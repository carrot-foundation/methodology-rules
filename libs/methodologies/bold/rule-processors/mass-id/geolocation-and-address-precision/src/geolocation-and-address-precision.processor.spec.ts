import {
  spyOnDocumentQueryServiceLoad,
  spyOnLoadDocument,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  BoldStubsBuilder,
  expectRuleOutput,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import { type RuleInput } from '@carrot-fndn/shared/rule/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import { GeolocationAndAddressPrecisionProcessor } from './geolocation-and-address-precision.processor';
import {
  geolocationAndAddressPrecisionErrorTestCases,
  geolocationAndAddressPrecisionTestCases,
  reviewRequiredNoCoordinatesTestCase,
  reviewRequiredTestCase,
} from './geolocation-and-address-precision.test-cases';

describe('GeolocationAndAddressPrecisionProcessor', () => {
  const ruleDataProcessor = new GeolocationAndAddressPrecisionProcessor();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it.each(geolocationAndAddressPrecisionTestCases)(
    'should return $resultStatus when $scenario',
    async ({
      accreditationDocuments,
      actorParticipants,
      massIDDocumentParameters,
      resultComment,
      resultStatus,
    }) => {
      const {
        massIDAuditDocument,
        massIDDocument,
        participantsAccreditationDocuments,
      } = new BoldStubsBuilder({
        massIDActorParticipants: actorParticipants,
      })
        .createMassIDDocuments(massIDDocumentParameters)
        .createMassIDAuditDocuments()
        .createMethodologyDocument()
        .createParticipantAccreditationDocuments(accreditationDocuments)
        .build();

      const auditActorEvents = [...actorParticipants.values()].map(
        (participant) =>
          stubDocumentEvent({
            label: participant.type,
            name: BoldDocumentEventName.ACTOR,
            participant,
            relatedDocument: {
              documentId: participantsAccreditationDocuments.get(
                participant.type,
              )!.id,
            },
          }),
      );

      massIDAuditDocument.externalEvents = [
        ...(massIDAuditDocument.externalEvents ?? []),
        ...auditActorEvents,
      ];

      const allDocuments = [
        massIDDocument,
        massIDAuditDocument,
        ...participantsAccreditationDocuments.values(),
      ];

      spyOnLoadDocument(massIDAuditDocument);
      spyOnDocumentQueryServiceLoad(massIDAuditDocument, allDocuments);

      const ruleInput = stubRuleInput({
        documentId: massIDAuditDocument.id,
      });

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      expectRuleOutput({
        resultComment,
        resultStatus,
        ruleInput,
        ruleOutput,
      });
    },
  );

  describe('when ENABLE_REVIEW_REQUIRED is enabled', () => {
    beforeEach(() => {
      vi.stubEnv('ENABLE_REVIEW_REQUIRED', 'true');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('should return REVIEW_REQUIRED when address similarity matches', async () => {
      const {
        accreditationDocuments,
        actorParticipants,
        massIDDocumentParameters,
        resultComment,
        resultStatus,
      } = reviewRequiredTestCase;

      const {
        massIDAuditDocument,
        massIDDocument,
        participantsAccreditationDocuments,
      } = new BoldStubsBuilder({
        massIDActorParticipants: actorParticipants,
      })
        .createMassIDDocuments(massIDDocumentParameters)
        .createMassIDAuditDocuments()
        .createMethodologyDocument()
        .createParticipantAccreditationDocuments(accreditationDocuments)
        .build();

      const auditActorEvents = [...actorParticipants.values()].map(
        (participant) =>
          stubDocumentEvent({
            label: participant.type,
            name: BoldDocumentEventName.ACTOR,
            participant,
            relatedDocument: {
              documentId: participantsAccreditationDocuments.get(
                participant.type,
              )!.id,
            },
          }),
      );

      massIDAuditDocument.externalEvents = [
        ...(massIDAuditDocument.externalEvents ?? []),
        ...auditActorEvents,
      ];

      const allDocuments = [
        massIDDocument,
        massIDAuditDocument,
        ...participantsAccreditationDocuments.values(),
      ];

      spyOnLoadDocument(massIDAuditDocument);
      spyOnDocumentQueryServiceLoad(massIDAuditDocument, allDocuments);

      const ruleInput = stubRuleInput({
        documentId: massIDAuditDocument.id,
      });

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      expectRuleOutput({
        resultComment,
        resultStatus,
        ruleInput,
        ruleOutput,
      });
    });

    it('should return REVIEW_REQUIRED when event address coordinates are missing and similarity matches', async () => {
      const {
        accreditationDocuments,
        actorParticipants,
        massIDDocumentParameters,
        resultComment,
        resultStatus,
      } = reviewRequiredNoCoordinatesTestCase;

      const {
        massIDAuditDocument,
        massIDDocument,
        participantsAccreditationDocuments,
      } = new BoldStubsBuilder({
        massIDActorParticipants: actorParticipants,
      })
        .createMassIDDocuments(massIDDocumentParameters)
        .createMassIDAuditDocuments()
        .createMethodologyDocument()
        .createParticipantAccreditationDocuments(accreditationDocuments)
        .build();

      const auditActorEvents = [...actorParticipants.values()].map(
        (participant) =>
          stubDocumentEvent({
            label: participant.type,
            name: BoldDocumentEventName.ACTOR,
            participant,
            relatedDocument: {
              documentId: participantsAccreditationDocuments.get(
                participant.type,
              )!.id,
            },
          }),
      );

      massIDAuditDocument.externalEvents = [
        ...(massIDAuditDocument.externalEvents ?? []),
        ...auditActorEvents,
      ];

      const allDocuments = [
        massIDDocument,
        massIDAuditDocument,
        ...participantsAccreditationDocuments.values(),
      ];

      spyOnLoadDocument(massIDAuditDocument);
      spyOnDocumentQueryServiceLoad(massIDAuditDocument, allDocuments);

      const ruleInput = stubRuleInput({
        documentId: massIDAuditDocument.id,
      });

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      expectRuleOutput({
        resultComment,
        resultStatus,
        ruleInput,
        ruleOutput,
      });
    });
  });

  describe('GeolocationAndAddressPrecisionProcessorErrors', () => {
    it.each(geolocationAndAddressPrecisionErrorTestCases)(
      'should return $resultStatus when $scenario',
      async (testCase) => {
        if (testCase.massIDAuditDocument) {
          const { documents, massIDAuditDocument } = testCase;

          spyOnLoadDocument(massIDAuditDocument);
          spyOnDocumentQueryServiceLoad(massIDAuditDocument, [
            massIDAuditDocument,
            ...documents,
          ]);

          const ruleInput: RuleInput = stubRuleInput({
            documentId: massIDAuditDocument.id,
          });

          const ruleOutput = await ruleDataProcessor.process(ruleInput);

          expectRuleOutput({
            resultComment: testCase.resultComment,
            resultStatus: testCase.resultStatus,
            ruleInput,
            ruleOutput,
          });
        } else {
          spyOnLoadDocument(undefined);

          const ruleInput = stubRuleInput();

          const ruleOutput = await ruleDataProcessor.process(ruleInput);

          expectRuleOutput({
            resultComment: testCase.resultComment,
            resultStatus: testCase.resultStatus,
            ruleInput,
            ruleOutput,
          });
        }
      },
    );
  });
});
