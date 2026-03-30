import {
  stubDocument,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import { faker } from '@faker-js/faker';

import { WeighingRuleSubjectSchema } from './weighing.rule-subject';

const buildValidSubject = (weighingEventCount: number) => ({
  massIDDocumentId: faker.string.uuid(),
  recyclerAccreditationDocument: stubDocument(),
  weighingEvents: Array.from({ length: weighingEventCount }, () =>
    stubDocumentEvent({ name: DocumentEventName.WEIGHING }),
  ),
});

describe('WeighingRuleSubjectSchema', () => {
  it('should accept a valid single-step subject (1 event)', () => {
    const subject = buildValidSubject(1);

    const result = WeighingRuleSubjectSchema.safeParse(subject);

    expect(result.success).toBe(true);
  });

  it('should accept a valid two-step subject (2 events)', () => {
    const subject = buildValidSubject(2);

    const result = WeighingRuleSubjectSchema.safeParse(subject);

    expect(result.success).toBe(true);
  });

  it('should reject a subject with more than 2 weighing events via superRefine', () => {
    const subject = buildValidSubject(3);

    const result = WeighingRuleSubjectSchema.safeParse(subject);

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some(
        (issue) =>
          issue.path.includes('weighingEvents') && issue.code === 'custom',
      ),
    ).toBe(true);
    expect(
      result.error?.issues.some((issue) => issue.message.includes('at most 2')),
    ).toBe(true);
  });

  it('should reject a subject with zero weighing events', () => {
    const subject = buildValidSubject(0);

    const result = WeighingRuleSubjectSchema.safeParse(subject);

    expect(result.success).toBe(false);
  });

  it('should reject a subject missing required fields', () => {
    const result = WeighingRuleSubjectSchema.safeParse({});

    expect(result.success).toBe(false);

    const paths = result.error?.issues.map((issue) => issue.path[0]) ?? [];

    expect(paths).toContain('massIDDocumentId');
    expect(paths).toContain('recyclerAccreditationDocument');
    expect(paths).toContain('weighingEvents');
  });

  it('should reject a subject with an empty massIDDocumentId', () => {
    const subject = {
      ...buildValidSubject(1),
      massIDDocumentId: '',
    };

    const result = WeighingRuleSubjectSchema.safeParse(subject);

    expect(result.success).toBe(false);
  });
});
