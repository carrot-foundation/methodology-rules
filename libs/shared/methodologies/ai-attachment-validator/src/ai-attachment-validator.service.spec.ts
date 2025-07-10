import { logger } from '@carrot-fndn/shared/helpers';
import { stubDocument } from '@carrot-fndn/shared/methodologies/bold/testing';
import { afterEach } from 'node:test';

import type { ApiAiValidationResponse } from './ai-attachment-validator.api.dto';

import {
  AI_ATTACHMENT_VALIDATOR_API_URI,
  FIELD_SEPARATOR,
  VALID_MESSAGE,
  VALIDATION_MODE,
  VALIDATION_UNAVAILABLE_MESSAGE,
} from './ai-attachment-validator.constants';
import { formatInvalidField } from './ai-attachment-validator.helpers';
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAttachment', () => {
    it('should call the post method with the correct arguments and return valid response', async () => {
      const dto = stubAiValidateAttachmentDto();
      const apiResponse: ApiAiValidationResponse = [
        {
          fieldName: 'testField',
          invalidReason: null,
          isValid: true,
          value: 'testValue',
        },
      ];

      jest.spyOn(service as any, 'post').mockResolvedValue(apiResponse);

      const result = await service.validateAttachment(dto);

      expect(service['post']).toHaveBeenCalledWith(
        AI_ATTACHMENT_VALIDATOR_API_URI,
        {
          attachmentPaths: [dto.attachmentPath],
          documentJson: dto.document,
          mode: VALIDATION_MODE,
          ...(dto.additionalContext && { context: dto.additionalContext }),
        },
      );

      expect(result).toEqual({
        isValid: true,
        validationResponse: VALID_MESSAGE,
      });
    });

    it('should return invalid response when AI validation finds invalid fields', async () => {
      const dto = stubAiValidateAttachmentDto();
      const apiResponse: ApiAiValidationResponse = [
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
      ];

      jest.spyOn(service as any, 'post').mockResolvedValue(apiResponse);

      const result = await service.validateAttachment(dto);

      expect(result).toEqual({
        isValid: false,
        validationResponse: `field1: Field 1 is incosistent with the document${FIELD_SEPARATOR}field2: Invalid format`,
      });
    });

    it('should return valid response when all fields are valid', async () => {
      const dto = stubAiValidateAttachmentDto();
      const apiResponse: ApiAiValidationResponse = [
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
      ];

      jest.spyOn(service as any, 'post').mockResolvedValue(apiResponse);

      const result = await service.validateAttachment(dto);

      expect(result).toEqual({
        isValid: true,
        validationResponse: VALID_MESSAGE,
      });
    });

    it('should throw an error when the dto is invalid', async () => {
      await expect(service.validateAttachment({} as never)).rejects.toThrow(
        'Error on createAssertEquals()',
      );
    });

    it('should handle API errors gracefully and return error response', async () => {
      const dto = stubAiValidateAttachmentDto();
      const error = new Error('Network error');

      jest.spyOn(service as any, 'post').mockRejectedValue(error);

      const result = await service.validateAttachment(dto);

      expect(logger.debug).toHaveBeenCalledWith(
        'AI validation failed:',
        JSON.stringify(error),
      );

      expect(result).toEqual({
        isValid: false,
        validationResponse: VALIDATION_UNAVAILABLE_MESSAGE,
      });
    });

    it('should handle malformed API response gracefully', async () => {
      const dto = stubAiValidateAttachmentDto();

      jest.spyOn(service as any, 'post').mockRejectedValue('invalid response');

      await expect(service.validateAttachment(dto)).resolves.toEqual({
        isValid: false,
        validationResponse: VALIDATION_UNAVAILABLE_MESSAGE,
      });
    });

    it('should correctly map the DTO for the API call', async () => {
      const document = stubDocument();
      const dto = stubAiValidateAttachmentDto({
        document,
      });

      delete dto.additionalContext; // Ensure additionalContext is not included in the test

      const apiResponse = stubApiAiValidationResponse();

      jest.spyOn(service as any, 'post').mockResolvedValue(apiResponse);

      await service.validateAttachment(dto);

      expect(service['post']).toHaveBeenCalledWith(
        AI_ATTACHMENT_VALIDATOR_API_URI,
        {
          attachmentPaths: [dto.attachmentPath],
          documentJson: document,
          mode: VALIDATION_MODE,
        },
      );
    });
  });

  describe('processValidationResult', () => {
    it('should return valid response when all fields are valid', () => {
      const validationResult: ApiAiValidationResponse = [
        {
          fieldName: 'field1',
          invalidReason: null,
          isValid: true,
          value: 'valid-value',
        },
      ];

      const result = service['processValidationResult'](validationResult);

      expect(result).toEqual({
        isValid: true,
        validationResponse: VALID_MESSAGE,
      });
    });

    it('should return invalid response with formatted field errors', () => {
      const validationResult: ApiAiValidationResponse = [
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
      ];

      const result = service['processValidationResult'](validationResult);

      expect(result).toEqual({
        isValid: false,
        validationResponse: `field1: Error message 1${FIELD_SEPARATOR}field2: Error message 2`,
      });
    });

    it('should filter out valid fields and only show invalid ones', () => {
      const validationResult: ApiAiValidationResponse = [
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
      ];

      const result = service['processValidationResult'](validationResult);

      expect(result).toEqual({
        isValid: false,
        validationResponse: 'invalidField: Error message',
      });
    });
  });

  describe('mapValidateAttachmentDto', () => {
    it('should correctly map the DTO with additional context', () => {
      const dto = stubAiValidateAttachmentDto();

      dto.additionalContext = 'Some additional context here';

      // Access the private method for testing
      const mappedDto = service['mapValidateAttachmentDto'](dto);

      expect(mappedDto).toEqual({
        attachmentPaths: [dto.attachmentPath],
        context: dto.additionalContext,
        documentJson: dto.document,
        mode: VALIDATION_MODE,
      });
    });

    it('should correctly map the DTO without additional context', () => {
      const dto = stubAiValidateAttachmentDto();

      delete dto.additionalContext;

      const mappedDto = service['mapValidateAttachmentDto'](dto);

      expect(mappedDto).toEqual({
        attachmentPaths: [dto.attachmentPath],
        documentJson: dto.document,
        mode: VALIDATION_MODE,
      });
      expect(mappedDto).not.toHaveProperty('context');
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
