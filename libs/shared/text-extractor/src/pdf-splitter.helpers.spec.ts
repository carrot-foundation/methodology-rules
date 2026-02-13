import { logger } from '@carrot-fndn/shared/helpers';
import { PDFDocument } from 'pdf-lib';

import { splitPdfPages } from './pdf-splitter.helpers';

const createTestPdf = async (pageCount: number): Promise<Uint8Array> => {
  const document = await PDFDocument.create();

  for (let index = 0; index < pageCount; index++) {
    document.addPage();
  }

  return document.save();
};

describe('splitPdfPages', () => {
  beforeEach(() => {
    jest.spyOn(logger, 'info').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should split a 2-page PDF into 2 single-page PDFs', async () => {
    const pdfBytes = await createTestPdf(2);

    const pages = await splitPdfPages(pdfBytes);

    expect(pages).toHaveLength(2);

    for (const page of pages) {
      const loadedDocument = await PDFDocument.load(page);

      expect(loadedDocument.getPageCount()).toBe(1);
    }
  });

  it('should return a single page for a 1-page PDF', async () => {
    const pdfBytes = await createTestPdf(1);

    const pages = await splitPdfPages(pdfBytes);

    expect(pages).toHaveLength(1);

    const loadedDocument = await PDFDocument.load(pages[0]!);

    expect(loadedDocument.getPageCount()).toBe(1);
  });

  it('should split a 5-page PDF into 5 single-page PDFs', async () => {
    const pdfBytes = await createTestPdf(5);

    const pages = await splitPdfPages(pdfBytes);

    expect(pages).toHaveLength(5);
  });

  it('should log the page count', async () => {
    const pdfBytes = await createTestPdf(3);

    await splitPdfPages(pdfBytes);

    expect(logger.info).toHaveBeenCalledWith(
      'Splitting PDF into 3 individual pages',
    );
  });
});
