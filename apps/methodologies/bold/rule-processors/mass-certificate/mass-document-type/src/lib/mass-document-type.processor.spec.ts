import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  stubDocument,
  stubDocumentEvent,
  stubMassAuditDocument,
  stubMassCertificateDocument,
  stubMassDocument,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentCategory,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
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

    const massAudits = organicMasses.map((mass) =>
      stubMassAuditDocument({
        parentDocumentId: mass.id,
      }),
    );

    const massCertificate = stubMassCertificateDocument({
      externalEvents: massAudits.map((massAudit) =>
        stubDocumentEvent({
          relatedDocument: {
            category: DocumentCategory.METHODOLOGY,
            documentId: massAudit.id,
            subtype: massAudit.subtype,
            type: massAudit.type,
          },
        }),
      ),
    });

    spyOnDocumentQueryServiceLoad(stubDocument(), [
      massCertificate,
      ...massAudits,
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
