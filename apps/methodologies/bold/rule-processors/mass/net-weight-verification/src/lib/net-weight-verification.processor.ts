import { loadParentDocument } from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  and,
  eventNameIsAnyOf,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/methodologies/bold/predicates';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/types';
import { DOCUMENT_NOT_FOUND_RESULT_COMMENT } from '@carrot-fndn/methodologies/bold/utils';
import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import BigNumber from 'bignumber.js';

import {
  extractWeighingAttributes,
  getWeighingAttributesMissingFields,
  getWeighingAttributesValidationErrors,
  isValidWeighingAttributes,
} from './net-weight-verification.utils';

const { MOVE } = DocumentEventName;
const { WEIGHING } = DocumentEventMoveType;
const { MOVE_TYPE } = DocumentEventAttributeName;
const { APPROVED, REJECTED } = RuleOutputStatus;
const { LOAD_NET_WEIGHT, VEHICLE_GROSS_WEIGHT, VEHICLE_WEIGHT } =
  DocumentEventAttributeName;

interface CalculationValues {
  netWeightResult: BigNumber;
  vehicleGrossWeight: number;
  vehicleWeight: number;
}

export class NetWeightVerificationProcessor extends RuleDataProcessor {
  private ResultComment = {
    WEIGHING_EVENTS_NOT_FOUND: `${WEIGHING} ${MOVE} events not found`,
    approved: ({
      eventIndex,
      ...weighingValues
    }: {
      eventIndex: number;
    } & CalculationValues) =>
      `${this.getEventCommentText(eventIndex)}: ${this.formatCalculationText(weighingValues)}`,

    missingValues: ({
      eventIndex,
      missingValues,
    }: {
      eventIndex: number;
      missingValues: string;
    }) =>
      `${this.getEventCommentText(eventIndex)} is missing attributes: ${missingValues}`,

    rejected: ({
      eventIndex,
      loadNetWeight,
      ...weighingValues
    }: {
      eventIndex: number;
      loadNetWeight: number;
    } & CalculationValues) =>
      `${this.getEventCommentText(eventIndex)}: Invalid load net weight (${this.formatCalculationText(weighingValues)}) should be equal to ${loadNetWeight}`,

    validationError: ({
      eventIndex,
      validationErrors,
    }: {
      eventIndex: number;
      validationErrors: string;
    }) =>
      `${this.getEventCommentText(eventIndex)} has invalid attributes: ${validationErrors}`,
  };

  private formatCalculationText = ({
    netWeightResult,
    vehicleGrossWeight,
    vehicleWeight,
  }: CalculationValues): string =>
    `${vehicleGrossWeight} - ${vehicleWeight} = ${netWeightResult.toString()}`;

  private getEventCommentText = (eventIndex: number): string =>
    `${WEIGHING} ${MOVE} event (${eventIndex + 1})`;

  private validateWeighingEvents(weighingEvents: DocumentEvent[]) {
    const rejectedResultComments: string[] = [];
    const approvedResultComments: string[] = [];

    for (const [eventIndex, event] of weighingEvents.entries()) {
      const attributes = extractWeighingAttributes(event);
      const attributesValues = Object.fromEntries(
        attributes.map(([key, { value }]) => [key, value]),
      );

      if (isValidWeighingAttributes(attributesValues)) {
        const {
          [LOAD_NET_WEIGHT]: loadNetWeight,
          [VEHICLE_GROSS_WEIGHT]: vehicleGrossWeight,
          [VEHICLE_WEIGHT]: vehicleWeight,
        } = attributesValues;
        const netWeightResult = new BigNumber(vehicleGrossWeight).minus(
          new BigNumber(vehicleWeight),
        );

        if (netWeightResult.isEqualTo(new BigNumber(loadNetWeight))) {
          approvedResultComments.push(
            this.ResultComment.approved({
              eventIndex,
              netWeightResult,
              vehicleGrossWeight,
              vehicleWeight,
            }),
          );
        } else {
          rejectedResultComments.push(
            this.ResultComment.rejected({
              eventIndex,
              loadNetWeight,
              netWeightResult,
              vehicleGrossWeight,
              vehicleWeight,
            }),
          );
        }
      } else {
        const validationErrors =
          getWeighingAttributesValidationErrors(attributes);
        const missingValues = getWeighingAttributesMissingFields(attributes);

        if (validationErrors.length > 0) {
          rejectedResultComments.push(
            this.ResultComment.validationError({
              eventIndex,
              validationErrors,
            }),
          );
        } else if (missingValues.length > 0) {
          approvedResultComments.push(
            this.ResultComment.missingValues({
              eventIndex,
              missingValues,
            }),
          );
        }
      }
    }

    return {
      approvedResultComments,
      rejectedResultComments,
    };
  }

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    const document = await loadParentDocument(
      this.context.documentLoaderService,
      toDocumentKey({
        documentId: ruleInput.parentDocumentId,
        documentKeyPrefix: ruleInput.documentKeyPrefix,
      }),
    );

    if (!document) {
      return mapToRuleOutput(ruleInput, REJECTED, {
        resultComment: DOCUMENT_NOT_FOUND_RESULT_COMMENT,
      });
    }

    const weighingEvents = (document.externalEvents ?? []).filter(
      and(
        eventNameIsAnyOf([MOVE]),
        metadataAttributeValueIsAnyOf(MOVE_TYPE, [WEIGHING]),
      ),
    );

    if (weighingEvents.length === 0) {
      return mapToRuleOutput(ruleInput, APPROVED, {
        resultComment: this.ResultComment.WEIGHING_EVENTS_NOT_FOUND,
      });
    }

    const { approvedResultComments, rejectedResultComments } =
      this.validateWeighingEvents(weighingEvents);

    return rejectedResultComments.length > 0
      ? mapToRuleOutput(ruleInput, REJECTED, {
          resultComment: rejectedResultComments.join(' | '),
        })
      : mapToRuleOutput(ruleInput, APPROVED, {
          resultComment: approvedResultComments.join(' | '),
        });
  }
}
