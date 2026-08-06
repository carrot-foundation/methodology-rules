import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import { PrivacyFlagsProcessor } from './privacy-flags.processor';

vi.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('PrivacyFlagsProcessor', () => {
  const ruleDataProcessor = new PrivacyFlagsProcessor();
  const documentLoaderService = vi.mocked(loadDocument);

  it('should return a result for a MassID document', async () => {
    const ruleInput = stubRuleInput();
    const { massIDDocument } = new BoldStubsBuilder()
      .createMassIDDocuments()
      .build();

    documentLoaderService.mockResolvedValueOnce(massIDDocument);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    expect(ruleOutput.resultStatus).toBe('PASSED');
  });
});
