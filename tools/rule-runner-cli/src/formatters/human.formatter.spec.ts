import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

import { formatAsHuman } from './human.formatter';

describe('formatAsHuman', () => {
  it('should format a PASSED result', () => {
    const output = formatAsHuman(
      {
        requestId: 'req-1',
        responseToken: 'token',
        responseUrl: 'https://localhost/placeholder' as never,
        resultComment: 'All checks passed',
        resultStatus: RuleOutputStatus.PASSED,
      },
      { elapsedMs: 150 },
    );

    expect(output).toContain('✓ PASSED');
    expect(output).toContain('All checks passed');
    expect(output).toContain('150ms');
  });

  it('should format a FAILED result', () => {
    const output = formatAsHuman({
      requestId: 'req-1',
      responseToken: 'token',
      responseUrl: 'https://localhost/placeholder' as never,
      resultComment: 'Validation failed',
      resultStatus: RuleOutputStatus.FAILED,
    });

    expect(output).toContain('✗ FAILED');
    expect(output).toContain('Validation failed');
  });

  it('should include result content when present', () => {
    const output = formatAsHuman({
      requestId: 'req-1',
      responseToken: 'token',
      responseUrl: 'https://localhost/placeholder' as never,
      resultContent: { distance: 42 },
      resultStatus: RuleOutputStatus.PASSED,
    });

    expect(output).toContain('Result Content');
    expect(output).toContain('42');
  });

  it('should include full output in debug mode', () => {
    const output = formatAsHuman(
      {
        requestId: 'req-1',
        responseToken: 'token',
        responseUrl: 'https://localhost/placeholder' as never,
        resultStatus: RuleOutputStatus.PASSED,
      },
      { debug: true },
    );

    expect(output).toContain('Full Output');
    expect(output).toContain('req-1');
  });
});
