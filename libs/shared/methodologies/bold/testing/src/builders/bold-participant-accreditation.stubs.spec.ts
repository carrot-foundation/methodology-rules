import {
  BoldAttributeName,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { stubBoldOrganicWasteCarbonCharacterizationEvent } from './bold-participant-accreditation.stubs';

const {
  CARBON_ANALYSIS_DATE,
  CARBON_FRACTION,
  LOCAL_WASTE_CLASSIFICATION_ID,
  MOISTURE_FRACTION,
} = BoldAttributeName;

describe('stubBoldOrganicWasteCarbonCharacterizationEvent', () => {
  it('builds the carbon characterization event with the given attributes', () => {
    const event = stubBoldOrganicWasteCarbonCharacterizationEvent({
      metadataAttributes: [
        [LOCAL_WASTE_CLASSIFICATION_ID, '20 01 99'],
        [CARBON_FRACTION, '0.12'],
        [CARBON_ANALYSIS_DATE, '2026-05-01'],
        [MOISTURE_FRACTION, '0.65'],
      ],
    });

    expect(event.name).toBe(
      BoldDocumentEventName.ORGANIC_WASTE_CARBON_CHARACTERIZATION,
    );
  });
});
