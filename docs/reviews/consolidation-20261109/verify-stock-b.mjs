import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { checks } from './stock-b-literal-checks.mjs';

const [repoPath, optionalHead, ...extra] = process.argv.slice(2);
if (!repoPath || extra.length) throw Error('Usage: node verify-stock-b.mjs <local-git-repository> [candidate-commit]');
const head = optionalHead ?? 'c8edde6a8d2a83d69a5ef863057184d0ee5022d0';
assert.match(head, /^[0-9a-f]{40}$/);
const registryBaseline = '381bccfbdfa841867de6f652faebc581ca117388';
const batchABaseline = 'a5e7356dae36d2aac3db068352a916d76c7594c3';
const sectionNames = ['goal', 'scope', 'userFlow', 'inputsOutputs', 'implementation', 'acceptance', 'tests', 'handoff'];
const aspectIds = ['functionality', 'boundaries', 'privacy', 'security', 'usability', 'accessibility', 'localization-seo', 'toolchain-provenance', 'compatibility'];
const hash = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const runGit = args => execFileSync('git', ['-c', 'credential.helper=', '-c', 'core.askPass=', '-c', 'http.extraHeader=', '-C', repoPath, ...args], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, windowsHide: true });
const tree = new Map(runGit(['ls-tree', '-r', '-z', head]).split('\0').filter(Boolean).map(line => {
  const i = line.indexOf('\t');
  const [, type, sha] = line.slice(0, i).split(' ');
  return [line.slice(i + 1), { type, sha }];
}));
const fixedManifest = 'docs/consolidation/2026-11-09/spec-stock-b-manifest.json';
const fixedBytes = (file, commit = head) => Buffer.from(runGit(['show', commit + ':' + file]), 'utf8');
const inventory = JSON.parse(fixedBytes('coordination/work-registry.json', registryBaseline)).specs;
const batchA = JSON.parse(fixedBytes('docs/consolidation/2026-11-09/spec-stock-a-manifest.json', batchABaseline));
const manifestBytes = fixedBytes(fixedManifest);
const manifest = JSON.parse(manifestBytes);
assert.equal(tree.get(fixedManifest)?.sha, hash(manifestBytes));
assert.equal(manifest.specifications.length, 20);
assert.equal(new Set(manifest.specifications.map(spec => spec.slug)).size, 20);
assert.equal(inventory.length, 130);

const cases = new Map();
const fileRows = [{ path: fixedManifest, sha: tree.get(fixedManifest).sha }];
let links = 0;
let fixtureCount = 0;
for (const item of manifest.specifications) {
  assert.match(item.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(inventory.every(old => old.id !== item.id && !old.document.path.endsWith('/' + item.slug + '/SPEC.md')));
  assert.ok(batchA.specs.every(old => old.slug !== item.slug && old.id !== item.id));
  assert.deepEqual(item.acceptanceCriteria.map(a => a.id), aspectIds);
  const names = ['SPEC.md', 'BRIEF.md', 'fixtures.json', 'AUTHOR-CHECK.md'];
  const directory = 'docs/specs/' + item.slug + '/';
  assert.deepEqual(Object.values(item.paths).sort(), names.map(name => directory + name).sort());
  const content = {};
  for (const file of Object.values(item.paths)) {
    const bytes = fixedBytes(file);
    assert.equal(tree.get(file)?.type, 'blob', file);
    assert.equal(tree.get(file)?.sha, hash(bytes), file);
    fileRows.push({ path: file, sha: hash(bytes) });
    content[file] = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (!file.endsWith('.md')) continue;
    for (const [, link] of content[file].matchAll(/\[[^\]\n]+\]\(([^)\n]+)\)/g)) {
      const base = link.split('#')[0];
      if (!base || base.startsWith('https://')) continue;
      assert.ok(!base.includes('\\') && !path.isAbsolute(base) && tree.has(path.posix.normalize(path.posix.join(path.posix.dirname(file), base))), file + ': ' + base);
      links++;
    }
  }
  const spec = content[item.paths.spec];
  assert.deepEqual([...spec.matchAll(/^## (\w+)$/gm)].map(m => m[1]), sectionNames, item.slug);
  for (const term of ['130', '桌面', '<48rem', 'Node.js 24', 'noindex', 'zh-Hant', 'Chrome', 'Edge', 'Network', 'Storage', 'NOT_RUN', 'tools/' + item.slug]) assert.ok(spec.includes(term), item.slug + ': ' + term);
  for (const aspect of aspectIds) assert.ok(spec.includes(aspect), item.slug + ': ' + aspect);
  const scope = spec.split('## scope')[1].split('## userFlow')[0];
  for (const match of scope.matchAll(/\x60(spec-[a-z0-9-]+)\x60/g)) assert.ok(inventory.some(row => row.id === match[1]), match[1]);
  const fixtures = JSON.parse(content[item.paths.fixtures]);
  assert.equal(fixtures.specId, item.id);
  assert.equal(fixtures.cases.length, 8);
  assert.equal(new Set(fixtures.cases.map(c => c.id)).size, 8);
  const solve = fixtures.cases.filter(c => c.kind === 'solve');
  const flow = fixtures.cases.filter(c => c.kind === 'flow');
  assert.equal(solve.length, 6);
  assert.equal(flow.length, 2);
  assert.ok(solve.some(c => c.expected.status === 'ok') && solve.some(c => c.expected.status === 'error'));
  for (const testCase of fixtures.cases) {
    assert.ok(testCase.id.startsWith(item.slug + '.') && testCase.input && testCase.expected && testCase.derivation);
    cases.set(testCase.id, testCase);
  }
  assert.ok(flow.some(c => c.expected.phase === 'dirty' && c.expected.result === null));
  assert.ok(flow.some(c => c.input.some(a => a.type === 'cancel') && c.expected.phase === 'ready'));
  fixtureCount += fixtures.cases.length;
}

const evidence = [];
for (const [id, compute, project, rationale] of checks) {
  const example = cases.get(id);
  assert.equal(example?.expected.status, 'ok', id);
  const actual = compute(example.input);
  assert.deepEqual(actual, project(example.expected.result), id);
  evidence.push({ id, calculated: actual, rationale });
}
assert.equal(new Set(evidence.map(e => e.id.split('.')[0])).size, 20);

const report = { head, tree: runGit(['rev-parse', head + '^{tree}']).trim(), documents: fileRows.length, fixtures: fixtureCount, links, independentLiteralChecks: evidence, product: 'NOT_RUN', fileRows };
console.log(JSON.stringify(report, null, 2));
