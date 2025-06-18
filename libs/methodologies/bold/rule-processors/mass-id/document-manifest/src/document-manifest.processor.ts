import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import {
  getOrDefault,
  isNil,
  isNonEmptyArray,
  isNonEmptyString,
} from '@carrot-fndn/shared/helpers';
import {
  getDocumentEventAttachmentByLabel,
  getEventAttributeByName,
  getEventAttributeValue,
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
  DocumentEventAttributeName,
  DocumentEventName,
  ReportType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import {
  type MethodologyDocumentEventAttachment,
  type MethodologyDocumentEventAttribute,
  MethodologyDocumentEventAttributeFormat,
  type MethodologyDocumentEventAttributeValue,
  MethodologyDocumentEventLabel,
} from '@carrot-fndn/shared/types';

import { RESULT_COMMENTS } from './document-manifest.constants';

const { ACTOR, RECYCLING_MANIFEST, TRANSPORT_MANIFEST } = DocumentEventName;
const { DOCUMENT_NUMBER, DOCUMENT_TYPE, EXEMPTION_JUSTIFICATION, ISSUE_DATE } =
  DocumentEventAttributeName;
const { RECYCLER } = MethodologyDocumentEventLabel;
const { DATE } = MethodologyDocumentEventAttributeFormat;

export type DocumentManifestType =
  | typeof RECYCLING_MANIFEST
  | typeof TRANSPORT_MANIFEST;

interface DocumentManifestEventSubject {
  attachment: MethodologyDocumentEventAttachment | undefined;
  documentNumber: EventAttributeValueType;
  documentType: EventAttributeValueType;
  eventAddressId: string | undefined;
  eventValue: number | undefined;
  exemptionJustification: EventAttributeValueType;
  hasWrongLabelAttachment: boolean;
  issueDateAttribute: MethodologyDocumentEventAttribute | undefined;
  recyclerCountryCode: string | undefined;
}

type EventAttributeValueType =
  | MethodologyDocumentEventAttributeValue
  | string
  | undefined;

type RuleSubject = {
  documentManifestEvents: DocumentManifestEventSubject[];
  recyclerEvent: DocumentEvent | undefined;
};

interface ValidationResult {
  failMessages: string[];
  passMessage?: string;
}

const DOCUMENT_TYPE_MAPPING = {
  [RECYCLING_MANIFEST]: ReportType.CDF.toString(),
  [TRANSPORT_MANIFEST]: ReportType.MTR.toString(),
} as const;

export class DocumentManifestProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  private readonly documentManifestType: DocumentManifestType;

  constructor(documentManifestType: DocumentManifestType) {
    super();
    this.documentManifestType = documentManifestType;
  }

  protected override evaluateResult(
    ruleSubject: RuleSubject,
  ): EvaluateResultOutput | Promise<EvaluateResultOutput> {
    if (!isNonEmptyArray(ruleSubject.documentManifestEvents)) {
      return {
        resultComment: RESULT_COMMENTS.MISSING_EVENT,
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    if (isNil(ruleSubject.recyclerEvent)) {
      return {
        resultComment: RESULT_COMMENTS.MISSING_RECYCLER_EVENT,
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    const validationResults = ruleSubject.documentManifestEvents.map(
      (subject) =>
        this.validateDocumentManifestEvents(
          subject,
          ruleSubject.recyclerEvent as DocumentEvent,
        ),
    );
    const allFailMessages = validationResults.flatMap((v) => v.failMessages);
    const passMessages = validationResults
      .map((v) => v.passMessage)
      .filter(Boolean) as string[];

    if (allFailMessages.length > 0) {
      return {
        resultComment: allFailMessages.join(' '),
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    return {
      resultComment: passMessages.join(' '),
      resultStatus: RuleOutputStatus.PASSED,
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
        transportManifestEvents?.map((event) => {
          const correctLabelAttachment = getDocumentEventAttachmentByLabel(
            event,
            this.documentManifestType,
          );

          const hasWrongLabelAttachment =
            !correctLabelAttachment && isNonEmptyArray(event.attachments);

          return {
            attachment: correctLabelAttachment,
            documentNumber: getEventAttributeValue(event, DOCUMENT_NUMBER),
            documentType: getEventAttributeValue(event, DOCUMENT_TYPE),
            eventAddressId: event.address.id,
            eventValue: event.value,
            exemptionJustification: getEventAttributeValue(
              event,
              EXEMPTION_JUSTIFICATION,
            ),
            hasWrongLabelAttachment,
            issueDateAttribute: getEventAttributeByName(event, ISSUE_DATE),
            recyclerCountryCode: recyclerEvent?.address.countryCode,
          };
        }),
        [],
      ),
      recyclerEvent,
    };
  }

  private validateDocumentAttributes(
    documentType: EventAttributeValueType,
    documentNumber: EventAttributeValueType,
    recyclerCountryCode: string | undefined,
  ): ValidationResult {
    const failMessages: string[] = [];

    const documentTypeString = documentType?.toString();
    const documentNumberString = documentNumber?.toString();

    if (!isNonEmptyString(documentTypeString)) {
      failMessages.push(RESULT_COMMENTS.MISSING_DOCUMENT_TYPE);
    }

    if (
      isNonEmptyString(documentTypeString) &&
      recyclerCountryCode === 'BR' &&
      documentTypeString !== DOCUMENT_TYPE_MAPPING[this.documentManifestType]
    ) {
      failMessages.push(
        RESULT_COMMENTS.INVALID_BR_DOCUMENT_TYPE(documentTypeString),
      );
    }

    if (!isNonEmptyString(documentNumberString)) {
      failMessages.push(RESULT_COMMENTS.MISSING_DOCUMENT_NUMBER);
    }

    return { failMessages };
  }

  private validateDocumentManifestEvents(
    subject: DocumentManifestEventSubject,
    recyclerEvent: DocumentEvent,
  ): ValidationResult {
    const {
      attachment,
      documentNumber,
      documentType,
      eventAddressId,
      eventValue,
      exemptionJustification,
      hasWrongLabelAttachment,
      issueDateAttribute,
      recyclerCountryCode,
    } = subject;

    if (
      eventAddressId !== recyclerEvent.address.id &&
      this.documentManifestType === RECYCLING_MANIFEST
    ) {
      return {
        failMessages: [RESULT_COMMENTS.ADDRESS_MISMATCH],
      };
    }

    const exemptionResult = this.validateExemptionAndAttachment(
      attachment,
      exemptionJustification,
      hasWrongLabelAttachment,
    );

    if (exemptionResult.passMessage) {
      return exemptionResult;
    }

    if (exemptionResult.failMessages.length > 0) {
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

    const failMessages = validations.flatMap((v) => v.failMessages);

    if (failMessages.length > 0) {
      return { failMessages };
    }

    return {
      failMessages: [],
      passMessage: RESULT_COMMENTS.VALID_ATTACHMENT_DECLARATION({
        documentNumber: documentNumber as string,
        documentType: documentType as string,
        issueDate: issueDateAttribute?.value as string,
        value: getOrDefault(eventValue, 0),
      }),
    };
  }

  private validateEventValue(eventValue: number | undefined): ValidationResult {
    if (eventValue === 0) {
      return {
        failMessages: [
          RESULT_COMMENTS.INVALID_EVENT_VALUE(eventValue.toString()),
        ],
      };
    }

    return { failMessages: [] };
  }

  private validateExemptionAndAttachment(
    attachment: MethodologyDocumentEventAttachment | undefined,
    exemptionJustification: EventAttributeValueType,
    hasWrongLabelAttachment: boolean,
  ): ValidationResult {
    const justificationString = exemptionJustification?.toString();

    if (hasWrongLabelAttachment) {
      return {
        failMessages: [RESULT_COMMENTS.INCORRECT_ATTACHMENT_LABEL],
      };
    }

    if (isNil(attachment) && isNonEmptyString(justificationString)) {
      return {
        failMessages: [],
        passMessage: RESULT_COMMENTS.PROVIDE_EXEMPTION_JUSTIFICATION,
      };
    }

    if (isNil(attachment) && !isNonEmptyString(justificationString)) {
      return {
        failMessages: [RESULT_COMMENTS.MISSING_ATTRIBUTES],
      };
    }

    if (isNonEmptyString(justificationString) && !isNil(attachment)) {
      return {
        failMessages: [RESULT_COMMENTS.ATTACHMENT_AND_JUSTIFICATION_PROVIDED],
      };
    }

    return { failMessages: [] };
  }

  private validateIssueDate(
    issueDateAttribute: MethodologyDocumentEventAttribute | undefined,
  ): ValidationResult {
    const failMessages: string[] = [];

    if (!isNonEmptyString(issueDateAttribute?.name)) {
      failMessages.push(RESULT_COMMENTS.MISSING_ISSUE_DATE);
    } else if (issueDateAttribute.format !== DATE) {
      failMessages.push(
        RESULT_COMMENTS.INVALID_ISSUE_DATE_FORMAT(
          issueDateAttribute.format as string,
        ),
      );
    }

    return { failMessages };
  }
}
