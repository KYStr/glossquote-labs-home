import { readdir, readFile, lstat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { ROOT } from './contract.mjs';
import { sourceManifest } from './run-gates.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const save = (file, value) => writeFile(path.join(ROOT, 'evidence/m1b', file), JSON.stringify(value, null, 2) + '\n');
async function protectedFiles() {
  const records = [];
  async function walk(name) {
    const stat = await lstat(path.join(ROOT, name));
    if (stat.isSymbolicLink()) throw new Error('PROTECTED_LINK');
    if (stat.isDirectory()) { for (const item of await readdir(path.join(ROOT, name))) await walk(name + '/' + item); }
    else { const bytes = await readFile(path.join(ROOT, name)); records.push({ path: name, bytes: bytes.length, sha256: digest(bytes) }); }
  }
  for (const directory of ['public', 'dist', 'evidence/m1', 'docs']) await walk(directory);
  for (const file of ['AGENTS.md', 'START-HERE.md', 'README.md', 'PRODUCT.md', 'TECHNICAL.md', 'ACCEPTANCE.md', 'TASKS.md', 'UX-SEO.md']) await walk(file);
  return records.sort((a, b) => a.path.localeCompare(b.path, 'en'));
}
const baseline = JSON.parse(await readFile(path.join(ROOT, 'evidence/m1b/protected-before.json'), 'utf8'));
const beforeProtected = await protectedFiles();
if (JSON.stringify(baseline) !== JSON.stringify(beforeProtected)) throw new Error('PROTECTED_INPUT_CHANGED_STOP');
const before = await sourceManifest();
const commands = [['test'], ['run', 'check'], ['run', 'build:release'], ['run', 'check:release']];
const results = [];
for (const args of commands) {
  const npmCli = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  const result = spawnSync(process.execPath, [npmCli, ...args], { cwd: ROOT, shell: false, windowsHide: true, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
  const log = (result.stdout ?? '') + (result.stderr ?? '');
  const file = 'final-' + args.at(-1).replace(':', '-') + '.log';
  await writeFile(path.join(ROOT, 'evidence/m1b', file), log);
  results.push({ command: 'npm ' + args.join(' '), executable: process.execPath, args: [npmCli, ...args], exit: result.status, signal: result.signal, log: file, ...(args[0] === 'test' ? { tests: { count: Number(log.match(/(?:#|ℹ) tests (\d+)/)?.[1] ?? -1), pass: Number(log.match(/(?:#|ℹ) pass (\d+)/)?.[1] ?? -1), fail: Number(log.match(/(?:#|ℹ) fail (\d+)/)?.[1] ?? -1), skipped: Number(log.match(/(?:#|ℹ) skipped (\d+)/)?.[1] ?? -1) } } : {}) });
  process.stdout.write(results.at(-1).command + ': exit ' + result.status + '\n');
  if (result.status !== 0) { process.stdout.write(log); break; }
}
const after = await sourceManifest(), afterProtected = await protectedFiles();
const sourceUnchanged = JSON.stringify(before) === JSON.stringify(after), protectedUnchanged = JSON.stringify(baseline) === JSON.stringify(afterProtected);
await save('final-gates.json', { node: process.version, results, sourceUnchanged, protectedUnchanged, before, after });
await save('protected-after.json', afterProtected);
const sourceText = JSON.stringify(after, null, 2) + '\n';
await writeFile(path.join(ROOT, 'evidence/m1b/source-files.json'), sourceText);
await save('source-identity.json', { files: after.length, bytes: after.reduce((sum, file) => sum + file.bytes, 0), algorithm: 'SHA-256 of source-files.json UTF-8 bytes', sha256: digest(sourceText), node: process.version });
if (!sourceUnchanged || !protectedUnchanged || results.length !== 4 || results.some(result => result.exit !== 0)) process.exitCode = 1;
else {
  const manifest = await readFile(path.join(ROOT, 'release-artifacts/manifest.json'));
  const parsed = JSON.parse(manifest);
  await save('artifact-identity.json', { origin: parsed.origin, toolSlug: parsed.toolSlug, mode: parsed.mode, manifestBytes: manifest.length, manifestSHA256: digest(manifest), siteFiles: parsed.files.length, siteBytes: parsed.files.reduce((sum, file) => sum + file.bytes, 0), sourcePublicFiles: parsed.sourceFiles.length, sourcePublicBytes: parsed.sourceFiles.reduce((sum, file) => sum + file.bytes, 0), sourcePublicRecordsSHA256: digest(JSON.stringify(parsed.sourceFiles, null, 2) + '\n'), files: parsed.files });
  await save('protected-comparison.json', { status: 'PASS', unchangedFiles: baseline.length, scope: 'public, dist, original evidence/m1, original specifications and docs', before: 'protected-before.json', after: 'protected-after.json' });
}
