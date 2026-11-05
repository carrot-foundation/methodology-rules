import { MassIDOrganicSubtype } from '@carrot-fndn/shared/methodologies/bold/types';

import {
  findBrWasteClassification,
  getSubtypeByCdmCode,
  getWasteSubtypeClassificationEvidence,
  NO_ELIGIBLE_SUBTYPE,
} from './waste-classification.helpers';

describe('findBrWasteClassification', () => {
  it('should find the classification ignoring whitespace', () => {
    expect(findBrWasteClassification('020103')).toEqual({
      CDM_CODE: '8.3',
      description: 'Resíduos de tecidos vegetais',
      id: '02 01 03',
    });
  });

  it.each([undefined, '', '99 99 99', 42])(
    'should return undefined for %p',
    (localWasteClassificationId) => {
      expect(
        findBrWasteClassification(localWasteClassificationId),
      ).toBeUndefined();
    },
  );
});

describe('getSubtypeByCdmCode', () => {
  it('should return the subtype mapped to the CDM code', () => {
    expect(getSubtypeByCdmCode('8.3')).toBe(
      MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
    );
  });

  it('should return undefined when no subtype maps to the CDM code', () => {
    expect(getSubtypeByCdmCode('8.2')).toBeUndefined();
  });
});

describe('getWasteSubtypeClassificationEvidence', () => {
  it('should return the subtype the classification code expects', () => {
    expect(
      getWasteSubtypeClassificationEvidence({
        localWasteClassificationId: '02 01 03',
        subtype: MassIDOrganicSubtype.WOOD_AND_WOOD_PRODUCTS,
      }),
    ).toEqual({
      cdmCode: '8.3',
      expectedSubtype: MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
      localWasteClassificationId: '02 01 03',
      subtype: MassIDOrganicSubtype.WOOD_AND_WOOD_PRODUCTS,
    });
  });

  it('should report no eligible subtype when the CDM category has none', () => {
    expect(
      getWasteSubtypeClassificationEvidence({
        localWasteClassificationId: '20 01 01',
        subtype: 'Paper',
      }),
    ).toEqual({
      cdmCode: '8.2',
      expectedSubtype: NO_ELIGIBLE_SUBTYPE,
      localWasteClassificationId: '20 01 01',
      subtype: 'Paper',
    });
  });

  it('should report the classification code in its canonical spelling', () => {
    expect(
      getWasteSubtypeClassificationEvidence({
        localWasteClassificationId: '020103',
        subtype: 'Paper',
      }),
    ).toMatchObject({ localWasteClassificationId: '02 01 03' });
  });

  it('should omit the CDM fields when the classification code is unknown', () => {
    expect(
      getWasteSubtypeClassificationEvidence({
        localWasteClassificationId: '99 99 99',
        subtype: undefined,
      }),
    ).toEqual({ localWasteClassificationId: '99 99 99' });
  });
});
