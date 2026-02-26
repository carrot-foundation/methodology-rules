import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import {
  getOrDefault,
  isNameMatch,
  isNonEmptyString,
  normalizeString,
} from '@carrot-fndn/shared/helpers';
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
import { WASTE_CLASSIFICATION_CODES } from '@carrot-fndn/shared/methodologies/bold/utils';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import {
  type AnyObject,
  type MethodologyDocumentEventAttributeValue,
  MethodologyDocumentEventLabel,
} from '@carrot-fndn/shared/types';

import { RegionalWasteClassificationProcessorErrors } from './regional-waste-classification.errors';
import { getCdmCodeFromSubtype } from './regional-waste-classification.helpers';

const DESCRIPTION_SIMILARITY_THRESHOLD = 0.9;

const {
  LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
  LOCAL_WASTE_CLASSIFICATION_ID,
} = DocumentEventAttributeName;
const { ACTOR, PICK_UP } = DocumentEventName;
const { RECYCLER } = MethodologyDocumentEventLabel;

export const RESULT_COMMENTS = {
  CLASSIFICATION_DESCRIPTION_MISSING: `The "${LOCAL_WASTE_CLASSIFICATION_DESCRIPTION}" was not provided.`,
  CLASSIFICATION_ID_MISSING: `The "${LOCAL_WASTE_CLASSIFICATION_ID}" was not provided.`,
  INVALID_CLASSIFICATION_DESCRIPTION: `The "${LOCAL_WASTE_CLASSIFICATION_DESCRIPTION}" does not match the expected local waste classification code description.`,
  INVALID_CLASSIFICATION_ID: `The "${LOCAL_WASTE_CLASSIFICATION_ID}" does not match the local waste classification code accepted by the methodology.`,
  INVALID_SUBTYPE_CDM_CODE_MISMATCH: `The subtype does not match the CDM code for the provided "${LOCAL_WASTE_CLASSIFICATION_ID}".`,
  INVALID_SUBTYPE_MAPPING: `The provided subtype does not map to a valid CDM code.`,
  UNSUPPORTED_COUNTRY: (recyclerCountryCode: string) =>
    `Local waste classification is only validated for recyclers in Brazil, but the recycler country is ${recyclerCountryCode}.`,
  VALID_CLASSIFICATION: `The local waste classification "${LOCAL_WASTE_CLASSIFICATION_ID}" and "${LOCAL_WASTE_CLASSIFICATION_DESCRIPTION}" match an Ibama code.`,
} as const;

type Subject = {
  description: MethodologyDocumentEventAttributeValue | string | undefined;
  id: MethodologyDocumentEventAttributeValue | string | undefined;
  recyclerCountryCode: string;
  subtype: string;
};

export class RegionalWasteClassificationProcessor extends ParentDocumentRuleProcessor<Subject> {
  protected readonly processorErrors =
    new RegionalWasteClassificationProcessorErrors();

  protected override evaluateResult(
    subject: Subject,
  ): EvaluateResultOutput | Promise<EvaluateResultOutput> {
    const { description, id, recyclerCountryCode, subtype } = subject;

    if (recyclerCountryCode !== 'BR') {
      return this.isFailed(
        RESULT_COMMENTS.UNSUPPORTED_COUNTRY(recyclerCountryCode),
        subject,
      );
    }

    if (!isNonEmptyString(id)) {
      return this.isFailed(RESULT_COMMENTS.CLASSIFICATION_ID_MISSING, subject);
    }

    if (!isNonEmptyString(description)) {
      return this.isFailed(
        RESULT_COMMENTS.CLASSIFICATION_DESCRIPTION_MISSING,
        subject,
      );
    }

    const validClassificationIds = Object.keys(WASTE_CLASSIFICATION_CODES.BR);

    const normalizedId = validClassificationIds.find(
      (validId) => normalizeString(validId) === normalizeString(id),
    );

    if (!normalizedId) {
      return this.isFailed(RESULT_COMMENTS.INVALID_CLASSIFICATION_ID, subject);
    }

    const expectedCdmCode = getCdmCodeFromSubtype(subtype);

    if (!expectedCdmCode) {
      return this.isFailed(RESULT_COMMENTS.INVALID_SUBTYPE_MAPPING, subject);
    }

    const classificationEntry =
      WASTE_CLASSIFICATION_CODES.BR[
        normalizedId as keyof typeof WASTE_CLASSIFICATION_CODES.BR
      ];

    if (classificationEntry.CDM_CODE !== expectedCdmCode) {
      return this.isFailed(
        RESULT_COMMENTS.INVALID_SUBTYPE_CDM_CODE_MISMATCH,
        subject,
      );
    }

    const expectedDescription = classificationEntry.description;

    const { isMatch } = isNameMatch(
      description,
      expectedDescription,
      DESCRIPTION_SIMILARITY_THRESHOLD,
    );

    if (!isMatch) {
      return this.isFailed(
        RESULT_COMMENTS.INVALID_CLASSIFICATION_DESCRIPTION,
        subject,
      );
    }

    return {
      resultComment: RESULT_COMMENTS.VALID_CLASSIFICATION,
      resultContent: subject,
      resultStatus: RuleOutputStatus.PASSED,
    };
  }

  protected override getRuleSubject(document: Document): Subject | undefined {
    const pickUpEvent = document.externalEvents?.find(
      eventNameIsAnyOf([PICK_UP]),
    );
    const recyclerEvent = document.externalEvents?.find(
      and(eventNameIsAnyOf([ACTOR]), eventLabelIsAnyOf([RECYCLER])),
    );

    if (!document.subtype) {
      return undefined;
    }

    return {
      description: getEventAttributeValue(
        pickUpEvent,
        LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
      ),
      id: getEventAttributeValue(pickUpEvent, LOCAL_WASTE_CLASSIFICATION_ID),
      recyclerCountryCode: getOrDefault(recyclerEvent?.address.countryCode, ''),
      subtype: document.subtype,
    };
  }

  private isFailed(
    resultComment: string,
    resultContent?: AnyObject,
  ): EvaluateResultOutput {
    return {
      resultComment,
      ...(resultContent && { resultContent }),
      resultStatus: RuleOutputStatus.FAILED,
    };
  }
}
