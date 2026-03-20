import { formatAsHuman } from './human.formatter';

describe('formatAsHuman', () => {
  it('should format a PASSED result', () => {
    const output = formatAsHuman(
      {
        requestId: 'req-1',
        responseToken: 'token',
        responseUrl: 'https://localhost/placeholder' as never,
        resultComment: 'All checks passed',
        resultStatus: 'PASSED' as const,
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
      resultStatus: 'FAILED' as const,
    });

    expect(output).toContain('✗ FAILED');
    expect(output).toContain('Validation failed');
  });

  it('should format a REVIEW_REQUIRED result', () => {
    const output = formatAsHuman({
      requestId: 'req-1',
      responseToken: 'token',
      responseUrl: 'https://localhost/placeholder' as never,
      resultComment: 'Review required: vehicle plate mismatch',
      resultStatus: 'REVIEW_REQUIRED' as const,
    });

    expect(output).toContain('⚠ REVIEW_REQUIRED');
    expect(output).toContain('vehicle plate mismatch');
  });

  it('should include result content when present', () => {
    const output = formatAsHuman({
      requestId: 'req-1',
      responseToken: 'token',
      responseUrl: 'https://localhost/placeholder' as never,
      resultContent: { distance: 42 },
      resultStatus: 'PASSED' as const,
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
        resultStatus: 'PASSED' as const,
      },
      { debug: true },
    );

    expect(output).toContain('Full Output');
    expect(output).toContain('req-1');
  });
});
