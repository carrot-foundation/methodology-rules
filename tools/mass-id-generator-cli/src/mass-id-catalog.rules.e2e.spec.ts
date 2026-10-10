import type { MethodologyRuleEvent } from '@carrot-fndn/shared/lambda/types';
import type { Handler } from 'aws-lambda';

import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { compostingCycleTimeframeLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/composting-cycle-timeframe';
import { driverIdentificationLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/driver-identification';
import { dropOffAtRecyclerLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/drop-off-at-recycler';
import { haulerIdentificationLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/hauler-identification';
import { massIDQualificationsLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/mass-id-qualifications';
import { privacyFlagsLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/privacy-flags';
import { processorIdentificationLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/processor-identification';
import { projectPeriodLimitLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/project-period-limit';
import { recyclerIdentificationLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/recycler-identification';
import { regionalWasteClassificationLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/regional-waste-classification';
import { vehicleIdentificationLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/vehicle-identification';
import { wasteOriginIdentificationLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/waste-origin-identification';
import {
  type BoldDocument,
  BoldDocumentEventName,
  BoldDocumentSchema,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { stubCatalogMassIDDocument } from './mass-id-catalog.stubs';

type RuleLambda = Handler<MethodologyRuleEvent, unknown>;

const RULE_LAMBDAS: ReadonlyArray<readonly [string, RuleLambda]> = [
  ['composting-cycle-timeframe', compostingCycleTimeframeLambda],
  ['driver-identification', driverIdentificationLambda],
  ['drop-off-at-recycler', dropOffAtRecyclerLambda],
  ['hauler-identification', haulerIdentificationLambda],
  ['mass-id-qualifications', massIDQualificationsLambda],
  ['privacy-flags', privacyFlagsLambda],
  ['processor-identification', processorIdentificationLambda],
  ['project-period-limit', projectPeriodLimitLambda],
  ['recycler-identification', recyclerIdentificationLambda],
  ['regional-waste-classification', regionalWasteClassificationLambda],
  ['vehicle-identification', vehicleIdentificationLambda],
  ['waste-origin-identification', wasteOriginIdentificationLambda],
];

// project-period-limit reads the wall clock; the example's dates are fixed.
const EXAMPLE_VERIFIED_AT = new Date('2025-03-01T00:00:00.000Z');
const NOT_APPLICABLE_COMMENT = 'Rule not applicable';

const runRule = async (
  ruleLambda: RuleLambda,
  document: BoldDocument,
): Promise<RuleOutput> => {
  const documentKeyPrefix = faker.string.uuid();

  prepareEnvironmentTestE2E([
    {
      document,
      documentKey: toDocumentKey({
        documentId: document.id,
        documentKeyPrefix,
      }),
    },
  ]);

  return (await ruleLambda(
    stubRuleInput({ documentKeyPrefix, parentDocumentId: document.id }),
    stubContext(),
    () => stubRuleResponse(),
  )) as RuleOutput;
};

describe('MassID catalog rule verification E2E', () => {
  beforeAll(() => {
    vi.useFakeTimers({ now: EXAMPLE_VERIFIED_AT, toFake: ['Date'] });
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('should run the rules against the pinned clock', () => {
    expect(new Date().toISOString()).toBe(EXAMPLE_VERIFIED_AT.toISOString());
  });

  it('should build a document the loaded-document schema accepts', () => {
    const result = BoldDocumentSchema.safeParse(stubCatalogMassIDDocument());

    expect(result.error?.issues ?? []).toStrictEqual([]);
  });

  it.each(RULE_LAMBDAS)(
    'should return PASSED from %s for the canonical document',
    async (_ruleSlug, ruleLambda) => {
      const response = await runRule(ruleLambda, stubCatalogMassIDDocument());

      expect(`${response.resultStatus}: ${response.resultComment}`).toMatch(
        /^PASSED: /,
      );
      expect(response.resultComment).not.toBe(NOT_APPLICABLE_COMMENT);
    },
  );

  it('should have privacy-flags validate everything except the attributes its table does not list', async () => {
    const response = await runRule(
      privacyFlagsLambda,
      stubCatalogMassIDDocument(),
    );

    expect(response.resultContent?.['notValidated']).toStrictEqual([
      { attributeName: 'Container Quantity', eventName: 'Weighing' },
      { attributeName: 'Container Capacity', eventName: 'Weighing' },
    ]);
  });

  it('should stop returning PASSED from privacy-flags when the Pick-up event is private', async () => {
    const document = stubCatalogMassIDDocument();
    const response = await runRule(privacyFlagsLambda, {
      ...document,
      externalEvents: document.externalEvents?.map((event) =>
        event.name === BoldDocumentEventName.PICK_UP
          ? { ...event, isPublic: false }
          : event,
      ),
    });

    expect(response.resultStatus).not.toBe('PASSED');
    expect(response.resultContent?.['reviewReasons']).toContainEqual(
      expect.objectContaining({
        eventName: BoldDocumentEventName.PICK_UP,
        field: 'isPublic',
      }),
    );
  });
});
