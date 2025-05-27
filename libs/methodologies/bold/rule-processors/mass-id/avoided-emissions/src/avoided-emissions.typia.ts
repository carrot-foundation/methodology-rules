import { WasteGeneratorBaselineValues } from 'libs/methodologies/bold/rule-processors/mass-id/avoided-emissions/src/avoided-emissions.types';
import { createIs } from 'typia';

export const isWasteGeneratorBaselineValues =
  createIs<WasteGeneratorBaselineValues>();
