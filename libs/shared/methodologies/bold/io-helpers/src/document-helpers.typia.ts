import type { Document } from '@carrot-fndn/shared/methodologies/bold/types';

import { createValidate } from 'typia';

export const validateDocument = createValidate<Document>();
