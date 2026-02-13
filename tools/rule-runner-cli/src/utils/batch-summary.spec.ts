import { logger } from '@carrot-fndn/shared/helpers';
import { mkdir, writeFile } from 'node:fs/promises';

import {
  appendBreakdown,
  buildReasonCodeBreakdown,
  writeJsonLog,
} from './batch-summary';

jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
}));

const mockMkdir = mkdir as jest.MockedFunction<typeof mkdir>;
const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;

describe('buildReasonCodeBreakdown', () => {
  it('should count reason codes from resultContent', () => {
    const results = [
      {
        resultContent: {
          reviewReasons: [{ code: 'A' }, { code: 'B' }, { code: 'A' }],
        },
        resultStatus: 'REVIEW_REQUIRED',
      },
      {
        resultContent: {
          reviewReasons: [{ code: 'B' }],
        },
        resultStatus: 'REVIEW_REQUIRED',
      },
    ];

    const breakdown = buildReasonCodeBreakdown(results, 'reviewReasons');

    expect(breakdown).toStrictEqual([
      { code: 'A', count: 2 },
      { code: 'B', count: 2 },
    ]);
  });

  it('should return empty array when no reasons exist', () => {
    const results = [{ resultContent: undefined, resultStatus: 'PASSED' }];

    expect(buildReasonCodeBreakdown(results, 'reviewReasons')).toStrictEqual(
      [],
    );
  });

  it('should skip non-array reasons', () => {
    const results = [
      {
        resultContent: { reviewReasons: 'not-an-array' },
        resultStatus: 'REVIEW_REQUIRED',
      },
    ];

    expect(buildReasonCodeBreakdown(results, 'reviewReasons')).toStrictEqual(
      [],
    );
  });

  it('should skip reasons without string code', () => {
    const results = [
      {
        resultContent: {
          reviewReasons: [{ code: 123 }, { notCode: 'A' }, null, 'string'],
        },
        resultStatus: 'REVIEW_REQUIRED',
      },
    ];

    expect(buildReasonCodeBreakdown(results, 'reviewReasons')).toStrictEqual(
      [],
    );
  });

  it('should sort by count descending', () => {
    const results = [
      {
        resultContent: {
          failReasons: [
            { code: 'RARE' },
            { code: 'COMMON' },
            { code: 'COMMON' },
            { code: 'COMMON' },
          ],
        },
        resultStatus: 'FAILED',
      },
    ];

    const breakdown = buildReasonCodeBreakdown(results, 'failReasons');

    expect(breakdown[0]).toStrictEqual({ code: 'COMMON', count: 3 });
    expect(breakdown[1]).toStrictEqual({ code: 'RARE', count: 1 });
  });
});

describe('appendBreakdown', () => {
  it('should not append when breakdown is empty', () => {
    const lines: string[] = ['existing'];

    appendBreakdown(lines, 'Title:', [], (text) => text);

    expect(lines).toStrictEqual(['existing']);
  });

  it('should append title and color-formatted codes', () => {
    const lines: string[] = [];

    appendBreakdown(
      lines,
      'Review Reason Codes:',
      [
        { code: 'A', count: 3 },
        { code: 'B', count: 1 },
      ],
      (text) => `[yellow]${text}[/yellow]`,
    );

    expect(lines).toContain('[yellow]  A: 3[/yellow]');
    expect(lines).toContain('[yellow]  B: 1[/yellow]');
  });
});

describe('writeJsonLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
  });

  it('should create logs directory and write JSON file', async () => {
    const data = [{ id: 1 }, { id: 2 }];

    await writeJsonLog(data, 'test-prefix');

    expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining('logs'), {
      recursive: true,
    });
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('test-prefix-'),
      JSON.stringify(data, null, 2),
      'utf8',
    );
  });

  it('should use custom path when provided', async () => {
    const data = [{ id: 1 }];

    await writeJsonLog(data, 'prefix', 'custom/path.json');

    expect(mockWriteFile).toHaveBeenCalledWith(
      'custom/path.json',
      expect.any(String),
      'utf8',
    );
  });

  it('should log the file path', async () => {
    const infoSpy = jest.spyOn(logger, 'info');

    await writeJsonLog([{ id: 1 }], 'my-prefix');

    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('my-prefix JSON written to:'),
    );
  });
});
