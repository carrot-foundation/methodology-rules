import { S3Client } from '@aws-sdk/client-s3';
import { TextractClient } from '@aws-sdk/client-textract';

import type { TextExtractor } from './text-extractor.types';

import { CachedTextExtractor } from './cached-text-extractor';
import { TextractService } from './textract.service';

const region = process.env['AWS_REGION'];
const regionConfig = region ? { region } : {};

const textractClient = new TextractClient(regionConfig);
const s3Client = new S3Client(regionConfig);

const base: TextExtractor = new TextractService(textractClient, s3Client);
const cacheDirectory = process.env['TEXTRACT_CACHE_DIR'];

export const textExtractor: TextExtractor = cacheDirectory
  ? new CachedTextExtractor(base, cacheDirectory)
  : base;
