import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type BoldDocumentEvent,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { PRIVACY_REASON_CODES } from './privacy-flags.constants';
import { privacyFlagsLambda } from './privacy-flags.lambda';
import {
  conformantEvent,
  conformantExternalEventsMap,
} from './privacy-flags.test-cases';

const { PICK_UP } = BoldDocumentEventName;

describe('PrivacyFlagsLambda E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  const runLambda = async (
    externalEventsMap: Record<string, BoldDocumentEvent>,
  ): Promise<RuleOutput> => {
    const { massIDAuditDocument, massIDDocument } = new BoldStubsBuilder()
      .createMassIDDocuments({ externalEventsMap })
      .createMassIDAuditDocuments()
      .build();

    prepareEnvironmentTestE2E(
      [massIDDocument, massIDAuditDocument].map((document) => ({
        document,
        documentKey: toDocumentKey({
          documentId: document.id,
          documentKeyPrefix,
        }),
      })),
    );

    return (await privacyFlagsLambda(
      stubRuleInput({
        documentKeyPrefix,
        parentDocumentId: massIDDocument.id,
      }),
      stubContext(),
      () => stubRuleResponse(),
    )) as RuleOutput;
  };

  it('should return PASSED when all privacy flags match the methodology specification', async () => {
    const response = await runLambda(conformantExternalEventsMap());

    expect(response.resultStatus).toBe('PASSED');
  });

  it('should return FAILED with the review reason that detected the violation when the Pick-up event declares isPublic as false', async () => {
    const response = await runLambda({
      ...conformantExternalEventsMap(),
      [PICK_UP]: { ...conformantEvent(PICK_UP), isPublic: false },
    });

    expect(response.resultStatus).toBe('FAILED');
    expect(response.resultContent?.['reviewReasons']).toContainEqual(
      expect.objectContaining({
        code: PRIVACY_REASON_CODES.EVENT_IS_PUBLIC,
        eventName: PICK_UP,
      }),
    );
  });
});
