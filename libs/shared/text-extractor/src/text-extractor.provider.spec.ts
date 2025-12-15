import { TextractClient } from '@aws-sdk/client-textract';

import { textExtractor } from './text-extractor.provider';
import { TextractService } from './textract.service';

describe('text-extractor.provider', () => {
  it('should provide a TextractService-backed instance', () => {
    expect(textExtractor).toBeInstanceOf(TextractService);
  });

  it('should create service with TextractClient dependency', () => {
    expect((textExtractor as TextractService)['textractClient']).toBeInstanceOf(
      TextractClient,
    );
  });
});
