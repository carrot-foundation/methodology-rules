import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import {
  getOrDefault,
  isNil,
  isNonEmptyArray,
  isNonEmptyString,
} from '@carrot-fndn/shared/helpers';
import {
  getEventAttributeByName,
  getEventAttributeValue,
  getFirstDocumentEventAttachment,
} from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  and,
  eventLabelIsAnyOf,
  eventNameIsAnyOf,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttachmentLabel,
  DocumentEventName,
  NewDocumentEventAttributeName,
  ReportType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import {
  type MethodologyDocumentEventAttribute,
  MethodologyDocumentEventAttributeFormat,
  type MethodologyDocumentEventAttributeValue,
  MethodologyDocumentEventLabel,
} from '@carrot-fndn/shared/types';
import { is } from 'typia';

import { RESULT_COMMENTS } from './document-manifest.constants';

const { ACTOR, RECYCLING_MANIFEST, TRANSPORT_MANIFEST } = DocumentEventName;
const { DOCUMENT_NUMBER, DOCUMENT_TYPE, EXEMPTION_JUSTIFICATION, ISSUE_DATE } =
  NewDocumentEventAttributeName;
const { RECYCLER } = MethodologyDocumentEventLabel;
const { DATE } = MethodologyDocumentEventAttributeFormat;

interface ValidationResult {
  approvedMessages: string[];
  rejectedMessages: string[];
}

interface DocumentManifestEventSubject {
  attachmentLabel: DocumentEventAttachmentLabel | string | undefined;
  documentNumber: MethodologyDocumentEventAttributeValue | string | undefined;
  documentType: MethodologyDocumentEventAttributeValue | string | undefined;
  eventAddressId: string | undefined;
  eventValue: number | undefined;
  exemptionJustification:
    | MethodologyDocumentEventAttributeValue
    | string
    | undefined;
  issueDateAttribute: MethodologyDocumentEventAttribute | undefined;
  recyclerCountryCode: string | undefined;
}

type RuleSubject = {
  documentManifestEvents: DocumentManifestEventSubject[];
  recyclerEvent: DocumentEvent | undefined;
};

export type DocumentManifestType =
  | typeof RECYCLING_MANIFEST
  | typeof TRANSPORT_MANIFEST;

