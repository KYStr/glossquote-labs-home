import { spawnSync } from 'node:child_process';
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { root } from './files.mjs';
const stage = process.argv[2];
if (!/^(t00|t10|t20|t30)$/.test(stage ?? '')) throw new Error('Explicit ordered stage required');
let folder = path.join(root, 'evidence', 'm1', stage);
try { await access(folder); folder += '-rerun-' + Date.now(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(folder, { recursive: true });
const npmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const commands = [['node --version', ['--version']], ['npm test', [npmCli, 'test']], ['npm run check', [npmCli, 'run', 'check']], ['npm run build', [npmCli, 'run', 'build']]];
const report = [];
for (const [label, args] of commands) {
  const start = Date.now();
  const result = spawnSync(process.execPath, args, { cwd: root, shell: false, windowsHide: true, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 120000 });
  const log = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  await writeFile(path.join(folder, label.replaceAll(' ', '-') + '.txt'), log);
  report.push({ command: label, executable: process.execPath, args, exit: result.status, signal: result.signal, elapsedMs: Date.now() - start });
  process.stdout.write(`${label}: exit=${result.status}\n${log}`);
  if (result.status !== 0) { process.exitCode = 1; break; }
}
await writeFile(path.join(folder, 'commands.json'), JSON.stringify(report, null, 2) + '\n');
