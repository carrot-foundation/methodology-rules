import type { PluginOption } from 'vite';
import _swc from 'unplugin-swc';

// Handle CJS/ESM default-export interop
const swc =
  'vite' in _swc ? _swc : (_swc as unknown as { default: typeof _swc }).default;

export interface VitestPluginsOptions {
  dirname: string;
}

export const getVitestBasePlugins = ({
  dirname: _dirname,
}: VitestPluginsOptions): PluginOption[] => {
  return [
    swc.vite({
      jsc: {
        target: 'es2022',
        parser: {
          syntax: 'typescript',
          tsx: false,
          decorators: false,
        },
      },
    }),
  ];
};
