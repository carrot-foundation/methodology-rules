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
            name: DocumentEventName.ACTOR,
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

      const ruleInput = {
        ...random<Required<RuleInput>>(),
        documentId: massIDAuditDocument.id,
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
          testCase.massIDAuditDocument && testCase.documents,
        ),
      }),
    );

    it.each(allErrorCases)(
      'should return $resultStatus when $scenario',
      async (testCase) => {
        if (testCase.hasDocuments) {
          const { documents, massIDAuditDocument } = testCase as unknown as {
            documents: Document[];
            massIDAuditDocument: Document;
          };

          spyOnLoadDocument(massIDAuditDocument);
          spyOnDocumentQueryServiceLoad(massIDAuditDocument, [
            massIDAuditDocument,
            ...documents,
          ]);

          const ruleInput: Required<RuleInput> = {
            ...random<Required<RuleInput>>(),
            documentId: massIDAuditDocument.id,
          };

          const ruleOutput = await ruleDataProcessor.process(ruleInput);

          expectRuleOutput({
            resultComment: testCase.resultComment,
            resultStatus: testCase.resultStatus,
            ruleInput,
            ruleOutput,
          });
        } else {
          spyOnLoadDocument(undefined);

          const ruleInput = random<Required<RuleInput>>();

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
