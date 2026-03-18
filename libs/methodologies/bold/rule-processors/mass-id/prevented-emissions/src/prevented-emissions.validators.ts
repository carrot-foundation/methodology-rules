import {
  MassIDOrganicSubtype,
  MethodologyBaseline,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { z } from 'zod';

import type { WasteGeneratorBaselineValues } from './prevented-emissions.types';

const WasteGeneratorBaselineValuesSchema = z.record(
  z.enum(MassIDOrganicSubtype),
  z.enum(MethodologyBaseline),
);

export const isWasteGeneratorBaselineValues = (
  input: unknown,
): input is WasteGeneratorBaselineValues =>
  WasteGeneratorBaselineValuesSchema.safeParse(input).success;
