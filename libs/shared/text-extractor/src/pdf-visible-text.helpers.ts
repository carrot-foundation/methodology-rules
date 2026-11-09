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
  kind: 'fill' | 'glyph' | 'image' | 'stroke';
  rect: Rect;
}

interface Glyph {
  color: string;
  coversBefore: number;
  rect: Rect;
  text: string;
}

type GStateEntry = [string, unknown];

type Matrix = [number, number, number, number, number, number];

type Operators = Awaited<ReturnType<typeof getResolvedPDFJS>>['OPS'];

interface PdfFont {
  fontMatrix?: number[];
  isType3Font: boolean;
  vertical: boolean;
}

interface PdfGlyph {
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
  renderMode: number;
  rise: number;
  wordSpacing: number;
}

class UnmodelledContentError extends Error {}

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const UNIT_SQUARE: Bounds = [0, 0, 1, 1];
const DEFAULT_FONT_MATRIX = [0.001, 0, 0, 0.001, 0, 0];
const GLYPH_DESCENT = -0.2;
const GLYPH_ASCENT = 0.8;
const MIN_CONTRAST_RATIO = 2;
const WHITE = '#ffffff';
const FILL_RENDER_MODES = new Set([0, 2]);
const INVISIBLE_RENDER_MODE = 3;
const MIN_FONT_SIZE_POINTS = 4;
const MIN_COVERING_STROKE_POINTS = 2;
const AXIS_EPSILON = 1e-6;
const PATH_MOVE_TO = 0;
const PATH_LINE_TO = 1;
const PATH_CLOSE = 4;

