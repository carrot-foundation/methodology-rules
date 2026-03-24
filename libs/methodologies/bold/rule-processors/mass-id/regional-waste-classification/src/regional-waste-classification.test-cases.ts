import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';
import type { PartialDeep } from 'type-fest';

import {
  type BoldExternalEventsObject,
  stubAddress,
  stubBoldMassIDPickUpEvent,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { type Document } from '@carrot-fndn/shared/methodologies/bold/types';
import { WASTE_CLASSIFICATION_CODES } from '@carrot-fndn/shared/methodologies/bold/utils';
import { type AnyObject } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';

import { RESULT_COMMENTS } from './regional-waste-classification.constants';

const randomId = faker.lorem.word();
const randomDescription = faker.lorem.sentence();
const brazilianRecyclerEvent = stubDocumentEvent({
  address: stubAddress({
    countryCode: 'BR',
  }),
  label: 'Recycler',
  name: 'ACTOR',
});
const americanRecyclerEvent = stubDocumentEvent({
  address: stubAddress({
    countryCode: 'US',
  }),
  label: 'Recycler',
  name: 'ACTOR',
});

interface RegionalWasteClassificationTestCase extends RuleTestCase {
  events: BoldExternalEventsObject;
  partialDocument: PartialDeep<Document>;
  resultContent: AnyObject | undefined;
}

export const regionalWasteClassificationTestCases: RegionalWasteClassificationTestCase[] =
  [
    {
      events: {
        'ACTOR-Recycler': brazilianRecyclerEvent,
        'Pick-up': stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            ['Local Waste Classification ID', '02 01 01'],
            [
              'Local Waste Classification Description',
              WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
            ],
          ],
        }),
      },
      manifestExample: true,
      partialDocument: {
        subtype: 'Industrial Sludge',
      },
      resultComment: RESULT_COMMENTS.passed.VALID_CLASSIFICATION,
      resultContent: {
        description: WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
        id: '02 01 01',
        recyclerCountryCode: 'BR',
        subtype: 'Industrial Sludge',
      },
      resultStatus: 'PASSED',
      scenario:
        'The local waste classification ID and description match a local waste classification code with matching subtype',
    },
    {
      events: {
        'ACTOR-Recycler': brazilianRecyclerEvent,
        'Pick-up': stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            ['Local Waste Classification ID', '020101'],
            [
              'Local Waste Classification Description',
              WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
            ],
          ],
        }),
      },
      partialDocument: {
        subtype: 'Industrial Sludge',
      },
      resultComment: RESULT_COMMENTS.passed.VALID_CLASSIFICATION,
      resultContent: {
        description: WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
        id: '020101',
        recyclerCountryCode: 'BR',
        subtype: 'Industrial Sludge',
      },
      resultStatus: 'PASSED',
      scenario:
        'The local waste classification ID and description match the local waste classification code without spaces with matching subtype',
    },
    {
      events: {
        'ACTOR-Recycler': brazilianRecyclerEvent,
        'Pick-up': stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            ['Local Waste Classification ID', '02 01 01'],
            [
              'Local Waste Classification Description',
              `***${WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description} - (*)`,
            ],
          ],
        }),
      },
      partialDocument: {
        subtype: 'Industrial Sludge',
      },
      resultComment: RESULT_COMMENTS.passed.VALID_CLASSIFICATION,
      resultContent: {
        description: `***${WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description} - (*)`,
        id: '02 01 01',
        recyclerCountryCode: 'BR',
        subtype: 'Industrial Sludge',
      },
      resultStatus: 'PASSED',
      scenario:
        'The local waste classification description has leading/trailing special characters but matches after normalization with matching subtype',
    },
    {
      events: {
        'ACTOR-Recycler': brazilianRecyclerEvent,
        'Pick-up': stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            ['Local Waste Classification ID', undefined],
            [
              'Local Waste Classification Description',
              WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
            ],
          ],
        }),
      },
      partialDocument: {
        subtype: 'Industrial Sludge',
      },
      resultComment: RESULT_COMMENTS.failed.CLASSIFICATION_ID_MISSING,
      resultContent: {
        description: WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
        id: undefined,
        recyclerCountryCode: 'BR',
        subtype: 'Industrial Sludge',
      },
      resultStatus: 'FAILED',
      scenario: 'The local waste classification ID is missing',
    },
    {
      events: {
        'ACTOR-Recycler': brazilianRecyclerEvent,
        'Pick-up': stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            ['Local Waste Classification ID', '02 01 01'],
            ['Local Waste Classification Description', undefined],
          ],
        }),
      },
      partialDocument: {
        subtype: 'Industrial Sludge',
      },
      resultComment: RESULT_COMMENTS.failed.CLASSIFICATION_DESCRIPTION_MISSING,
      resultContent: {
        description: undefined,
        id: '02 01 01',
        recyclerCountryCode: 'BR',
        subtype: 'Industrial Sludge',
      },
      resultStatus: 'FAILED',
      scenario: 'The local waste classification description is missing',
    },
    {
      events: {
        'ACTOR-Recycler': brazilianRecyclerEvent,
        'Pick-up': stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            ['Local Waste Classification ID', '02 01 02'],
            [
              'Local Waste Classification Description',
              'Residuos de tecidos animais',
            ],
          ],
        }),
      },
      manifestExample: true,
      partialDocument: {
        subtype: 'Food, Food Waste and Beverages',
      },
      resultComment: RESULT_COMMENTS.passed.VALID_CLASSIFICATION,
      resultContent: {
        description: 'Residuos de tecidos animais',
        id: '02 01 02',
        recyclerCountryCode: 'BR',
        subtype: 'Food, Food Waste and Beverages',
      },
      resultStatus: 'PASSED',
      scenario:
        'The local waste classification description matches after normalization (accent stripped)',
    },
    {
      events: {
        'ACTOR-Recycler': brazilianRecyclerEvent,
        'Pick-up': stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            ['Local Waste Classification ID', '02 01 01'],
            ['Local Waste Classification Description', randomDescription],
          ],
        }),
      },
      manifestExample: true,
      partialDocument: {
        subtype: 'Industrial Sludge',
      },
      resultComment: RESULT_COMMENTS.failed.INVALID_CLASSIFICATION_DESCRIPTION,
      resultContent: {
        description: randomDescription,
        id: '02 01 01',
        recyclerCountryCode: 'BR',
        subtype: 'Industrial Sludge',
      },
      resultStatus: 'FAILED',
      scenario:
        'The local waste classification description does not match the expected local waste classification code',
    },
    {
      events: {
        'ACTOR-Recycler': americanRecyclerEvent,
        'Pick-up': stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            ['Local Waste Classification ID', '02 01 01'],
            ['Local Waste Classification Description', randomDescription],
          ],
        }),
      },
      partialDocument: {
        subtype: 'Industrial Sludge',
      },
      resultComment: RESULT_COMMENTS.failed.UNSUPPORTED_COUNTRY('US'),
      resultContent: {
        description: randomDescription,
        id: '02 01 01',
        recyclerCountryCode: 'US',
        subtype: 'Industrial Sludge',
      },
      resultStatus: 'FAILED',
      scenario: 'The recycler is not from Brazil',
    },
    {
      events: {
        'ACTOR-Recycler': brazilianRecyclerEvent,
        'Pick-up': stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            ['Local Waste Classification ID', randomId],
            ['Local Waste Classification Description', randomDescription],
          ],
        }),
      },
      partialDocument: {
        subtype: 'Industrial Sludge',
      },
      resultComment: RESULT_COMMENTS.failed.INVALID_CLASSIFICATION_ID,
      resultContent: {
        description: randomDescription,
        id: randomId,
        recyclerCountryCode: 'BR',
        subtype: 'Industrial Sludge',
      },
      resultStatus: 'FAILED',
      scenario: 'The local waste classification ID is not valid',
    },
    {
      events: {
        'ACTOR-Recycler': brazilianRecyclerEvent,
        'Pick-up': stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            ['Local Waste Classification ID', '02 01 01'],
            [
              'Local Waste Classification Description',
              WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
            ],
          ],
        }),
      },
      partialDocument: {
        subtype: 'Food, Food Waste and Beverages',
      },
      resultComment: RESULT_COMMENTS.failed.INVALID_SUBTYPE_CDM_CODE_MISMATCH,
      resultContent: {
        description: WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
        id: '02 01 01',
        recyclerCountryCode: 'BR',
        subtype: 'Food, Food Waste and Beverages',
      },
      resultStatus: 'FAILED',
      scenario:
        'The subtype does not match the CDM_CODE for the provided classification ID',
    },
    {
      events: {
        'ACTOR-Recycler': brazilianRecyclerEvent,
        'Pick-up': stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            ['Local Waste Classification ID', '02 01 02'],
            [
              'Local Waste Classification Description',
              WASTE_CLASSIFICATION_CODES.BR['02 01 02'].description,
            ],
          ],
        }),
      },
      partialDocument: {
        subtype: 'Food, Food Waste and Beverages',
      },
      resultComment: RESULT_COMMENTS.passed.VALID_CLASSIFICATION,
      resultContent: {
        description: WASTE_CLASSIFICATION_CODES.BR['02 01 02'].description,
        id: '02 01 02',
        recyclerCountryCode: 'BR',
        subtype: 'Food, Food Waste and Beverages',
      },
      resultStatus: 'PASSED',
      scenario:
        'The subtype matches the CDM_CODE for the provided classification ID',
    },
    {
      events: {
        'ACTOR-Recycler': brazilianRecyclerEvent,
        'Pick-up': stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            ['Local Waste Classification ID', '02 01 07'],
            [
              'Local Waste Classification Description',
              WASTE_CLASSIFICATION_CODES.BR['02 01 07'].description,
            ],
          ],
        }),
      },
      partialDocument: {
        subtype: 'Wood and Wood Products',
      },
      resultComment: RESULT_COMMENTS.passed.VALID_CLASSIFICATION,
      resultContent: {
        description: WASTE_CLASSIFICATION_CODES.BR['02 01 07'].description,
        id: '02 01 07',
        recyclerCountryCode: 'BR',
        subtype: 'Wood and Wood Products',
      },
      resultStatus: 'PASSED',
      scenario:
        'The subtype matches the CDM_CODE 8.1 for Wood and Wood Products',
    },
    {
      events: {
        'ACTOR-Recycler': brazilianRecyclerEvent,
        'Pick-up': stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            ['Local Waste Classification ID', '02 02 04'],
            [
              'Local Waste Classification Description',
              WASTE_CLASSIFICATION_CODES.BR['02 02 04'].description,
            ],
          ],
        }),
      },
      partialDocument: {
        subtype: 'Domestic Sludge',
      },
      resultComment: RESULT_COMMENTS.passed.VALID_CLASSIFICATION,
      resultContent: {
        description: WASTE_CLASSIFICATION_CODES.BR['02 02 04'].description,
        id: '02 02 04',
        recyclerCountryCode: 'BR',
        subtype: 'Domestic Sludge',
      },
      resultStatus: 'PASSED',
      scenario: 'The subtype matches the CDM_CODE 8.7C for Domestic Sludge',
    },
    {
      events: {
        'ACTOR-Recycler': brazilianRecyclerEvent,
        'Pick-up': stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            ['Local Waste Classification ID', '02 01 01'],
            [
              'Local Waste Classification Description',
              WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
            ],
          ],
        }),
      },
      partialDocument: {
        subtype: 'Tobacco',
      },
      resultComment: RESULT_COMMENTS.failed.INVALID_SUBTYPE_MAPPING,
      resultContent: {
        description: WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
        id: '02 01 01',
        recyclerCountryCode: 'BR',
        subtype: 'Tobacco',
      },
      resultStatus: 'FAILED',
      scenario:
        'The subtype does not map to a valid CDM_CODE (TOBACCO has no mapping)',
    },
    {
      events: {
        'ACTOR-Recycler': brazilianRecyclerEvent,
        'Pick-up': stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            ['Local Waste Classification ID', '02 01 01'],
            [
              'Local Waste Classification Description',
              WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
            ],
          ],
        }),
      },
      partialDocument: {
        subtype: undefined,
      },
      resultComment: 'Rule not applicable',
      resultContent: undefined,
      resultStatus: 'PASSED',
      scenario: 'The document does not have a subtype (rule not applicable)',
    },
  ];
