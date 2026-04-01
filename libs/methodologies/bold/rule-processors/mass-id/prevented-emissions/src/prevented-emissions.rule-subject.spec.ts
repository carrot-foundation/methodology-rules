import {
  BoldBaseline,
  MassIDOrganicSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { PreventedEmissionsRuleSubjectSchema } from './prevented-emissions.rule-subject';

describe('PreventedEmissionsRuleSubjectSchema', () => {
  it('should accept a valid organic rule subject', () => {
    const input = {
      baseline: BoldBaseline.OPEN_AIR_DUMP,
      exceedingEmissionCoefficient: 0.5,
      gasType: 'CO2e',
      massIDDocumentValue: 100,
      wasteSubtype: MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
    };

    const result = PreventedEmissionsRuleSubjectSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('should reject a non-organic document subtype', () => {
    const input = {
      baseline: BoldBaseline.OPEN_AIR_DUMP,
      exceedingEmissionCoefficient: 0.5,
      gasType: 'CO2e',
      massIDDocumentValue: 100,
      wasteSubtype: 'Plastic',
    };

    const result = PreventedEmissionsRuleSubjectSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it('should accept a valid "Others (if organic)" subject with classification IDs', () => {
    const input = {
      baseline: BoldBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS,
      exceedingEmissionCoefficient: 0.3,
      gasType: 'CO2e',
      localWasteClassificationId: 'BR-8.7D-001',
      massIDDocumentValue: 50,
      normalizedLocalWasteClassificationId: '8.7D-001',
      wasteSubtype: MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
    };

    const result = PreventedEmissionsRuleSubjectSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('should accept a subject with undefined baseline', () => {
    const input = {
      exceedingEmissionCoefficient: 0.5,
      gasType: 'CO2e',
      massIDDocumentValue: 100,
      wasteSubtype: MassIDOrganicSubtype.DOMESTIC_SLUDGE,
    };

    const result = PreventedEmissionsRuleSubjectSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('should reject an empty gasType', () => {
    const input = {
      baseline: BoldBaseline.OPEN_AIR_DUMP,
      exceedingEmissionCoefficient: 0.5,
      gasType: '',
      massIDDocumentValue: 100,
      wasteSubtype: MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
    };

    const result = PreventedEmissionsRuleSubjectSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it('should reject a negative massIDDocumentValue', () => {
    const input = {
      baseline: BoldBaseline.OPEN_AIR_DUMP,
      exceedingEmissionCoefficient: 0.5,
      gasType: 'CO2e',
      massIDDocumentValue: -10,
      wasteSubtype: MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
    };

    const result = PreventedEmissionsRuleSubjectSchema.safeParse(input);

    expect(result.success).toBe(false);
  });
});
