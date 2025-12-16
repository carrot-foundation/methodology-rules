describe('text-extractor.provider', () => {
  const originalAwsRegion = process.env['AWS_REGION'];

  afterEach(() => {
    if (originalAwsRegion === undefined) {
      delete process.env['AWS_REGION'];
    } else {
      process.env['AWS_REGION'] = originalAwsRegion;
    }
    jest.resetModules();
  });

  it('should provide a TextractService-backed instance when AWS_REGION is set', () => {
    process.env['AWS_REGION'] = 'us-east-1';
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { textExtractor } = require('./text-extractor.provider');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TextractService } = require('./textract.service');

    expect(textExtractor).toBeInstanceOf(TextractService);
  });

  it('should create service with TextractClient dependency when AWS_REGION is set', () => {
    process.env['AWS_REGION'] = 'us-east-1';
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TextractClient } = require('@aws-sdk/client-textract');

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { textExtractor } = require('./text-extractor.provider');

    expect(textExtractor['textractClient']).toBeInstanceOf(TextractClient);
  });

  it('should provide a TextractService-backed instance when AWS_REGION is not set', () => {
    delete process.env['AWS_REGION'];
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { textExtractor } = require('./text-extractor.provider');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TextractService } = require('./textract.service');

    expect(textExtractor).toBeInstanceOf(TextractService);
  });

  it('should create service with TextractClient dependency when AWS_REGION is not set', () => {
    delete process.env['AWS_REGION'];
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TextractClient } = require('@aws-sdk/client-textract');

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { textExtractor } = require('./text-extractor.provider');

    expect(textExtractor['textractClient']).toBeInstanceOf(TextractClient);
  });
});
