import { mkdir, writeFile, readFile, readdir, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const [mode, tag, ...extra] = process.argv.slice(2);
if (!['targeted', 'final'].includes(mode) || !/^[a-z0-9-]+$/.test(tag ?? '') || extra.length) throw new Error('Usage: capture-m1b.mjs targeted|final unique-tag');
if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error('Node 24 required.');
const evidence = new URL(`evidence/m1b/${tag}/`, root);
await mkdir(evidence);
const npmCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
let npmEnvironment;
if (mode === 'final') {
  const config = new URL('npm-isolation/', evidence);
  await mkdir(config);
  await writeFile(new URL('user.npmrc', config), '', { flag: 'wx' });
  await writeFile(new URL('global.npmrc', config), '', { flag: 'wx' });
  // No inherited credentials, account .npmrc, Node hooks or diagnostic flags.
  // All overrides stay in this child environment, never in User/Machine state.
  npmEnvironment = {
    Path: `${dirname(process.execPath)};C:\\Windows\\System32`,
    SystemRoot: 'C:\\Windows', ComSpec: 'C:\\Windows\\System32\\cmd.exe', PATHEXT: '.COM;.EXE;.BAT;.CMD',
    npm_config_userconfig: fileURLToPath(new URL('user.npmrc', config)),
    npm_config_globalconfig: fileURLToPath(new URL('global.npmrc', config)),
    npm_config_cache: fileURLToPath(new URL('cache/', config)),
    npm_config_offline: 'true', npm_config_update_notifier: 'false', npm_config_audit: 'false', npm_config_fund: 'false',
    NODE_OPTIONS: `--import=${new URL('scripts/hidden-process.mjs', root).href}`
  };
}
const commands = mode === 'targeted' ? [
  { command: 'node --test test/release.test.mjs', args: ['--test', 'test/release.test.mjs'] }
] : [
  { command: 'node --version', args: ['--version'] },
  { command: 'npm --version', args: [npmCli, '--version'] },
  { command: 'npm test', args: [npmCli, 'test'] },
  { command: 'npm run check', args: [npmCli, 'run', 'check'] },
  { command: 'npm run build:release', args: [npmCli, 'run', 'build:release'] },
  { command: 'npm run check:release', args: [npmCli, 'run', 'check:release'] }
];
const records = [];
for (let i = 0; i < commands.length; i += 1) {
  const command = commands[i]; const startedAt = new Date().toISOString();
  const run = spawnSync(process.execPath, command.args, {
    cwd: fileURLToPath(root), shell: false, windowsHide: true, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    ...(npmEnvironment ? { env: npmEnvironment } : {})
  });
  const stdout = `${i + 1}-stdout.txt`, stderr = `${i + 1}-stderr.txt`;
  await writeFile(new URL(stdout, evidence), run.stdout ?? '', { flag: 'wx' });
  await writeFile(new URL(stderr, evidence), run.stderr ?? '', { flag: 'wx' });
  records.push({ command: command.command, executable: process.execPath, args: command.args,
    startedAt, finishedAt: new Date().toISOString(), exitCode: run.status, signal: run.signal,
    spawnError: run.error?.code ?? null, stdout, stderr });
  console.log(`${command.command}: exit ${run.status}`);
  if (run.status !== 0 || run.error) break;
}
await writeFile(new URL('commands.json', evidence), `${JSON.stringify(records, null, 2)}\n`, { flag: 'wx' });
const passed = records.length === commands.length && records.every(record => record.exitCode === 0 && !record.spawnError);
if (!passed) process.exitCode = 1;
else if (mode === 'final') {
  const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
  const paths = ['package.json', '.gitignore'];
  const walk = async (folder, prefix) => {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const target = new URL(entry.name + (entry.isDirectory() ? '/' : ''), folder);
      if ((await lstat(target)).isSymbolicLink()) throw new Error('Source link refused.');
      if (entry.isDirectory()) await walk(target, `${prefix}${entry.name}/`);
      else paths.push(`${prefix}${entry.name}`);
    }
  };
  for (const folder of ['public', 'scripts', 'test']) await walk(new URL(`${folder}/`, root), `${folder}/`);
  const files = [];
  for (const path of paths.sort()) {
    const bytes = await readFile(new URL(path, root));
    files.push({ path, bytes: bytes.byteLength, sha256: sha256(bytes) });
  }
  const manifestDigest = sha256(Buffer.from(JSON.stringify(files)));
  await writeFile(new URL('sources.sha256.json', evidence), `${JSON.stringify({ algorithm: 'SHA-256', manifestDigest, files }, null, 2)}\n`, { flag: 'wx' });
  const manifestBytes = await readFile(new URL('release-artifacts/manifest.json', root));
  const manifest = JSON.parse(manifestBytes);
  for (const file of manifest.files) {
    const bytes = await readFile(new URL(`release-artifacts/site/${file.path}`, root));
    if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256) throw new Error('Artifact mismatch after verification.');
  }
  await writeFile(new URL('artifact.sha256.json', evidence), `${JSON.stringify({
    manifest: { path: 'release-artifacts/manifest.json', bytes: manifestBytes.byteLength, sha256: sha256(manifestBytes) },
    files: manifest.files, sourceFiles: manifest.sourceFiles, sourceManifestDigest: manifestDigest
  }, null, 2)}\n`, { flag: 'wx' });
  console.log(`Frozen ${files.length} source files; digest ${manifestDigest}.`);
  console.log(`Release manifest ${manifestBytes.length} bytes, SHA-256 ${sha256(manifestBytes)}; ${manifest.files.length} site files.`);
}
