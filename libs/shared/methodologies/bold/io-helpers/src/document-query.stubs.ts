import { faker } from '@faker-js/faker';

import type { QueryContext } from './document-query.service.types';

export const stubQueryContext = (): QueryContext => ({
  s3KeyPrefix: faker.string.uuid(),
});
