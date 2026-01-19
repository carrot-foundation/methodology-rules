import {
  stubAddress,
  stubBoldMassIdPickUpEvent,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
  MassIdOrganicSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';

import { WASTE_CLASSIFICATION_CODES } from './regional-waste-classification.constants';
import { RESULT_COMMENTS } from './regional-waste-classification.processor';

const {
  LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
  LOCAL_WASTE_CLASSIFICATION_ID,
} = DocumentEventAttributeName;

const { ACTOR, PICK_UP } = DocumentEventName;
const { RECYCLER } = MethodologyDocumentEventLabel;

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

export const regionalWasteClassificationTestCases = [
  {
    events: {
      [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
      [PICK_UP]: stubBoldMassIdPickUpEvent({
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
      subtype: MassIdOrganicSubtype.INDUSTRIAL_SLUDGE,
    },
    resultComment: RESULT_COMMENTS.VALID_CLASSIFICATION,
    resultContent: {
      description: WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
      id: '02 01 01',
      recyclerCountryCode: 'BR',
      subtype: MassIdOrganicSubtype.INDUSTRIAL_SLUDGE,
    },
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'the local waste classification ID and description match an IBAMA code with matching subtype.',
  },
  {
    events: {
      [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
      [PICK_UP]: stubBoldMassIdPickUpEvent({
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
      subtype: MassIdOrganicSubtype.INDUSTRIAL_SLUDGE,
    },
    resultComment: RESULT_COMMENTS.VALID_CLASSIFICATION,
    resultContent: {
      description: WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
      id: '020101',
      recyclerCountryCode: 'BR',
      subtype: MassIdOrganicSubtype.INDUSTRIAL_SLUDGE,
    },
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'the local waste classification ID and description match the IBAMA code without spaces with matching subtype.',
  },
  {
    events: {
      [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
      [PICK_UP]: stubBoldMassIdPickUpEvent({
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
      subtype: MassIdOrganicSubtype.INDUSTRIAL_SLUDGE,
    },
    resultComment: RESULT_COMMENTS.VALID_CLASSIFICATION,
    resultContent: {
      description: `***${WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description} - (*)`,
      id: '02 01 01',
      recyclerCountryCode: 'BR',
      subtype: MassIdOrganicSubtype.INDUSTRIAL_SLUDGE,
    },
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'the local waste classification description has leading/trailing special characters but matches after normalization with matching subtype.',
  },
  {
    events: {
      [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
      [PICK_UP]: stubBoldMassIdPickUpEvent({
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
      subtype: MassIdOrganicSubtype.INDUSTRIAL_SLUDGE,
    },
    resultComment: RESULT_COMMENTS.CLASSIFICATION_ID_MISSING,
    resultContent: {
      description: WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
      id: undefined,
      recyclerCountryCode: 'BR',
      subtype: MassIdOrganicSubtype.INDUSTRIAL_SLUDGE,
    },
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the local waste classification ID is missing.',
  },
  {
    events: {
      [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
      [PICK_UP]: stubBoldMassIdPickUpEvent({
        metadataAttributes: [
          [LOCAL_WASTE_CLASSIFICATION_ID, '02 01 01'],
          [LOCAL_WASTE_CLASSIFICATION_DESCRIPTION, undefined],
        ],
      }),
    },
    partialDocument: {
      subtype: MassIdOrganicSubtype.INDUSTRIAL_SLUDGE,
    },
    resultComment: RESULT_COMMENTS.CLASSIFICATION_DESCRIPTION_MISSING,
    resultContent: {
      description: undefined,
      id: '02 01 01',
      recyclerCountryCode: 'BR',
      subtype: MassIdOrganicSubtype.INDUSTRIAL_SLUDGE,
    },
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the local waste classification description is missing.',
  },
  {
    events: {
      [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
      [PICK_UP]: stubBoldMassIdPickUpEvent({
        metadataAttributes: [
          [LOCAL_WASTE_CLASSIFICATION_ID, '02 01 01'],
          [LOCAL_WASTE_CLASSIFICATION_DESCRIPTION, randomDescription],
        ],
      }),
    },
    partialDocument: {
      subtype: MassIdOrganicSubtype.INDUSTRIAL_SLUDGE,
    },
    resultComment: RESULT_COMMENTS.INVALID_CLASSIFICATION_DESCRIPTION,
    resultContent: {
      description: randomDescription,
      id: '02 01 01',
      recyclerCountryCode: 'BR',
      subtype: MassIdOrganicSubtype.INDUSTRIAL_SLUDGE,
    },
    resultStatus: RuleOutputStatus.FAILED,
    scenario:
      'the local waste classification description does not match the expected IBAMA code.',
  },
  {
    events: {
      [`${ACTOR}-${RECYCLER}`]: americanRecyclerEvent,
      [PICK_UP]: stubBoldMassIdPickUpEvent({
        metadataAttributes: [
          [LOCAL_WASTE_CLASSIFICATION_ID, '02 01 01'],
          [LOCAL_WASTE_CLASSIFICATION_DESCRIPTION, randomDescription],
        ],
      }),
    },
    partialDocument: {
      subtype: MassIdOrganicSubtype.INDUSTRIAL_SLUDGE,
    },
    resultComment: RESULT_COMMENTS.UNSUPPORTED_COUNTRY('US'),
    resultContent: {
      description: randomDescription,
      id: '02 01 01',
      recyclerCountryCode: 'US',
      subtype: MassIdOrganicSubtype.INDUSTRIAL_SLUDGE,
    },
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the recycler is not from Brazil.',
  },
  {
    events: {
      [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
      [PICK_UP]: stubBoldMassIdPickUpEvent({
        metadataAttributes: [
          [LOCAL_WASTE_CLASSIFICATION_ID, randomId],
          [LOCAL_WASTE_CLASSIFICATION_DESCRIPTION, randomDescription],
        ],
      }),
    },
    partialDocument: {
      subtype: MassIdOrganicSubtype.INDUSTRIAL_SLUDGE,
    },
    resultComment: RESULT_COMMENTS.INVALID_CLASSIFICATION_ID,
    resultContent: {
      description: randomDescription,
      id: randomId,
      recyclerCountryCode: 'BR',
      subtype: MassIdOrganicSubtype.INDUSTRIAL_SLUDGE,
    },
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the local waste classification ID is not valid.',
  },
  {
    events: {
      [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
      [PICK_UP]: stubBoldMassIdPickUpEvent({
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
      subtype: MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
    },
    resultComment: RESULT_COMMENTS.INVALID_SUBTYPE_CDM_CODE_MISMATCH,
    resultContent: {
      description: WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
      id: '02 01 01',
      recyclerCountryCode: 'BR',
      subtype: MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
    },
    resultStatus: RuleOutputStatus.FAILED,
    scenario:
      'the subtype does not match the CDM_CODE for the provided classification ID.',
  },
  {
    events: {
      [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
      [PICK_UP]: stubBoldMassIdPickUpEvent({
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
      subtype: MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
    },
    resultComment: RESULT_COMMENTS.VALID_CLASSIFICATION,
    resultContent: {
      description: WASTE_CLASSIFICATION_CODES.BR['02 01 02'].description,
      id: '02 01 02',
      recyclerCountryCode: 'BR',
      subtype: MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
    },
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'the subtype matches the CDM_CODE for the provided classification ID.',
  },
  {
    events: {
      [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
      [PICK_UP]: stubBoldMassIdPickUpEvent({
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
      subtype: MassIdOrganicSubtype.WOOD_AND_WOOD_PRODUCTS,
    },
    resultComment: RESULT_COMMENTS.VALID_CLASSIFICATION,
    resultContent: {
      description: WASTE_CLASSIFICATION_CODES.BR['02 01 07'].description,
      id: '02 01 07',
      recyclerCountryCode: 'BR',
      subtype: MassIdOrganicSubtype.WOOD_AND_WOOD_PRODUCTS,
    },
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'the subtype matches the CDM_CODE 8.1 for Wood and Wood Products.',
  },
  {
    events: {
      [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
      [PICK_UP]: stubBoldMassIdPickUpEvent({
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
      subtype: MassIdOrganicSubtype.DOMESTIC_SLUDGE,
    },
    resultComment: RESULT_COMMENTS.VALID_CLASSIFICATION,
    resultContent: {
      description: WASTE_CLASSIFICATION_CODES.BR['02 02 04'].description,
      id: '02 02 04',
      recyclerCountryCode: 'BR',
      subtype: MassIdOrganicSubtype.DOMESTIC_SLUDGE,
    },
    resultStatus: RuleOutputStatus.PASSED,
    scenario: 'the subtype matches the CDM_CODE 8.7C for Domestic Sludge.',
  },
  {
    events: {
      [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
      [PICK_UP]: stubBoldMassIdPickUpEvent({
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
      subtype: MassIdOrganicSubtype.TOBACCO,
    },
    resultComment: RESULT_COMMENTS.INVALID_SUBTYPE_MAPPING,
    resultContent: {
      description: WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
      id: '02 01 01',
      recyclerCountryCode: 'BR',
      subtype: MassIdOrganicSubtype.TOBACCO,
    },
    resultStatus: RuleOutputStatus.FAILED,
    scenario:
      'the subtype does not map to a valid CDM_CODE (TOBACCO has no mapping).',
  },
  {
    events: {
      [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
      [PICK_UP]: stubBoldMassIdPickUpEvent({
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
    resultStatus: RuleOutputStatus.PASSED,
    scenario: 'the document does not have a subtype (rule not applicable).',
  },
];
