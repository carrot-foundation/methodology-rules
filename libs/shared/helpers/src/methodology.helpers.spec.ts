import { getMethodologySlug } from './methodology.helpers';

describe('getMethodologySlug', () => {
  const environment = process.env;

  afterAll(() => {
    process.env = environment;
  });

  it('should return the methodology slug from environment variables', () => {
    process.env['METHODOLOGY_SLUG'] = 'example-slug';
    expect(getMethodologySlug()).toBe('example-slug');
  });

  it('should return an empty string if methodology slug is not set in environment variables', () => {
    delete process.env['METHODOLOGY_SLUG'];
    expect(getMethodologySlug()).toBe('');
  });
});
