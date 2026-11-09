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
  text?: string;
}

interface Glyph {
  color: string;
  core: Rect;
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
  lineJoin: number;
  lineWidth: number;
  miterLimit: number;
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
const GLYPH_CORE_INSET = 0.1;
const GLYPH_CORE_TOP = 0.6;
const OVERPRINT_TOLERANCE = 0.25;
const AXIS_EPSILON = 1e-6;
const PATH_MOVE_TO = 0;
const PATH_LINE_TO = 1;
const PATH_CURVE_TO = 2;
const PATH_QUADRATIC_CURVE_TO = 3;
const PATH_CLOSE = 4;
const MITER_JOIN = 0;

const NO_VISUAL_EFFECT_GSTATE_KEYS = new Set([
  'D',
  'FL',
  'LC',
  'OP',
  'op',
  'OPM',
  'RI',
  'SA',
]);

const STROKE_GSTATE_KEYS = {
  LJ: 'lineJoin',
  LW: 'lineWidth',
  ML: 'miterLimit',
} as const;

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
  key in STROKE_GSTATE_KEYS ||
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

const isSingleRectangle = (path: ArrayLike<number>): boolean => {
  if (path.length !== 12 && !(path.length === 13 && path[12] === PATH_CLOSE)) {
    return false;
  }

  const [x0, y0, x1, y1, x2, y2, x3, y3] = [1, 2, 4, 5, 7, 8, 10, 11].map(
    // eslint-disable-next-line security/detect-object-injection
    (offset) => path[offset]!,
  );

  return (
    path[0] === PATH_MOVE_TO &&
    // eslint-disable-next-line security/detect-object-injection
    [3, 6, 9].every((offset) => path[offset] === PATH_LINE_TO) &&
    x0 !== x2 &&
    y0 !== y2 &&
    ((x0 === x1 && y1 === y2 && x2 === x3 && y3 === y0) ||
      (y0 === y1 && x1 === x2 && y2 === y3 && x3 === x0))
  );
};

type Point = [number, number];

const boundsAround = (points: readonly Point[], pad: number): Bounds => [
  Math.min(...points.map(([x]) => x)) - pad,
  Math.min(...points.map(([, y]) => y)) - pad,
  Math.max(...points.map(([x]) => x)) + pad,
  Math.max(...points.map(([, y]) => y)) + pad,
];

const direction = ([x0, y0]: Point, [x1, y1]: Point): Point | undefined => {
  const length = Math.hypot(x1 - x0, y1 - y0);

  return length > 0 ? [(x1 - x0) / length, (y1 - y0) / length] : undefined;
};

const strokeBounds = (
  path: ArrayLike<number>,
  half: number,
  miterLimit: number | undefined,
): Bounds[] => {
  const result: Bounds[] = [];
  // eslint-disable-next-line security/detect-object-injection
  const read = (offset: number): Point => [path[offset]!, path[offset + 1]!];
  let start: Point = [0, 0];
  let current: Point = [0, 0];
  let incoming: Point | undefined;
  let first: Point | undefined;

  const join = (outgoing: Point | undefined) => {
    if (miterLimit !== undefined && incoming && outgoing) {
      const ratio =
        1 /
        Math.sqrt(
          (1 + incoming[0] * outgoing[0] + incoming[1] * outgoing[1]) / 2,
        );

      if (ratio <= miterLimit) {
        result.push(boundsAround([current], half * ratio));
      }
    }
  };
  const segment = (points: readonly Point[], end: Point) => {
    const startDirection = points
      .map((point) => direction(current, point))
      .find((value) => value !== undefined);

    join(startDirection);
    first ??= startDirection;
    result.push(boundsAround([current, ...points], half));
    incoming =
      [current, ...points]
        .reverse()
        .map((point) => direction(point, end))
        .find((value) => value !== undefined) ?? incoming;
    current = end;
  };

  for (let index = 0; index < path.length; ) {
    // eslint-disable-next-line security/detect-object-injection
    const command = path[index];

    switch (command) {
      case PATH_CURVE_TO: {
        segment(
          [read(index + 1), read(index + 3), read(index + 5)],
          read(index + 5),
        );
        index += 7;

        break;
      }
      case PATH_LINE_TO: {
        segment([read(index + 1)], read(index + 1));
        index += 3;

        break;
      }
      case PATH_MOVE_TO: {
        start = read(index + 1);
        current = start;
        incoming = undefined;
        first = undefined;
        index += 3;

        break;
      }
      case PATH_QUADRATIC_CURVE_TO: {
        segment([read(index + 1), read(index + 3)], read(index + 3));
        index += 5;

        break;
      }

      default: {
        assertModelled(command === PATH_CLOSE, 'path command');
        segment([start], start);
        join(first);
        index += 1;
      }
    }
  }

  return result;
};

const isInsidePage = (rect: Rect): boolean =>
  rect.left >= 0 && rect.top >= 0 && rect.right <= 1 && rect.bottom <= 1;

const isGlyphVisible = (glyph: Glyph, covers: readonly Cover[]): boolean => {
  if (!isInsidePage(glyph.rect)) {
    return false;
  }

  const height = glyph.rect.bottom - glyph.rect.top;
  const isOverprint = (cover: Cover) =>
    cover.kind === 'glyph' &&
    cover.text === glyph.text &&
    cover.color === glyph.color &&
    Math.abs(cover.rect.left - glyph.core.left) +
      Math.abs(cover.rect.top - glyph.core.top) <
      height * OVERPRINT_TOLERANCE;
  const isCoveredLater = covers
    .slice(glyph.coversBefore)
    .some((cover) => overlaps(cover.rect, glyph.core) && !isOverprint(cover));
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
    lineJoin: MITER_JOIN,
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
      const isPainted = FILL_RENDER_MODES.has(state.renderMode);
      const rect = toRect(renderingMatrix, [
        0,
        GLYPH_DESCENT,
        advance,
        GLYPH_ASCENT,
      ]);
      const core = toRect(renderingMatrix, [
        advance * GLYPH_CORE_INSET,
        GLYPH_CORE_INSET,
        advance * (1 - GLYPH_CORE_INSET),
        GLYPH_CORE_TOP,
      ]);

      glyphs.push(
        isPainted &&
          !state.clipped &&
          height >= MIN_FONT_SIZE_POINTS &&
          width >= height / 2
          ? {
              color: state.fillColor,
              core,
              coversBefore: covers.length,
              rect,
              text: item.unicode,
            }
          : undefined,
      );

      if (isPainted) {
        covers.push({
          color: state.fillColor,
          kind: 'glyph',
          rect: core,
          text: item.unicode,
        });
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
    path: ArrayLike<number>,
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
        const [firstPath, ...otherPaths] = arguments_[1] as Array<
          ArrayLike<number>
        >;
        const bounds = arguments_[2] as Bounds | null;

        if (
          pendingClip &&
          !(
            firstPath !== undefined &&
            otherPaths.length === 0 &&
            isPageCoveringRectangle(state.ctm, bounds, firstPath)
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

        if (STROKE_PATH_OPS.has(paintOperator)) {
          const miterLimit =
            state.lineJoin === MITER_JOIN ? state.miterLimit : undefined;

          covers.push(
            ...[firstPath!, ...otherPaths]
              .flatMap((path) =>
                strokeBounds(path, state.lineWidth / 2, miterLimit),
              )
              .map((strokeBound) => ({
                color: undefined,
                kind: 'stroke' as const,
                rect: toRect(state.ctm, strokeBound),
              })),
          );
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
          if (key in STROKE_GSTATE_KEYS) {
            state[STROKE_GSTATE_KEYS[key as keyof typeof STROKE_GSTATE_KEYS]] =
              value as number;
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
      OPS.setLineJoin,
      (arguments_) => {
        state.lineJoin = arguments_[0] as number;
      },
    ],
    [
      OPS.setLineWidth,
      (arguments_) => {
        state.lineWidth = arguments_[0] as number;
      },
    ],
    [
      OPS.setMiterLimit,
      (arguments_) => {
        state.miterLimit = arguments_[0] as number;
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
