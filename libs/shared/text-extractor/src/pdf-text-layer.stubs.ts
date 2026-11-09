import {
  beginText,
  clip,
  endPath,
  endText,
  moveText,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  setFontAndSize,
  setTextRenderingMode,
  showText,
  StandardFonts,
  TextRenderingMode,
} from 'pdf-lib';

export interface StubPdfLine {
  concealment?: StubPdfLineConcealment;
  text: string;
}

export type StubPdfLineConcealment =
  | 'clipped'
  | 'covered'
  | 'invisible-mode'
  | 'off-page'
  | 'under-image'
  | 'white';

const PAGE_SIZE: [number, number] = [600, 800];
const FONT_SIZE = 10;
const LINE_HEIGHT = 14;
const MARGIN = 40;

const ONE_PIXEL_PNG = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNgAAAAAgAB4iG8MwAAAABJRU5ErkJggg==',
  ),
  (character) => character.codePointAt(0)!,
);

export const stubPdfWithLines = async (
  lines: readonly StubPdfLine[],
): Promise<Uint8Array> => {
  const document = await PDFDocument.create();
  const page = document.addPage(PAGE_SIZE);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const image = await document.embedPng(ONE_PIXEL_PNG);

  for (const [index, { concealment, text }] of lines.entries()) {
    const y = PAGE_SIZE[1] - MARGIN - index * LINE_HEIGHT;
    const x = concealment === 'off-page' ? PAGE_SIZE[0] + MARGIN : MARGIN;

    if (concealment === 'clipped') {
      page.pushOperators(
        pushGraphicsState(),
        rectangle(0, 0, 1, 1),
        clip(),
        endPath(),
      );
      page.drawText(text, { font, size: FONT_SIZE, x, y });
      page.pushOperators(popGraphicsState());
      continue;
    }

    if (concealment === 'invisible-mode') {
      const fontKey = page.node.newFontDictionary(font.name, font.ref);

      page.pushOperators(
        pushGraphicsState(),
        beginText(),
        setFontAndSize(fontKey, FONT_SIZE),
        setTextRenderingMode(TextRenderingMode.Invisible),
        moveText(x, y),
        showText(font.encodeText(text)),
        endText(),
        popGraphicsState(),
      );
      continue;
    }

    page.drawText(text, {
      color: concealment === 'white' ? rgb(1, 1, 1) : rgb(0, 0, 0),
      font,
      size: FONT_SIZE,
      x,
      y,
    });

    if (concealment === 'under-image') {
      page.drawImage(image, {
        height: LINE_HEIGHT,
        width: PAGE_SIZE[0] - 2 * MARGIN,
        x,
        y: y - FONT_SIZE / 2,
      });
    }

    if (concealment === 'covered') {
      page.drawRectangle({
        color: rgb(1, 1, 1),
        height: LINE_HEIGHT,
        width: PAGE_SIZE[0] - 2 * MARGIN,
        x,
        y: y - FONT_SIZE / 2,
      });
    }
  }

  return document.save();
};

export const stubImageOnlyPdf = async (): Promise<Uint8Array> => {
  const document = await PDFDocument.create();
  const page = document.addPage(PAGE_SIZE);
  const image = await document.embedPng(ONE_PIXEL_PNG);

  page.drawImage(image, {
    height: PAGE_SIZE[1],
    width: PAGE_SIZE[0],
    x: 0,
    y: 0,
  });

  return document.save();
};
