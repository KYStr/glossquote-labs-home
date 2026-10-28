import { spawnSync } from 'node:child_process';
import { readFile, writeFile, readdir, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ROOT } from './contract.mjs';

export async function sourceManifest() {
  const names = ['.gitignore', 'package.json'];
  async function walk(dir) {
    for (const name of await readdir(path.join(ROOT, dir))) {
      const relative = dir + '/' + name;
      const info = await lstat(path.join(ROOT, relative));
      if (info.isSymbolicLink()) throw new Error('SOURCE_LINK');
      if (info.isDirectory()) await walk(relative);
      else names.push(relative);
    }
  }
  for (const directory of ['public', 'scripts', 'test']) await walk(directory);
  return Promise.all(names.sort().map(async name => {
    const bytes = await readFile(path.join(ROOT, name));
    return { path: name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.join(ROOT, 'scripts/run-gates.mjs')) {
  const phase = process.argv[2];
  if (!['t00', 't01', 't02', 't03', 'final'].includes(phase)) throw new Error('INVALID_PHASE');
  const before = await sourceManifest();
  const commands = phase === 't01' ? [['test'], ['run', 'check']] : [['test'], ['run', 'check'], ['run', 'build']];
  const results = [];
  for (const args of commands) {
    const npmCli = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
    const result = spawnSync(process.execPath, [npmCli, ...args], { cwd: ROOT, shell: false, windowsHide: true, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
    const log = (result.stdout ?? '') + (result.stderr ?? '');
    const logPath = 'evidence/m1/' + phase + '-' + args.at(-1) + '.log';
    await writeFile(path.join(ROOT, logPath), log);
    results.push({ command: 'npm ' + args.join(' '), executable: process.execPath, args: [npmCli, ...args], exit: result.status, signal: result.signal, log: logPath, tests: args[0] === 'test' ? { count: Number(log.match(/(?:#|ℹ) tests (\d+)/)?.[1] ?? -1), pass: Number(log.match(/(?:#|ℹ) pass (\d+)/)?.[1] ?? -1), fail: Number(log.match(/(?:#|ℹ) fail (\d+)/)?.[1] ?? -1) } : undefined });
    process.stdout.write(results.at(-1).command + ': exit ' + result.status + '\n');
    if (result.status !== 0) { process.stdout.write(log); break; }
  }
  const after = await sourceManifest();
  const unchanged = JSON.stringify(before) === JSON.stringify(after);
  await writeFile(path.join(ROOT, 'evidence/m1/' + phase + '-gates.json'), JSON.stringify({ node: process.version, results, sourceUnchanged: unchanged, before, after }, null, 2) + '\n');
  if (!unchanged || results.some(result => result.exit !== 0) || results.length !== commands.length) process.exitCode = 1;
}
