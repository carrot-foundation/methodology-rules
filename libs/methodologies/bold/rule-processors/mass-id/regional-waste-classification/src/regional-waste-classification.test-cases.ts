import {
  stubAddress,
  stubBoldMassIdPickUpEvent,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
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
    resultComment: RESULT_COMMENTS.VALID_CLASSIFICATION,
    resultContent: {
      description: WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
      id: '02 01 01',
      recyclerCountryCode: 'BR',
    },
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'the local waste classification ID and description match an IBAMA code.',
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
    resultComment: RESULT_COMMENTS.VALID_CLASSIFICATION,
    resultContent: {
      description: WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
      id: '020101',
      recyclerCountryCode: 'BR',
    },
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'the local waste classification ID and description match the IBAMA code without spaces.',
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
    resultComment: RESULT_COMMENTS.VALID_CLASSIFICATION,
    resultContent: {
      description: `***${WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description} - (*)`,
      id: '02 01 01',
      recyclerCountryCode: 'BR',
    },
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'the local waste classification description has leading/trailing special characters but matches after normalization.',
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
    resultComment: RESULT_COMMENTS.CLASSIFICATION_ID_MISSING,
    resultContent: {
      description: WASTE_CLASSIFICATION_CODES.BR['02 01 01'].description,
      id: undefined,
      recyclerCountryCode: 'BR',
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
    resultComment: RESULT_COMMENTS.CLASSIFICATION_DESCRIPTION_MISSING,
    resultContent: {
      description: undefined,
      id: '02 01 01',
      recyclerCountryCode: 'BR',
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
    resultComment: RESULT_COMMENTS.INVALID_CLASSIFICATION_DESCRIPTION,
    resultContent: {
      description: randomDescription,
      id: '02 01 01',
      recyclerCountryCode: 'BR',
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
    resultComment: RESULT_COMMENTS.UNSUPPORTED_COUNTRY('US'),
    resultContent: {
      description: randomDescription,
      id: '02 01 01',
      recyclerCountryCode: 'US',
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
    resultComment: RESULT_COMMENTS.INVALID_CLASSIFICATION_ID,
    resultContent: {
      description: randomDescription,
      id: randomId,
      recyclerCountryCode: 'BR',
    },
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the local waste classification ID is not valid.',
  },
];
