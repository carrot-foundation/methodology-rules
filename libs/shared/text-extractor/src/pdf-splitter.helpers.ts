import { logger } from '@carrot-fndn/shared/helpers';
import { PDFDocument } from 'pdf-lib';

export const splitPdfPages = async (
  pdfBytes: Uint8Array,
): Promise<Uint8Array[]> => {
  const sourceDocument = await PDFDocument.load(pdfBytes);
  const pageCount = sourceDocument.getPageCount();

  logger.info(`Splitting PDF into ${pageCount} individual pages`);

  const pages: Uint8Array[] = [];

  for (let index = 0; index < pageCount; index++) {
    const singlePageDocument = await PDFDocument.create();
    const [copiedPage] = await singlePageDocument.copyPages(sourceDocument, [
      index,
    ]);

    /* istanbul ignore next -- defensive: copyPages always returns requested pages */
    if (!copiedPage) {
      throw new Error(`Failed to copy page ${index + 1} from PDF`);
    }

    singlePageDocument.addPage(copiedPage);
    pages.push(await singlePageDocument.save());
  }

  return pages;
};
