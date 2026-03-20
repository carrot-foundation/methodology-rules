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

    vi.resetModules();
  });

  it('should provide a TextractService-backed instance when AWS_REGION is set', async () => {
    process.env['AWS_REGION'] = 'us-east-1';
    delete process.env['TEXTRACT_CACHE_DIR'];
    vi.resetModules();
    const { textExtractor } = await import('./text-extractor.provider');
    const { TextractService } = await import('./textract.service');

    expect(textExtractor).toBeInstanceOf(TextractService);
  });

  it('should create service with TextractClient dependency when AWS_REGION is set', async () => {
    process.env['AWS_REGION'] = 'us-east-1';
    delete process.env['TEXTRACT_CACHE_DIR'];
    vi.resetModules();
    const { TextractClient } = await import('@aws-sdk/client-textract');

    const { textExtractor } = await import('./text-extractor.provider');

    expect(
      (textExtractor as unknown as Record<string, unknown>)['textractClient'],
    ).toBeInstanceOf(TextractClient);
  });

  it('should provide a TextractService-backed instance when AWS_REGION is not set', async () => {
    delete process.env['AWS_REGION'];
    delete process.env['TEXTRACT_CACHE_DIR'];
    vi.resetModules();
    const { textExtractor } = await import('./text-extractor.provider');
    const { TextractService } = await import('./textract.service');

    expect(textExtractor).toBeInstanceOf(TextractService);
  });

  it('should create service with TextractClient dependency when AWS_REGION is not set', async () => {
    delete process.env['AWS_REGION'];
    delete process.env['TEXTRACT_CACHE_DIR'];
    vi.resetModules();
    const { TextractClient } = await import('@aws-sdk/client-textract');

    const { textExtractor } = await import('./text-extractor.provider');

    expect(
      (textExtractor as unknown as Record<string, unknown>)['textractClient'],
    ).toBeInstanceOf(TextractClient);
  });

  it('should wrap with CachedTextExtractor when TEXTRACT_CACHE_DIR is set', async () => {
    // eslint-disable-next-line sonarjs/publicly-writable-directories
    process.env['TEXTRACT_CACHE_DIR'] = '/tmp/cache';
    vi.resetModules();
    const { CachedTextExtractor } = await import('./cached-text-extractor');
    const { textExtractor } = await import('./text-extractor.provider');

    expect(textExtractor).toBeInstanceOf(CachedTextExtractor);
  });

  it('should not wrap with CachedTextExtractor when TEXTRACT_CACHE_DIR is not set', async () => {
    delete process.env['TEXTRACT_CACHE_DIR'];
    vi.resetModules();
    const { textExtractor } = await import('./text-extractor.provider');
    const { TextractService } = await import('./textract.service');

    expect(textExtractor).toBeInstanceOf(TextractService);
  });
});
