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
  generatorTaxId,
  haulerTaxId = HAULER_TAX_ID,
  receiverTaxId = { text: `CNPJ: ${RECEIVER_TAX_ID}` },
}: {
  generatorTaxId: StubPdfLine;
  haulerTaxId?: string;
  receiverTaxId?: StubPdfLine;
}): StubPdfLine[] => [
  { text: 'Manifesto de Transporte de Residuos' },
  { text: 'Fundacao Estadual de Protecao Ambiental' },
  { text: 'MTR no 0124048986' },
  { text: 'Data de Emissao: 15/03/2024' },
  { text: 'Gerador' },
  { text: 'EMPRESA GERADORA LTDA' },
  generatorTaxId,
  { text: 'Endereco: Rua Industrial, 100' },
  { text: 'Municipio: Cidade Interior' },
  { text: 'UF: RS' },
  { text: 'Transportador' },
  { text: 'TRANSPORTES AMBIENTAIS S.A.' },
  { text: `CNPJ: ${haulerTaxId}` },
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
  generatorTaxId: { text: 'CNPJ:' },
  receiverTaxId: { text: 'CNPJ:' },
});

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

  it('should fill a tax id OCR missed from the visible text layer', async () => {
    const result = await extract(
      await stubPdfWithLines(
        mtrLines({ generatorTaxId: { text: `CNPJ: ${GENERATOR_TAX_ID}` } }),
      ),
    );

    expect(result.data.generator?.taxId).toMatchObject({
      confidence: 'high',
      parsed: GENERATOR_TAX_ID,
    });
    expect(result.data.lowConfidenceFields).not.toContain('generator.taxId');
    expect(result.reviewReasons.map(({ code }) => code)).not.toContain(
      'LOW_CONFIDENCE_GENERATOR.TAX_ID',
    );
  });

  it.each(['white', 'off-page', 'invisible-mode', 'covered'] as const)(
    'should not fill a tax id drawn %s',
    async (concealment) => {
      const result = await extract(
        await stubPdfWithLines(
          mtrLines({
            generatorTaxId: { concealment, text: `CNPJ: ${GENERATOR_TAX_ID}` },
          }),
        ),
      );

      expect(result.data.generator?.taxId.parsed).toBe('');
      expect(result.data.lowConfidenceFields).toContain('generator.taxId');
      expect(result.data.receiver?.taxId.parsed).toBe(RECEIVER_TAX_ID);
    },
  );

  it('should fill nothing and flag review when a high-confidence OCR field disagrees', async () => {
    const result = await extract(
      await stubPdfWithLines(
        mtrLines({
          generatorTaxId: { text: `CNPJ: ${GENERATOR_TAX_ID}` },
          haulerTaxId: OTHER_HAULER_TAX_ID,
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

  it('should return the OCR-only output for an image-only PDF', async () => {
    const textLayerSpy = vi.spyOn(pdfTextLayerExtractor, 'extractText');
    const ocrOnly = await createDocumentExtractor({
      extractText: () => Promise.reject(new Error('not used')),
    }).extract<MtrExtractedData>(
      { filePath: 'unused' },
      {
        documentType: 'transportManifest',
        layouts: ['mtr-sinfat' as NonEmptyString],
        textExtractionResult: stubTextExtractionResult(toText(ocrLines)),
      },
    );

    expect(await extract(await stubImageOnlyPdf())).toEqual(ocrOnly);
    await expect(textLayerSpy.mock.results[0]?.value).rejects.toThrow();
  });
});
