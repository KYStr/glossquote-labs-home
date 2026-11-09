import { lstat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { root, sourceContents, inventory, verifyBuild } from './assets.mjs';

try {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('node-24-required');
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  if (Object.keys(pkg.dependencies ?? {}).length || Object.keys(pkg.devDependencies ?? {}).length) throw new Error('external-dependencies');
  const source = await sourceContents();
  const scripts = await inventory(join(root, 'scripts'));
  const expected = ['assets.mjs', 'build-production.mjs', 'build.mjs', 'check-production.mjs', 'check.mjs', 'generate-pages.mjs', 'production.mjs', 'release-check.mjs', 'serve-production.mjs', 'serve.mjs'];
  if (JSON.stringify(scripts) !== JSON.stringify(expected)) throw new Error('unexpected-script');
  for (const path of [...source.keys()].filter(path => path.endsWith('.js')).map(path => join(root, 'public', path)).concat(scripts.map(path => join(root, 'scripts', path)))) {
    if (spawnSync(process.execPath, ['--check', path], { stdio: 'pipe' }).status !== 0) throw new Error('syntax-check-failed');
  }
  let built = false;
  try { await lstat(join(root, 'dist')); built = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (built) await verifyBuild();
  process.stdout.write(`PASS source allowlist, schemas, syntax, privacy scan${built ? ', fresh preview manifest' : ''}\n`);
} catch (error) {
  process.stderr.write(`FAIL check: ${['node-24-required','external-dependencies','unexpected-script','syntax-check-failed','unsafe-file-type','unexpected-public-file','stale-html','forbidden-browser-capability','external-or-inline-code','unexpected-build-file','stale-build','invalid-manifest'].includes(error.message) ? error.message : 'check-failed'}\n`);
  process.exitCode = 1;
}
