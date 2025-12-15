import { TextractClient } from '@aws-sdk/client-textract';

import { TextractService } from './textract.service';

const textractClient = new TextractClient();

export const provideTextractService = new TextractService(textractClient);
