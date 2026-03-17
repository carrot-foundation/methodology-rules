import { UriSchema } from '@carrot-fndn/shared/types';

export const AUDIT_API_URL = UriSchema.parse(process.env['AUDIT_URL']);
