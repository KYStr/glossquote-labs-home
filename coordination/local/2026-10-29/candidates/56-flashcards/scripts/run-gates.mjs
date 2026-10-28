import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './files.mjs';

const stage = process.argv[2];
if (!/^(t00|t01|t02|t03|final)$/.test(stage ?? '')) throw new Error('STAGE_REQUIRED');
const commands = [['test'], ['run', 'check'], ['run', 'build']];
const npmCli = process.argv[3];
if (!npmCli) throw new Error('EXPLICIT_NPM_CLI_REQUIRED');
mkdirSync(join(ROOT, 'evidence/m1'), { recursive: true });
const results = [];
for (const args of commands) {
  const result = spawnSync(process.execPath, [npmCli, ...args], { cwd: ROOT, shell: false, windowsHide: true, encoding: 'utf8', timeout: 120000 });
  const record = { command: `npm ${args.join(' ')}`, executable: process.execPath, npmCli, shell: false, windowsHide: true, exit: result.status, signal: result.signal, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
  results.push(record);
  process.stdout.write(`${record.command}: exit ${record.exit}\n${record.stdout}${record.stderr}`);
  if (result.status !== 0) break;
}
let output = join(ROOT, `evidence/m1/${stage}-commands.json`), attempt = 1;
while (existsSync(output)) { attempt++; output = join(ROOT, `evidence/m1/${stage}-commands-attempt-${attempt}.json`); }
writeFileSync(output, `${JSON.stringify(results, null, 2)}\n`, { flag: 'wx' });
if (results.length !== 3 || results.some(result => result.exit !== 0)) process.exitCode = 1;
