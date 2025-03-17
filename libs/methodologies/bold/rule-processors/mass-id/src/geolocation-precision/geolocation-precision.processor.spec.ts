import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { GeolocationPrecisionProcessorErrors } from './geolocation-precision.errors';
import { GeolocationPrecisionProcessor } from './geolocation-precision.processor';
import { geolocationPrecisionTestCases } from './geolocation-precision.test-cases';

const { DROP_OFF, PICK_UP } = DocumentEventName;

describe('GeolocationPrecisionProcessor', () => {
  const ruleDataProcessor = new GeolocationPrecisionProcessor();

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it.each(geolocationPrecisionTestCases)(
    'should return $resultStatus when $scenario',
    async ({
      actorParticipants,
      homologationDocuments,
      massIdDocumentParameters,
      resultComment,
      resultStatus,
    }) => {
      const {
        massIdAuditDocument,
        massIdDocument,
        participantsHomologationDocuments,
      } = new BoldStubsBuilder({ actorParticipants })
        .createMassIdDocument(massIdDocumentParameters)
        .createMassIdAuditDocument()
        .createMethodologyDocuments()
        .createParticipantHomologationDocuments(homologationDocuments)
        .build();

      const allDocuments = [
        massIdDocument,
        massIdAuditDocument,
        ...participantsHomologationDocuments.values(),
      ];

      spyOnDocumentQueryServiceLoad(massIdAuditDocument, allDocuments);

      const ruleInput = {
        ...random<Required<RuleInput>>(),
        documentId: massIdAuditDocument.id,
      };

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      expect(ruleOutput).toEqual({
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultComment,
        resultStatus,
      });
    },
  );

  describe('GeolocationPrecisionProcessorErrors', () => {
    const {
      massIdAuditDocument,
      massIdDocument,
      participantsHomologationDocuments,
    } = new BoldStubsBuilder()
      .createMassIdDocument({
        externalEventsMap: {
          [DROP_OFF]: undefined,
          [PICK_UP]: undefined,
        },
      })
      .createMassIdAuditDocument()
      .createMethodologyDocuments()
      .createParticipantHomologationDocuments()
      .build();

    it('should return REJECTED when the MassId document does not exist', async () => {
      spyOnDocumentQueryServiceLoad(massIdAuditDocument, [
        massIdAuditDocument,
        ...participantsHomologationDocuments.values(),
      ]);

      const ruleInput = {
        ...random<Required<RuleInput>>(),
        documentId: massIdAuditDocument.id,
      };

      const errorMessage = new GeolocationPrecisionProcessorErrors();

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      expect(ruleOutput).toMatchObject({
        resultComment: errorMessage.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
        resultStatus: RuleOutputStatus.REJECTED,
      });
    });

    it('should return REJECTED when the MassId document does not contain a DROP_OFF or PICK_UP event', async () => {
      spyOnDocumentQueryServiceLoad(massIdAuditDocument, [
        massIdDocument,
        ...participantsHomologationDocuments.values(),
      ]);

      const ruleInput = {
        ...random<Required<RuleInput>>(),
        documentId: massIdAuditDocument.id,
      };

      const errorMessage = new GeolocationPrecisionProcessorErrors();

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      expect(ruleOutput).toMatchObject({
        resultComment:
          errorMessage.ERROR_MESSAGE.MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_REQUIRED_EVENTS(
            massIdDocument.id,
          ),
        resultStatus: RuleOutputStatus.REJECTED,
      });
    });

    it('should return REJECTED when the homologation documents are not found', async () => {
      spyOnDocumentQueryServiceLoad(massIdAuditDocument, [massIdDocument]);

      const ruleInput = {
        ...random<Required<RuleInput>>(),
        documentId: massIdAuditDocument.id,
      };

      const errorMessage = new GeolocationPrecisionProcessorErrors();

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      expect(ruleOutput).toMatchObject({
        resultComment:
          errorMessage.ERROR_MESSAGE
            .PARTICIPANT_HOMOLOGATION_DOCUMENTS_NOT_FOUND,
        resultStatus: RuleOutputStatus.REJECTED,
      });
    });
  });
});
