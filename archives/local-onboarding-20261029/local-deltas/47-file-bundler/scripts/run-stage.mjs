import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { ROOT } from './assets.mjs';

// Task-owned CLI verification only. Never launches a server, browser, or installer.
const [stage, powershell, guard] = process.argv.slice(2);
if (!/^[a-z0-9-]+$/.test(stage ?? '') || !powershell || !guard) throw new Error('STAGE_ARGUMENTS');
const evidence = join(ROOT, 'evidence', 'm1');
await mkdir(evidence, { recursive: true });
const target = join(evidence, `${stage}-commands.json`);
try { await access(target); throw new Error('EVIDENCE_ALREADY_EXISTS'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const baseline = JSON.parse(await readFile(join(evidence, 'environment-before.json'), 'utf8'));
function run(executable, args) {
  const result = spawnSync(executable, args, { cwd: ROOT, shell: false, windowsHide: true, timeout: 45000, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8' });
  return { exitCode: result.status, signal: result.signal, stdout: result.stdout ?? '', stderr: result.stderr ?? '', error: result.error ? 'PROCESS_FAILED' : null };
}
function captureEnvironment() {
  const result = run(powershell, ['-NoProfile', '-NonInteractive', '-File', guard]);
  if (result.exitCode !== 0) throw new Error('ENVIRONMENT_GUARD_FAILED');
  const snapshot = JSON.parse(result.stdout.replace(/^\uFEFF/, ''));
  if (snapshot.Status !== 'PASS' || JSON.stringify(snapshot.Snapshots) !== JSON.stringify(baseline.Snapshots)) throw new Error('PERSISTENT_ENVIRONMENT_DRIFT');
  return snapshot;
}
const before = captureEnvironment();
await writeFile(join(evidence, `${stage}-environment-before.json`), `${JSON.stringify(before, null, 2)}\n`, { flag: 'wx' });
const commands = [];
const npm = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
for (const [command, args] of [
  ['node --version', ['--version']],
  ['npm test', [npm, 'test']],
  ['npm run check', [npm, 'run', 'check']],
  ['npm run build', [npm, 'run', 'build']]
]) {
  const result = run(process.execPath, args);
  commands.push({ command, ...result });
  process.stdout.write(`${command}: exit ${result.exitCode}\n${result.stdout}${result.stderr}`);
  if (result.exitCode !== 0) break;
}
await writeFile(target, `${JSON.stringify({ stage, shell: false, windowsHide: true, commands }, null, 2)}\n`, { flag: 'wx' });
const after = captureEnvironment();
await writeFile(join(evidence, `${stage}-environment-after.json`), `${JSON.stringify(after, null, 2)}\n`, { flag: 'wx' });
if (commands.length !== 4 || commands.some(item => item.exitCode !== 0)) process.exitCode = 1;
