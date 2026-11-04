#!/bin/sh
set -eu
project_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)"
cd "$project_root"
if command -v crisos-project-setup >/dev/null 2>&1; then
  exec crisos-project-setup start --worktree "$project_root" --wait
fi
node_pin="$(cat .nvmrc)"
node_pin="${node_pin#v}"
if [ "$(node --version)" != "v$node_pin" ]; then
  echo "worktree setup requires Node $node_pin from .nvmrc" >&2
  exit 1
fi
pnpm_pin="$(node -p "JSON.parse(require('fs').readFileSync('package.json', 'utf8')).packageManager.split('@')[1].split('+')[0]")"
if [ "$(pnpm --version)" != "$pnpm_pin" ]; then
  echo "worktree setup requires pnpm $pnpm_pin from packageManager" >&2
  exit 1
fi
NX_DAEMON=false pnpm install --frozen-lockfile --prefer-offline
if [ -d .husky ]; then
  pnpm exec husky
fi
