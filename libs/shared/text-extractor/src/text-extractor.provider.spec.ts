import { TextractClient } from '@aws-sdk/client-textract';

import { provideTextractService } from './text-extractor.provider';
import { TextractService } from './textract.service';

describe('text-extractor.provider', () => {
  it('should provide a TextractService instance', () => {
    expect(provideTextractService).toBeInstanceOf(TextractService);
  });

  it('should create service with TextractClient dependency', () => {
    expect(provideTextractService['textractClient']).toBeInstanceOf(
      TextractClient,
    );
  });
});
