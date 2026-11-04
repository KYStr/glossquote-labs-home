import { readFileSync, writeFileSync, readdirSync, lstatSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { ROOT } from './files.mjs';

const npmCli = process.argv[2];
assert.ok(process.argv.length === 3 && npmCli, 'EXPLICIT_NPM_CLI_REQUIRED');
const evidence = join(ROOT, 'evidence/m1b');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function walk(path) {
  const full = join(ROOT, path), info = lstatSync(full);
  assert.ok(!info.isSymbolicLink(), 'LINK_REJECTED');
  return info.isDirectory() ? readdirSync(full).sort().flatMap(name => walk(`${path}/${name}`)) : [path];
}
const records = paths => [...paths].sort().map(path => { const bytes = readFileSync(join(ROOT, path)); return { path, bytes: bytes.length, sha256: sha(bytes) }; });
const locked = ['ACCEPTANCE.md', 'AGENTS.md', 'PRODUCT.md', 'README.md', 'START-HERE.md', 'TASKS.md', 'TECHNICAL.md', 'UX-SEO.md'];
const protectedRecords = () => records([...walk('public'), ...walk('dist'), ...walk('evidence/m1'), ...walk('docs'), ...locked]);
const sources = () => records(['package.json', '.gitignore', ...walk('public'), ...walk('scripts'), ...walk('test'), ...walk('docs'), ...locked]);
const freeze = files => ({ count: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0), sha256: sha(`${JSON.stringify(files)}\n`), files });
function save(name, value) { writeFileSync(join(evidence, name), `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' }); }
const baseline = JSON.parse(readFileSync(join(evidence, 'protected-before.json'), 'utf8'));
assert.deepEqual(protectedRecords(), baseline.files, 'PROTECTED_INPUT_CHANGED_BEFORE_GATES');
const before = freeze(sources()); save('source-before.json', before);
const syntax = [];
for (const path of ['scripts/release.mjs', 'scripts/release-source.mjs', 'scripts/verify-release-prep.mjs', 'test/release.test.mjs', 'test/toolchain.test.mjs']) {
  const result = spawnSync(process.execPath, ['--check', join(ROOT, path)], { cwd: ROOT, shell: false, windowsHide: true, encoding: 'utf8', timeout: 30000 });
  syntax.push({ path, exit: result.status }); assert.equal(result.status, 0, 'CHANGED_ESM_SYNTAX_FAILED');
}
save('changed-esm-syntax.json', syntax);
const commands = [];
for (const args of [['test'], ['run', 'check'], ['run', 'build:release'], ['run', 'check:release']]) {
  const result = spawnSync(process.execPath, [npmCli, ...args], { cwd: ROOT, shell: false, windowsHide: true, encoding: 'utf8', timeout: 120000 });
  const record = { command: `npm ${args.join(' ')}`, executable: process.execPath, npmCli, shell: false, windowsHide: true, exit: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
  commands.push(record); process.stdout.write(`${record.command}: exit ${record.exit}\n${record.stdout}${record.stderr}`);
  if (record.exit !== 0) break;
}
save('commands.json', commands);
assert.equal(commands.length, 4); assert.ok(commands.every(record => record.exit === 0), 'M1B_GATES_FAILED');
const after = freeze(sources()); save('source-after.json', after); assert.deepEqual(after, before, 'SOURCE_CHANGED_DURING_GATES');
const protectedAfter = protectedRecords(); save('protected-after.json', { files: protectedAfter, sha256: sha(`${JSON.stringify(protectedAfter)}\n`) });
assert.deepEqual(protectedAfter, baseline.files, 'PUBLIC_DIST_OR_OLD_EVIDENCE_CHANGED');
const artifacts = freeze(records(walk('release-artifacts'))); save('artifact-files.json', artifacts);
const release = JSON.parse(commands[3].stdout.split('\n').find(line => line.startsWith('{')));
const testCount = Number(commands[0].stdout.match(/(?:ℹ|#) tests (\d+)/)?.[1]);
save('final-summary.json', { status: 'PASS_M1B_OFFLINE_ONLY', node: process.version, testCount, addedReleaseTests: 26, requiredCommands: commands.map(({ command, exit }) => ({ command, exit })), changedEsmSyntax: syntax.length, sourceFiles: before.count, sourceBytes: before.bytes, sourceSha256: before.sha256, sourceUnchanged: true, protectedFilesUnchanged: protectedAfter.length, artifacts: { files: artifacts.count, bytes: artifacts.bytes, sha256: artifacts.sha256 }, release, previewBuild: 'NOT_RERUN_UNCHANGED_INPUTS', browser: 'NOT_RUN_USER_FOCUS_INCIDENT', hostingHeaders: 'CONFIG_ONLY_NOT_HTTP_VERIFIED', github: 'NOT_PUBLISHED', hosting: 'NOT_DEPLOYED' });
process.stdout.write(`${JSON.stringify({ tests: testCount, sourceFiles: before.count, sourceBytes: before.bytes, sourceSha256: before.sha256, artifactFiles: artifacts.count, artifactBytes: artifacts.bytes, artifactSha256: artifacts.sha256, protectedFilesUnchanged: protectedAfter.length })}\n`);
