import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root } from './files.mjs';

const evidence = path.join(root, 'evidence/m1');
await mkdir(evidence, { recursive: true });
const npmCli = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const report = { node: process.version, npmEntrypoint: npmCli, shell: false, windowsHide: true, runs: [] };
for (const [name, args, command] of [['test', ['test'], 'npm test'], ['check', ['run', 'check'], 'npm run check'], ['build', ['run', 'build'], 'npm run build']]) {
  const result = spawnSync(process.execPath, [npmCli, ...args], { cwd: root, shell: false, windowsHide: true, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const log = `final-${name}.log`;
  await writeFile(path.join(evidence, log), `${result.stdout || ''}${result.stderr || ''}`, 'utf8');
  report.runs.push({ command, exit: result.status, log, error: result.error ? 'CHILD_START_FAILED' : null });
  console.log(`${command}: exit ${result.status}`);
  if (result.status !== 0) { process.exitCode = 1; break; }
}
await writeFile(path.join(evidence, 'commands.json'), JSON.stringify(report, null, 2) + '\n');
