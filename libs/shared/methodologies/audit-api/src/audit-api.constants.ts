import type { Uri } from '@carrot-fndn/shared/types';

import { assert } from 'typia';

export const AUDIT_API_URL = assert<Uri>(process.env['AUDIT_URL']);
