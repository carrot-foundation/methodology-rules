import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  createExtractedEntityWithAddress,
  type ExtractedEntityWithAddressInfo,
  extractEntityFromSection,
  type ExtractionOutput,
  extractSection,
  finalizeExtraction,
} from '@carrot-fndn/shared/document-extractor';

import {
  MTR_ALL_FIELDS,
  MTR_REQUIRED_FIELDS,
  type MtrExtractedData,
} from './transport-manifest.types';

export const MTR_ADDRESS_PATTERNS = {
  // eslint-disable-next-line sonarjs/slow-regex
  address: /Endereco\s*:?\s*(.+)/i,
  // eslint-disable-next-line sonarjs/slow-regex
  city: /Municipio\s*:?\s*(.+)/i,
  // eslint-disable-next-line sonarjs/slow-regex
  state: /(?:UF|Estado)\s*:?\s*(\w{2})/i,
} as const;

export const stripTrailingRegistrationNumber = (name: string): string =>
  // eslint-disable-next-line sonarjs/slow-regex
  name.replace(/\s+[-–]?\s*\d{1,7}$/, '').trim();

export const extractAddressFields = (
  sectionText: string,
): undefined | { address: string; city: string; state: string } => {
  const addressMatch = MTR_ADDRESS_PATTERNS.address.exec(sectionText);
  const cityMatch = MTR_ADDRESS_PATTERNS.city.exec(sectionText);
  const stateMatch = MTR_ADDRESS_PATTERNS.state.exec(sectionText);

  if (!addressMatch?.[1] || !cityMatch?.[1] || !stateMatch?.[1]) {
    return undefined;
  }

  return {
    address: addressMatch[1].trim(),
    city: cityMatch[1].trim(),
    state: stateMatch[1].trim(),
  };
};

export const extractMtrEntityWithAddress = (
  rawText: string,
  sectionPattern: RegExp,
  allSectionPatterns: RegExp[],
  cnpjPattern: RegExp,
): ExtractedEntityWithAddressInfo => {
  const entityExtracted = extractEntityFromSection(
    rawText,
    sectionPattern,
    allSectionPatterns,
    cnpjPattern,
  );

  const section = extractSection(rawText, sectionPattern, allSectionPatterns);
  const addressFields = section ? extractAddressFields(section) : undefined;

  return createExtractedEntityWithAddress(
    entityExtracted
      ? {
          rawMatch: entityExtracted.rawMatch,
          value: {
            ...entityExtracted.value,
            name: stripTrailingRegistrationNumber(
              entityExtracted.value.name,
            ) as NonEmptyString,
            ...addressFields,
          },
        }
      : undefined,
  );
};

export const finalizeMtrExtraction = (
  partialData: Partial<MtrExtractedData>,
  matchScore: number,
  rawText: string,
): ExtractionOutput<MtrExtractedData> =>
  finalizeExtraction<MtrExtractedData>({
    allFields: [...MTR_ALL_FIELDS],
    confidenceFields: [
      partialData.documentNumber,
      partialData.issueDate,
      partialData.generator?.name,
      partialData.generator?.taxId,
      partialData.hauler?.name,
      partialData.hauler?.taxId,
      partialData.receiver?.name,
      partialData.receiver?.taxId,
    ],
    documentType: 'transportManifest',
    matchScore,
    partialData,
    rawText,
    requiredFields: [...MTR_REQUIRED_FIELDS],
  });
