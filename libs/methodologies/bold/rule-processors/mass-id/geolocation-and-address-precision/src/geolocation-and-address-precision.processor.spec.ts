import {
  spyOnDocumentQueryServiceLoad,
  spyOnLoadDocument,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  BoldStubsBuilder,
  expectRuleOutput,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type RuleInput } from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { GeolocationAndAddressPrecisionProcessor } from './geolocation-and-address-precision.processor';
import {
  geolocationAndAddressPrecisionErrorTestCases,
  geolocationAndAddressPrecisionTestCases,
} from './geolocation-and-address-precision.test-cases';

describe('GeolocationAndAddressPrecisionProcessor', () => {
  const ruleDataProcessor = new GeolocationAndAddressPrecisionProcessor();

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it.each(geolocationAndAddressPrecisionTestCases)(
    'should return $resultStatus when $scenario',
    async ({
      accreditationDocuments,
      actorParticipants,
      massIdDocumentParameters,
      resultComment,
      resultStatus,
    }) => {
      const {
        massIdAuditDocument,
        massIdDocument,
        participantsAccreditationDocuments,
      } = new BoldStubsBuilder({
        massIdActorParticipants: actorParticipants,
      })
        .createMassIdDocuments(massIdDocumentParameters)
        .createMassIdAuditDocuments()
        .createMethodologyDocument()
        .createParticipantAccreditationDocuments(accreditationDocuments)
        .build();

      const auditActorEvents = [...actorParticipants.values()].map(
        (participant) =>
          stubDocumentEvent({
            label: participant.type,
            name: DocumentEventName.ACTOR,
            participant,
            relatedDocument: {
              documentId: participantsAccreditationDocuments.get(
                participant.type,
              )!.id,
            },
          }),
      );

      massIdAuditDocument.externalEvents = [
        ...(massIdAuditDocument.externalEvents ?? []),
        ...auditActorEvents,
      ];

      const allDocuments = [
        massIdDocument,
        massIdAuditDocument,
        ...participantsAccreditationDocuments.values(),
      ];

      spyOnLoadDocument(massIdAuditDocument);
      spyOnDocumentQueryServiceLoad(massIdAuditDocument, allDocuments);

      const ruleInput = {
        ...random<Required<RuleInput>>(),
        documentId: massIdAuditDocument.id,
      };

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      expectRuleOutput({
        resultComment,
        resultStatus,
        ruleInput,
        ruleOutput,
      });
    },
  );

  describe('GeolocationAndAddressPrecisionProcessorErrors', () => {
    const allErrorCases = geolocationAndAddressPrecisionErrorTestCases.map(
      (testCase) => ({
        ...testCase,
        hasDocuments: Boolean(
          testCase.massIdAuditDocument && testCase.documents,
        ),
      }),
    );

    it.each(allErrorCases)(
      'should return $resultStatus when $scenario',
      async (testCase) => {
        if (testCase.hasDocuments) {
          const { documents, massIdAuditDocument } = testCase as unknown as {
            documents: Document[];
            massIdAuditDocument: Document;
          };

          spyOnLoadDocument(massIdAuditDocument);
          spyOnDocumentQueryServiceLoad(massIdAuditDocument, [
            massIdAuditDocument,
            ...documents,
          ]);

          const ruleInput: Required<RuleInput> = {
            ...random<Required<RuleInput>>(),
            documentId: massIdAuditDocument.id,
          };

          const ruleOutput = await ruleDataProcessor.process(ruleInput);

          expect(ruleOutput).toEqual({
            requestId: ruleInput.requestId,
            responseToken: ruleInput.responseToken,
            responseUrl: ruleInput.responseUrl,
            resultComment: testCase.resultComment,
            resultStatus: testCase.resultStatus,
          });
        } else {
          spyOnLoadDocument(undefined);

          const ruleInput = random<Required<RuleInput>>();

          const ruleOutput = await ruleDataProcessor.process(ruleInput);

          expect(ruleOutput).toEqual({
            requestId: ruleInput.requestId,
            responseToken: ruleInput.responseToken,
            responseUrl: ruleInput.responseUrl,
            resultComment: testCase.resultComment,
            resultStatus: testCase.resultStatus,
          });
        }
      },
    );
  });
});
