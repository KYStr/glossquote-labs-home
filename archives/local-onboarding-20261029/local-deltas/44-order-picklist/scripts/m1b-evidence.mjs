import { readFile, writeFile, readdir, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { ROOT, ASSETS } from './assets.mjs';
import { SOURCE_PINS, SITE_PATHS } from './release.mjs';
import { ORIGIN, TOOL_SLUG } from './release-html.mjs';

const evidence = join(ROOT, 'evidence/m1b');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const contracts = ['README.md', 'START-HERE.md', 'AGENTS.md', 'PRODUCT.md', 'TECHNICAL.md', 'UX-SEO.md', 'ACCEPTANCE.md', 'TASKS.md', 'HANDOFF.md', 'docs/BRAND.md', 'docs/DESIGN-SYSTEM.md', 'docs/ENGINEERING.md', 'docs/GIT-PUBLICATION-SAFETY.md', 'docs/PRIVACY-SECURITY.md'];
const scripts = ['assets.mjs', 'audit.mjs', 'check.mjs', 'build.mjs', 'serve.mjs', 'pages.mjs', 'candidate-evidence.mjs', 'release.mjs', 'release-html.mjs', 'm1b-evidence.mjs'].map(path => 'scripts/' + path);
const tests = ['csv.test.mjs', 'orders.test.mjs', 'export.test.mjs', 'session.test.mjs', 'tooling.test.mjs', 'app-model.test.mjs', 'dom-model.mjs', 'release.test.mjs'].map(path => 'test/' + path);
const sourcePaths = [...contracts, '.gitignore', 'package.json', 'TASK-ENTRY.md', 'M1B-RELEASE.md', ...ASSETS.map(path => 'public/' + path), ...scripts, ...tests].sort();
function safe(path) { assert.ok(path.split('/').every(part => part && part !== '.' && part !== '..' && !part.includes('\\') && !part.includes(':')), 'UNSAFE_PATH'); }
async function entry(base, path) {
  safe(path); let cursor = base;
  for (const part of path.split('/')) { cursor = join(cursor, part); assert.equal((await lstat(cursor)).isSymbolicLink(), false, 'SYMLINK_REJECTED'); }
  const bytes = await readFile(cursor);
  return { path, bytes: bytes.length, sha256: hash(bytes) };
}
function aggregate(files) { return hash(files.map(file => `${file.path}\0${file.bytes}\0${file.sha256}\n`).join('')); }
async function manifest(base, paths) {
  const files = await Promise.all([...paths].sort().map(path => entry(base, path)));
  return { algorithm: 'SHA-256', aggregateFormat: 'UTF-8 sorted path + NUL + byte length + NUL + hex SHA-256 + LF', fileCount: files.length, totalBytes: files.reduce((sum, file) => sum + file.bytes, 0), aggregateSha256: aggregate(files), files };
}
async function pathsUnder(path) {
  const stat = await lstat(join(ROOT, path)); assert.equal(stat.isSymbolicLink(), false, 'PROTECTED_LINK_CHANGED');
  if (stat.isFile()) return [path];
  assert.ok(stat.isDirectory());
  const result = [];
  for (const name of (await readdir(join(ROOT, path))).sort()) result.push(...await pathsUnder(path + '/' + name));
  return result;
}

const baseline = JSON.parse(await readFile(join(evidence, 'input-baseline.json'), 'utf8'));
const protectedPaths = (await Promise.all(['public', 'dist', 'evidence/m1'].map(pathsUnder))).flat().sort();
assert.deepEqual(protectedPaths, baseline.protectedFiles.map(file => file.path));
const protectedNow = (await manifest(ROOT, protectedPaths));
assert.deepEqual(protectedNow.files, baseline.protectedFiles, 'PREVIEW_OR_M1_EVIDENCE_CHANGED');
assert.equal(protectedNow.aggregateSha256, baseline.protectedAggregateSha256);
const publicNow = await manifest(join(ROOT, 'public'), ASSETS);
assert.deepEqual(publicNow.files, SOURCE_PINS, 'M1_PUBLIC_CHANGED');
const sources = await manifest(ROOT, sourcePaths);
const oldFiles = new Map(baseline.originalSourceFiles.map(file => [file.path, file]));
const changes = sources.files.filter(file => oldFiles.get(file.path)?.sha256 !== file.sha256).map(file => ({ path: file.path, kind: oldFiles.has(file.path) ? 'modified' : 'added', before: oldFiles.get(file.path) ?? null, after: file }));
for (const change of changes) assert.ok(['package.json', '.gitignore', 'HANDOFF.md', 'TASK-ENTRY.md', 'M1B-RELEASE.md'].includes(change.path) || change.path.startsWith('scripts/') || change.path.startsWith('test/'), 'OUT_OF_SCOPE_DIFF');
const site = await manifest(join(ROOT, 'release-artifacts/site'), SITE_PATHS);
const artifacts = await manifest(join(ROOT, 'release-artifacts'), ['manifest.json', ...SITE_PATHS.map(path => 'site/' + path)]);
const releaseManifest = JSON.parse(await readFile(join(ROOT, 'release-artifacts/manifest.json'), 'utf8'));
assert.deepEqual(releaseManifest.files, site.files); assert.deepEqual(releaseManifest.sourceFiles, publicNow.files);
assert.equal(releaseManifest.origin, ORIGIN); assert.equal(releaseManifest.toolSlug, TOOL_SLUG);
const commands = JSON.parse(await readFile(join(evidence, 'final-result.json'), 'utf8'));
assert.ok(commands.commands.every(command => command.exitCode === 0));
const environment = JSON.parse(await readFile(join(evidence, 'environment-comparison.json'), 'utf8'));
assert.equal(environment.status, 'PASS'); assert.equal(environment.unchanged, true);
for (const [name, data] of [['source-manifest.json', sources], ['site-manifest.json', site], ['artifact-manifest.json', artifacts], ['source-diff.json', { status: 'PASS', changes }], ['input-preservation.json', { status: 'PASS', protectedFiles: protectedNow.fileCount, aggregateSha256: protectedNow.aggregateSha256, publicSourceAggregateSha256: publicNow.aggregateSha256, publicDistAndOldM1EvidenceUnchanged: true }]]) await writeFile(join(evidence, name), JSON.stringify(data, null, 2) + '\n');
const candidate = {
  milestone: 'B20-RP-44-M1B', status: 'OFFLINE_RELEASE_CANDIDATE_AWAITING_PRIMARY_ACCEPTANCE',
  origin: ORIGIN, originStatus: 'PLANNED_NOT_LIVE', toolSlug: TOOL_SLUG,
  siteDirectory: 'release-artifacts/site', manifest: 'release-artifacts/manifest.json',
  source: { files: sources.fileCount, bytes: sources.totalBytes, sha256: sources.aggregateSha256 },
  site: { files: site.fileCount, bytes: site.totalBytes, sha256: site.aggregateSha256 },
  artifact: { files: artifacts.fileCount, bytes: artifacts.totalBytes, sha256: artifacts.aggregateSha256 },
  protected: { files: protectedNow.fileCount, sha256: protectedNow.aggregateSha256, unchanged: true },
  changedSourceFiles: changes.length, commands,
  browser: 'NOT_RUN_USER_FOCUS_INCIDENT', actualHostingHeaders: 'NOT_RUN', github: 'NOT_PUBLISHED', hosting: 'NOT_DEPLOYED', homepage: 'NOT_CHANGED', sourceCommit: null,
  requestedConfiguration: 'gpt-6.1-sol/max', backendIndependentlyVerified: false,
};
await writeFile(join(evidence, 'candidate.json'), JSON.stringify(candidate, null, 2) + '\n');
console.log(JSON.stringify(candidate, null, 2));
