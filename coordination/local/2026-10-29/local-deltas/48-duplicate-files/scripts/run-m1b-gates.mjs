import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile, lstat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import assert from 'node:assert/strict';
import { ROOT } from './check.mjs';

const mode = process.argv[2];
assert(['targeted', 'final'].includes(mode) && process.argv.length === 3, 'Use targeted or final only');
const evidence = resolve(ROOT, 'evidence/m1b'); await mkdir(evidence, { recursive: true });
// Never overwrite an earlier attempt, including failures.
let attempt = 1;
while (true) { try { await lstat(resolve(evidence, `${mode}-${attempt}-commands.json`)); attempt++; } catch (error) { if (error.code === 'ENOENT') break; throw error; } }
const npmCli = resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'); await readFile(npmCli);
const commands = mode === 'targeted' ? [['node --test test/release.test.mjs', ['--test', 'test/release.test.mjs']]] : [
  ['node --version', ['--version']], ['npm test', [npmCli, 'test']], ['npm run check', [npmCli, 'run', 'check']],
  ['npm run build:release', [npmCli, 'run', 'build:release']], ['npm run check:release', [npmCli, 'run', 'check:release']]
];
const records = [];
for (const [command, args] of commands) {
  const result = spawnSync(process.execPath, args, { cwd: ROOT, shell: false, windowsHide: true, encoding: 'utf8', timeout: 120000 });
  const log = `${mode}-${attempt}-${records.length + 1}.log`, text = (result.stdout ?? '') + (result.stderr ?? '');
  await writeFile(resolve(evidence, log), text);
  records.push({ command, exit: result.status, signal: result.signal, errorCode: result.error?.code ?? null, log });
  await writeFile(resolve(evidence, `${mode}-${attempt}-commands.json`), JSON.stringify(records, null, 2) + '\n');
  console.log(`${command}: exit ${result.status} (${log})`);
  if (result.status !== 0) { process.exitCode = 1; break; }
}
