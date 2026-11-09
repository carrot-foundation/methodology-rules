import type { PDFPageProxy } from 'unpdf/pdfjs';

import { logger } from '@carrot-fndn/shared/helpers';
import { getResolvedPDFJS } from 'unpdf';

export interface VisibleWord {
  height: number;
  left: number;
  text: string;
  top: number;
  width: number;
}

type Bounds = [number, number, number, number];

interface Cover {
  color: string | undefined;
  rect: Rect;
}

interface Glyph {
  color: string;
  coversBefore: number;
  isLegible: boolean;
  rect: Rect;
  text: string;
}

type GStateEntry = [string, unknown];

type Matrix = [number, number, number, number, number, number];

type Operators = Awaited<ReturnType<typeof getResolvedPDFJS>>['OPS'];

interface PdfFont {
  fontMatrix?: number[];
  isType3Font: boolean;
  missingFile?: boolean;
  vertical: boolean;
}

interface PdfGlyph {
  isInFont: boolean;
  isSpace: boolean;
  unicode: string;
  width: number;
}

interface Rect {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

interface State {
  charSpacing: number;
  clipped: boolean;
  ctm: Matrix;
  fillColor: string;
  font: PdfFont | undefined;
  fontSize: number;
  hScale: number;
  leading: number;
  lineWidth: number;
  miterLimit: number;
  renderMode: number;
  rise: number;
  wordSpacing: number;
}

type StateSetting =
  | 'charSpacing'
  | 'fillColor'
  | 'leading'
  | 'lineWidth'
  | 'rise'
  | 'wordSpacing';

class UnmodelledContentError extends Error {}

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const UNIT_SQUARE: Bounds = [0, 0, 1, 1];
const DEFAULT_FONT_MATRIX = [0.001, 0, 0, 0.001, 0, 0];
const GLYPH_DESCENT = -0.2;
const GLYPH_ASCENT = 0.8;
const MIN_CONTRAST_RATIO = 2;
const MIN_FONT_SIZE_POINTS = 4;
const MIN_COVERING_STROKE_POINTS = 2;
const OVERLAP_EPSILON = 1e-6;
const WHITE = '#ffffff';
const FILL_RENDER_MODE = 0;
const INVISIBLE_RENDER_MODE = 3;

const NO_VISUAL_EFFECT_GSTATE_KEYS = new Set([
  'D',
  'FL',
  'LC',
  'LJ',
  'OP',
  'op',
  'OPM',
  'RI',
  'SA',
]);

const assertModelled = (isModelled: boolean, reason: string): void => {
  if (!isModelled) {
    throw new UnmodelledContentError(reason);
  }
};

const ignore = (): void => undefined;

const multiply = (m1: Matrix, m2: Matrix): Matrix => [
  m1[0] * m2[0] + m1[1] * m2[2],
  m1[0] * m2[1] + m1[1] * m2[3],
  m1[2] * m2[0] + m1[3] * m2[2],
  m1[2] * m2[1] + m1[3] * m2[3],
  m1[4] * m2[0] + m1[5] * m2[2] + m2[4],
  m1[4] * m2[1] + m1[5] * m2[3] + m2[5],
];

const translate = (x: number, y: number): Matrix => [1, 0, 0, 1, x, y];

const isGStateEntryModelled = ([key, value]: GStateEntry): boolean =>
  NO_VISUAL_EFFECT_GSTATE_KEYS.has(key) ||
  key === 'LW' ||
  key === 'ML' ||
  (key === 'SMask' && value === false) ||
  ((key === 'ca' || key === 'CA') && value === 1) ||
  (key === 'BM' && (value === 'source-over' || value === 'Normal'));

const relativeLuminance = (hex: string): number => {
  const channels = [1, 3, 5].map((start) => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;

    return value <= 0.039_28 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
};

const contrastRatio = (first: string, second: string): number => {
  const [light, dark] = [relativeLuminance(first), relativeLuminance(second)]
    .sort((higher, lower) => lower - higher)
    .map((luminance) => luminance + 0.05);

  return light! / dark!;
};

const overlaps = (first: Rect, second: Rect): boolean =>
  first.left + OVERLAP_EPSILON < second.right &&
  second.left + OVERLAP_EPSILON < first.right &&
  first.top + OVERLAP_EPSILON < second.bottom &&
  second.top + OVERLAP_EPSILON < first.bottom;

const contains = (rect: Rect, x: number, y: number): boolean =>
  x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

const isInsidePage = (rect: Rect): boolean =>
  rect.left >= 0 && rect.top >= 0 && rect.right <= 1 && rect.bottom <= 1;

const isGlyphVisible = (glyph: Glyph, covers: readonly Cover[]): boolean => {
  const centerX = (glyph.rect.left + glyph.rect.right) / 2;
  const centerY = (glyph.rect.top + glyph.rect.bottom) / 2;
  const backgroundColors = [
    WHITE,
    ...covers
      .slice(0, glyph.coversBefore)
      .filter((cover) => contains(cover.rect, centerX, centerY))
      .map((cover) => cover.color),
  ];

  return (
    isInsidePage(glyph.rect) &&
    !covers
      .slice(glyph.coversBefore + 1)
      .some((cover) => overlaps(cover.rect, glyph.rect)) &&
    backgroundColors.every(
      (color) =>
        color !== undefined &&
        contrastRatio(glyph.color, color) >= MIN_CONTRAST_RATIO,
    )
  );
};

const joinGlyphsIntoWords = (glyphs: readonly Glyph[]): VisibleWord[] => {
  const words: VisibleWord[] = [];
  let current: Rect | undefined;
  let text = '';
  let isEveryGlyphVisible = true;

  const flush = () => {
    if (current && isEveryGlyphVisible) {
      words.push({
        height: current.bottom - current.top,
        left: current.left,
        text,
        top: current.top,
        width: current.right - current.left,
      });
    }

    current = undefined;
    text = '';
    isEveryGlyphVisible = true;
  };

  for (const glyph of glyphs) {
    if (glyph.isLegible && glyph.text.trim().length === 0) {
      flush();
      continue;
    }

    const { rect } = glyph;
    const height = rect.bottom - rect.top;
    const isAdjacent =
      current !== undefined &&
      Math.abs(rect.top - current.top) < height / 2 &&
      rect.left - current.right < height / 4 &&
      rect.left - current.right > -height / 2;

    if (!isAdjacent) {
      flush();
    }

    current = current
      ? {
          bottom: Math.max(current.bottom, rect.bottom),
          left: Math.min(current.left, rect.left),
          right: Math.max(current.right, rect.right),
          top: Math.min(current.top, rect.top),
        }
      : rect;
    text += glyph.text;
    isEveryGlyphVisible &&= glyph.isLegible;
  }

  flush();

  return words;
};

const walkOperatorList = async (
  page: PDFPageProxy,
  OPS: Operators,
): Promise<VisibleWord[]> => {
  const viewport = page.getViewport({ scale: 1 });
  const { argsArray, fnArray } = await page.getOperatorList();

  const FILL_PATH_OPS = new Set<number>([
    OPS.closeEOFillStroke,
    OPS.closeFillStroke,
    OPS.eoFill,
    OPS.eoFillStroke,
    OPS.fill,
    OPS.fillStroke,
  ]);

  const STROKE_PATH_OPS = new Set<number>([
    OPS.closeEOFillStroke,
    OPS.closeFillStroke,
    OPS.closeStroke,
    OPS.eoFillStroke,
    OPS.fillStroke,
    OPS.stroke,
  ]);

  const IMAGE_OPS = [
    OPS.paintImageMaskXObject,
    OPS.paintImageXObject,
    OPS.paintInlineImageXObject,
    OPS.paintSolidColorImageMask,
  ];

  const NO_VISUAL_EFFECT_OPS = [
    OPS.beginCompat,
    OPS.beginMarkedContent,
    OPS.dependency,
    OPS.endCompat,
    OPS.endMarkedContent,
    OPS.endText,
    OPS.markPoint,
    OPS.markPointProps,
    OPS.setDash,
    OPS.setFlatness,
    OPS.setLineCap,
    OPS.setLineJoin,
    OPS.setRenderingIntent,
    OPS.setStrokeRGBColor,
  ];

  const STATE_SETTINGS: Array<[number, StateSetting]> = [
    [OPS.setCharSpacing, 'charSpacing'],
    [OPS.setFillRGBColor, 'fillColor'],
    [OPS.setLeading, 'leading'],
    [OPS.setLineWidth, 'lineWidth'],
    [OPS.setTextRise, 'rise'],
    [OPS.setWordSpacing, 'wordSpacing'],
  ];

  const toRect = (matrix: Matrix, [x0, y0, x1, y1]: Bounds): Rect => {
    const points = [
      [x0, y0],
      [x1, y0],
      [x0, y1],
      [x1, y1],
    ].map(([x, y]) => {
      const [viewX, viewY] = viewport.convertToViewportPoint(
        matrix[0] * x! + matrix[2] * y! + matrix[4],
        matrix[1] * x! + matrix[3] * y! + matrix[5],
      ) as [number, number];

      return [viewX / viewport.width, viewY / viewport.height] as const;
    });

    const rect = {
      bottom: Math.max(...points.map(([, y]) => y)),
      left: Math.min(...points.map(([x]) => x)),
      right: Math.max(...points.map(([x]) => x)),
      top: Math.min(...points.map(([, y]) => y)),
    };

    assertModelled(
      Object.values(rect).every((value) => Number.isFinite(value)),
      'non-finite geometry',
    );

    return rect;
  };

  const covers: Cover[] = [];
  const glyphs: Glyph[] = [];
  const stack: State[] = [];
  const formFloors: number[] = [];
  let state: State = {
    charSpacing: 0,
    clipped: false,
    ctm: IDENTITY,
    fillColor: '#000000',
    font: undefined,
    fontSize: 0,
    hScale: 1,
    leading: 0,
    lineWidth: 1,
    miterLimit: 10,
    renderMode: 0,
    rise: 0,
    wordSpacing: 0,
  };
  let textMatrix = IDENTITY;
  let lineMatrix = IDENTITY;
  let pendingClip = false;

  const moveText = (x: number, y: number) => {
    lineMatrix = multiply(translate(x, y), lineMatrix);
    textMatrix = lineMatrix;
  };

  const showText = (items: Array<number | PdfGlyph>) => {
    const fontMatrix = state.font?.fontMatrix ?? DEFAULT_FONT_MATRIX;

    for (const item of items) {
      if (typeof item === 'number') {
        textMatrix = multiply(
          translate((-item / 1000) * state.fontSize * state.hScale, 0),
          textMatrix,
        );
        continue;
      }

      const advance = item.width * fontMatrix[0]!;
      const renderingMatrix = multiply(
        multiply(
          [state.fontSize * state.hScale, 0, 0, state.fontSize, 0, state.rise],
          textMatrix,
        ),
        state.ctm,
      );
      const width = Math.hypot(renderingMatrix[0], renderingMatrix[1]);
      const height =
        Math.abs(
          renderingMatrix[0] * renderingMatrix[3] -
            renderingMatrix[1] * renderingMatrix[2],
        ) / width;

      assertModelled(height >= MIN_FONT_SIZE_POINTS, 'text below minimum size');

      const isPainted =
        state.renderMode === FILL_RENDER_MODE &&
        (item.isInFont || state.font?.missingFile === true);
      const rect = toRect(renderingMatrix, [
        0,
        GLYPH_DESCENT,
        advance,
        GLYPH_ASCENT,
      ]);

      glyphs.push({
        color: state.fillColor,
        coversBefore: covers.length,
        isLegible: isPainted && !state.clipped && width >= height / 2,
        rect,
        text: item.unicode,
      });

      if (isPainted) {
        covers.push({ color: state.fillColor, rect });
      }

      textMatrix = multiply(
        translate(
          (advance * state.fontSize +
            state.charSpacing +
            (item.isSpace ? state.wordSpacing : 0)) *
            state.hScale,
          0,
        ),
        textMatrix,
      );
    }
  };

  const setMiterLimit = (limit: number) => {
    if (Number.isFinite(limit) && limit > 0) {
      state.miterLimit = limit;
    }
  };
  const save = () => {
    stack.push({ ...state });
  };
  const restore = () => {
    assertModelled(
      stack.length > (formFloors.at(-1) ?? 0),
      'unbalanced restore',
    );
    state = stack.pop()!;
  };
  const nextLine = () => {
    moveText(0, -state.leading);
  };
  const startClip = () => {
    pendingClip = true;
  };
  const show = (items: unknown) => {
    showText(items as Array<number | PdfGlyph>);
  };
  const paintImage = () => {
    covers.push({
      color: undefined,
      rect: toRect(state.ctm, UNIT_SQUARE),
    });
  };

  const handlers = new Map<number, (arguments_: readonly unknown[]) => void>([
    ...IMAGE_OPS.map((op) => [op, paintImage] as const),
    ...NO_VISUAL_EFFECT_OPS.map((op) => [op, ignore] as const),
    ...STATE_SETTINGS.map(
      ([op, setting]) =>
        [
          op,
          (arguments_: readonly unknown[]) => {
            Object.assign(state, { [setting]: arguments_[0] });
          },
        ] as const,
    ),
    [
      OPS.beginMarkedContentProps,
      (arguments_) => {
        assertModelled(arguments_[0] !== 'OC', 'optional content');
      },
    ],
    [
      OPS.beginText,
      () => {
        textMatrix = IDENTITY;
        lineMatrix = IDENTITY;
      },
    ],
    [OPS.clip, startClip],
    [
      OPS.constructPath,
      (arguments_) => {
        const paintOperator = arguments_[0] as number;
        const bounds = arguments_[2] as Bounds | null;

        state.clipped ||= pendingClip;
        pendingClip = false;

        if (!bounds) {
          return;
        }

        if (FILL_PATH_OPS.has(paintOperator)) {
          covers.push({
            color: state.clipped ? undefined : state.fillColor,
            rect: toRect(state.ctm, bounds),
          });
        }

        const [a, b, c, d] = state.ctm;
        const squares = a * a + b * b + c * c + d * d;
        const largestScale = Math.sqrt(
          (squares +
            Math.sqrt(Math.max(0, squares ** 2 - 4 * (a * d - b * c) ** 2))) /
            2,
        );
        const strokeWidth = state.lineWidth * largestScale;

        if (
          STROKE_PATH_OPS.has(paintOperator) &&
          strokeWidth >= MIN_COVERING_STROKE_POINTS
        ) {
          const pad =
            (state.lineWidth * Math.max(state.miterLimit, Math.SQRT2)) / 2;
          const [x0, y0, x1, y1] = bounds;

          covers.push({
            color: undefined,
            rect: toRect(state.ctm, [x0 - pad, y0 - pad, x1 + pad, y1 + pad]),
          });
        }
      },
    ],
    [OPS.eoClip, startClip],
    [
      OPS.moveText,
      (arguments_) =>
        moveText(arguments_[0] as number, arguments_[1] as number),
    ],
    [OPS.nextLine, nextLine],
    [
      OPS.nextLineSetSpacingShowText,
      (arguments_) => {
        state.wordSpacing = arguments_[0] as number;
        state.charSpacing = arguments_[1] as number;
        nextLine();
        show(arguments_[2]);
      },
    ],
    [
      OPS.nextLineShowText,
      (arguments_) => {
        nextLine();
        show(arguments_[0]);
      },
    ],
    [
      OPS.paintFormXObjectBegin,
      (arguments_) => {
        save();
        formFloors.push(stack.length);
        state.ctm = multiply(
          (arguments_[0] as Matrix | null) ?? IDENTITY,
          state.ctm,
        );
        state.clipped = true;
      },
    ],
    [
      OPS.paintFormXObjectEnd,
      () => {
        stack.length = formFloors.pop() ?? stack.length;
        restore();
      },
    ],
    [OPS.restore, restore],
    [OPS.save, save],
    [
      OPS.setFont,
      (arguments_) => {
        const font = page.commonObjs.get(arguments_[0] as string) as PdfFont;

        assertModelled(
          !font.isType3Font && !font.vertical,
          'Type3 or vertical font',
        );
        state.font = font;
        state.fontSize = arguments_[1] as number;
      },
    ],
    [
      OPS.setGState,
      (arguments_) => {
        const entries = arguments_[0] as GStateEntry[];

        assertModelled(
          entries.every((entry) => isGStateEntryModelled(entry)),
          'graphics state',
        );

        for (const [key, value] of entries) {
          if (key === 'LW') {
            state.lineWidth = value as number;
          } else if (key === 'ML') {
            setMiterLimit(value as number);
          }
        }
      },
    ],
    [
      OPS.setHScale,
      (arguments_) => {
        state.hScale = (arguments_[0] as number) / 100;
      },
    ],
    [
      OPS.setLeadingMoveText,
      (arguments_) => {
        state.leading = -(arguments_[1] as number);
        moveText(arguments_[0] as number, arguments_[1] as number);
      },
    ],
    [OPS.setMiterLimit, (arguments_) => setMiterLimit(arguments_[0] as number)],
    [
      OPS.setTextMatrix,
      (arguments_) => {
        textMatrix = arguments_[0] as Matrix;
        lineMatrix = textMatrix;
      },
    ],
    [
      OPS.setTextRenderingMode,
      (arguments_) => {
        const mode = arguments_[0] as number;

        assertModelled(
          mode === FILL_RENDER_MODE || mode === INVISIBLE_RENDER_MODE,
          'text render mode',
        );
        state.renderMode = mode;
      },
    ],
    [OPS.showSpacedText, (arguments_) => show(arguments_[0])],
    [OPS.showText, (arguments_) => show(arguments_[0])],
    [
      OPS.transform,
      (arguments_) => {
        state.ctm = multiply(arguments_ as Matrix, state.ctm);
      },
    ],
  ]);

  for (const [index, operator] of fnArray.entries()) {
    const handler = handlers.get(operator);

    if (!handler) {
      throw new UnmodelledContentError(`operator ${String(operator)}`);
    }

    // eslint-disable-next-line security/detect-object-injection
    handler((argsArray[index] as null | unknown[]) ?? []);
  }

  assertModelled(
    glyphs.every((glyph) => !glyph.isLegible || isGlyphVisible(glyph, covers)),
    'painted text that is not visible',
  );

  return joinGlyphsIntoWords(glyphs);
};

export const extractVisibleWords = async (
  page: PDFPageProxy,
): Promise<VisibleWord[]> => {
  try {
    const { OPS } = await getResolvedPDFJS();

    return await walkOperatorList(page, OPS);
  } catch (error) {
    if (error instanceof UnmodelledContentError) {
      logger.debug(
        { pageNumber: page.pageNumber, reason: error.message },
        'PDF page uses unmodelled content; its text layer is not used',
      );

      return [];
    }

    throw error;
  }
};
