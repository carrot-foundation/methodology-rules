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
  type MethodologyDocumentEventAttributeValue,
  MethodologyDocumentEventLabel,
} from '@carrot-fndn/shared/types';

import { WASTE_CLASSIFICATION_IDS } from './local-waste-classification.constants';
import { LocalWasteClassificationProcessorErrors } from './local-waste-classification.errors';

const { LOCAL_WASTE_CLASSIFICATION_DESC, LOCAL_WASTE_CLASSIFICATION_ID } =
  DocumentEventAttributeName;
const { ACTOR, PICK_UP } = DocumentEventName;
const { RECYCLER } = MethodologyDocumentEventLabel;

export const RESULT_COMMENTS = {
  CLASSIFICATION_DESCRIPTION_MISSING: `The "${LOCAL_WASTE_CLASSIFICATION_DESC}" was not provided.`,
  CLASSIFICATION_ID_MISSING: `The "${LOCAL_WASTE_CLASSIFICATION_ID}" was not provided.`,
  INVALID_CLASSIFICATION_DESCRIPTION: `The "${LOCAL_WASTE_CLASSIFICATION_DESC}" does not match the expected IBAMA code description.`,
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

  private isRejected(resultComment: string): EvaluateResultOutput {
    return {
      resultComment,
      resultStatus: RuleOutputStatus.REJECTED,
    };
  }

  protected override evaluateResult({
    description,
    id,
    recyclerCountryCode,
  }: Subject): EvaluateResultOutput | Promise<EvaluateResultOutput> {
    if (recyclerCountryCode !== 'BR') {
      return this.isRejected(
        RESULT_COMMENTS.UNSUPPORTED_COUNTRY(recyclerCountryCode),
      );
    }

    if (!isNonEmptyString(id)) {
      return this.isRejected(RESULT_COMMENTS.CLASSIFICATION_ID_MISSING);
    }

    if (!isNonEmptyString(description)) {
      return this.isRejected(
        RESULT_COMMENTS.CLASSIFICATION_DESCRIPTION_MISSING,
      );
    }

    const validClassificationIds = Object.keys(WASTE_CLASSIFICATION_IDS.BR);

    if (!validClassificationIds.includes(id)) {
      return this.isRejected(RESULT_COMMENTS.INVALID_CLASSIFICATION_ID);
    }

    const expectedDescription =
      WASTE_CLASSIFICATION_IDS.BR[
        id as keyof typeof WASTE_CLASSIFICATION_IDS.BR
      ].description;

    if (description !== expectedDescription) {
      return this.isRejected(
        RESULT_COMMENTS.INVALID_CLASSIFICATION_DESCRIPTION,
      );
    }

    return {
      resultComment: RESULT_COMMENTS.VALID_CLASSIFICATION,
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
        LOCAL_WASTE_CLASSIFICATION_DESC,
      ),
      id: getEventAttributeValue(pickUpEvent, LOCAL_WASTE_CLASSIFICATION_ID),
      recyclerCountryCode: getOrDefault(recyclerEvent?.address.countryCode, ''),
    };
  }
}
