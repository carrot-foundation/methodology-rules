import { S3Client } from '@aws-sdk/client-s3';
import { TextractClient } from '@aws-sdk/client-textract';

import type { TextExtractor } from './text-extractor.types';

import { TextractService } from './textract.service';

const region = process.env['AWS_REGION'];
const regionConfig = region ? { region } : {};

const textractClient = new TextractClient(regionConfig);
const s3Client = new S3Client(regionConfig);

export const textExtractor: TextExtractor = new TextractService(
  textractClient,
  s3Client,
);
