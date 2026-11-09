import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, ASSETS, validateSource, inspectTree, validateBuild } from './validation.mjs';

await validateSource();
const scripts = (await readdir(path.join(ROOT, 'scripts'))).filter(file => file.endsWith('.mjs'));
const code = [...ASSETS.filter(file => file.endsWith('.mjs')).map(file => `public/${file}`), ...scripts.map(file => `scripts/${file}`)];
for (const file of code) {
  const result = spawnSync(process.execPath, ['--check', path.join(ROOT, file)], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`SYNTAX_CHECK_FAILED: ${file}`);
}
const existing = await inspectTree(path.join(ROOT, 'dist'), { optional: true });
if (existing.length) await validateBuild();
process.stdout.write(`PASS source contract, ${ASSETS.length} static assets, ${code.length} syntax checks${existing.length ? ', current build' : ''}\n`);
