import { faker } from '@faker-js/faker';

import {
  BOLD_ROOT_DOCUMENT_CRITERIA,
  DocumentQueryCriteriaSchema,
  PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA,
} from './document-query.criteria';

describe('DocumentQueryCriteriaSchema', () => {
  it('should accept the participant-accreditation document-query criteria', () => {
    expect(
      DocumentQueryCriteriaSchema.parse(
        PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA,
      ),
    ).toEqual(PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA);
  });

  it('should accept the explicit root-only criteria', () => {
    expect(
      DocumentQueryCriteriaSchema.parse(BOLD_ROOT_DOCUMENT_CRITERIA),
    ).toEqual(BOLD_ROOT_DOCUMENT_CRITERIA);
  });

  it('should accept recursive non-empty document field values outside BOLD enums', () => {
    expect(
      DocumentQueryCriteriaSchema.safeParse({
        parentDocument: {
          category: 'Custom parent category',
          relatedDocuments: [
            {
              subtype: 'Custom nested subtype',
              type: 'Custom nested type',
            },
          ],
        },
        relatedDocuments: [
          {
            category: 'Custom related category',
            subtype: 'Custom related subtype',
            type: 'Custom related type',
          },
        ],
      }).success,
    ).toBe(true);
  });

  it.each([
    [[]],
    [{ unknown: faker.string.sample() }],
    [{ parentDocument: { omit: faker.string.sample() } }],
    [{ relatedDocuments: [{ category: faker.number.int() }] }],
    [
      {
        parentDocument: {
          relatedDocuments: [{ type: faker.number.int() }],
        },
      },
    ],
  ])('should reject invalid criteria %j', (criteria) => {
    expect(DocumentQueryCriteriaSchema.safeParse(criteria).success).toBe(false);
  });
});
