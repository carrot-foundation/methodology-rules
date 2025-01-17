import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';
import {
  stubDocument,
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
  stubMassAuditDocument,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  DataSetName,
  DocumentEventAttributeName,
  DocumentEventName,
  MethodologyEvaluationResult,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { CARROT_PARTICIPANT_BY_ENVIRONMENT } from '@carrot-fndn/methodologies/bold/recycling/organic/utils';
import { pick } from '@carrot-fndn/shared/helpers';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { random } from 'typia';

import { MassAuditDocumentStatusProcessor } from './mass-audit-document-status.processor';

const { CLOSE } = DocumentEventName;
const { METHODOLOGY_EVALUATION_RESULT } = DocumentEventAttributeName;
const { APPROVED } = MethodologyEvaluationResult;

describe('MassAuditDocumentStatusProcessor', () => {
  const ruleDataProcessor = new MassAuditDocumentStatusProcessor();

  it('should return APPROVED when related documents matches mass audit and have approved close event', async () => {
    const ruleInput = random<Required<RuleInput>>();

    const relatedDocumentsOfParentDocument = stubArray(() =>
      stubMassAuditDocument({
        dataSetName: DataSetName.TEST,
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            {
              name: CLOSE,
              participant: {
                id: CARROT_PARTICIPANT_BY_ENVIRONMENT.development.TEST.id,
              },
            },
            [[METHODOLOGY_EVALUATION_RESULT, APPROVED]],
          ),
        ],
      }),
    );

    spyOnDocumentQueryServiceLoad(
      stubDocument(),
      relatedDocumentsOfParentDocument,
    );

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment: ruleDataProcessor['ResultComment'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });

  it('should return REJECTED when the related documents do not match the mass audit criteria', async () => {
    const ruleInput = random<Required<RuleInput>>();

    const relatedDocumentsOfParentDocument = stubArray(() => stubDocument(), {
      max: 10,
      min: 2,
    });

    spyOnDocumentQueryServiceLoad(
      stubDocument(),
      stubArray(() => {
        const document = stubMassAuditDocument();

        document.externalEvents = relatedDocumentsOfParentDocument.map(
          (value) =>
            stubDocumentEvent({
              relatedDocument: pick(value, 'id', 'category', 'type', 'subtype'),
            }),
        );

        return document;
      }),
    );

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment: ruleDataProcessor['ResultComment'].REJECTED,
      resultStatus: RuleOutputStatus.REJECTED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });

  it('should return REJECTED when the related documents matches mass audit but does not have a CLOSE event', async () => {
    const ruleInput = random<Required<RuleInput>>();

    const relatedDocumentsOfParentDocument = stubArray(() => {
      const document = stubMassAuditDocument();

      document.externalEvents = [
        stubDocumentEvent({
          name: DocumentEventName.MOVE,
        }),
      ];

      return document;
    });

    spyOnDocumentQueryServiceLoad(
      stubDocument(),
      stubArray(() => {
        const document = stubMassAuditDocument();

        document.externalEvents = relatedDocumentsOfParentDocument.map(
          (value) =>
            stubDocumentEvent({
              relatedDocument: pick(value, 'id', 'category', 'type', 'subtype'),
            }),
        );

        return document;
      }),
    );

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment: ruleDataProcessor['ResultComment'].REJECTED,
      resultStatus: RuleOutputStatus.REJECTED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });
});
