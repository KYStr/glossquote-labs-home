import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { ROOT } from './files.mjs';

if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('NODE_24_REQUIRED');
const npmCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const evidence = join(ROOT, 'evidence', 'm1b');
await mkdir(evidence, { recursive: true });
const results = [];
for (const args of [['--version'], ['test'], ['run', 'check'], ['run', 'build:release'], ['run', 'check:release']]) {
  const commandArgs = [npmCli, '--offline', '--no-audit', '--no-fund', '--update-notifier=false', ...args];
  const name = args.at(-1) === '--version' ? 'npm-version' : args.at(-1).replace(':', '-');
  const result = spawnSync(process.execPath, commandArgs, { cwd: ROOT, shell: false, windowsHide: true, encoding: 'utf8', maxBuffer: 4194304 });
  await writeFile(join(evidence, `${name}.stdout.txt`), result.stdout ?? '');
  await writeFile(join(evidence, `${name}.stderr.txt`), result.stderr ?? '');
  const count = args[0] === 'test' ? Number((result.stdout.match(/(?:# |ℹ )?tests\s+(\d+)/) ?? [])[1]) : null;
  results.push({ command: [process.execPath, ...commandArgs], node: process.version, exit: result.status, signal: result.signal, tests: Number.isFinite(count) ? count : null, log: `${name}.stdout.txt`, stderrLog: `${name}.stderr.txt` });
  await writeFile(join(evidence, 'commands.json'), JSON.stringify({ task: 'B20-RP-60', offlineNpm: true, serverStarted: false, results }, null, 2) + '\n');
  process.stdout.write(`${name}: exit ${result.status}${count ? `, ${count} tests` : ''}\n`);
  if (result.status !== 0 || result.error) { process.exitCode = 1; break; }
}
