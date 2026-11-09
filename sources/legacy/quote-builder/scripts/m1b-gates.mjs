import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root } from './files.mjs';

const evidence = path.join(root, 'evidence/m1b');
await mkdir(evidence, { recursive: true });
const npmCli = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const report = { task: 'B20-RP-57', node: process.version, shell: false, windowsHide: true, evidenceKind: 'offline Node / release preparation; no browser or deployment', runs: [] };
for (const [name, args, command] of [
  ['test', ['test'], 'npm test'],
  ['check', ['run', 'check'], 'npm run check'],
  ['build-release', ['run', 'build:release'], 'npm run build:release'],
  ['check-release', ['run', 'check:release'], 'npm run check:release'],
]) {
  const child = spawnSync(process.execPath, [npmCli, ...args], { cwd: root, shell: false, windowsHide: true, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const log = `final-${name}.log`;
  await writeFile(path.join(evidence, log), `${child.stdout || ''}${child.stderr || ''}`, 'utf8');
  report.runs.push({ command, exit: child.status, log, error: child.error ? 'CHILD_START_FAILED' : null });
  console.log(`${command}: exit ${child.status}`);
  if (child.status !== 0) { process.exitCode = 1; break; }
}
await writeFile(path.join(evidence, 'commands.json'), JSON.stringify(report, null, 2) + '\n');
