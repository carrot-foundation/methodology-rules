import type { NonEmptyString } from '@carrot-fndn/shared/types';

import type { BaseExtractedData } from './document-extractor.types';

import {
  createHighConfidenceField,
  createLowConfidenceField,
  lowConfidenceReviewReason,
} from './confidence.helpers';
import {
  applyTextLayerMerge,
  mergeTextLayerFields,
} from './text-layer-merge.helpers';

type StubData = BaseExtractedData & Record<string, unknown>;

const stubData = (
  fields: Record<string, unknown>,
  lowConfidenceFields: string[] = [],
): StubData => ({
  documentType: 'transportManifest',
  extractionConfidence: 'low',
  lowConfidenceFields,
  rawText: 'stub text' as NonEmptyString,
  ...fields,
});

const entity = (taxId: string, name = 'ACME LTDA') => ({
  name: name ? createHighConfidenceField(name) : createLowConfidenceField(''),
  taxId: taxId
    ? createHighConfidenceField(taxId)
    : createLowConfidenceField(''),
});

describe('mergeTextLayerFields', () => {
  it('should fill empty, low and absent fields when a high-confidence anchor agrees', () => {
    const primary = stubData(
      {
        documentNumber: createHighConfidenceField('MTR-001'),
        driverName: createLowConfidenceField('JOH'),
        generator: entity(''),
        wasteTypes: [{ code: createLowConfidenceField('') }],
      },
      ['driverName', 'generator.taxId', 'wasteTypes[0].code'],
    );
    const textLayer = stubData({
      documentNumber: createHighConfidenceField('mtr 001'),
      driverName: createHighConfidenceField('JOHN DOE'),
      generator: entity('12.345.678/0001-90', 'OTHER NAME'),
      hauler: entity('', 'HAULER LTDA'),
      issueDate: createHighConfidenceField('01/02/2024'),
      wasteTypes: [{ code: createHighConfidenceField('200108') }],
    });

    const result = mergeTextLayerFields(primary, textLayer);

    expect(result).toEqual({
      data: {
        ...primary,
        driverName: createHighConfidenceField('JOHN DOE'),
        generator: {
          name: createHighConfidenceField('ACME LTDA'),
          taxId: createHighConfidenceField('12.345.678/0001-90'),
        },
        hauler: entity('', 'HAULER LTDA'),
        issueDate: createHighConfidenceField('01/02/2024'),
        lowConfidenceFields: ['wasteTypes[0].code', 'hauler.taxId'],
      },
      outcome: 'filled',
    });
  });

  it('should not fill from a low or empty text layer value', () => {
    const primary = stubData(
      {
        documentNumber: createHighConfidenceField('MTR-001'),
        driverName: createLowConfidenceField('JOH'),
      },
      ['driverName'],
    );
    const textLayer = stubData({
      documentNumber: createHighConfidenceField('MTR-001'),
      driverName: createLowConfidenceField('JOHN'),
      issueDate: createHighConfidenceField(undefined),
    });

    expect(mergeTextLayerFields(primary, textLayer)).toEqual({
      data: primary,
      outcome: 'filled',
    });
  });

  it('should keep a primary value that is not an entity group', () => {
    const primary = stubData({
      documentNumber: createHighConfidenceField('MTR-001'),
      generator: 'unexpected',
    });
    const textLayer = stubData({
      documentNumber: createHighConfidenceField('MTR-001'),
      generator: entity('12.345.678/0001-90'),
    });

    expect(mergeTextLayerFields(primary, textLayer)).toMatchObject({
      data: { generator: 'unexpected' },
      outcome: 'filled',
    });
  });

  it('should report the first disagreeing anchor', () => {
    const primary = stubData({
      documentNumber: createHighConfidenceField('MTR-001'),
      generator: entity('12.345.678/0001-90'),
    });
    const textLayer = stubData({
      documentNumber: createHighConfidenceField('MTR-001'),
      generator: entity('99.345.678/0001-90'),
    });

    expect(mergeTextLayerFields(primary, textLayer)).toEqual({
      mismatchedField: 'generator.taxId',
      outcome: 'disagreement',
    });
  });

  it.each([
    {
      description: 'OCR read no anchor with high confidence',
      primary: stubData({ documentNumber: createLowConfidenceField('MTR') }),
      textLayer: stubData({
        documentNumber: createHighConfidenceField('MTR-001'),
      }),
    },
    {
      description: 'the only anchors hold no letters or digits',
      primary: stubData({ documentNumber: createHighConfidenceField('-') }),
      textLayer: stubData({ documentNumber: createHighConfidenceField('.') }),
    },
    {
      description: 'the text layer lacks the anchor OCR read',
      primary: stubData({ generator: entity('12.345.678/0001-90') }),
      textLayer: stubData({ generator: entity('') }),
    },
  ])(
    'should leave the output unverified when $description',
    ({ primary, textLayer }) => {
      expect(mergeTextLayerFields(primary, textLayer)).toEqual({
        outcome: 'unverified',
      });
    },
  );
});

describe('applyTextLayerMerge', () => {
  const otherReason = { code: 'LOW_LAYOUT_MATCH_SCORE', description: 'other' };
  const output = {
    data: stubData({}, ['driverName', 'issueDate']),
    reviewReasons: [
      lowConfidenceReviewReason('driverName'),
      otherReason,
      lowConfidenceReviewReason('issueDate'),
    ],
    reviewRequired: true,
  };

  it('should keep other reasons, drop cleared ones and add new ones', () => {
    const data = stubData({}, ['issueDate', 'hauler.taxId']);

    expect(applyTextLayerMerge(output, { data, outcome: 'filled' })).toEqual({
      data,
      reviewReasons: [
        otherReason,
        lowConfidenceReviewReason('issueDate'),
        lowConfidenceReviewReason('hauler.taxId'),
      ],
      reviewRequired: true,
    });
  });

  it('should clear review when every reason is resolved', () => {
    const resolved = {
      ...output,
      reviewReasons: [lowConfidenceReviewReason('driverName')],
    };
    const data = stubData({});

    expect(
      applyTextLayerMerge(resolved, { data, outcome: 'filled' }),
    ).toMatchObject({ data, reviewReasons: [], reviewRequired: false });
  });

  it('should return the output unchanged when unverified', () => {
    expect(applyTextLayerMerge(output, { outcome: 'unverified' })).toBe(output);
  });
});
