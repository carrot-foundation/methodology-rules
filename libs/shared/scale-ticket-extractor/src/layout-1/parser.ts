import type { TextractExtractionResult } from '@carrot-fndn/shared/text-extractor';

import type { ScaleTicketParser } from '../types';

import {
  extractFinalWeight,
  extractInitialWeight,
  extractNetWeight,
  extractTicketNumber,
  extractTransporter,
  extractVehiclePlate,
} from './extractors';
import { validateWeights } from './helpers';
import { Layout1ScaleTicketData } from './types';

export class Layout1ScaleTicketParser
  implements ScaleTicketParser<Layout1ScaleTicketData>
{
  parse(extractionResult: TextractExtractionResult): Layout1ScaleTicketData {
    const { rawText } = extractionResult;

    const netWeight = extractNetWeight(rawText);

    if (!netWeight) {
      throw new Error('Net weight is required but could not be extracted');
    }

    const ticketNumber = extractTicketNumber(rawText);
    const vehiclePlate = extractVehiclePlate(rawText);
    const transporter = extractTransporter(rawText);
    const initialWeight = extractInitialWeight(rawText);
    const finalWeight = extractFinalWeight(rawText);

    const isValid = validateWeights(initialWeight, finalWeight, netWeight);

    return {
      finalWeight,
      initialWeight,
      isValid,
      netWeight,
      rawText,
      ticketNumber,
      transporter,
      vehiclePlate,
    };
  }
}
