import type { PDFPageProxy } from 'unpdf/pdfjs';

import { getResolvedPDFJS } from 'unpdf';

import { extractVisibleWords } from './pdf-visible-text.helpers';

const { OPS } = await getResolvedPDFJS();

type Operation = [number, null | unknown[]];

const PAGE_SIZE = 100;
const PAGE_RECT = [0, 0, PAGE_SIZE, PAGE_SIZE];
const PAGE_PATH = [0, 0, 0, 1, 100, 0, 1, 100, 100, 1, 0, 100];

const pageClip = (
  path: number[] = PAGE_PATH,
  bounds: null | number[] = PAGE_RECT,
): Operation[] => [
  [OPS.clip, null],
  [OPS.constructPath, [OPS.endPath, [path], bounds]],
];

const glyph = (unicode: string) => ({
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

const fillRect = (
  color: string,
  [x0, y0, x1, y1]: number[],
  paintOp: number = OPS.fill,
): Operation[] => [
  [OPS.setFillRGBColor, [color]],
  [
    OPS.constructPath,
    [
      paintOp,
      [[0, x0, y0, 1, x1, y0, 1, x1, y1, 1, x0, y1, 4]],
      [x0, y0, x1, y1],
    ],
  ],
  [OPS.setFillRGBColor, ['#000000']],
];

const wordsOf = async (operations: readonly Operation[]) => {
  const words = await extractVisibleWords(fakePage(operations));

  return words.map(({ text }) => text);
};

const strokeOver = (path: number[]): Operation[] => [
  ...textAt('A', 10, 50),
  [OPS.constructPath, [OPS.closeStroke, [path], [0, 0, 100, 100]]],
];

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

  it('should split words on a horizontal gap and on a new line', async () => {
    expect(
      await wordsOf([
        ...textAt('A', 10, 50),
        ...textAt('B', 30, 50),
        ...textAt('C', 12, 40),
      ]),
    ).toEqual(['A', 'B', 'C']);
  });

  it.each([
    { description: 'outside the page', operations: textAt('A', 120, 50) },
    {
      description: 'in invisible render mode',
      operations: [
        [OPS.setTextRenderingMode, [3]],
        ...textAt('A'),
      ] as Operation[],
    },
    {
      description: 'in a colour too close to white',
      operations: [
        [OPS.setFillRGBColor, ['#f5f5f5']],
        ...textAt('A'),
      ] as Operation[],
    },
    {
      description: 'under a filled path drawn later',
      operations: [...textAt('A'), ...fillRect('#ffffff', [0, 40, 50, 60])],
    },
    {
      description: 'under an image drawn later',
      operations: [
        ...textAt('A'),
        [OPS.transform, [100, 0, 0, 100, 0, 0]],
        [OPS.paintImageXObject, ['img', 1, 1]],
      ] as Operation[],
    },
    {
      description: 'over an image',
      operations: [
        [OPS.save, null],
        [OPS.transform, [100, 0, 0, 100, 0, 0]],
        [OPS.paintImageXObject, ['img', 1, 1]],
        [OPS.restore, null],
        ...textAt('A'),
      ] as Operation[],
    },
    {
      description: 'over a fill of its own colour',
      operations: [...fillRect('#000000', [0, 40, 50, 60]), ...textAt('A')],
    },
    {
      description: 'in light colour, even over a dark fill',
      operations: [
        ...fillRect('#000000', [0, 40, 50, 60]),
        [OPS.setFillRGBColor, ['#ffffff']],
        ...textAt('A'),
      ] as Operation[],
    },
    {
      description: 'over a fill painted inside a clip',
      operations: [
        [OPS.save, null],
        ...pageClip(PAGE_PATH, [0, 0, 1, 1]),
        ...fillRect('#ff0000', [0, 40, 50, 60]),
        [OPS.restore, null],
        ...textAt('A'),
      ] as Operation[],
    },
    {
      description: 'too small to read',
      operations: [
        [OPS.beginText, null],
        [OPS.setFont, ['f1', 1]],
        [OPS.setTextMatrix, [[1, 0, 0, 1, 10, 50]]],
        [OPS.showText, [glyphs('A')]],
      ] as Operation[],
    },
    {
      description: 'squeezed horizontally',
      operations: [[OPS.setHScale, [10]], ...textAt('A')] as Operation[],
    },
    {
      description: 'under a thick stroke drawn later',
      operations: [
        ...textAt('A'),
        [OPS.setLineWidth, [5]],
        ...fillRect('#ffffff', [0, 51, 50, 51], OPS.stroke),
      ] as Operation[],
    },
    {
      description: 'under a thick stroke set through the graphics state',
      operations: [
        ...textAt('A'),
        [OPS.setGState, [[['LW', 5]]]],
        ...fillRect('#ffffff', [0, 40, 50, 60], OPS.fillStroke),
      ] as Operation[],
    },
    {
      description: 'inside a page-sized clip made of two paths',
      operations: [
        [OPS.clip, null],
        [OPS.constructPath, [OPS.endPath, [PAGE_PATH, PAGE_PATH], PAGE_RECT]],
        ...textAt('A'),
      ] as Operation[],
    },
    {
      description: 'inside a page-sized clip that is not a rectangle',
      operations: [
        ...pageClip([0, 50, 0, 1, 100, 50, 1, 50, 100, 1, 0, 50]),
        ...textAt('A'),
      ],
    },
    {
      description: 'inside a page-sized clip that does not start with a move',
      operations: [
        ...pageClip([1, 0, 0, 1, 100, 0, 1, 100, 100, 1, 0, 100]),
        ...textAt('A'),
      ],
    },
    {
      description: 'inside a page-sized clip with no area',
      operations: [
        ...pageClip([0, 0, 0, 1, 100, 0, 1, 0, 0, 1, 0, 100, 4]),
        ...textAt('A'),
      ],
    },
    {
      description: 'inside a page-sized clip whose edges do not alternate',
      operations: [
        ...pageClip([0, 0, 0, 1, 0, 100, 1, 100, 0, 1, 100, 100]),
        ...textAt('A'),
      ],
    },
    {
      description: 'sheared flat',
      operations: [
        [OPS.beginText, null],
        [OPS.setFont, ['f1', 1]],
        [OPS.setTextMatrix, [[12, 0, 11.9, 0.3, 10, 50]]],
        [OPS.showText, [glyphs('A')]],
      ] as Operation[],
    },
    {
      description: 'under a thin stroke through its core',
      operations: [
        ...textAt('A'),
        ...fillRect('#ffffff', [0, 51, 50, 51], OPS.stroke),
      ],
    },
    {
      description: 'inside a page-sized clip with a trailing curve',
      operations: [...pageClip([...PAGE_PATH, 2]), ...textAt('A')],
    },
    {
      description: 'inside a page-sized clip with no bounds',
      operations: [...pageClip(PAGE_PATH, null), ...textAt('A')],
    },
    {
      description: 'inside a rotated page-sized clip',
      operations: [
        [OPS.transform, [0.7, 0.7, -0.7, 0.7, 50, 0]],
        ...pageClip(),
        [OPS.transform, [0.7, -0.7, 0.7, 0.7, -35, 35]],
        ...textAt('A'),
      ] as Operation[],
    },
    {
      description: 'after an unbalanced restore inside a clipped form',
      operations: [
        [
          OPS.paintFormXObjectBegin,
          [
            [1, 0, 0, 1, 0, 0],
            [0, 0, 1, 1],
          ],
        ],
        [OPS.restore, null],
        ...textAt('A'),
        [OPS.paintFormXObjectEnd, null],
      ] as Operation[],
    },
    {
      description: 'inside a clip',
      operations: [...pageClip(PAGE_PATH, [0, 0, 50, 50]), ...textAt('A')],
    },
    {
      description: 'inside a clip with no bounds',
      operations: [
        [OPS.eoClip, null],
        [OPS.constructPath, [OPS.endPath, [], null]],
        ...textAt('A'),
      ] as Operation[],
    },
    {
      description: 'inside a form with a bounding box',
      operations: [
        [
          OPS.paintFormXObjectBegin,
          [
            [1, 0, 0, 1, 0, 0],
            [0, 0, 50, 60],
          ],
        ],
        ...textAt('A'),
        [OPS.paintFormXObjectEnd, null],
      ] as Operation[],
    },
  ])('should drop text drawn $description', async ({ operations }) => {
    expect(await wordsOf(operations)).toEqual([]);
  });

  it.each([
    {
      description: 'after a clip covering the page is restored',
      operations: [
        [OPS.save, null],
        ...pageClip(PAGE_PATH, [0, 0, 10, 10]),
        [OPS.restore, null],
        ...pageClip(),
        ...pageClip([...PAGE_PATH, 4]),
        ...pageClip([0, 0, 0, 1, 0, 100, 1, 100, 100, 1, 100, 0]),
        ...textAt('A'),
      ] as Operation[],
    },
    {
      description: 'inside a form covering the page or without bounds',
      operations: [
        [OPS.paintFormXObjectBegin, [[1, 0, 0, 1, 0, 0], PAGE_RECT]],
        [OPS.paintFormXObjectBegin, [null, null]],
        ...textAt('A'),
        [OPS.paintFormXObjectEnd, null],
        [OPS.paintFormXObjectEnd, null],
        [OPS.paintFormXObjectEnd, null],
      ] as Operation[],
    },
    {
      description: 'inside a page-sized clip under a quarter turn',
      operations: [
        [OPS.transform, [0, 1, -1, 0, 100, 0]],
        ...pageClip(),
        [OPS.transform, [0, -1, 1, 0, 0, 100]],
        ...textAt('A'),
      ] as Operation[],
    },
    {
      description: 'inside non-optional marked content',
      operations: [
        [OPS.beginMarkedContentProps, ['Span', {}]],
        ...textAt('A'),
      ] as Operation[],
    },
    {
      description: 'over a stroke below its core, a path without bounds',
      operations: [
        ...textAt('A'),
        ...fillRect('#ffffff', [0, 49, 50, 49.5], OPS.stroke),
        [OPS.constructPath, [OPS.fill, [], null]],
      ] as Operation[],
    },
    {
      description: 'in fill-and-stroke mode with modelled graphics state',
      operations: [
        [
          OPS.setGState,
          [
            [
              ['LW', 1],
              ['SMask', false],
              ['ca', 1],
              ['BM', 'source-over'],
              ['BM', 'Normal'],
            ],
          ],
        ],
        [OPS.setTextRenderingMode, [2]],
        ...textAt('A'),
      ] as Operation[],
    },
  ])('should keep text drawn $description', async ({ operations }) => {
    expect(await wordsOf(operations)).toEqual(['A']);
  });

  it('should not splice a concealed glyph into a visible word', async () => {
    expect(
      await wordsOf([
        [OPS.beginText, null],
        [OPS.setFont, ['f1', 4]],
        [OPS.setTextMatrix, [[1, 0, 0, 1, 10, 50]]],
        [OPS.showText, [glyphs('A')]],
        [OPS.setFillRGBColor, ['#ffffff']],
        [OPS.showText, [glyphs('X')]],
        [OPS.setFillRGBColor, ['#000000']],
        [OPS.showText, [glyphs('C')]],
      ]),
    ).toEqual(['A', 'C']);
  });

  it('should hide a glyph under a later different glyph but keep an overprint', async () => {
    expect(await wordsOf([...textAt('A'), ...textAt('B')])).toEqual(['B']);

    const overprint = await wordsOf([...textAt('A'), ...textAt('A')]);

    expect(overprint.join('')).toBe('AA');
  });

  const spike = (setup: Operation[] = []): Operation[] => [
    ...textAt('A', 22, 50),
    ...setup,
    [OPS.setLineWidth, [2]],
    [
      OPS.constructPath,
      [OPS.stroke, [[0, 0, 48, 1, 20, 51, 1, 0, 54]], [0, 48, 20, 54]],
    ],
  ];

  it('should hide text under a miter spike, unless the join cannot spike', async () => {
    expect(await wordsOf(spike())).toEqual([]);
    expect(await wordsOf(spike([[OPS.setLineJoin, [1]]]))).toEqual(['A']);
    expect(await wordsOf(spike([[OPS.setMiterLimit, [2]]]))).toEqual(['A']);
    expect(
      await wordsOf(
        spike([
          [
            OPS.setGState,
            [
              [
                ['LJ', 2],
                ['ML', 10],
              ],
            ],
          ],
        ]),
      ),
    ).toEqual(['A']);
  });

  it('should hide text under a closed path join, curves and quadratic curves', async () => {
    expect(
      await wordsOf(strokeOver([0, 11, 40, 1, 11, 51, 1, 30, 40, 4])),
    ).toEqual([]);
    expect(
      await wordsOf(strokeOver([0, 0, 0, 2, 11, 51, 11, 51, 0, 100])),
    ).toEqual([]);
    expect(await wordsOf(strokeOver([0, 0, 0, 3, 11, 51, 0, 100]))).toEqual([]);
  });

  it('should drop the whole page on an unknown path command', async () => {
    expect(
      await wordsOf([
        ...textAt('A'),
        [OPS.constructPath, [OPS.stroke, [[9, 0, 0]], [0, 0, 1, 1]]],
      ]),
    ).toEqual([]);
  });

  it('should keep text inside a stroked cell border and with tight spacing', async () => {
    expect(
      await wordsOf([
        ...textAt('A'),
        ...fillRect('#000000', [0, 40, 50, 60], OPS.stroke),
      ]),
    ).toEqual(['A']);
    expect(
      await wordsOf([[OPS.setCharSpacing, [-0.3]], ...textAt('AB')]),
    ).toEqual(['AB']);
  });

  it('should hide text under a copy of itself in another colour', async () => {
    expect(
      await wordsOf([
        ...textAt('A'),
        [OPS.setFillRGBColor, ['#ffffff']],
        ...textAt('A'),
      ]),
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

  it.each([
    {
      description: 'an unknown operator',
      operation: [9999, null],
    },
    {
      description: 'optional content',
      operation: [OPS.beginMarkedContentProps, ['OC', {}]],
    },
    {
      description: 'a soft mask',
      operation: [OPS.setGState, [[['SMask', {}]]]],
    },
    {
      description: 'transparency',
      operation: [OPS.setGState, [[['ca', 0.5]]]],
    },
    {
      description: 'a blend mode',
      operation: [OPS.setGState, [[['BM', 'multiply']]]],
    },
    { description: 'a transparency group', operation: [OPS.beginGroup, [{}]] },
    {
      description: 'a pattern colour',
      operation: [OPS.setFillColorN, ['pattern']],
    },
    { description: 'a shading', operation: [OPS.shadingFill, ['shading']] },
    { description: 'an annotation', operation: [OPS.beginAnnotation, []] },
    {
      description: 'a clipping render mode',
      operation: [OPS.setTextRenderingMode, [7]],
    },
    {
      description: 'a stroke render mode',
      operation: [OPS.setTextRenderingMode, [1]],
    },
  ] as Array<{ description: string; operation: Operation }>)(
    'should drop the whole page when it uses $description',
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

  it('should propagate unexpected operator list failures', async () => {
    const page = {
      getOperatorList: () => Promise.reject(new Error('broken page')),
      getViewport: () => ({}),
    } as unknown as PDFPageProxy;

    await expect(extractVisibleWords(page)).rejects.toThrow('broken page');
  });
});