export class DocumentManifestProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  private readonly documentManifestType: DocumentManifestType;

  constructor(documentManifestType: DocumentManifestType) {
    super();
    this.documentManifestType = documentManifestType;
  }

  private validateDocumentAttributes(
    documentType: MethodologyDocumentEventAttributeValue | string | undefined,
    documentNumber: MethodologyDocumentEventAttributeValue | string | undefined,
    recyclerCountryCode: string | undefined,
  ): ValidationResult {
    const rejectedMessages: string[] = [];

    const typeString = documentType?.toString();
    const numberString = documentNumber?.toString();

    if (!isNonEmptyString(typeString)) {
      rejectedMessages.push(RESULT_COMMENTS.MISSING_DOCUMENT_TYPE);
    }

    if (
      isNonEmptyString(typeString) &&
      typeString !== ReportType.MTR.toString() &&
      recyclerCountryCode !== 'BR'
    ) {
      rejectedMessages.push(
        RESULT_COMMENTS.INVALID_BR_DOCUMENT_TYPE(typeString),
      );
    }

    if (!isNonEmptyString(numberString)) {
      rejectedMessages.push(RESULT_COMMENTS.MISSING_DOCUMENT_NUMBER);
    }

    return { approvedMessages: [], rejectedMessages };
  }

  private validateDocumentManifestEvents(
    subject: DocumentManifestEventSubject,
    recyclerEvent: DocumentEvent,
  ): ValidationResult {
    const {
      attachmentLabel,
      documentNumber,
      documentType,
      eventAddressId,
      eventValue,
      exemptionJustification,
      issueDateAttribute,
      recyclerCountryCode,
    } = subject;

    if (
      eventAddressId !== recyclerEvent.address.id &&
      this.documentManifestType === RECYCLING_MANIFEST
    ) {
      return {
        approvedMessages: [],
        rejectedMessages: [RESULT_COMMENTS.ADDRESS_MISMATCH],
      };
    }

    const exemptionResult = this.validateExemptionAndAttachment(
      attachmentLabel,
      exemptionJustification,
    );

    if (exemptionResult.approvedMessages.length > 0) {
      return exemptionResult;
    }

    if (exemptionResult.rejectedMessages.length > 0) {
      return exemptionResult;
    }

    const validations = [
      exemptionResult,
      this.validateDocumentAttributes(
        documentType,
        documentNumber,
        recyclerCountryCode,
      ),
      this.validateIssueDate(issueDateAttribute),
      this.validateEventValue(eventValue),
    ];

    const rejectedMessages = validations.flatMap((v) => v.rejectedMessages);

    if (rejectedMessages.length > 0) {
      return { approvedMessages: [], rejectedMessages };
    }

    return {
      approvedMessages: [
        RESULT_COMMENTS.VALID_ATTACHMENT_DECLARATION({
          documentNumber: documentNumber as string,
          documentType: documentType as string,
          issueDate: issueDateAttribute?.value as string,
          value: getOrDefault(eventValue, 0),
        }),
      ],
      rejectedMessages: [],
    };
  }

  private validateEventValue(eventValue: number | undefined): ValidationResult {
    if (eventValue === 0) {
      return {
        approvedMessages: [],
        rejectedMessages: [
          RESULT_COMMENTS.INVALID_EVENT_VALUE(eventValue.toString()),
        ],
      };
    }

    return { approvedMessages: [], rejectedMessages: [] };
  }

  private validateExemptionAndAttachment(
    attachmentLabel: string | undefined,
    exemptionJustification:
      | MethodologyDocumentEventAttributeValue
      | string
      | undefined,
  ): ValidationResult {
    const justificationString = exemptionJustification?.toString();

    if (
      !isNonEmptyString(attachmentLabel) &&
      isNonEmptyString(justificationString)
    ) {
      return {
        approvedMessages: [RESULT_COMMENTS.PROVIDE_EXEMPTION_JUSTIFICATION],
        rejectedMessages: [],
      };
    }

    if (
      !isNonEmptyString(justificationString) &&
      !isNonEmptyString(attachmentLabel)
    ) {
      return {
        approvedMessages: [],
        rejectedMessages: [RESULT_COMMENTS.MISSING_ATTRIBUTES],
      };
    }

    if (
      isNonEmptyString(justificationString) &&
      is<DocumentEventAttachmentLabel>(attachmentLabel)
    ) {
      return {
        approvedMessages: [],
        rejectedMessages: [
          RESULT_COMMENTS.ATTACHMENT_AND_JUSTIFICATION_PROVIDED,
        ],
      };
    }

    if (!is<DocumentEventAttachmentLabel>(attachmentLabel)) {
      return {
        approvedMessages: [],
        rejectedMessages: [
          RESULT_COMMENTS.INCORRECT_ATTACHMENT_LABEL(
            getOrDefault(attachmentLabel, 'undefined'),
          ),
        ],
      };
    }

    return { approvedMessages: [], rejectedMessages: [] };
  }

  private validateIssueDate(
    issueDateAttribute: MethodologyDocumentEventAttribute | undefined,
  ): ValidationResult {
    const rejectedMessages: string[] = [];

    if (!isNonEmptyString(issueDateAttribute?.name)) {
      rejectedMessages.push(RESULT_COMMENTS.MISSING_ISSUE_DATE);
    } else if (issueDateAttribute.format !== DATE) {
      rejectedMessages.push(
        RESULT_COMMENTS.INVALID_ISSUE_DATE_FORMAT(
          issueDateAttribute.format as string,
        ),
      );
    }

    return { approvedMessages: [], rejectedMessages };
  }

  protected override evaluateResult(
    ruleSubject: RuleSubject,
  ): EvaluateResultOutput | Promise<EvaluateResultOutput> {
    if (!isNonEmptyArray(ruleSubject.documentManifestEvents)) {
      return {
        resultComment: RESULT_COMMENTS.MISSING_EVENT,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    if (isNil(ruleSubject.recyclerEvent)) {
      return {
        resultComment: RESULT_COMMENTS.MISSING_RECYCLER_EVENT,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    const validationResults = ruleSubject.documentManifestEvents.map(
      (subject) =>
        this.validateDocumentManifestEvents(
          subject,
          ruleSubject.recyclerEvent as DocumentEvent,
        ),
    );
    const allRejectedMessages = validationResults.flatMap(
      (v) => v.rejectedMessages,
    );
    const allApprovedMessages = validationResults.flatMap(
      (v) => v.approvedMessages,
    );

    if (allRejectedMessages.length > 0) {
      return {
        resultComment: allRejectedMessages.join(' '),
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    return {
      resultComment: allApprovedMessages.join(' '),
      resultStatus: RuleOutputStatus.APPROVED,
    };
  }

  protected override getRuleSubject(document: Document): RuleSubject {
    const transportManifestEvents = document.externalEvents?.filter(
      eventNameIsAnyOf([this.documentManifestType]),
    );
    const recyclerEvent = document.externalEvents?.find(
      and(eventNameIsAnyOf([ACTOR]), eventLabelIsAnyOf([RECYCLER])),
    );

    return {
      documentManifestEvents: getOrDefault(
        transportManifestEvents?.map((event) => ({
          attachmentLabel: getFirstDocumentEventAttachment(event)?.label,
          documentNumber: getEventAttributeValue(event, DOCUMENT_NUMBER),
          documentType: getEventAttributeValue(event, DOCUMENT_TYPE),
          eventAddressId: event.address.id,
          eventValue: event.value,
          exemptionJustification: getEventAttributeValue(
            event,
            EXEMPTION_JUSTIFICATION,
          ),
          issueDateAttribute: getEventAttributeByName(event, ISSUE_DATE),
          recyclerCountryCode: recyclerEvent?.address.countryCode,
        })),
        [],
      ),
      recyclerEvent,
    };
  }
}
