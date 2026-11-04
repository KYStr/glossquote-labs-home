import { spawnSync } from 'node:child_process';
import { mkdir, writeFile, lstat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { PROJECT_ROOT } from './check.mjs';

const directory = join(PROJECT_ROOT, 'evidence/m1b/final-commands');
await mkdir(directory); // An existing run is evidence, never silently overwritten.
const userConfig = join(directory, 'empty-user.npmrc');
const globalConfig = join(directory, 'empty-global.npmrc');
await writeFile(userConfig, '', { flag: 'wx' });
await writeFile(globalConfig, '', { flag: 'wx' });
try { await lstat(join(PROJECT_ROOT, '.npmrc')); throw new Error('Unreviewed project npm config; stop'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const env = {};
for (const key of ['SystemRoot', 'WINDIR', 'ComSpec', 'Path', 'PATH', 'PATHEXT', 'TEMP', 'TMP']) if (process.env[key] !== undefined) env[key] = process.env[key];
Object.assign(env, { npm_config_userconfig: userConfig, npm_config_globalconfig: globalConfig, npm_config_cache: join(directory, 'npm-cache'), npm_config_logs_max: '0', npm_config_update_notifier: 'false', npm_config_offline: 'true', npm_config_audit: 'false', npm_config_fund: 'false', NO_COLOR: '1' });
const npm = join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const results = { node: process.version, scope: 'M1B offline release preparation only', subprocess: { shell: false, windowsHide: true, offline: true, accountNpmConfig: false }, commands: [] };
for (const [command, args, name] of [
  ['npm test', ['test'], 'test'], ['npm run check', ['run', 'check'], 'check'],
  ['npm run build:release', ['run', 'build:release'], 'build-release'], ['npm run check:release', ['run', 'check:release'], 'check-release']
]) {
  const child = spawnSync(process.execPath, [npm, ...args], { cwd: PROJECT_ROOT, env, encoding: 'utf8', shell: false, windowsHide: true, maxBuffer: 4194304, timeout: 120000 });
  await writeFile(join(directory, `${name}.stdout.txt`), child.stdout ?? '', { flag: 'wx' });
  await writeFile(join(directory, `${name}.stderr.txt`), child.stderr ?? '', { flag: 'wx' });
  results.commands.push({ command, executable: process.execPath, args: [npm, ...args], exit: child.status, signal: child.signal, errorCode: child.error?.code ?? null });
  await writeFile(join(directory, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
  process.stdout.write(`${command}: exit ${child.status}\n`);
  if (child.error || child.status !== 0) { process.stderr.write(child.stdout ?? ''); process.stderr.write(child.stderr ?? ''); process.exitCode = 1; break; }
}
