import { isNil } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  type Document,
  DocumentEventAttributeName,
  DocumentEventName,
  MassIdOrganicSubtype,
  MethodologyBaseline,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { AVOIDED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON } from './avoided-emissions.constants';
import { AvoidedEmissionsProcessorErrors } from './avoided-emissions.errors';
import { isWasteGeneratorBaselineValues } from './avoided-emissions.typia';

const { BASELINES } = DocumentEventAttributeName;
const { RECYCLING_BASELINES } = DocumentEventName;

export const getAvoidedEmissionsFactor = (
  wasteSubtype: MassIdOrganicSubtype,
  wasteGeneratorBaseline: MethodologyBaseline,
): number => {
  const factor =
    AVOIDED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON[wasteSubtype][
      wasteGeneratorBaseline
    ];

  return factor;
};

export const calculateAvoidedEmissions = (
  exceedingEmissionCoefficient: number,
  avoidedEmissionsByMaterialAndBaselinePerTon: number,
  massIdDocumentValue: number,
): number =>
  (1 - exceedingEmissionCoefficient) *
  avoidedEmissionsByMaterialAndBaselinePerTon *
  massIdDocumentValue;

export const getWasteGeneratorBaselineByWasteSubtype = (
  wasteGeneratorHomologationDocument: Document,
  wasteSubtype: MassIdOrganicSubtype,
  processorErrors: AvoidedEmissionsProcessorErrors,
): MethodologyBaseline | undefined => {
  const recyclingBaselineEvent =
    wasteGeneratorHomologationDocument.externalEvents?.find(
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
  processorErrors: AvoidedEmissionsProcessorErrors,
): void => {
  if (isNil(value)) {
    throw processorErrors.getKnownError(errorMessage);
  }
};
