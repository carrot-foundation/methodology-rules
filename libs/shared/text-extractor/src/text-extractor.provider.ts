import { TextractClient } from '@aws-sdk/client-textract';

import type { TextExtractor } from './text-extractor.types';

import { TextractService } from './textract.service';

const textractRegion = process.env['AWS_REGION'];

const textractClient = new TextractClient(
  textractRegion ? { region: textractRegion } : {},
);

export const textExtractor: TextExtractor = new TextractService(textractClient);
