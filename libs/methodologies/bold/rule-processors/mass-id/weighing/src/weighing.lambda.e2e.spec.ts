import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import * as scaleTicketVerification from './scale-ticket-verification/scale-ticket-verification.helpers';
import { weighingLambda } from './weighing.lambda';
import {
  weighingErrorTestCases,
  weighingTestCases,
} from './weighing.test-cases';

describe('WeighingProcessor E2E', () => {
  let verifyScaleTicketNetWeightSpy: jest.SpiedFunction<
    typeof scaleTicketVerification.verifyScaleTicketNetWeight
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    verifyScaleTicketNetWeightSpy = jest
      .spyOn(scaleTicketVerification, 'verifyScaleTicketNetWeight')
      .mockResolvedValue({ errors: [] });
  });

  const documentKeyPrefix = faker.string.uuid();

  it.each(weighingTestCases)(
    'should return $resultStatus when $scenario',
    async (testCase) => {
      const {
        accreditationDocuments,
        massIDDocumentEvents,
        resultComment,
        resultStatus,
      } = testCase;

      if ('scaleTicketVerificationError' in testCase) {
        verifyScaleTicketNetWeightSpy.mockResolvedValueOnce({
          errors: [testCase.scaleTicketVerificationError],
        });
      }

      const {
        massIDAuditDocument,
        massIDDocument,
        participantsAccreditationDocuments,
      } = new BoldStubsBuilder()
        .createMassIDDocuments({
          externalEventsMap: massIDDocumentEvents,
        })
        .createMassIDAuditDocuments()
        .createMethodologyDocument()
        .createParticipantAccreditationDocuments(accreditationDocuments)
        .build();

      prepareEnvironmentTestE2E(
        [
          massIDDocument,
          massIDAuditDocument,
          ...participantsAccreditationDocuments.values(),
        ].map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const response = (await weighingLambda(
        stubRuleInput({
          documentId: massIDAuditDocument.id,
          documentKeyPrefix,
        }),
        stubContext(),
        () => stubRuleResponse(),
      )) as RuleOutput;

      expect(response).toMatchObject({
        resultComment,
        resultStatus,
      });
    },
  );

  describe('WeighingProcessorErrors', () => {
    it.each(weighingErrorTestCases)(
      'should return $resultStatus when $scenario',
      async ({ documents, massIDAuditDocument, resultStatus }) => {
        prepareEnvironmentTestE2E(
          [...documents, massIDAuditDocument].map((document) => ({
            document,
            documentKey: toDocumentKey({
              documentId: document.id,
              documentKeyPrefix,
            }),
          })),
        );

        const response = (await weighingLambda(
          stubRuleInput({
            documentId: massIDAuditDocument.id,
            documentKeyPrefix,
          }),
          stubContext(),
          () => stubRuleResponse(),
        )) as RuleOutput;

        expect(response.resultStatus).toBe(resultStatus);
      },
    );
  });
});
