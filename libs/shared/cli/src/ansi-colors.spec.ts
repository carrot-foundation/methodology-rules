import { blue, bold, cyan, gray, green, red, yellow } from './ansi-colors';

describe('ansi-colors', () => {
  it('should wrap text with bold escape codes', () => {
    expect(bold('hello')).toBe('\u001B[1mhello\u001B[22m');
  });

  it('should wrap text with gray escape codes', () => {
    expect(gray('hello')).toBe('\u001B[90mhello\u001B[39m');
  });

  it('should wrap text with green escape codes', () => {
    expect(green('hello')).toBe('\u001B[92mhello\u001B[39m');
  });

  it('should wrap text with red escape codes', () => {
    expect(red('hello')).toBe('\u001B[91mhello\u001B[39m');
  });

  it('should wrap text with blue escape codes', () => {
    expect(blue('hello')).toBe('\u001B[94mhello\u001B[39m');
  });

  it('should wrap text with yellow escape codes', () => {
    expect(yellow('hello')).toBe('\u001B[93mhello\u001B[39m');
  });

  it('should wrap text with cyan escape codes', () => {
    expect(cyan('hello')).toBe('\u001B[96mhello\u001B[39m');
  });

  it('should support nested color functions', () => {
    expect(bold(green('ok'))).toBe('\u001B[1m\u001B[92mok\u001B[39m\u001B[22m');
  });
});
