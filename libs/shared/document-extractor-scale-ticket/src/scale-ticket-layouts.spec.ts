import type { NonEmptyString } from '@carrot-fndn/shared/types';

import { createDocumentExtractor } from '@carrot-fndn/shared/document-extractor';
import {
  stubTextExtractionResult,
  type TextExtractor,
} from '@carrot-fndn/shared/text-extractor';

import type { ScaleTicketExtractedData } from './scale-ticket.types';

import './index';
import {
  stubLayout1TicketText,
  stubPesagemManualText,
  stubToledoGuardianText,
} from './scale-ticket.stubs';

const ALL_LAYOUTS = [
  'layout-1',
  'pesagem-manual',
  'toledo-guardian',
] as NonEmptyString[];

describe('scale ticket layout selection', () => {
  const textExtractor: TextExtractor = {
    extractText: vi.fn(),
  };
  const extractor = createDocumentExtractor(textExtractor);

  const extract = (rawText: string, layouts: NonEmptyString[]) =>
    extractor.extract<ScaleTicketExtractedData>(
      { filePath: 'ticket.jpg' },
      {
        documentType: 'scaleTicket',
        layouts,
        textExtractionResult: stubTextExtractionResult(rawText),
      },
    );

  it.each([
    { expectedLayout: 'layout-1', text: stubLayout1TicketText() },
    {
      expectedLayout: 'pesagem-manual',
      text: stubPesagemManualText({
        gross: '12.000',
        net: '2.000',
        tare: '10.000',
      }),
    },
    {
      expectedLayout: 'toledo-guardian',
      text: stubToledoGuardianText({
        firstWeighing: '9500 kg',
        net: '500 kg',
        secondWeighing: '10.000 kg',
      }),
    },
  ])(
    'should select $expectedLayout whatever the configured layout order',
    async ({ expectedLayout, text }) => {
      const forward = await extract(text, ALL_LAYOUTS);
      const reversed = await extract(text, ALL_LAYOUTS.toReversed());

      expect(forward.layoutId).toBe(expectedLayout);
      expect(reversed.layoutId).toBe(expectedLayout);
    },
  );

  it('should parse a layout-1 ticket identically with or without the other layouts', async () => {
    const text = stubLayout1TicketText();

    const layout1Only = await extract(text, ['layout-1'] as NonEmptyString[]);
    const allLayouts = await extract(text, ALL_LAYOUTS);

    expect(allLayouts).toEqual(layout1Only);
    expect(allLayouts.data.netWeight?.parsed.value).toBe(5000);
  });
});
