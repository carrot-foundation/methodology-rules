import type { Uri } from '@carrot-fndn/shared/types';

import { createAssert, createIs } from 'typia';

import type { MethodologyCreditNftMetadataDto } from './nft-metadata-selection.dto';

export const isUri = createIs<Uri>();

export const assertMethodologyCreditNftMetadataDto =
  createAssert<MethodologyCreditNftMetadataDto>();
