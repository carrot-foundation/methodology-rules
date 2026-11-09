import type { PDFPageProxy } from 'unpdf/pdfjs';

import { getResolvedPDFJS } from 'unpdf';

import { extractVisibleWords } from './pdf-visible-text.helpers';

const { OPS } = await getResolvedPDFJS();

type Operation = [number, null | unknown[]];

const PAGE_SIZE = 100;

const glyph = (unicode: string, isInFont = true) => ({
  isInFont,
  isSpace: unicode === ' ',
  unicode,
  width: 500,
});

const glyphs = (text: string) => [...text].map((character) => glyph(character));

const fakePage = (
  operations: readonly Operation[],
  fonts: Record<string, object> = {},
): PDFPageProxy =>
  ({
    commonObjs: {
      get: (id: string) => fonts[id] ?? { isType3Font: false, vertical: false },
    },
    getOperatorList: () =>
      Promise.resolve({
        argsArray: operations.map(([, arguments_]) => arguments_),
        fnArray: operations.map(([function_]) => function_),
      }),
    getViewport: () => ({
      convertToViewportPoint: (x: number, y: number) => [x, PAGE_SIZE - y],
      height: PAGE_SIZE,
      width: PAGE_SIZE,
    }),
  }) as unknown as PDFPageProxy;

const textAt = (text: string, x = 10, y = 50): Operation[] => [
  [OPS.beginText, null],
  [OPS.setFont, ['f1', 4]],
  [OPS.setTextMatrix, [[1, 0, 0, 1, x, y]]],
  [OPS.showText, [glyphs(text)]],
  [OPS.endText, null],
];

const paintRect = (
  color: string,
  bounds: number[],
  paintOp: number = OPS.fill,
): Operation[] => [
  [OPS.setFillRGBColor, [color]],
  [OPS.constructPath, [paintOp, [[]], bounds]],
  [OPS.setFillRGBColor, ['#000000']],
];

const wordsOf = async (operations: readonly Operation[]) => {
  const words = await extractVisibleWords(fakePage(operations));

  return words.map(({ text }) => text);
};

const strokeAfterText = (setup: Operation[]) =>
  wordsOf([
    ...textAt('A'),
    [OPS.setLineWidth, [3]],
    ...setup,
    ...paintRect('#ffffff', [0, 47, 9.5, 47], OPS.stroke),
  ]);

