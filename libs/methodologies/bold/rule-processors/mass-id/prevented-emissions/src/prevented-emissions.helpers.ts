import { isNil } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  type Document,
  DocumentEventAttributeName,
  DocumentEventName,
  MassIdOrganicSubtype,
  MethodologyBaseline,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { PREVENTED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON } from './prevented-emissions.constants';
import { PreventedEmissionsProcessorErrors } from './prevented-emissions.errors';
import { isWasteGeneratorBaselineValues } from './prevented-emissions.typia';

const { BASELINES } = DocumentEventAttributeName;
const { RECYCLING_BASELINES } = DocumentEventName;

export const getPreventedEmissionsFactor = (
  wasteSubtype: MassIdOrganicSubtype,
  wasteGeneratorBaseline: MethodologyBaseline,
): number => {
  const factor =
    PREVENTED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON[wasteSubtype][
      wasteGeneratorBaseline
    ];

  return factor;
};

export const calculatePreventedEmissions = (
  exceedingEmissionCoefficient: number,
  preventedEmissionsByMaterialAndBaselinePerTon: number,
  massIdDocumentValue: number,
): number =>
  (1 - exceedingEmissionCoefficient) *
  preventedEmissionsByMaterialAndBaselinePerTon *
  massIdDocumentValue;

export const getWasteGeneratorBaselineByWasteSubtype = (
  wasteGeneratorAccreditationDocument: Document,
  wasteSubtype: MassIdOrganicSubtype,
  processorErrors: PreventedEmissionsProcessorErrors,
): MethodologyBaseline | undefined => {
  const recyclingBaselineEvent =
    wasteGeneratorAccreditationDocument.externalEvents?.find(
      (event) => event.name === RECYCLING_BASELINES.toString(),
    );

  const baselines = getEventAttributeValue(recyclingBaselineEvent, BASELINES);

  if (!isWasteGeneratorBaselineValues(baselines)) {
    throw processorErrors.getKnownError(
      processorErrors.ERROR_MESSAGE.INVALID_WASTE_GENERATOR_BASELINES,
    );
  }

  return baselines[wasteSubtype];
};

export const throwIfMissing = <T>(
  value: T | undefined,
  errorMessage: string,
  processorErrors: PreventedEmissionsProcessorErrors,
): void => {
  if (isNil(value)) {
    throw processorErrors.getKnownError(errorMessage);
  }
};
