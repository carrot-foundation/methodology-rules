import type {
  ExtractedData,
  Parser,
  TextractExtractionResult,
} from '@carrot-fndn/shared/text-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

export interface ScaleTicketData extends ExtractedData {
  finalWeight:
    | undefined
    | {
        timestamp?: Date;
        unit: string;
        value: number;
      };

  initialWeight:
    | undefined
    | {
        timestamp?: Date;
        unit: NonEmptyString;
        value: number;
      };
  isValid: boolean | undefined;
  netWeight: { unit: NonEmptyString; value: number };

  ticketNumber: NonEmptyString | undefined;
}

export interface ScaleTicketParser<T extends ScaleTicketData = ScaleTicketData>
  extends Parser<T> {
  parse(extractionResult: TextractExtractionResult): T;
}