describe('extractVisibleWords', () => {
  it('should place a visible word in 0-1 page space with a top-left origin', async () => {
    expect(await extractVisibleWords(fakePage(textAt('AB')))).toEqual([
      {
        height: expect.closeTo(0.04, 5) as number,
        left: expect.closeTo(0.1, 5) as number,
        text: 'AB',
        top: expect.closeTo(0.468, 5) as number,
        width: expect.closeTo(0.04, 5) as number,
      },
    ]);
  });

  it('should follow the text positioning operators', async () => {
    const words = await extractVisibleWords(
      fakePage([
        [OPS.save, null],
        [OPS.transform, [1, 0, 0, 1, 0, 10]],
        [OPS.beginText, null],
        [OPS.setFont, ['f1', 4]],
        [OPS.setCharSpacing, [0]],
        [OPS.setWordSpacing, [2]],
        [OPS.setHScale, [100]],
        [OPS.setTextRise, [0]],
        [OPS.setLeading, [10]],
        [OPS.moveText, [10, 50]],
        [OPS.showText, [glyphs('A B')]],
        [OPS.nextLine, null],
        [OPS.showSpacedText, [[glyph('C'), -5000, glyph('D')]]],
        [OPS.nextLineShowText, [glyphs('E')]],
        [OPS.nextLineSetSpacingShowText, [0, 0, glyphs('F')]],
        [OPS.setLeadingMoveText, [0, -10]],
        [OPS.showText, [glyphs('G')]],
        [OPS.endText, null],
        [OPS.restore, null],
      ]),
    );

    expect(words.map(({ text }) => text)).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
      'G',
    ]);
    expect(words.map(({ top }) => top)).toEqual(
      [0.368, 0.368, 0.468, 0.468, 0.568, 0.668, 0.768].map(
        (top) => expect.closeTo(top, 5) as number,
      ),
    );
  });

  it('should honour a font matrix', async () => {
    const [word] = await extractVisibleWords(
      fakePage(textAt('AB'), {
        f1: {
          fontMatrix: [0.002, 0, 0, 0.002, 0, 0],
          isType3Font: false,
          vertical: false,
        },
      }),
    );

    expect(word?.width).toBeCloseTo(0.08, 5);
  });

  it('should split words on a gap, a new line and a concealed glyph', async () => {
    expect(
      await wordsOf([
        ...textAt('A', 10, 50),
        ...textAt('B', 30, 50),
        ...textAt('C', 12, 40),
        [OPS.setTextRenderingMode, [3]],
        ...textAt('X', 14, 40),
        [OPS.setTextRenderingMode, [0]],
        ...textAt('D', 16, 40),
      ]),
    ).toEqual(['A', 'B', 'C', 'D']);
  });

  it.each([
    { operations: textAt('A', 120, 50), rule: 'outside the page' },
    {
      operations: [[OPS.setTextRenderingMode, [3]], ...textAt('A')],
      rule: 'in invisible render mode',
    },
    {
      operations: [[OPS.setTextRenderingMode, [2]], ...textAt('A')],
      rule: 'in fill-then-stroke render mode',
    },
    {
      operations: [
        [OPS.beginText, null],
        [OPS.setFont, ['f1', 4]],
        [OPS.setTextMatrix, [[1, 0, 0, 1, 10, 50]]],
        [OPS.showText, [[glyph('A', false)]]],
      ],
      rule: 'with a glyph missing from its font',
    },
    {
      operations: [[OPS.setFillRGBColor, ['#f5f5f5']], ...textAt('A')],
      rule: 'without contrast against the page',
    },
    {
      operations: [
        ...paintRect('#000000', [0, 40, 50, 60]),
        [OPS.setFillRGBColor, ['#ffffff']],
        ...textAt('A'),
      ],
      rule: 'without contrast against every fill beneath it',
    },
    {
      operations: [
        [OPS.save, null],
        [OPS.transform, [100, 0, 0, 100, 0, 0]],
        [OPS.paintImageXObject, ['img', 1, 1]],
        [OPS.restore, null],
        ...textAt('A'),
      ],
      rule: 'over an image',
    },
    {
      operations: [
        [OPS.save, null],
        [OPS.clip, null],
        ...paintRect('#ff0000', [0, 40, 50, 60]),
        [OPS.restore, null],
        ...textAt('A'),
      ],
      rule: 'over a fill painted inside a clip',
    },
    {
      operations: [...textAt('A'), ...paintRect('#ffffff', [0, 40, 50, 60])],
      rule: 'under a fill painted later',
    },
    {
      operations: [
        ...textAt('A'),
        [OPS.transform, [100, 0, 0, 100, 0, 0]],
        [OPS.paintImageXObject, ['img', 1, 1]],
      ],
      rule: 'under an image painted later',
    },
    {
      operations: [
        ...textAt('A'),
        [
          OPS.setGState,
          [
            [
              ['LW', 5],
              ['ML', 10],
            ],
          ],
        ],
        ...paintRect('#ffffff', [0, 47, 9.5, 47], OPS.stroke),
      ],
      rule: 'under the padded box of a later stroke',
    },
    {
      operations: [...textAt('A'), ...textAt('B')],
      rule: 'under a glyph painted later',
    },
    {
      operations: [
        [OPS.setLineWidth, [5]],
        ...paintRect('#ffffff', [0, 40, 50, 60], OPS.stroke),
        ...textAt('A'),
      ],
      rule: 'over an earlier thick stroke',
    },
    {
      operations: [
        [OPS.beginText, null],
        [OPS.setFont, ['f1', 20]],
        [OPS.setTextMatrix, [[1, 0, 0, 1, 8, 45]]],
        [OPS.showText, [glyphs('Q')]],
        ...textAt('A'),
      ],
      rule: 'over an earlier glyph of its own colour',
    },
    {
      operations: [
        ...textAt('A'),
        [OPS.save, null],
        [OPS.transform, [1, 1, 0, 1, 0, 0]],
        [OPS.setLineWidth, [1.3]],
        ...paintRect('#ffffff', [5, 45, 15, 45], OPS.stroke),
        [OPS.restore, null],
      ],
      rule: 'under a stroke that a shear makes thick',
    },
    {
      operations: [
        [OPS.eoClip, null],
        [OPS.constructPath, [OPS.endPath, [[]], null]],
        ...textAt('A'),
      ],
      rule: 'inside any clip',
    },
    {
      operations: [
        [OPS.paintFormXObjectBegin, [null, null]],
        ...textAt('A'),
        [OPS.paintFormXObjectEnd, null],
      ],
      rule: 'inside a form XObject',
    },
    {
      operations: [
        [OPS.beginText, null],
        [OPS.setFont, ['f1', 1]],
        [OPS.setTextMatrix, [[12, 0, 11.9, 0.3, 10, 50]]],
        [OPS.showText, [glyphs('A')]],
      ],
      rule: 'below the minimum rendered size',
    },
    {
      operations: [[OPS.setHScale, [10]], ...textAt('A')],
      rule: 'squeezed horizontally',
    },
  ] as Array<{ operations: Operation[]; rule: string }>)(
    'should drop text drawn $rule',
    async ({ operations }) => {
      expect(await wordsOf(operations)).not.toContain('A');
    },
  );

  it('should keep text after a form ends, beside a stroke, under a thin stroke, and in modelled state', async () => {
    expect(
      await wordsOf([
        [
          OPS.paintFormXObjectBegin,
          [
            [1, 0, 0, 1, 0, 0],
            [0, 0, 1, 1],
          ],
        ],
        [OPS.save, null],
        [OPS.paintFormXObjectEnd, null],
        [OPS.beginMarkedContentProps, ['Span', {}]],
        [
          OPS.setGState,
          [
            [
              ['SMask', false],
              ['ca', 1],
              ['BM', 'source-over'],
              ['BM', 'Normal'],
              ['LJ', 0],
            ],
          ],
        ],
        [OPS.setTextRenderingMode, [0]],
        ...textAt('A'),
        ...paintRect('#000000', [80, 80, 90, 90], OPS.stroke),
        ...paintRect('#ffffff', [0, 51, 50, 51], OPS.stroke),
        [OPS.constructPath, [OPS.fill, [[]], null]],
      ]),
    ).toEqual(['A']);
  });

  it.each([
    { operation: [9999, null], rule: 'an unknown operator' },
    {
      operation: [OPS.beginMarkedContentProps, ['OC', {}]],
      rule: 'optional content',
    },
    { operation: [OPS.setGState, [[['SMask', {}]]]], rule: 'a soft mask' },
    { operation: [OPS.setGState, [[['ca', 0.5]]]], rule: 'transparency' },
    {
      operation: [OPS.setGState, [[['BM', 'multiply']]]],
      rule: 'a blend mode',
    },
    { operation: [OPS.beginGroup, [{}]], rule: 'a transparency group' },
    { operation: [OPS.setFillColorN, ['pattern']], rule: 'a pattern colour' },
    { operation: [OPS.shadingFill, ['shading']], rule: 'a shading' },
    { operation: [OPS.beginAnnotation, []], rule: 'an annotation' },
    {
      operation: [OPS.setTextRenderingMode, [7]],
      rule: 'a clipping render mode',
    },
    {
      operation: [OPS.setTextRenderingMode, [1]],
      rule: 'a stroke render mode',
    },
    { operation: [OPS.restore, null], rule: 'an unbalanced restore' },
    {
      operation: [OPS.paintFormXObjectEnd, null],
      rule: 'an unbalanced form end',
    },
  ] as Array<{ operation: Operation; rule: string }>)(
    'should drop the whole page when it uses $rule',
    async ({ operation }) => {
      expect(await wordsOf([...textAt('A'), operation])).toEqual([]);
    },
  );

  it.each([
    { isType3Font: true, vertical: false },
    { isType3Font: false, vertical: true },
  ])('should drop the whole page for an unmodelled font %o', async (font) => {
    expect(
      await extractVisibleWords(fakePage(textAt('A'), { f1: font })),
    ).toEqual([]);
  });

  it('should drop the whole page on non-finite geometry', async () => {
    expect(
      await wordsOf([
        [OPS.transform, [Number.NaN, 0, 0, 1, 0, 0]],
        ...textAt('A'),
      ]),
    ).toEqual([]);
  });

  it('should keep the previous miter limit when a new one is invalid', async () => {
    expect(await strokeAfterText([[OPS.setMiterLimit, [-1]]])).toEqual([]);
    expect(await strokeAfterText([[OPS.setMiterLimit, [Number.NaN]]])).toEqual(
      [],
    );
    expect(
      await strokeAfterText([
        [OPS.setMiterLimit, [1]],
        [OPS.setMiterLimit, [-1]],
      ]),
    ).toEqual(['A']);
  });

  it('should pad a thick stroke by at least half its width times the square root of two', async () => {
    expect(
      await wordsOf([
        ...textAt('A'),
        [OPS.setLineWidth, [3]],
        [OPS.setMiterLimit, [1]],
        ...paintRect('#ffffff', [0, 47.5, 9.5, 47.5], OPS.stroke),
      ]),
    ).toEqual([]);
  });

  it('should drop the page on a restore inside a form that would pop the form', async () => {
    expect(
      await wordsOf([
        [OPS.save, null],
        [OPS.paintFormXObjectBegin, [null, null]],
        [OPS.restore, null],
        [OPS.paintFormXObjectEnd, null],
        ...textAt('A'),
      ]),
    ).toEqual([]);
  });

  it('should keep a glyph missing from a font whose file is missing', async () => {
    const words = await extractVisibleWords(
      fakePage(
        [
          [OPS.beginText, null],
          [OPS.setFont, ['f1', 4]],
          [OPS.setTextMatrix, [[1, 0, 0, 1, 10, 50]]],
          [OPS.showText, [[glyph('A', false)]]],
        ],
        { f1: { isType3Font: false, missingFile: true, vertical: false } },
      ),
    );

    expect(words.map(({ text }) => text)).toEqual(['A']);
  });

  it('should propagate unexpected operator list failures', async () => {
    const page = {
      getOperatorList: () => Promise.reject(new Error('broken page')),
      getViewport: () => ({}),
    } as unknown as PDFPageProxy;

    await expect(extractVisibleWords(page)).rejects.toThrow('broken page');
  });
});
