import { getOrDefault } from '@carrot-fndn/shared/helpers';
import { assert } from 'typia';

export const AUDIT_API_URL_MAP = {
  development: 'https://smaug.carrot.eco',
  production: 'https://core.carrot.eco',
} as const;

export const AUDIT_API_URL =
  AUDIT_API_URL_MAP[
    assert<'development' | 'production'>(
      getOrDefault(process.env['ENVIRONMENT'], 'development'),
    )
  ];
