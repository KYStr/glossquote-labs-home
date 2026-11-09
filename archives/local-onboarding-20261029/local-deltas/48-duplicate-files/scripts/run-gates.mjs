import { spawnSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { ROOT } from './check.mjs';

const stage = process.argv[2];
assert(['t00', 't10', 't20', 't30'].includes(stage), 'Expected a named M1 stage');
const npmCli = resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
await readFile(npmCli);
const evidence = resolve(ROOT, 'evidence/m1');
await mkdir(evidence, { recursive: true });
const records = [];
for (const [command, args] of [
  ['node --version', ['--version']], ['npm test', [npmCli, 'test']],
  ['npm run check', [npmCli, 'run', 'check']], ['npm run build', [npmCli, 'run', 'build']]
]) {
  const result = spawnSync(process.execPath, args, { cwd: ROOT, shell: false, windowsHide: true, encoding: 'utf8', timeout: 120000 });
  const log = (result.stdout ?? '') + (result.stderr ?? '');
  await writeFile(resolve(evidence, `${stage}-${records.length + 1}.log`), log);
  const record = { command, exit: result.status, signal: result.signal, errorCode: result.error?.code ?? null, log: `${stage}-${records.length + 1}.log` };
  records.push(record);
  console.log(`${stage} ${command}: exit ${result.status}`);
  if (result.status !== 0) {
    await writeFile(resolve(evidence, `${stage}-commands.json`), JSON.stringify(records, null, 2) + '\n');
    process.exitCode = 1;
    break;
  }
}
await writeFile(resolve(evidence, `${stage}-commands.json`), JSON.stringify(records, null, 2) + '\n');
