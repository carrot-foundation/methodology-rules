import { MassIDOrganicSubtype } from '@carrot-fndn/shared/methodologies/bold/types';

import {
  findBrWasteClassification,
  getSubtypesByCdmCode,
  getWasteSubtypeClassificationEvidence,
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

describe('getSubtypesByCdmCode', () => {
  it('should return every subtype mapped to the CDM code', () => {
    expect(getSubtypesByCdmCode('8.3')).toEqual([
      MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
      MassIDOrganicSubtype.TOBACCO,
    ]);
  });

  it('should return no subtype when none maps to the CDM code', () => {
    expect(getSubtypesByCdmCode('8.2')).toEqual([]);
  });
});

describe('getWasteSubtypeClassificationEvidence', () => {
  it('should quote each subtype the classification code accepts as a separate option', () => {
    expect(
      getWasteSubtypeClassificationEvidence({
        localWasteClassificationId: '02 01 03',
        subtype: MassIDOrganicSubtype.WOOD_AND_WOOD_PRODUCTS,
      }),
    ).toEqual({
      cdmCode: '8.3',
      expectedSubtype: '“Food, Food Waste and Beverages” ou “Tobacco”',
      localWasteClassificationId: '02 01 03',
      subtype: MassIDOrganicSubtype.WOOD_AND_WOOD_PRODUCTS,
    });
  });

  it('should quote the only subtype the classification code accepts', () => {
    expect(
      getWasteSubtypeClassificationEvidence({
        localWasteClassificationId: '02 01 01',
        subtype: 'Paper',
      }),
    ).toMatchObject({
      cdmCode: '8.7B',
      expectedSubtype: '“Industrial Sludge”',
    });
  });

  it('should name the CDM category the methodology does not accept when it has no eligible subtype', () => {
    expect(
      getWasteSubtypeClassificationEvidence({
        localWasteClassificationId: '20 01 01',
        subtype: 'Paper',
      }),
    ).toEqual({
      cdmCode: '8.2',
      expectedSubtype:
        'nenhum: a categoria CDM 8.2 não é aceita pela metodologia',
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

  it.each([
    { expected: { localWasteClassificationId: '99 99 99' }, id: '99 99 99' },
    { expected: {}, id: undefined },
  ])(
    'should omit the CDM code and say the Ibama code is not accepted when it is $id',
    ({ expected, id }) => {
      expect(
        getWasteSubtypeClassificationEvidence({
          localWasteClassificationId: id,
          subtype: undefined,
        }),
      ).toEqual({
        ...expected,
        expectedSubtype:
          'nenhum: o código Ibama não foi informado ou não é aceito',
      });
    },
  );
});