const NO_VISUAL_EFFECT_GSTATE_KEYS = new Set([
  'D',
  'FL',
  'LC',
  'LJ',
  'ML',
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
    .sort((a, b) => b - a)
    .map((luminance) => luminance + 0.05);

  return light! / dark!;
};

const overlaps = (a: Rect, b: Rect): boolean =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

const contains = (rect: Rect, x: number, y: number): boolean =>
  x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

const coversPage = (rect: Rect): boolean =>
  rect.left <= 0 && rect.top <= 0 && rect.right >= 1 && rect.bottom >= 1;

const isAxisAligned = (matrix: Matrix): boolean =>
  (Math.abs(matrix[1]) < AXIS_EPSILON && Math.abs(matrix[2]) < AXIS_EPSILON) ||
  (Math.abs(matrix[0]) < AXIS_EPSILON && Math.abs(matrix[3]) < AXIS_EPSILON);

const isSingleRectangle = (path: ArrayLike<number> | undefined): boolean => {
  if (
    path?.length !== 12 &&
    !(path?.length === 13 && path[12] === PATH_CLOSE)
  ) {
    return false;
  }

  const points = [0, 3, 6, 9].map((offset) => [
    path[offset + 1]!,
    path[offset + 2]!,
  ]);

  return (
    path[0] === PATH_MOVE_TO &&
    // eslint-disable-next-line security/detect-object-injection
    [3, 6, 9].every((offset) => path[offset] === PATH_LINE_TO) &&
    points.every(([x, y], index) => {
      const [nextX, nextY] = points[(index + 1) % points.length]!;

      return x === nextX || y === nextY;
    })
  );
};

const isInsidePage = (rect: Rect): boolean =>
  rect.left >= 0 && rect.top >= 0 && rect.right <= 1 && rect.bottom <= 1;

const isGlyphVisible = (glyph: Glyph, covers: readonly Cover[]): boolean => {
  if (!isInsidePage(glyph.rect)) {
    return false;
  }

  const isCoveredLater = covers
    .slice(glyph.coversBefore)
    .some(
      (cover) =>
        overlaps(cover.rect, glyph.rect) &&
        !(cover.kind === 'glyph' && cover.color === glyph.color),
    );
  const centerX = (glyph.rect.left + glyph.rect.right) / 2;
  const centerY = (glyph.rect.top + glyph.rect.bottom) / 2;
  const backgroundColors = [
    WHITE,
    ...covers
      .slice(0, glyph.coversBefore)
      .filter(
        (cover) =>
          (cover.kind === 'fill' || cover.kind === 'image') &&
          contains(cover.rect, centerX, centerY),
      )
      .map((cover) => cover.color),
  ];

  return (
    !isCoveredLater &&
    backgroundColors.every(
      (color) =>
        color !== undefined &&
        contrastRatio(glyph.color, color) >= MIN_CONTRAST_RATIO,
    )
  );
};

const joinGlyphsIntoWords = (
  glyphs: readonly (Glyph | undefined)[],
): VisibleWord[] => {
  const words: VisibleWord[] = [];
  let current: Rect | undefined;
  let text = '';

  const flush = () => {
    if (current) {
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
  };

  for (const glyph of glyphs) {
    if (!glyph || glyph.text.trim().length === 0) {
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

  const IMAGE_OPS = new Set<number>([
    OPS.paintImageMaskXObject,
    OPS.paintImageXObject,
    OPS.paintInlineImageXObject,
    OPS.paintSolidColorImageMask,
  ]);

  const NO_VISUAL_EFFECT_OPS = new Set<number>([
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
    OPS.setMiterLimit,
    OPS.setRenderingIntent,
    OPS.setStrokeRGBColor,
  ]);

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
  const glyphs: Array<Glyph | undefined> = [];
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
      const height = Math.hypot(renderingMatrix[2], renderingMatrix[3]);
      const isPainted = FILL_RENDER_MODES.has(state.renderMode);
      const rect = toRect(renderingMatrix, [
        0,
        GLYPH_DESCENT,
        advance,
        GLYPH_ASCENT,
      ]);

      glyphs.push(
        isPainted &&
          !state.clipped &&
          height >= MIN_FONT_SIZE_POINTS &&
          width >= height / 2
          ? {
              color: state.fillColor,
              coversBefore: covers.length,
              rect,
              text: item.unicode,
            }
          : undefined,
      );

      if (isPainted) {
        covers.push({ color: state.fillColor, kind: 'glyph', rect });
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

  const save = () => {
    stack.push({ ...state });
  };
  const restore = () => {
    if (stack.length > (formFloors.at(-1) ?? 0)) {
      state = stack.pop()!;
    }
  };
  const isPageCoveringRectangle = (
    matrix: Matrix,
    bounds: Bounds | null,
    path: ArrayLike<number> | undefined,
  ): boolean =>
    bounds !== null &&
    isAxisAligned(matrix) &&
    isSingleRectangle(path) &&
    coversPage(toRect(matrix, bounds));
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
      kind: 'image',
      rect: toRect(state.ctm, UNIT_SQUARE),
    });
  };

  const handlers = new Map<number, (arguments_: readonly unknown[]) => void>([
    ...[...IMAGE_OPS].map((op) => [op, paintImage] as const),
    ...[...NO_VISUAL_EFFECT_OPS].map((op) => [op, ignore] as const),
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
        const paths = arguments_[1] as Array<ArrayLike<number>> | undefined;
        const bounds = arguments_[2] as Bounds | null;

        if (
          pendingClip &&
          !(
            paths?.length === 1 &&
            isPageCoveringRectangle(state.ctm, bounds, paths[0])
          )
        ) {
          state.clipped = true;
        }

        pendingClip = false;

        if (!bounds) {
          return;
        }

        if (FILL_PATH_OPS.has(paintOperator)) {
          covers.push({
            color: state.clipped ? undefined : state.fillColor,
            kind: 'fill',
            rect: toRect(state.ctm, bounds),
          });
        }

        const strokeWidth =
          state.lineWidth *
          Math.sqrt(
            Math.abs(state.ctm[0] * state.ctm[3] - state.ctm[1] * state.ctm[2]),
          );

        if (
          STROKE_PATH_OPS.has(paintOperator) &&
          strokeWidth >= MIN_COVERING_STROKE_POINTS
        ) {
          const half = state.lineWidth / 2;

          covers.push({
            color: undefined,
            kind: 'stroke',
            rect: toRect(state.ctm, [
              bounds[0] - half,
              bounds[1] - half,
              bounds[2] + half,
              bounds[3] + half,
            ]),
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
        const bounds = arguments_[1] as Bounds | null;

        save();
        formFloors.push(stack.length);
        state.ctm = multiply(
          (arguments_[0] as Matrix | null) ?? IDENTITY,
          state.ctm,
        );

        if (bounds) {
          const [x0, y0, x1, y1] = bounds;

          state.clipped ||= !isPageCoveringRectangle(state.ctm, bounds, [
            PATH_MOVE_TO,
            x0,
            y0,
            PATH_LINE_TO,
            x1,
            y0,
            PATH_LINE_TO,
            x1,
            y1,
            PATH_LINE_TO,
            x0,
            y1,
          ]);
        }
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
      OPS.setCharSpacing,
      (arguments_) => {
        state.charSpacing = arguments_[0] as number;
      },
    ],
    [
      OPS.setFillRGBColor,
      (arguments_) => {
        state.fillColor = arguments_[0] as string;
      },
    ],
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
      OPS.setLeading,
      (arguments_) => {
        state.leading = arguments_[0] as number;
      },
    ],
    [
      OPS.setLeadingMoveText,
      (arguments_) => {
        state.leading = -(arguments_[1] as number);
        moveText(arguments_[0] as number, arguments_[1] as number);
      },
    ],
    [
      OPS.setLineWidth,
      (arguments_) => {
        state.lineWidth = arguments_[0] as number;
      },
    ],
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
          FILL_RENDER_MODES.has(mode) || mode === INVISIBLE_RENDER_MODE,
          'text render mode',
        );
        state.renderMode = mode;
      },
    ],
    [
      OPS.setTextRise,
      (arguments_) => {
        state.rise = arguments_[0] as number;
      },
    ],
    [
      OPS.setWordSpacing,
      (arguments_) => {
        state.wordSpacing = arguments_[0] as number;
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

  return joinGlyphsIntoWords(
    glyphs.map((glyph) =>
      glyph && isGlyphVisible(glyph, covers) ? glyph : undefined,
    ),
  );
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
