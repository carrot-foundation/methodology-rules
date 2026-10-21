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
  BoldAttributeName,
  type BoldDocument,
  type BoldDocumentEvent,
  type BoldDocumentEventAttribute,
  BoldDocumentEventLabel,
  BoldDocumentEventName,
  BoldReportType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  joinRenderedFindings,
  type RenderedRuleFinding,
} from '@carrot-fndn/shared/rule/result';
import {
  type DocumentEventAttachment,
  DocumentEventAttributeFormat,
} from '@carrot-fndn/shared/types';

import { RESULT_COMMENTS } from './document-manifest-data.constants';
import { crossValidateWithTextract } from './document-manifest-data.extractor';
import {
  DOCUMENT_MANIFEST_DATA_FINDINGS,
  toCrossValidationFinding,
} from './document-manifest-data.findings';
import {
  type AttachmentInfo,
  type DocumentManifestEventSubject,
  type EventAttributeValueType,
  getAttachmentInfos,
} from './document-manifest-data.helpers';

const {
  ACTOR,
  DROP_OFF,
  PICK_UP,
  RECYCLING_MANIFEST,
  TRANSPORT_MANIFEST,
  WEIGHING,
} = BoldDocumentEventName;
const { DOCUMENT_NUMBER, DOCUMENT_TYPE, EXEMPTION_JUSTIFICATION, ISSUE_DATE } =
  BoldAttributeName;
const { HAULER, RECYCLER, WASTE_GENERATOR } = BoldDocumentEventLabel;
const { DATE } = DocumentEventAttributeFormat;

export type DocumentManifestType =
  | typeof RECYCLING_MANIFEST
  | typeof TRANSPORT_MANIFEST;

const VALID_MANIFEST_TYPES: ReadonlySet<string> = new Set<string>([
  RECYCLING_MANIFEST,
  TRANSPORT_MANIFEST,
]);

type RuleSubject = {
  attachmentInfos: AttachmentInfo[];
  document: BoldDocument;
  documentManifestEvents: DocumentManifestEventSubject[];
  dropOffEvent: BoldDocumentEvent | undefined;
  haulerEvent: BoldDocumentEvent | undefined;
  mtrEventDocumentNumbers: string[];
  pickUpEvent: BoldDocumentEvent | undefined;
  recyclerEvent: BoldDocumentEvent | undefined;
  wasteGeneratorEvent: BoldDocumentEvent | undefined;
  weighingEvents: BoldDocumentEvent[];
};

const DOCUMENT_TYPE_MAPPING = {
  [RECYCLING_MANIFEST]: BoldReportType.CDF.toString(),
  [TRANSPORT_MANIFEST]: BoldReportType.MTR.toString(),
} as const;

