import type { PluginOption } from 'vite';
import path from 'node:path';
import _tsconfigPaths from 'vite-tsconfig-paths';
import _swc from 'unplugin-swc';

// Handle CJS/ESM default-export interop
const tsconfigPaths =
  typeof _tsconfigPaths === 'function'
    ? _tsconfigPaths
    : (_tsconfigPaths as unknown as { default: typeof _tsconfigPaths }).default;

const swc =
  'vite' in _swc ? _swc : (_swc as unknown as { default: typeof _swc }).default;

export interface VitestPluginsOptions {
  dirname: string;
}

export const getVitestBasePlugins = ({
  dirname: _dirname,
}: VitestPluginsOptions): PluginOption[] => {
  const workspaceRoot = path.resolve(import.meta.dirname, '../..');
  const baseTsconfig = path.join(workspaceRoot, 'tsconfig.base.json');

  return [
    tsconfigPaths({
      projects: [baseTsconfig],
    }),
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
