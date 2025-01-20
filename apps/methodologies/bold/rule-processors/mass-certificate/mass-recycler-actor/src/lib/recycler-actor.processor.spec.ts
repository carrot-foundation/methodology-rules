import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';
import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  DocumentCategory,
  DocumentEventActorType,
  DocumentEventAttributeName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { MethodologyDocumentEventName } from '@carrot-fndn/shared/types';
import { random } from 'typia';

import { RecyclerActorDocumentProcessor } from './recycler-actor.processor';

const { ACTOR } = MethodologyDocumentEventName;
const { RECYCLER } = DocumentEventActorType;
const { ACTOR_TYPE } = DocumentEventAttributeName;

describe('RecyclerActorDocumentProcessor', () => {
  const ruleDataProcessor = new RecyclerActorDocumentProcessor();

  it.each([
    {
      massDocuments: stubArray(() =>
        stubDocument({ category: DocumentCategory.MASS }),
      ),
      resultComment: ruleDataProcessor['ResultComment'].REJECTED,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'have some undefined participants',
    },
    {
      massDocuments: stubArray(
        () =>
          stubDocument({
            category: DocumentCategory.MASS,
            externalEvents: [
              stubDocumentEventWithMetadataAttributes(
                { name: ACTOR, participant: { id: '123' } },
                [[ACTOR_TYPE, RECYCLER]],
              ),
            ],
          }),
        { max: 10, min: 2 },
      ),
      resultComment: ruleDataProcessor['ResultComment'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'have same participants declared as recycler',
    },
    {
      massDocuments: stubArray(
        () =>
          stubDocument({
            category: DocumentCategory.MASS,
            externalEvents: [
              stubDocumentEventWithMetadataAttributes({ name: ACTOR }, [
                [ACTOR_TYPE, RECYCLER],
              ]),
            ],
          }),
        { max: 10, min: 2 },
      ),
      resultComment: ruleDataProcessor['ResultComment'].REJECTED,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'does not have same participants declared as recycler',
    },
  ])(
    `should return "$resultStatus" when the documents $scenario`,
    async ({ massDocuments, resultComment, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();

      spyOnDocumentQueryServiceLoad(stubDocument(), massDocuments);

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      const expectedRuleOutput: RuleOutput = {
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultComment,
        resultStatus,
      };

      expect(ruleOutput).toEqual(expectedRuleOutput);
    },
  );
});
