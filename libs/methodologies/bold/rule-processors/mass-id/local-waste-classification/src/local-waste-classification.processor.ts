import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { getOrDefault, isNonEmptyString } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  and,
  eventLabelIsAnyOf,
  eventNameIsAnyOf,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import {
  type AnyObject,
  type MethodologyDocumentEventAttributeValue,
  MethodologyDocumentEventLabel,
} from '@carrot-fndn/shared/types';

import { WASTE_CLASSIFICATION_CODES } from './local-waste-classification.constants';
import { LocalWasteClassificationProcessorErrors } from './local-waste-classification.errors';

const {
  LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
  LOCAL_WASTE_CLASSIFICATION_ID,
} = DocumentEventAttributeName;
const { ACTOR, PICK_UP } = DocumentEventName;
const { RECYCLER } = MethodologyDocumentEventLabel;

export const RESULT_COMMENTS = {
  CLASSIFICATION_DESCRIPTION_MISSING: `The "${LOCAL_WASTE_CLASSIFICATION_DESCRIPTION}" was not provided.`,
  CLASSIFICATION_ID_MISSING: `The "${LOCAL_WASTE_CLASSIFICATION_ID}" was not provided.`,
  INVALID_CLASSIFICATION_DESCRIPTION: `The "${LOCAL_WASTE_CLASSIFICATION_DESCRIPTION}" does not match the expected IBAMA code description.`,
  INVALID_CLASSIFICATION_ID: `The "${LOCAL_WASTE_CLASSIFICATION_ID}" does not match any IBAMA code.`,
  UNSUPPORTED_COUNTRY: (recyclerCountryCode: string) =>
    `Local waste classification is only validated for recyclers in Brazil, but the recycler country is ${recyclerCountryCode}.`,
  VALID_CLASSIFICATION:
    'The local waste classification ID and description match an IBAMA code.',
} as const;

type Subject = {
  description: MethodologyDocumentEventAttributeValue | string | undefined;
  id: MethodologyDocumentEventAttributeValue | string | undefined;
  recyclerCountryCode: string;
};

export class LocalWasteClassificationProcessor extends ParentDocumentRuleProcessor<Subject> {
  protected readonly processorErrors =
    new LocalWasteClassificationProcessorErrors();

  private isRejected(
    resultComment: string,
    resultContent?: AnyObject,
  ): EvaluateResultOutput {
    return {
      resultComment,
      ...(resultContent && { resultContent }),
      resultStatus: RuleOutputStatus.REJECTED,
    };
  }

  protected override evaluateResult(
    subject: Subject,
  ): EvaluateResultOutput | Promise<EvaluateResultOutput> {
    const { description, id, recyclerCountryCode } = subject;

    if (recyclerCountryCode !== 'BR') {
      return this.isRejected(
        RESULT_COMMENTS.UNSUPPORTED_COUNTRY(recyclerCountryCode),
        subject,
      );
    }

    if (!isNonEmptyString(id)) {
      return this.isRejected(
        RESULT_COMMENTS.CLASSIFICATION_ID_MISSING,
        subject,
      );
    }

    if (!isNonEmptyString(description)) {
      return this.isRejected(
        RESULT_COMMENTS.CLASSIFICATION_DESCRIPTION_MISSING,
        subject,
      );
    }

    const validClassificationIds = Object.keys(WASTE_CLASSIFICATION_CODES.BR);

    const normalizedId = validClassificationIds.find(
      (validId) => validId.replaceAll(/\s+/g, '') === id.replaceAll(/\s+/g, ''),
    );

    if (!normalizedId) {
      return this.isRejected(
        RESULT_COMMENTS.INVALID_CLASSIFICATION_ID,
        subject,
      );
    }

    const expectedDescription =
      WASTE_CLASSIFICATION_CODES.BR[
        normalizedId as keyof typeof WASTE_CLASSIFICATION_CODES.BR
      ].description;

    if (description.trim() !== expectedDescription.trim()) {
      return this.isRejected(
        RESULT_COMMENTS.INVALID_CLASSIFICATION_DESCRIPTION,
        subject,
      );
    }

    return {
      resultComment: RESULT_COMMENTS.VALID_CLASSIFICATION,
      resultContent: subject,
      resultStatus: RuleOutputStatus.APPROVED,
    };
  }

  protected override getRuleSubject(document: Document): Subject | undefined {
    const pickUpEvent = document.externalEvents?.find(
      eventNameIsAnyOf([PICK_UP]),
    );
    const recyclerEvent = document.externalEvents?.find(
      and(eventNameIsAnyOf([ACTOR]), eventLabelIsAnyOf([RECYCLER])),
    );

    return {
      description: getEventAttributeValue(
        pickUpEvent,
        LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
      ),
      id: getEventAttributeValue(pickUpEvent, LOCAL_WASTE_CLASSIFICATION_ID),
      recyclerCountryCode: getOrDefault(recyclerEvent?.address.countryCode, ''),
    };
  }
}
