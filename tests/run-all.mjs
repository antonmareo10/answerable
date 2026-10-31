import { spawnSync } from 'node:child_process';
for (const args of [['--test', 'tests/unit.mjs'], ['tests/e2e.mjs'], ['tests/a11y-tree.mjs']]) {
  const r = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (r.status) process.exit(r.status);
}