interface ManifestEventValidation {
  failures: RenderedRuleFinding[];
  passMessage?: string;
}

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
        ...DOCUMENT_MANIFEST_DATA_FINDINGS.result(
          'RESULT.MISSING_EVENT',
          this.documentManifestType,
        ),
        resultStatus: 'FAILED',
      };
    }

    if (isNil(ruleSubject.recyclerEvent)) {
      return {
        ...DOCUMENT_MANIFEST_DATA_FINDINGS.result(
          'RESULT.MISSING_RECYCLER_EVENT',
        ),
        resultStatus: 'FAILED',
      };
    }

    const validationResults = ruleSubject.documentManifestEvents.map(
      (subject) =>
        this.validateDocumentManifestEvents(
          subject,
          ruleSubject.recyclerEvent as BoldDocumentEvent,
          ruleSubject.document.currentValue,
        ),
    );
    const allFailures = validationResults.flatMap(
      (validationResult) => validationResult.failures,
    );
    const passMessages = validationResults
      .map((v) => v.passMessage)
      .filter(Boolean) as string[];

    if (allFailures.length > 0) {
      return {
        ...joinRenderedFindings(allFailures),
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
      const { failReasons, reviewReasons } = crossValidationResult;

      return {
        resultComment:
          reviewReasons.length > 0
            ? `${crossValidationResult.failMessages.join(' ')} Review required: ${reviewReasons.map((r) => r.description).join('; ')}`
            : crossValidationResult.failMessages.join(' '),
        resultContent: {
          crossValidation: crossValidationResult.crossValidation,
          extractionMetadata,
          failReasons,
          ...(reviewReasons.length > 0 && { reviewReasons }),
        },
        resultFindings: [...failReasons, ...reviewReasons].map((reason) =>
          toCrossValidationFinding(reason),
        ),
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
        resultFindings: crossValidationResult.reviewReasons.map((reason) =>
          toCrossValidationFinding(reason),
        ),
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

  protected override getRuleSubject(document: BoldDocument): RuleSubject {
    const transportManifestEvents = document.externalEvents?.filter(
      eventNameIsAnyOf([this.documentManifestType]),
    );
    const recyclerEvent = document.externalEvents?.find(
      and(eventNameIsAnyOf([ACTOR]), eventLabelIsAnyOf([RECYCLER])),
    );
    const wasteGeneratorEvent = document.externalEvents?.find(
      and(eventNameIsAnyOf([ACTOR]), eventLabelIsAnyOf([WASTE_GENERATOR])),
    );
    const haulerEvent = document.externalEvents?.find(
      and(eventNameIsAnyOf([ACTOR]), eventLabelIsAnyOf([HAULER])),
    );
    const pickUpEvent = document.externalEvents?.find(
      eventNameIsAnyOf([PICK_UP]),
    );
    const dropOffEvent = document.externalEvents?.find(
      eventNameIsAnyOf([DROP_OFF]),
    );
    const weighingEvents = getOrDefault(
      document.externalEvents?.filter(eventNameIsAnyOf([WEIGHING])),
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
    );

    const mtrEventDocumentNumbers =
      this.documentManifestType === RECYCLING_MANIFEST
        ? getOrDefault(
            document.externalEvents
              ?.filter(eventNameIsAnyOf([TRANSPORT_MANIFEST]))
              .map((event) =>
                getEventAttributeValue(event, DOCUMENT_NUMBER)?.toString(),
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
  ): ManifestEventValidation {
    const failures: RenderedRuleFinding[] = [];

    const documentTypeString = documentType?.toString();
    const documentNumberString = documentNumber?.toString();

    if (!isNonEmptyString(documentTypeString)) {
      failures.push(
        DOCUMENT_MANIFEST_DATA_FINDINGS.render('RESULT.MISSING_DOCUMENT_TYPE'),
      );
    }

    if (
      isNonEmptyString(documentTypeString) &&
      recyclerCountryCode === 'BR' &&
      documentTypeString !== DOCUMENT_TYPE_MAPPING[this.documentManifestType]
    ) {
      failures.push(
        DOCUMENT_MANIFEST_DATA_FINDINGS.render(
          'RESULT.INVALID_BR_DOCUMENT_TYPE',
          documentTypeString,
        ),
      );
    }

    if (!isNonEmptyString(documentNumberString)) {
      failures.push(
        DOCUMENT_MANIFEST_DATA_FINDINGS.render(
          'RESULT.MISSING_DOCUMENT_NUMBER',
        ),
      );
    }

    return { failures };
  }

  private validateDocumentManifestEvents(
    subject: DocumentManifestEventSubject,
    recyclerEvent: BoldDocumentEvent,
    documentCurrentValue: number,
  ): ManifestEventValidation {
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
      this.documentManifestType === RECYCLING_MANIFEST
    ) {
      return {
        failures: [
          DOCUMENT_MANIFEST_DATA_FINDINGS.render('RESULT.ADDRESS_MISMATCH'),
        ],
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

    if (exemptionResult.failures.length > 0) {
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

    const failures = validations.flatMap((validation) => validation.failures);

    if (failures.length > 0) {
      return { failures };
    }

    return {
      failures: [],
      passMessage: RESULT_COMMENTS.VALID_ATTACHMENT_DECLARATION({
        documentNumber: documentNumber as string,
        documentType: documentType as string,
        issueDate: issueDateAttribute?.value as string,
        value: documentCurrentValue,
      }),
    };
  }

  private validateExemptionAndAttachment(
    attachment: DocumentEventAttachment | undefined,
    exemptionJustification: EventAttributeValueType,
    hasWrongLabelAttachment: boolean,
  ): ManifestEventValidation {
    const justificationString = exemptionJustification?.toString();

    if (hasWrongLabelAttachment) {
      return {
        failures: [
          DOCUMENT_MANIFEST_DATA_FINDINGS.render(
            'RESULT.INCORRECT_ATTACHMENT_LABEL',
            this.documentManifestType,
          ),
        ],
      };
    }

    if (isNil(attachment) && isNonEmptyString(justificationString)) {
      return {
        failures: [],
        passMessage: RESULT_COMMENTS.PROVIDE_EXEMPTION_JUSTIFICATION(
          this.documentManifestType,
        ),
      };
    }

    if (isNil(attachment) && !isNonEmptyString(justificationString)) {
      return {
        failures: [
          DOCUMENT_MANIFEST_DATA_FINDINGS.render(
            'RESULT.MISSING_ATTRIBUTES',
            this.documentManifestType,
          ),
        ],
      };
    }

    if (isNonEmptyString(justificationString) && !isNil(attachment)) {
      return {
        failures: [
          DOCUMENT_MANIFEST_DATA_FINDINGS.render(
            'RESULT.ATTACHMENT_AND_JUSTIFICATION_PROVIDED',
            this.documentManifestType,
          ),
        ],
      };
    }

    return { failures: [] };
  }

  private validateIssueDate(
    issueDateAttribute: BoldDocumentEventAttribute | undefined,
  ): ManifestEventValidation {
    const failures: RenderedRuleFinding[] = [];

    if (!isNonEmptyString(issueDateAttribute?.name)) {
      failures.push(
        DOCUMENT_MANIFEST_DATA_FINDINGS.render('RESULT.MISSING_ISSUE_DATE'),
      );
    } else if (issueDateAttribute.format !== DATE) {
      failures.push(
        DOCUMENT_MANIFEST_DATA_FINDINGS.render(
          'RESULT.INVALID_ISSUE_DATE_FORMAT',
          issueDateAttribute.format as string,
        ),
      );
    }

    return { failures };
  }
}
