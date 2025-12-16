import { TextractClient } from '@aws-sdk/client-textract';

import type { TextExtractor } from './text-extractor.types';

import { TextractService } from './textract.service';

const textractClient = new TextractClient();

export const textExtractor: TextExtractor = new TextractService(textractClient);
