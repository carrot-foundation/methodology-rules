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
import {
  type MethodologyDocumentEventAttachment,
  type MethodologyDocumentEventAttribute,
  MethodologyDocumentEventAttributeFormat,
  MethodologyDocumentEventLabel,
} from '@carrot-fndn/shared/types';

import { RESULT_COMMENTS } from './document-manifest-data.constants';
import { crossValidateWithTextract } from './document-manifest-data.extractor';
import {
  type AttachmentInfo,
  type DocumentManifestEventSubject,
  type EventAttributeValueType,
  getAttachmentInfos,
  type ValidationResult,
} from './document-manifest-data.helpers';

export type DocumentManifestType =
  | (typeof DocumentEventName)['Recycling Manifest']
  | (typeof DocumentEventName)['Transport Manifest'];

const VALID_MANIFEST_TYPES: ReadonlySet<string> = new Set<string>([
  DocumentEventName['Recycling Manifest'],
  DocumentEventName['Transport Manifest'],
]);

type RuleSubject = {
  attachmentInfos: AttachmentInfo[];
  document: Document;
  documentManifestEvents: DocumentManifestEventSubject[];
  dropOffEvent: DocumentEvent | undefined;
  haulerEvent: DocumentEvent | undefined;
  mtrEventDocumentNumbers: string[];
  pickUpEvent: DocumentEvent | undefined;
  recyclerEvent: DocumentEvent | undefined;
  wasteGeneratorEvent: DocumentEvent | undefined;
  weighingEvents: DocumentEvent[];
};

const DOCUMENT_TYPE_MAPPING = {
  [DocumentEventName['Recycling Manifest']]: ReportType.CDF.toString(),
  [DocumentEventName['Transport Manifest']]: ReportType.MTR.toString(),
} as const;

