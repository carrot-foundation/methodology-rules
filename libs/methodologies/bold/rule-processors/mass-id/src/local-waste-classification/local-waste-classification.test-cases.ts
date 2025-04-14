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

import { WASTE_CLASSIFICATION_IDS } from './local-waste-classification.constants';
import { RESULT_COMMENTS } from './local-waste-classification.processor';

const {
  LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
  LOCAL_WASTE_CLASSIFICATION_ID,
} = DocumentEventAttributeName;

const { ACTOR, PICK_UP } = DocumentEventName;
const { RECYCLER } = MethodologyDocumentEventLabel;

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

export const localWasteClassificationTestCases = [
  {
    events: {
      [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
      [PICK_UP]: stubBoldMassIdPickUpEvent({
        metadataAttributes: [
          [LOCAL_WASTE_CLASSIFICATION_ID, '02 01 01'],
          [
            LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
            WASTE_CLASSIFICATION_IDS.BR['02 01 01'].description,
          ],
        ],
      }),
    },
    resultComment: RESULT_COMMENTS.VALID_CLASSIFICATION,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario:
      'the local waste classification ID and description match an IBAMA code.',
  },
  {
    events: {
      [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
      [PICK_UP]: stubBoldMassIdPickUpEvent({
        metadataAttributes: [
          [LOCAL_WASTE_CLASSIFICATION_ID, undefined],
          [
            LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
            WASTE_CLASSIFICATION_IDS.BR['02 01 01'].description,
          ],
        ],
      }),
    },
    resultComment: RESULT_COMMENTS.CLASSIFICATION_ID_MISSING,
    resultStatus: RuleOutputStatus.REJECTED,
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
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'the local waste classification description is missing.',
  },
  {
    events: {
      [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
      [PICK_UP]: stubBoldMassIdPickUpEvent({
        metadataAttributes: [
          [LOCAL_WASTE_CLASSIFICATION_ID, '02 01 01'],
          [LOCAL_WASTE_CLASSIFICATION_DESCRIPTION, faker.lorem.sentence()],
        ],
      }),
    },
    resultComment: RESULT_COMMENTS.INVALID_CLASSIFICATION_DESCRIPTION,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario:
      'the local waste classification description does not match the expected IBAMA code.',
  },
  {
    events: {
      [`${ACTOR}-${RECYCLER}`]: americanRecyclerEvent,
      [PICK_UP]: stubBoldMassIdPickUpEvent({
        metadataAttributes: [
          [LOCAL_WASTE_CLASSIFICATION_ID, '02 01 01'],
          [LOCAL_WASTE_CLASSIFICATION_DESCRIPTION, faker.lorem.sentence()],
        ],
      }),
    },
    resultComment: RESULT_COMMENTS.UNSUPPORTED_COUNTRY('US'),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'the recycler is not from Brazil.',
  },
  {
    events: {
      [`${ACTOR}-${RECYCLER}`]: brazilianRecyclerEvent,
      [PICK_UP]: stubBoldMassIdPickUpEvent({
        metadataAttributes: [
          [LOCAL_WASTE_CLASSIFICATION_ID, faker.lorem.word()],
          [LOCAL_WASTE_CLASSIFICATION_DESCRIPTION, faker.lorem.sentence()],
        ],
      }),
    },
    resultComment: RESULT_COMMENTS.INVALID_CLASSIFICATION_ID,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'the local waste classification ID is not valid.',
  },
];
