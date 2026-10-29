import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const label = process.argv[2] || 'offline-1';
if (!/^offline-[1-9][0-9]?$/.test(label)) throw new Error('Fixed evidence label required');
const syntax = ['generation-decision.mjs', 'generation-decision.test.mjs', 'receipt-decision.mjs', 'receipt-decision.test.mjs', 'node-calibration-fixture.mjs', 'compile-only.mjs', 'run-offline-checks.mjs'];
const commands = syntax.map((f) => ['--check', path.join(root, f)]);
commands.push(['--test', path.join(root, 'generation-decision.test.mjs'), path.join(root, 'receipt-decision.test.mjs')]);
const results = [];
for (const [i, args] of commands.entries()) {
  const child = spawnSync(process.execPath, args, { cwd: root, shell: false, windowsHide: true, timeout: 30000, encoding: 'utf8', maxBuffer: 2097152 });
  const output = `${label}-${i}.txt`;
  await fs.writeFile(path.join(root, output), (child.stdout || '') + (child.stderr || ''), { flag: 'wx' });
  results.push({ command: [process.execPath, ...args], exitCode: child.status, windowsHide: true, output, errorCode: child.error?.code || null });
  if (child.status !== 0) break;
}
const result = { taskId: 'MU20-11-M1', status: results.length === commands.length && results.every((r) => r.exitCode === 0) ? 'PASS_OFFLINE_ONLY' : 'FAIL_OFFLINE', commands: results,
  nativeCollectorExecuted: false, libraryLoaded: false, nodeCalibrationFixtureExecuted: false, browserExecuted: false, nativeCalibration: 'NOT_RUN_PRIMARY_REVIEW_REQUIRED' };
await fs.writeFile(path.join(root, label + '.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: result.status, commands: results.length, log: results.at(-1).output }));
if (result.status !== 'PASS_OFFLINE_ONLY') process.exitCode = 1;