export class DocumentManifestDataProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  private readonly documentManifestType: DocumentManifestType;

  constructor({
    documentManifestType,
  }: {
    documentManifestType: DocumentManifestType;
  }) {
    super();

    if (!VALID_MANIFEST_TYPES.has(documentManifestType)) {
      const accepted = [...VALID_MANIFEST_TYPES].join(', ');

      throw new Error(
        `Invalid documentManifestType "${String(documentManifestType)}". Accepted values: ${accepted}`,
      );
    }

    this.documentManifestType = documentManifestType;
  }

  protected override async evaluateResult(
    ruleSubject: RuleSubject,
  ): Promise<EvaluateResultOutput> {
    if (!isNonEmptyArray(ruleSubject.documentManifestEvents)) {
      return {
        resultComment: RESULT_COMMENTS.MISSING_EVENT(this.documentManifestType),
        resultStatus: 'FAILED',
      };
    }

    if (isNil(ruleSubject.recyclerEvent)) {
      return {
        resultComment: RESULT_COMMENTS.MISSING_RECYCLER_EVENT,
        resultStatus: 'FAILED',
      };
    }

    const validationResults = ruleSubject.documentManifestEvents.map(
      (subject) =>
        this.validateDocumentManifestEvents(
          subject,
          ruleSubject.recyclerEvent as DocumentEvent,
          ruleSubject.document.currentValue,
        ),
    );
    const allFailMessages = validationResults.flatMap((v) => v.failMessages);
    const passMessages = validationResults
      .map((v) => v.passMessage)
      .filter(Boolean) as string[];

    if (allFailMessages.length > 0) {
      return {
        resultComment: allFailMessages.join(' '),
        resultStatus: 'FAILED',
      };
    }

    const crossValidationResult = await crossValidateWithTextract({
      attachmentInfos: ruleSubject.attachmentInfos,
      documentManifestEvents: ruleSubject.documentManifestEvents,
      dropOffEvent: ruleSubject.dropOffEvent,
      haulerEvent: ruleSubject.haulerEvent,
      mtrEventDocumentNumbers: ruleSubject.mtrEventDocumentNumbers,
      pickUpEvent: ruleSubject.pickUpEvent,
      recyclerEvent: ruleSubject.recyclerEvent,
      wasteGeneratorEvent: ruleSubject.wasteGeneratorEvent,
      weighingEvents: ruleSubject.weighingEvents,
    });

    const { extractionMetadata } = crossValidationResult;

    if (crossValidationResult.failMessages.length > 0) {
      const { reviewReasons } = crossValidationResult;

      return {
        resultComment:
          reviewReasons.length > 0
            ? `${crossValidationResult.failMessages.join(' ')} Review required: ${reviewReasons.map((r) => r.description).join('; ')}`
            : crossValidationResult.failMessages.join(' '),
        resultContent: {
          crossValidation: crossValidationResult.crossValidation,
          extractionMetadata,
          failReasons: crossValidationResult.failReasons,
          ...(reviewReasons.length > 0 && { reviewReasons }),
        },
        resultStatus: 'FAILED',
      };
    }

    const resultComment =
      crossValidationResult.passMessages.length > 0
        ? crossValidationResult.passMessages.join(' ')
        : passMessages.join(' ');

    if (crossValidationResult.reviewRequired) {
      return {
        resultComment: `${resultComment} Review required: ${crossValidationResult.reviewReasons.map((r) => r.description).join('; ')}`,
        resultContent: {
          crossValidation: crossValidationResult.crossValidation,
          extractionMetadata,
          reviewReasons: crossValidationResult.reviewReasons,
        },
        resultStatus: 'REVIEW_REQUIRED',
      };
    }

    return {
      resultComment,
      resultContent: {
        crossValidation: crossValidationResult.crossValidation,
        extractionMetadata,
      },
      resultStatus: 'PASSED',
    };
  }

  protected override getRuleSubject(document: Document): RuleSubject {
    const transportManifestEvents = document.externalEvents?.filter(
      eventNameIsAnyOf([this.documentManifestType]),
    );
    const recyclerEvent = document.externalEvents?.find(
      and(
        eventNameIsAnyOf([DocumentEventName.ACTOR]),
        eventLabelIsAnyOf([MethodologyDocumentEventLabel.Recycler]),
      ),
    );
    const wasteGeneratorEvent = document.externalEvents?.find(
      and(
        eventNameIsAnyOf([DocumentEventName.ACTOR]),
        eventLabelIsAnyOf([MethodologyDocumentEventLabel['Waste Generator']]),
      ),
    );
    const haulerEvent = document.externalEvents?.find(
      and(
        eventNameIsAnyOf([DocumentEventName.ACTOR]),
        eventLabelIsAnyOf([MethodologyDocumentEventLabel.Hauler]),
      ),
    );
    const pickUpEvent = document.externalEvents?.find(
      eventNameIsAnyOf([DocumentEventName['Pick-up']]),
    );
    const dropOffEvent = document.externalEvents?.find(
      eventNameIsAnyOf([DocumentEventName['Drop-off']]),
    );
    const weighingEvents = getOrDefault(
      document.externalEvents?.filter(
        eventNameIsAnyOf([DocumentEventName.Weighing]),
      ),
      [],
    );

    const documentManifestEvents = getOrDefault(
      transportManifestEvents?.map((event) => {
        const correctLabelAttachment = getDocumentEventAttachmentByLabel(
          event,
          this.documentManifestType,
        );

        const hasWrongLabelAttachment =
          !correctLabelAttachment && isNonEmptyArray(event.attachments);

        return {
          attachment: correctLabelAttachment,
          documentNumber: getEventAttributeValue(
            event,
            DocumentEventAttributeName['Document Number'],
          ),
          documentType: getEventAttributeValue(
            event,
            DocumentEventAttributeName['Document Type'],
          ),
          eventAddressId: event.address.id,
          eventValue: event.value,
          exemptionJustification: getEventAttributeValue(
            event,
            DocumentEventAttributeName['Exemption Justification'],
          ),
          hasWrongLabelAttachment,
          issueDateAttribute: getEventAttributeByName(
            event,
            DocumentEventAttributeName['Issue Date'],
          ),
          recyclerCountryCode: recyclerEvent?.address.countryCode,
        };
      }),
      [],
    );

    const mtrEventDocumentNumbers =
      this.documentManifestType === DocumentEventName['Recycling Manifest']
        ? getOrDefault(
            document.externalEvents
              ?.filter(
                eventNameIsAnyOf([DocumentEventName['Transport Manifest']]),
              )
              .map((event) =>
                getEventAttributeValue(
                  event,
                  DocumentEventAttributeName['Document Number'],
                )?.toString(),
              )
              .filter((v): v is string => isNonEmptyString(v)),
            [],
          )
        : [];

    return {
      attachmentInfos: getAttachmentInfos({
        documentId: document.id,
        events: documentManifestEvents,
      }),
      document,
      documentManifestEvents,
      dropOffEvent,
      haulerEvent,
      mtrEventDocumentNumbers,
      pickUpEvent,
      recyclerEvent,
      wasteGeneratorEvent,
      weighingEvents,
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
    documentCurrentValue: number,
  ): ValidationResult {
    const {
      attachment,
      documentNumber,
      documentType,
      eventAddressId,
      exemptionJustification,
      hasWrongLabelAttachment,
      issueDateAttribute,
      recyclerCountryCode,
    } = subject;

    if (
      eventAddressId !== recyclerEvent.address.id &&
      this.documentManifestType === DocumentEventName['Recycling Manifest']
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
        value: documentCurrentValue,
      }),
    };
  }

  private validateExemptionAndAttachment(
    attachment: MethodologyDocumentEventAttachment | undefined,
    exemptionJustification: EventAttributeValueType,
    hasWrongLabelAttachment: boolean,
  ): ValidationResult {
    const justificationString = exemptionJustification?.toString();

    if (hasWrongLabelAttachment) {
      return {
        failMessages: [
          RESULT_COMMENTS.INCORRECT_ATTACHMENT_LABEL(this.documentManifestType),
        ],
      };
    }

    if (isNil(attachment) && isNonEmptyString(justificationString)) {
      return {
        failMessages: [],
        passMessage: RESULT_COMMENTS.PROVIDE_EXEMPTION_JUSTIFICATION(
          this.documentManifestType,
        ),
      };
    }

    if (isNil(attachment) && !isNonEmptyString(justificationString)) {
      return {
        failMessages: [
          RESULT_COMMENTS.MISSING_ATTRIBUTES(this.documentManifestType),
        ],
      };
    }

    if (isNonEmptyString(justificationString) && !isNil(attachment)) {
      return {
        failMessages: [
          RESULT_COMMENTS.ATTACHMENT_AND_JUSTIFICATION_PROVIDED(
            this.documentManifestType,
          ),
        ],
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
    } else if (
      issueDateAttribute.format !== MethodologyDocumentEventAttributeFormat.DATE
    ) {
      failMessages.push(
        RESULT_COMMENTS.INVALID_ISSUE_DATE_FORMAT(
          issueDateAttribute.format as string,
        ),
      );
    }

    return { failMessages };
  }
}
