import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';
import type { PartialDeep } from 'type-fest';

import {
  type BoldExternalEventsObject,
  stubAddress,
  stubBoldMassIDPickUpEvent,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldAttributeName,
  type BoldDocument,
  BoldDocumentEventLabel,
  BoldDocumentEventName,
  MassIDOrganicSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { WASTE_CLASSIFICATION_CODES } from '@carrot-fndn/shared/methodologies/bold/utils';
import { type AnyObject } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';

import { RESULT_COMMENTS } from './regional-waste-classification.constants';

const {
  LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
  LOCAL_WASTE_CLASSIFICATION_ID,
} = BoldAttributeName;

const { ACTOR, PICK_UP } = BoldDocumentEventName;
const { RECYCLER } = BoldDocumentEventLabel;

const randomId = faker.lorem.word();
const randomDescription = faker.lorem.sentence();
const brazilianRecyclerEvent = stubDocumentEvent({
  address: stubAddress({
    countryCode: 'BR',
  }),
  label: RECYCLER,
  name: ACTOR,
});
const americanRecyclerEvent = stubDocumentEvent({
  address: stubAddress({
    countryCode: 'US',
  }),
  label: RECYCLER,
  name: ACTOR,
});

interface RegionalWasteClassificationTestCase extends RuleTestCase {
  events: BoldExternalEventsObject;
  partialDocument: PartialDeep<BoldDocument>;
  resultContent: AnyObject | undefined;
}

export const regionalWasteClassificationTestCases: RegionalWasteClassificationTestCase[] =
  [
    {
      events: {
        [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
        [PICK_UP]: stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            [LOCAL_WASTE_CLASSIFICATION_ID, '02 01 01'],
            [
              LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
              WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
            ],
          ],
        }),
      },
      manifestExample: true,
      partialDocument: {
        subtype: MassIDOrganicSubtype.INDUSTRIAL_SLUDGE,
      },
      resultComment: RESULT_COMMENTS.passed.VALID_CLASSIFICATION,
      resultContent: {
        description: WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
        id: '02 01 01',
        recyclerCountryCode: 'BR',
        subtype: MassIDOrganicSubtype.INDUSTRIAL_SLUDGE,
      },
      resultStatus: 'PASSED',
      scenario:
        'The local waste classification ID and description match a local waste classification code with matching subtype',
    },
    {
      events: {
        [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
        [PICK_UP]: stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            [LOCAL_WASTE_CLASSIFICATION_ID, '020101'],
            [
              LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
              WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
            ],
          ],
        }),
      },
      partialDocument: {
        subtype: MassIDOrganicSubtype.INDUSTRIAL_SLUDGE,
      },
      resultComment: RESULT_COMMENTS.passed.VALID_CLASSIFICATION,
      resultContent: {
        description: WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
        id: '020101',
        recyclerCountryCode: 'BR',
        subtype: MassIDOrganicSubtype.INDUSTRIAL_SLUDGE,
      },
      resultStatus: 'PASSED',
      scenario:
        'The local waste classification ID and description match the local waste classification code without spaces with matching subtype',
    },
    {
      events: {
        [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
        [PICK_UP]: stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            [LOCAL_WASTE_CLASSIFICATION_ID, '02 01 01'],
            [
              LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
              `***${WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description} - (*)`,
            ],
          ],
        }),
      },
      partialDocument: {
        subtype: MassIDOrganicSubtype.INDUSTRIAL_SLUDGE,
      },
      resultComment: RESULT_COMMENTS.passed.VALID_CLASSIFICATION,
      resultContent: {
        description: `***${WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description} - (*)`,
        id: '02 01 01',
        recyclerCountryCode: 'BR',
        subtype: MassIDOrganicSubtype.INDUSTRIAL_SLUDGE,
      },
      resultStatus: 'PASSED',
      scenario:
        'The local waste classification description has leading/trailing special characters but matches after normalization with matching subtype',
    },
    {
      events: {
        [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
        [PICK_UP]: stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            [LOCAL_WASTE_CLASSIFICATION_ID, undefined],
            [
              LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
              WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
            ],
          ],
        }),
      },
      partialDocument: {
        subtype: MassIDOrganicSubtype.INDUSTRIAL_SLUDGE,
      },
      resultComment: RESULT_COMMENTS.failed.CLASSIFICATION_ID_MISSING,
      resultContent: {
        description: WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
        id: undefined,
        recyclerCountryCode: 'BR',
        subtype: MassIDOrganicSubtype.INDUSTRIAL_SLUDGE,
      },
      resultStatus: 'FAILED',
      scenario: 'The local waste classification ID is missing',
    },
    {
      events: {
        [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
        [PICK_UP]: stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            [LOCAL_WASTE_CLASSIFICATION_ID, '02 01 01'],
            [LOCAL_WASTE_CLASSIFICATION_DESCRIPTION, undefined],
          ],
        }),
      },
      partialDocument: {
        subtype: MassIDOrganicSubtype.INDUSTRIAL_SLUDGE,
      },
      resultComment: RESULT_COMMENTS.failed.CLASSIFICATION_DESCRIPTION_MISSING,
      resultContent: {
        description: undefined,
        id: '02 01 01',
        recyclerCountryCode: 'BR',
        subtype: MassIDOrganicSubtype.INDUSTRIAL_SLUDGE,
      },
      resultStatus: 'FAILED',
      scenario: 'The local waste classification description is missing',
    },
    {
      events: {
        [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
        [PICK_UP]: stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            [LOCAL_WASTE_CLASSIFICATION_ID, '02 01 02'],
            [
              LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
              'Residuos de tecidos animais',
            ],
          ],
        }),
      },
      manifestExample: true,
      partialDocument: {
        subtype: MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
      },
      resultComment: RESULT_COMMENTS.passed.VALID_CLASSIFICATION,
      resultContent: {
        description: 'Residuos de tecidos animais',
        id: '02 01 02',
        recyclerCountryCode: 'BR',
        subtype: MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
      },
      resultStatus: 'PASSED',
      scenario:
        'The local waste classification description matches after normalization (accent stripped)',
    },
    {
      events: {
        [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
        [PICK_UP]: stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            [LOCAL_WASTE_CLASSIFICATION_ID, '02 01 01'],
            [LOCAL_WASTE_CLASSIFICATION_DESCRIPTION, randomDescription],
          ],
        }),
      },
      manifestExample: true,
      partialDocument: {
        subtype: MassIDOrganicSubtype.INDUSTRIAL_SLUDGE,
      },
      resultComment: RESULT_COMMENTS.failed.INVALID_CLASSIFICATION_DESCRIPTION,
      resultContent: {
        description: randomDescription,
        id: '02 01 01',
        recyclerCountryCode: 'BR',
        subtype: MassIDOrganicSubtype.INDUSTRIAL_SLUDGE,
      },
      resultStatus: 'FAILED',
      scenario:
        'The local waste classification description does not match the expected local waste classification code',
    },
    {
      events: {
        [`${ACTOR}-${RECYCLER}`]: americanRecyclerEvent,
        [PICK_UP]: stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            [LOCAL_WASTE_CLASSIFICATION_ID, '02 01 01'],
            [LOCAL_WASTE_CLASSIFICATION_DESCRIPTION, randomDescription],
          ],
        }),
      },
      partialDocument: {
        subtype: MassIDOrganicSubtype.INDUSTRIAL_SLUDGE,
      },
      resultComment: RESULT_COMMENTS.failed.UNSUPPORTED_COUNTRY('US'),
      resultContent: {
        description: randomDescription,
        id: '02 01 01',
        recyclerCountryCode: 'US',
        subtype: MassIDOrganicSubtype.INDUSTRIAL_SLUDGE,
      },
      resultStatus: 'FAILED',
      scenario: 'The recycler is not from Brazil',
    },
    {
      events: {
        [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
        [PICK_UP]: stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            [LOCAL_WASTE_CLASSIFICATION_ID, randomId],
            [LOCAL_WASTE_CLASSIFICATION_DESCRIPTION, randomDescription],
          ],
        }),
      },
      partialDocument: {
        subtype: MassIDOrganicSubtype.INDUSTRIAL_SLUDGE,
      },
      resultComment: RESULT_COMMENTS.failed.INVALID_CLASSIFICATION_ID,
      resultContent: {
        description: randomDescription,
        id: randomId,
        recyclerCountryCode: 'BR',
        subtype: MassIDOrganicSubtype.INDUSTRIAL_SLUDGE,
      },
      resultStatus: 'FAILED',
      scenario: 'The local waste classification ID is not valid',
    },
    {
      events: {
        [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
        [PICK_UP]: stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            [LOCAL_WASTE_CLASSIFICATION_ID, '02 01 01'],
            [
              LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
              WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
            ],
          ],
        }),
      },
      partialDocument: {
        subtype: MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
      },
      resultComment: RESULT_COMMENTS.failed.INVALID_SUBTYPE_CDM_CODE_MISMATCH,
      resultContent: {
        description: WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
        id: '02 01 01',
        recyclerCountryCode: 'BR',
        subtype: MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
      },
      resultStatus: 'FAILED',
      scenario:
        'The subtype does not match the CDM_CODE for the provided classification ID',
    },
    {
      events: {
        [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
        [PICK_UP]: stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            [LOCAL_WASTE_CLASSIFICATION_ID, '02 01 02'],
            [
              LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
              WASTE_CLASSIFICATION_CODES.BR['02 01 02'].description,
            ],
          ],
        }),
      },
      partialDocument: {
        subtype: MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
      },
      resultComment: RESULT_COMMENTS.passed.VALID_CLASSIFICATION,
      resultContent: {
        description: WASTE_CLASSIFICATION_CODES.BR['02 01 02'].description,
        id: '02 01 02',
        recyclerCountryCode: 'BR',
        subtype: MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
      },
      resultStatus: 'PASSED',
      scenario:
        'The subtype matches the CDM_CODE for the provided classification ID',
    },
    {
      events: {
        [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
        [PICK_UP]: stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            [LOCAL_WASTE_CLASSIFICATION_ID, '02 01 07'],
            [
              LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
              WASTE_CLASSIFICATION_CODES.BR['02 01 07'].description,
            ],
          ],
        }),
      },
      partialDocument: {
        subtype: MassIDOrganicSubtype.WOOD_AND_WOOD_PRODUCTS,
      },
      resultComment: RESULT_COMMENTS.passed.VALID_CLASSIFICATION,
      resultContent: {
        description: WASTE_CLASSIFICATION_CODES.BR['02 01 07'].description,
        id: '02 01 07',
        recyclerCountryCode: 'BR',
        subtype: MassIDOrganicSubtype.WOOD_AND_WOOD_PRODUCTS,
      },
      resultStatus: 'PASSED',
      scenario:
        'The subtype matches the CDM_CODE 8.1 for Wood and Wood Products',
    },
    {
      events: {
        [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
        [PICK_UP]: stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            [LOCAL_WASTE_CLASSIFICATION_ID, '02 02 04'],
            [
              LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
              WASTE_CLASSIFICATION_CODES.BR['02 02 04'].description,
            ],
          ],
        }),
      },
      partialDocument: {
        subtype: MassIDOrganicSubtype.DOMESTIC_SLUDGE,
      },
      resultComment: RESULT_COMMENTS.passed.VALID_CLASSIFICATION,
      resultContent: {
        description: WASTE_CLASSIFICATION_CODES.BR['02 02 04'].description,
        id: '02 02 04',
        recyclerCountryCode: 'BR',
        subtype: MassIDOrganicSubtype.DOMESTIC_SLUDGE,
      },
      resultStatus: 'PASSED',
      scenario: 'The subtype matches the CDM_CODE 8.7C for Domestic Sludge',
    },
    {
      events: {
        [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
        [PICK_UP]: stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            [LOCAL_WASTE_CLASSIFICATION_ID, '02 01 01'],
            [
              LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
              WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
            ],
          ],
        }),
      },
      partialDocument: {
        subtype: MassIDOrganicSubtype.TOBACCO,
      },
      resultComment: RESULT_COMMENTS.failed.INVALID_SUBTYPE_MAPPING,
      resultContent: {
        description: WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
        id: '02 01 01',
        recyclerCountryCode: 'BR',
        subtype: MassIDOrganicSubtype.TOBACCO,
      },
      resultStatus: 'FAILED',
      scenario:
        'The subtype does not map to a valid CDM_CODE (TOBACCO has no mapping)',
    },
    {
      events: {
        [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
        [PICK_UP]: stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            [LOCAL_WASTE_CLASSIFICATION_ID, '02 01 01'],
            [
              LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
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
