import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  stubCertificateDocument,
  stubDocument,
  stubDocumentEvent,
  stubMassDocument,
  stubMassValidationDocument,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  DocumentCategory,
  DocumentType,
} from '@carrot-fndn/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { random } from 'typia';

import { MassDocumentTypeProcessor } from './mass-document-type.processor';

describe('MassDocumentTypeRuleProcessor', () => {
  const massDocumentTypeRuleProcessor = new MassDocumentTypeProcessor();

  it('should return approved when all mass documents are of type Organic', async () => {
    const ruleInput = random<Required<RuleInput>>();

    const organicMasses = stubArray(
      () => stubMassDocument({ type: DocumentType.ORGANIC }),
      { max: 3, min: 1 },
    );

    const massValidations = organicMasses.map((mass) =>
      stubMassValidationDocument({
        parentDocumentId: mass.id,
      }),
    );

    const certificate = stubCertificateDocument({
      externalEvents: massValidations.map((massValidation) =>
        stubDocumentEvent({
          relatedDocument: {
            category: DocumentCategory.METHODOLOGY,
            documentId: massValidation.id,
            subtype: massValidation.subtype,
            type: massValidation.type,
          },
        }),
      ),
    });

    spyOnDocumentQueryServiceLoad(stubDocument(), [
      certificate,
      ...massValidations,
      ...organicMasses,
    ]);

    const ruleOutputResult =
      await massDocumentTypeRuleProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultStatus: RuleOutputStatus.APPROVED,
    };

    expect(ruleOutputResult).toEqual(expectedRuleOutput);
  });

  it('should return rejected when one of the mass documents are not of type Organic', async () => {
    const ruleInput = random<Required<RuleInput>>();

    const organicMass = stubMassDocument();
    const notOrganicMass = stubMassDocument({
      type: 'NotOrganic',
    });

    spyOnDocumentQueryServiceLoad(stubDocument(), [
      organicMass,
      notOrganicMass,
    ]);

    const ruleOutputResult =
      await massDocumentTypeRuleProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment: massDocumentTypeRuleProcessor['ResultComment'].REJECTED,
      resultStatus: RuleOutputStatus.REJECTED,
    };

    expect(ruleOutputResult).toEqual(expectedRuleOutput);
  });
});
