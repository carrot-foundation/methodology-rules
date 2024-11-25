import { getEventAttributeValue } from '@carrot-fndn/methodologies/bold/getters';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
} from '@carrot-fndn/methodologies/bold/types';
import {
  extractNumberFromString,
  isNonEmptyString,
  logger,
} from '@carrot-fndn/shared/helpers';
import { createIs } from 'typia';

const { LOAD_NET_WEIGHT, VEHICLE_GROSS_WEIGHT, VEHICLE_WEIGHT } =
  DocumentEventAttributeName;

const MEASUREMENT_UNIT = 'KG';

const WEIGHING_ATTRIBUTES = [
  LOAD_NET_WEIGHT,
  VEHICLE_GROSS_WEIGHT,
  VEHICLE_WEIGHT,
] as const;

type WeighingAttributes = (typeof WEIGHING_ATTRIBUTES)[number];

interface WeighingAttributesOutput {
  validationError?: string;
  value?: number;
}

type ExtracteAttributes = Array<[WeighingAttributes, WeighingAttributesOutput]>;

export const ALLOWABLE_WEIGHT_DIFFERENCE = 1;

export const isValidWeighingAttributes =
  createIs<Record<WeighingAttributes, number>>();

export const getWeighingAttributesValidationErrors = (
  attributes: ExtracteAttributes,
) =>
  attributes
    .filter(([, { validationError }]) => validationError)
    .map(([, { validationError }]) => validationError)
    .join(', ');

export const getWeighingAttributesMissingFields = (
  attributes: ExtracteAttributes,
) =>
  attributes
    .filter(([, { value }]) => typeof value !== 'number')
    .map(([attributeName]) => attributeName)
    .join(', ');

export const extractWeighingAttributes = (
  event: DocumentEvent,
): ExtracteAttributes =>
  WEIGHING_ATTRIBUTES.map((attributeName) => {
    const metadataValue = getEventAttributeValue(event, attributeName);

    if (!isNonEmptyString(metadataValue)) {
      return [attributeName, {}];
    }

    if (metadataValue.toUpperCase().includes(MEASUREMENT_UNIT)) {
      try {
        const value = extractNumberFromString(metadataValue);

        logger.info(
          `Extracted number "${value}" from "${metadataValue}" on attribute "${attributeName}"`,
        );

        return [attributeName, { value }];
      } catch (error) {
        logger.error(
          error,
          `Error extracting number from "${metadataValue}" on attribute "${attributeName}"`,
        );

        return [
          attributeName,
          {
            validationError: `Invalid value "${metadataValue}" on attribute "${attributeName}".`,
          },
        ];
      }
    } else {
      return [
        attributeName,
        {
          validationError: `Missing measurement unit "${MEASUREMENT_UNIT}" on attribute "${attributeName}".`,
        },
      ];
    }
  });
