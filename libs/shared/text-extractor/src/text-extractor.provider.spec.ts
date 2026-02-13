describe('text-extractor.provider', () => {
  const originalAwsRegion = process.env['AWS_REGION'];
  const originalCacheDirectory = process.env['TEXTRACT_CACHE_DIR'];

  afterEach(() => {
    if (originalAwsRegion === undefined) {
      delete process.env['AWS_REGION'];
    } else {
      process.env['AWS_REGION'] = originalAwsRegion;
    }

    if (originalCacheDirectory === undefined) {
      delete process.env['TEXTRACT_CACHE_DIR'];
    } else {
      process.env['TEXTRACT_CACHE_DIR'] = originalCacheDirectory;
    }

    jest.resetModules();
  });

  it('should provide a TextractService-backed instance when AWS_REGION is set', () => {
    process.env['AWS_REGION'] = 'us-east-1';
    delete process.env['TEXTRACT_CACHE_DIR'];
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { textExtractor } = require('./text-extractor.provider');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TextractService } = require('./textract.service');

    expect(textExtractor).toBeInstanceOf(TextractService);
  });

  it('should create service with TextractClient dependency when AWS_REGION is set', () => {
    process.env['AWS_REGION'] = 'us-east-1';
    delete process.env['TEXTRACT_CACHE_DIR'];
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TextractClient } = require('@aws-sdk/client-textract');

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { textExtractor } = require('./text-extractor.provider');

    expect(textExtractor['textractClient']).toBeInstanceOf(TextractClient);
  });

  it('should provide a TextractService-backed instance when AWS_REGION is not set', () => {
    delete process.env['AWS_REGION'];
    delete process.env['TEXTRACT_CACHE_DIR'];
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { textExtractor } = require('./text-extractor.provider');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TextractService } = require('./textract.service');

    expect(textExtractor).toBeInstanceOf(TextractService);
  });

  it('should create service with TextractClient dependency when AWS_REGION is not set', () => {
    delete process.env['AWS_REGION'];
    delete process.env['TEXTRACT_CACHE_DIR'];
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TextractClient } = require('@aws-sdk/client-textract');

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { textExtractor } = require('./text-extractor.provider');

    expect(textExtractor['textractClient']).toBeInstanceOf(TextractClient);
  });

  it('should wrap with CachedTextExtractor when TEXTRACT_CACHE_DIR is set', () => {
    // eslint-disable-next-line sonarjs/publicly-writable-directories
    process.env['TEXTRACT_CACHE_DIR'] = '/tmp/cache';
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { CachedTextExtractor } = require('./cached-text-extractor');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { textExtractor } = require('./text-extractor.provider');

    expect(textExtractor).toBeInstanceOf(CachedTextExtractor);
  });

  it('should not wrap with CachedTextExtractor when TEXTRACT_CACHE_DIR is not set', () => {
    delete process.env['TEXTRACT_CACHE_DIR'];
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { textExtractor } = require('./text-extractor.provider');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TextractService } = require('./textract.service');

    expect(textExtractor).toBeInstanceOf(TextractService);
  });
});
