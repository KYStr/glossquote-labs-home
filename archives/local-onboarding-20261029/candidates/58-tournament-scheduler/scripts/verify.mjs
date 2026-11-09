import { spawnSync } from 'node:child_process';
import { mkdir, writeFile, lstat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { PROJECT_ROOT } from './check.mjs';

// Run the requested npm commands without loading account npm config or credential env.
const evidence = join(PROJECT_ROOT, 'evidence/m1');
const runDirectory = join(evidence, 'final-commands');
await mkdir(runDirectory); // Preserve historical runs; never overwrite results.
const userConfig = join(runDirectory, 'empty-user.npmrc');
const globalConfig = join(runDirectory, 'empty-global.npmrc');
await writeFile(userConfig, '', { flag: 'wx' });
await writeFile(globalConfig, '', { flag: 'wx' });
try {
  await lstat(join(PROJECT_ROOT, '.npmrc'));
  throw new Error('Unreviewed project npm configuration; do not run npm');
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const env = {};
for (const key of ['SystemRoot', 'WINDIR', 'ComSpec', 'Path', 'PATH', 'PATHEXT', 'TEMP', 'TMP']) {
  if (process.env[key] !== undefined) env[key] = process.env[key];
}
Object.assign(env, { npm_config_userconfig: userConfig, npm_config_globalconfig: globalConfig, npm_config_cache: join(runDirectory, 'npm-cache'), npm_config_logs_max: '0', npm_config_update_notifier: 'false', npm_config_offline: 'true', npm_config_audit: 'false', npm_config_fund: 'false', NO_COLOR: '1' });
const npm = join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const results = { node: process.version, subprocess: { shell: false, windowsHide: true, offline: true, accountNpmConfig: false }, commands: [] };
for (const [label, args] of [['npm test', ['test']], ['npm run check', ['run', 'check']], ['npm run build', ['run', 'build']]]) {
  const child = spawnSync(process.execPath, [npm, ...args], { cwd: PROJECT_ROOT, env, encoding: 'utf8', shell: false, windowsHide: true, maxBuffer: 4194304, timeout: 120000 });
  const name = args.at(-1);
  await writeFile(join(runDirectory, `${name}.stdout.txt`), child.stdout ?? '', { flag: 'wx' });
  await writeFile(join(runDirectory, `${name}.stderr.txt`), child.stderr ?? '', { flag: 'wx' });
  const entry = { command: label, executable: process.execPath, args: [npm, ...args], exit: child.status, signal: child.signal, errorCode: child.error?.code ?? null };
  results.commands.push(entry);
  await writeFile(join(runDirectory, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
  process.stdout.write(`${label}: exit ${child.status}\n`);
  if (child.status !== 0 || child.error) { process.stderr.write(child.stdout ?? ''); process.stderr.write(child.stderr ?? ''); process.exitCode = 1; break; }
}
