import {
  clearRegistry,
  registerParser,
} from '@carrot-fndn/shared/document-extractor';
import { logger } from '@carrot-fndn/shared/helpers';

import { listLayoutsCommand } from './list-layouts.command';

const createMockParser = () =>
  class {
    documentType = 'scaleTicket' as const;
    layoutId = 'mock-layout';
    getMatchScore() {
      return 0;
    }
    parse() {
      return {
        data: {
          documentType: 'scaleTicket' as const,
          extractionConfidence: 'high' as const,
          lowConfidenceFields: [],
          missingRequiredFields: [],
          rawText: 'test' as never,
        },
        reviewReasons: [],
        reviewRequired: false,
      };
    }
  };

describe('listLayoutsCommand', () => {
  beforeEach(() => {
    clearRegistry();
    process.exitCode = undefined;
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.exitCode = undefined;
  });

  it('should list all registered layouts', async () => {
    registerParser('scaleTicket', 'layout-1', createMockParser());

    await listLayoutsCommand.parseAsync([], { from: 'user' });

    expect(logger.info).toHaveBeenCalledWith('scaleTicket:');
    expect(logger.info).toHaveBeenCalledWith('  - layout-1');
  });

  it('should filter by document type', async () => {
    registerParser('scaleTicket', 'layout-1', createMockParser());

    await listLayoutsCommand.parseAsync(['scaleTicket'], { from: 'user' });

    expect(logger.info).toHaveBeenCalledWith('scaleTicket:');
    expect(logger.info).toHaveBeenCalledWith('  - layout-1');
  });

  it('should show error for invalid document type', async () => {
    await listLayoutsCommand.parseAsync(['invalidType'], { from: 'user' });

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Unknown document type: invalidType'),
    );
    expect(process.exitCode).toBe(1);
  });

  it('should show message when no layouts match filter', async () => {
    await listLayoutsCommand.parseAsync(['scaleTicket'], { from: 'user' });

    expect(logger.info).toHaveBeenCalledWith(
      'No layouts registered for: scaleTicket',
    );
  });
});
