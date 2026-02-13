import { isS3Uri, parseS3Uri } from './s3-uri.parser';

describe('parseS3Uri', () => {
  it('should parse a valid S3 URI', () => {
    const result = parseS3Uri('s3://my-bucket/path/to/file.pdf');

    expect(result).toStrictEqual({
      bucket: 'my-bucket',
      key: 'path/to/file.pdf',
    });
  });

  it('should parse an S3 URI with a single-level key', () => {
    const result = parseS3Uri('s3://bucket/file.pdf');

    expect(result).toStrictEqual({
      bucket: 'bucket',
      key: 'file.pdf',
    });
  });

  it('should return undefined for a non-S3 URI', () => {
    expect(parseS3Uri('/local/path/file.pdf')).toBeUndefined();
  });

  it('should return undefined for an empty string', () => {
    expect(parseS3Uri('')).toBeUndefined();
  });

  it('should return undefined for s3:// without bucket and key', () => {
    expect(parseS3Uri('s3://')).toBeUndefined();
  });

  it('should return undefined for s3:// with bucket but no key', () => {
    expect(parseS3Uri('s3://bucket')).toBeUndefined();
    expect(parseS3Uri('s3://bucket/')).toBeUndefined();
  });
});

describe('isS3Uri', () => {
  it('should return true for S3 URIs', () => {
    expect(isS3Uri('s3://bucket/key')).toBe(true);
  });

  it('should return false for local paths', () => {
    expect(isS3Uri('/local/path')).toBe(false);
    expect(isS3Uri('./relative/path')).toBe(false);
  });
});
