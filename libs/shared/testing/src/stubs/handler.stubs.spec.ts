import { faker } from '@faker-js/faker';

import { stubRuleOutput } from './handler.stubs';

describe('stubRuleOutput timing compatibility', () => {
  it('keeps default fixtures legacy and retains explicitly supplied timing', () => {
    const startedAt = faker.date.recent().toISOString();
    const timing = {
      attemptId: faker.string.uuid(),
      finishedAt: new Date(Date.parse(startedAt) + 10).toISOString(),
      startedAt,
    };

    expect(stubRuleOutput()).not.toHaveProperty('timing');
    expect(stubRuleOutput({ timing })).toHaveProperty('timing', timing);
  });
});
