import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  clearRegistry,
  createDocumentExtractor,
  registerParser,
} from '@carrot-fndn/shared/document-extractor';
import {
  pdfTextLayerExtractor,
  stubImageOnlyPdf,
  type StubPdfLine,
  stubPdfWithLines,
  stubTextExtractionResult,
} from '@carrot-fndn/shared/text-extractor';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { MtrExtractedData } from './transport-manifest.types';

import { MtrSinfatParser } from './mtr-sinfat.parser';

const GENERATOR_TAX_ID = '12.345.678/0001-90';
const HAULER_TAX_ID = '98.765.432/0001-10';
const OTHER_HAULER_TAX_ID = '55.666.777/0001-88';
const RECEIVER_TAX_ID = '11.222.333/0001-44';

const mtrLines = ({
  generatorCity = { text: 'Município: São Gabriel' },
  generatorTaxId,
  haulerTaxId = { text: `CNPJ: ${HAULER_TAX_ID}` },
  receiverTaxId = { text: `CNPJ: ${RECEIVER_TAX_ID}` },
}: {
  generatorCity?: StubPdfLine;
  generatorTaxId: StubPdfLine;
  haulerTaxId?: StubPdfLine;
  receiverTaxId?: StubPdfLine;
}): StubPdfLine[] => [
  { text: 'Manifesto de Transporte de Residuos' },
  { text: 'Fundacao Estadual de Protecao Ambiental' },
  { text: 'MTR nº 0124048986' },
  { text: 'Data de Emissao: 15/03/2024' },
  { text: 'Gerador' },
  { text: 'EMPRESA GERADORA LTDA' },
  generatorTaxId,
  { text: 'Endereco: Rua Industrial, 100' },
  generatorCity,
  { text: 'UF: RS' },
  { text: 'Transportador' },
  { text: 'TRANSPORTES AMBIENTAIS S.A.' },
  haulerTaxId,
  { text: 'Endereco: Av. Brasil, 500' },
  { text: 'Municipio: Porto Alegre' },
  { text: 'UF: RS' },
  { text: 'Destinatario' },
  { text: 'RECICLAGEM SUSTENTAVEL LTDA' },
  receiverTaxId,
  { text: 'Endereco: Rod. BR-116, Km 20' },
  { text: 'Municipio: Curitiba' },
  { text: 'UF: PR' },
];

const toText = (lines: readonly StubPdfLine[]): NonEmptyString =>
  lines.map((line) => line.text).join('\n');

const ocrLines = mtrLines({
  generatorCity: { text: '' },
  generatorTaxId: { text: 'CNPJ:' },
  receiverTaxId: { text: 'CNPJ:' },
});

const extractOcrOnly = () =>
  createDocumentExtractor({
    extractText: () => Promise.reject(new Error('not used')),
  }).extract<MtrExtractedData>(
    { filePath: 'unused' },
    {
      documentType: 'transportManifest',
      layouts: ['mtr-sinfat' as NonEmptyString],
      textExtractionResult: stubTextExtractionResult(toText(ocrLines)),
    },
  );

