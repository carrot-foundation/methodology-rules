import type { PluginOption } from 'vite';
import _swc from 'unplugin-swc';

// Handle CJS/ESM default-export interop
const swc =
  'vite' in _swc ? _swc : (_swc as unknown as { default: typeof _swc }).default;

if (!swc?.vite) {
  throw new Error(
    'Failed to resolve unplugin-swc: unexpected export shape. ' +
      'Verify that the installed version of unplugin-swc is compatible.',
  );
}

export const getVitestBasePlugins = (): PluginOption[] => {
  return [
    swc.vite({
      jsc: {
        target: 'es2024',
        parser: {
          syntax: 'typescript',
          tsx: false,
          decorators: false,
        },
      },
    }),
  ];
};
