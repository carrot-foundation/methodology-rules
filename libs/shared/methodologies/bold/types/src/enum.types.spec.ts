import { BoldAttributeName, BoldDocumentEventName } from './enum.types';

describe('carbon characterization schema additions', () => {
  it('exposes the new attribute names', () => {
    expect(BoldAttributeName.CARBON_FRACTION).toBe('Carbon Fraction');
    expect(BoldAttributeName.CARBON_ANALYSIS_DATE).toBe('Carbon Analysis Date');
    expect(BoldAttributeName.MOISTURE_FRACTION).toBe('Moisture Fraction');
  });

  it('exposes the organic waste carbon characterization event', () => {
    expect(BoldDocumentEventName.ORGANIC_WASTE_CARBON_CHARACTERIZATION).toBe(
      'Organic Waste Carbon Characterization',
    );
  });
});