describe('MTR PDF text-layer fallback', () => {
  let directory: string;

  const extract = async (pdf: Uint8Array, ocrText = toText(ocrLines)) => {
    const filePath = path.join(directory, 'mtr.pdf');

    await writeFile(filePath, pdf);

    return createDocumentExtractor(
      { extractText: () => Promise.reject(new Error('not used')) },
      pdfTextLayerExtractor,
    ).extract<MtrExtractedData>(
      { filePath },
      {
        documentType: 'transportManifest',
        layouts: ['mtr-sinfat' as NonEmptyString],
        textExtractionResult: stubTextExtractionResult(ocrText),
      },
    );
  };

  beforeEach(async () => {
    clearRegistry();
    registerParser('transportManifest', 'mtr-sinfat', MtrSinfatParser);
    directory = await mkdtemp(path.join(os.tmpdir(), 'mtr-text-layer-'));
  });

  afterEach(async () => {
    await rm(directory, { force: true, recursive: true });
  });

  it('should fill a tax id and an accented-label city OCR missed from the visible text layer', async () => {
    const result = await extract(
      await stubPdfWithLines(
        mtrLines({ generatorTaxId: { text: `CNPJ: ${GENERATOR_TAX_ID}` } }),
      ),
    );

    expect(result.data.generator?.taxId).toMatchObject({
      confidence: 'high',
      parsed: GENERATOR_TAX_ID,
    });
    expect(result.data.generator?.city).toMatchObject({
      confidence: 'high',
      parsed: 'Sao Gabriel',
    });
    expect(result.data.lowConfidenceFields).not.toContain('generator.taxId');
    expect(result.reviewReasons.map(({ code }) => code)).not.toContain(
      'LOW_CONFIDENCE_GENERATOR.TAX_ID',
    );
  });

  it('should drop only a tax id drawn in invisible mode', async () => {
    const result = await extract(
      await stubPdfWithLines(
        mtrLines({
          generatorTaxId: {
            concealment: 'invisible-mode',
            text: `CNPJ: ${GENERATOR_TAX_ID}`,
          },
        }),
      ),
    );

    expect(result.data.generator?.taxId.parsed).toBe('');
    expect(result.data.lowConfidenceFields).toContain('generator.taxId');
    expect(result.data.receiver?.taxId.parsed).toBe(RECEIVER_TAX_ID);
  });

  it.each(['clipped', 'white', 'off-page', 'covered', 'under-image'] as const)(
    'should drop the whole text layer when a tax id is painted %s',
    async (concealment) => {
      const textLayerSpy = vi.spyOn(pdfTextLayerExtractor, 'extractText');
      const result = await extract(
        await stubPdfWithLines(
          mtrLines({
            generatorTaxId: { concealment, text: `CNPJ: ${GENERATOR_TAX_ID}` },
          }),
        ),
      );

      expect(result).toEqual(await extractOcrOnly());
      await expect(textLayerSpy.mock.results[0]?.value).rejects.toThrow();
    },
  );

  it('should fill nothing and flag review when a high-confidence OCR field disagrees', async () => {
    const result = await extract(
      await stubPdfWithLines(
        mtrLines({
          generatorTaxId: { text: `CNPJ: ${GENERATOR_TAX_ID}` },
          haulerTaxId: { text: `CNPJ: ${OTHER_HAULER_TAX_ID}` },
        }),
      ),
    );

    expect(result.data.generator?.taxId.parsed).toBe('');
    expect(result.reviewRequired).toBe(true);
    expect(result.reviewReasons).toContainEqual({
      code: 'TEXT_LAYER_MISMATCH',
      description: expect.stringContaining('hauler.taxId') as string,
    });
  });

  it('should ignore a disagreeing value that is not visible', async () => {
    const result = await extract(
      await stubPdfWithLines(
        mtrLines({
          generatorTaxId: { text: `CNPJ: ${GENERATOR_TAX_ID}` },
          haulerTaxId: {
            concealment: 'invisible-mode',
            text: `CNPJ: ${OTHER_HAULER_TAX_ID}`,
          },
        }),
      ),
    );

    expect(result.data.generator?.taxId.parsed).toBe(GENERATOR_TAX_ID);
    expect(result.reviewReasons.map(({ code }) => code)).not.toContain(
      'TEXT_LAYER_MISMATCH',
    );
  });

  it('should return the OCR-only output for an image-only PDF', async () => {
    const textLayerSpy = vi.spyOn(pdfTextLayerExtractor, 'extractText');

    expect(await extract(await stubImageOnlyPdf())).toEqual(
      await extractOcrOnly(),
    );
    await expect(textLayerSpy.mock.results[0]?.value).rejects.toThrow();
  });
});
