import { createRandom } from 'typia';

import type { QueryContext } from './document-query.service.types';

export const stubQueryContext = createRandom<QueryContext>();
