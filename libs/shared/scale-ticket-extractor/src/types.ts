import type {
  ExtractedData,
  Parser,
  TextractExtractionResult,
} from '@carrot-fndn/shared/text-extractor';

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
        unit: string;
        value: number;
      };
  isValid: boolean | undefined;
  netWeight: { unit: string; value: number };

  ticketNumber: string | undefined;
}

export interface ScaleTicketParser<T extends ScaleTicketData = ScaleTicketData>
  extends Parser<T> {
  parse(extractionResult: TextractExtractionResult): T;
}
