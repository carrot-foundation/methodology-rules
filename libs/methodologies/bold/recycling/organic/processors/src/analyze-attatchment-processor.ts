import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';
import type {
  NonEmptyString,
  NormalizedTextractBlock,
} from '@carrot-fndn/shared/types';

import {
  DetectDocumentTextCommand,
  TextractClient,
} from '@aws-sdk/client-textract';
import { fromEnv } from '@aws-sdk/credential-providers';
import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import {
  isNil,
  normalizeTextractBlocksResponse,
} from '@carrot-fndn/shared/helpers';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type RuleSubject = NormalizedTextractBlock[];

export abstract class AnalyzeAttatchmentProcessor extends RuleDataProcessor {
  private requiredPhrases: NonEmptyString[] = [];

  constructor(requiredPhrases?: NonEmptyString[]) {
    super();
    if (requiredPhrases) this.requiredPhrases = requiredPhrases;
  }

  private evaluateResult(
    ruleSubject: RuleSubject | undefined,
  ): EvaluateResultOutput {
    console.log(JSON.stringify(ruleSubject));
    const evaluationResult: EvaluateResultOutput = {
      resultComment: 'Document is valid',
      resultStatus: RuleOutputStatus.APPROVED,
    };

    if (isNil(ruleSubject)) {
      return {
        resultComment: 'No document found',
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    const hasRequiredFields = this.hasRequiredFields(ruleSubject);

    if (!hasRequiredFields) {
      evaluationResult.resultComment =
        'No required fields found in the document';
      evaluationResult.resultStatus = RuleOutputStatus.REJECTED;
    }

    console.log(JSON.stringify(evaluationResult, null, 2));

    return evaluationResult;
  }

  private hasRequiredFields(records: NormalizedTextractBlock[]): boolean {
    return this.requiredPhrases.every((phrase) =>
      records.some((record) => record.text.includes(phrase)),
    );
  }

  protected async getRuleSubject(): Promise<RuleSubject | undefined> {
    try {
      // TODO: create a textract service lib
      const textractClient = new TextractClient({
        credentials: fromEnv(),
      });

      const path = join(
        __dirname,
        'attatchment',
        // 'boarding-pass.pdf',
        'etJsKihS2eJx_OsSZPSk6-MTR.pdf',
        // '7gohEV7HdK6ZY5LtbKPbp-MTR.pdf',
        // 'eEv93CwlDNumDMyZ6z8oT-MTR.pdf',
      );

      console.log(path);

      const fileBytes = readFileSync(path);

      const command = new DetectDocumentTextCommand({
        Document: {
          Bytes: fileBytes,
        },
      });

      const response = await textractClient.send(command);

      if (!response.Blocks) {
        throw new Error('No text blocks found in the document');
      }

      return normalizeTextractBlocksResponse(response.Blocks);
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    const ruleSubject = await this.getRuleSubject();

    const { resultComment, resultStatus } = this.evaluateResult(ruleSubject);

    return mapToRuleOutput(
      ruleInput,
      resultStatus,
      resultComment ? { resultComment } : undefined,
    );
  }
}
