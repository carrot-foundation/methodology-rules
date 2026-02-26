import type { DocumentType } from '@carrot-fndn/shared/document-extractor';

import { input, select } from '@inquirer/prompts';

import { EXTRACT_OPTIONS } from './extract.constants';

const DOCUMENT_TYPE_CHOICES: Array<{
  name: string;
  value: DocumentType;
}> = [
  { name: 'Scale Ticket', value: 'scaleTicket' },
  { name: 'Transport Manifest (MTR)', value: 'transportManifest' },
  { name: 'Recycling Manifest (CDF)', value: 'recyclingManifest' },
];

export const promptForFilePath = (): Promise<string> =>
  input({
    message: 'Enter file path or glob pattern:',
    validate: (value) => {
      if (value.trim().length === 0) {
        return 'File path is required';
      }

      return true;
    },
  });

export const promptForDocumentType = (): Promise<DocumentType> =>
  select({
    choices: DOCUMENT_TYPE_CHOICES,
    message: `Select document type (use ${EXTRACT_OPTIONS.documentType}):`,
  });
