import { logger } from '@carrot-fndn/shared/helpers';
import { stubDocument } from '@carrot-fndn/shared/methodologies/bold/testing';
import { TypeGuardError } from 'typia';

import type { ApiAiValidationResponse } from './ai-attachment-validator.api.dto';

import {
  FIELD_SEPARATOR,
  getAiAttachmentValidatorApiUri,
  VALID_MESSAGE,
  VALIDATION_UNAVAILABLE_MESSAGE,
} from './ai-attachment-validator.constants';
import {
  formatInvalidField,
  optimizeDocumentJsonForValidation,
} from './ai-attachment-validator.helpers';
import { AiAttachmentValidatorService } from './ai-attachment-validator.service';
import {
  stubAiValidateAttachmentDto,
  stubApiAiValidationResponse,
} from './ai-attachment-validator.stubs';

describe('AiAttachmentValidatorService', () => {
  let service: AiAttachmentValidatorService;

  beforeEach(() => {
    service = new AiAttachmentValidatorService();
    jest.spyOn(logger, 'debug').mockImplementation();
    jest.spyOn(logger, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAttachment', () => {
    it('should call the post method with the correct arguments and return valid response', async () => {
      const dto = stubAiValidateAttachmentDto();
      const validationData: ApiAiValidationResponse = {
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
        },
        validation: {
          fields: [
            {
              fieldName: 'testField',
              invalidReason: null,
              isValid: true,
              value: 'testValue',
            },
          ],
          reasoning: 'All fields are valid',
        },
      };

      const apiResponse = { results: validationData };

      jest.spyOn(service as any, 'post').mockResolvedValue(apiResponse);

      const result = await service.validateAttachment(dto);

      expect(service['post']).toHaveBeenCalledWith(
        getAiAttachmentValidatorApiUri(),
        {
          attachmentPaths: [dto.attachmentPath],
          documentJson: optimizeDocumentJsonForValidation(dto.document),
          ...(dto.systemPrompt && { systemPrompt: dto.systemPrompt }),
        },
      );

      expect(result).toEqual({
        isValid: true,
        reasoning: 'All fields are valid',
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
        },
        validationResponse: VALID_MESSAGE,
      });
    });

    it('should return invalid response when AI validation finds invalid fields', async () => {
      const dto = stubAiValidateAttachmentDto();
      const validationData: ApiAiValidationResponse = {
        usage: {
          inputTokens: 150,
          outputTokens: 75,
          totalTokens: 225,
        },
        validation: {
          fields: [
            {
              fieldName: 'field1',
              invalidReason: 'Field 1 is incosistent with the document',
              isValid: false,
              value: null,
            },
            {
              fieldName: 'field2',
              invalidReason: 'Invalid format',
              isValid: false,
              value: 'invalid-value',
            },
            {
              fieldName: 'field3',
              invalidReason: null,
              isValid: true,
              value: 'valid-value',
            },
          ],
          reasoning: 'Some fields contain invalid data',
        },
      };

      const apiResponse = { results: validationData };

      jest.spyOn(service as any, 'post').mockResolvedValue(apiResponse);

      const result = await service.validateAttachment(dto);

      expect(result).toEqual({
        isValid: false,
        reasoning: 'Some fields contain invalid data',
        usage: {
          inputTokens: 150,
          outputTokens: 75,
          totalTokens: 225,
        },
        validationResponse: `field1: Field 1 is incosistent with the document${FIELD_SEPARATOR}field2: Invalid format`,
      });
    });

    it('should return valid response when all fields are valid', async () => {
      const dto = stubAiValidateAttachmentDto();
      const validationData: ApiAiValidationResponse = {
        usage: {
          inputTokens: 120,
          outputTokens: 60,
          totalTokens: 180,
        },
        validation: {
          fields: [
            {
              fieldName: 'field1',
              invalidReason: null,
              isValid: true,
              value: 'valid-value-1',
            },
            {
              fieldName: 'field2',
              invalidReason: null,
              isValid: true,
              value: 'valid-value-2',
            },
          ],
          reasoning: 'All fields passed validation',
        },
      };

      const apiResponse = { results: validationData };

      jest.spyOn(service as any, 'post').mockResolvedValue(apiResponse);

      const result = await service.validateAttachment(dto);

      expect(result).toEqual({
        isValid: true,
        reasoning: 'All fields passed validation',
        usage: {
          inputTokens: 120,
          outputTokens: 60,
          totalTokens: 180,
        },
        validationResponse: VALID_MESSAGE,
      });
    });

    it('should throw an error when the dto is invalid', async () => {
      await expect(service.validateAttachment({} as never)).rejects.toThrow(
        TypeGuardError,
      );
    });

    it('should handle API errors gracefully and return error response', async () => {
      const dto = stubAiValidateAttachmentDto();
      const error = new Error('Network error');

      jest.spyOn(service as any, 'post').mockRejectedValue(error);

      const result = await service.validateAttachment(dto);

      expect(logger.warn).toHaveBeenCalledWith(
        `AI validation failed: ${error.message}`,
      );

      expect(result).toEqual({
        isValid: false,
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
        validationResponse: VALIDATION_UNAVAILABLE_MESSAGE,
      });
    });

    it('should handle malformed API response gracefully', async () => {
      const dto = stubAiValidateAttachmentDto();

      jest.spyOn(service as any, 'post').mockRejectedValue('invalid response');

      await expect(service.validateAttachment(dto)).resolves.toEqual({
        isValid: false,
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
        validationResponse: VALIDATION_UNAVAILABLE_MESSAGE,
      });
    });

    it('should correctly map the DTO for the API call', async () => {
      const document = stubDocument();
      const dto = stubAiValidateAttachmentDto({
        document,
      });

      delete dto.systemPrompt; // Ensure systemPrompt is not included in the test

      const validationData = stubApiAiValidationResponse();
      const apiResponse = { results: validationData };

      jest.spyOn(service as any, 'post').mockResolvedValue(apiResponse);

      await service.validateAttachment(dto);

      expect(service['post']).toHaveBeenCalledWith(
        getAiAttachmentValidatorApiUri(),
        {
          attachmentPaths: [dto.attachmentPath],
          documentJson: optimizeDocumentJsonForValidation(document),
        },
      );
    });
  });

  describe('processValidationResult', () => {
    it('should return valid response when all fields are valid', () => {
      const validationResult: ApiAiValidationResponse = {
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
        },
        validation: {
          fields: [
            {
              fieldName: 'field1',
              invalidReason: null,
              isValid: true,
              value: 'valid-value',
            },
          ],
          reasoning: 'All fields are valid',
        },
      };

      const result = service['processValidationResult'](validationResult);

      expect(result).toEqual({
        isValid: true,
        reasoning: 'All fields are valid',
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
        },
        validationResponse: VALID_MESSAGE,
      });
    });

    it('should return invalid response with formatted field errors', () => {
      const validationResult: ApiAiValidationResponse = {
        usage: {
          inputTokens: 150,
          outputTokens: 75,
          totalTokens: 225,
        },
        validation: {
          fields: [
            {
              fieldName: 'field1',
              invalidReason: 'Error message 1',
              isValid: false,
              value: 'invalid-value',
            },
            {
              fieldName: 'field2',
              invalidReason: 'Error message 2',
              isValid: false,
              value: 'invalid-value',
            },
          ],
          reasoning: 'Multiple fields have errors',
        },
      };

      const result = service['processValidationResult'](validationResult);

      expect(result).toEqual({
        isValid: false,
        reasoning: 'Multiple fields have errors',
        usage: {
          inputTokens: 150,
          outputTokens: 75,
          totalTokens: 225,
        },
        validationResponse: `field1: Error message 1${FIELD_SEPARATOR}field2: Error message 2`,
      });
    });

    it('should filter out valid fields and only show invalid ones', () => {
      const validationResult: ApiAiValidationResponse = {
        usage: {
          inputTokens: 120,
          outputTokens: 60,
          totalTokens: 180,
        },
        validation: {
          fields: [
            {
              fieldName: 'validField',
              invalidReason: null,
              isValid: true,
              value: 'valid-value',
            },
            {
              fieldName: 'invalidField',
              invalidReason: 'Error message',
              isValid: false,
              value: 'invalid-value',
            },
          ],
          reasoning: 'One field is invalid',
        },
      };

      const result = service['processValidationResult'](validationResult);

      expect(result).toEqual({
        isValid: false,
        reasoning: 'One field is invalid',
        usage: {
          inputTokens: 120,
          outputTokens: 60,
          totalTokens: 180,
        },
        validationResponse: 'invalidField: Error message',
      });
    });
  });

  describe('mapValidateAttachmentDto', () => {
    it('should correctly map the DTO with systemPrompt', () => {
      const dto = stubAiValidateAttachmentDto();

      dto.systemPrompt = 'Custom system prompt';

      // Access the private method for testing
      const mappedDto = service['mapValidateAttachmentDto'](dto);

      expect(mappedDto).toEqual({
        attachmentPaths: [dto.attachmentPath],
        documentJson: optimizeDocumentJsonForValidation(dto.document),
        systemPrompt: dto.systemPrompt,
      });
    });

    it('should correctly map the DTO without systemPrompt', () => {
      const dto = stubAiValidateAttachmentDto();

      delete dto.systemPrompt;

      const mappedDto = service['mapValidateAttachmentDto'](dto);

      expect(mappedDto).toEqual({
        attachmentPaths: [dto.attachmentPath],
        documentJson: optimizeDocumentJsonForValidation(dto.document),
      });
      expect(mappedDto).not.toHaveProperty('systemPrompt');
    });
  });
});

describe('formatInvalidField helper', () => {
  it('should format field name and reason correctly', () => {
    const result = formatInvalidField('testField', 'Test error message');

    expect(result).toBe('testField: Test error message');
  });

  it('should handle null reason', () => {
    const result = formatInvalidField('testField', null);

    expect(result).toBe('testField: null');
  });
});
