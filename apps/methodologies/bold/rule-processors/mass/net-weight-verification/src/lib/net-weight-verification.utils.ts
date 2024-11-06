import { getEventAttributeValue } from '@carrot-fndn/methodologies/bold/getters';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
} from '@carrot-fndn/methodologies/bold/types';
import {
  extractNumberFromString,
  isNil,
  isNonEmptyString,
} from '@carrot-fndn/shared/helpers';

export function extractWeightAttributes(event: DocumentEvent) {
  const { LOAD_NET_WEIGHT, VEHICLE_GROSS_WEIGHT, VEHICLE_WEIGHT } =
    DocumentEventAttributeName;

  const [loadNetWeight, vehicleGrossWeight, vehicleWeight] = [
    LOAD_NET_WEIGHT,
    VEHICLE_GROSS_WEIGHT,
    VEHICLE_WEIGHT,
  ].map((attributeName) => {
    const value = getEventAttributeValue(event, attributeName);

    if (isNonEmptyString(value)) {
      return extractNumberFromString(value);
    }

    return null;
  });

  if (
    isNil(loadNetWeight) ||
    isNil(vehicleGrossWeight) ||
    isNil(vehicleWeight)
  ) {
    return null;
  }

  return {
    loadNetWeight,
    vehicleGrossWeight,
    vehicleWeight,
  };
}
