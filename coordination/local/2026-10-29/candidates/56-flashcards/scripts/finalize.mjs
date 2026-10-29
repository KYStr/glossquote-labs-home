import { readFileSync, writeFileSync, readdirSync, lstatSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { ROOT, PUBLIC_FILES, closedTree } from './files.mjs';
import { createController } from '../public/js/controller.mjs';
import { parseDeckJson } from '../public/js/core/schema.mjs';

const runName = process.argv[3] ?? '';
if (runName && !/^[a-z0-9-]+$/.test(runName)) throw new Error('SAFE_RUN_NAME_REQUIRED');
const EVIDENCE = join(ROOT, 'evidence/m1', runName);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function walk(relative) {
  const base = join(ROOT, relative), info = lstatSync(base);
  if (info.isSymbolicLink()) throw new Error('LINK_REJECTED');
  if (info.isFile()) return [relative];
  if (!info.isDirectory()) throw new Error('UNSUPPORTED_FILE');
  return readdirSync(base).sort().flatMap(name => walk(`${relative}/${name}`));
}
function inventory(includeRecords = false) {
  const root = ['.gitignore', 'package.json', 'ACCEPTANCE.md', 'AGENTS.md', 'PRODUCT.md', 'README.md', 'START-HERE.md', 'TASKS.md', 'TECHNICAL.md', 'UX-SEO.md'];
  if (includeRecords) root.push('HANDOFF.md', 'TASK-ENTRY.md');
  const paths = [...root, ...walk('docs'), ...PUBLIC_FILES.map(file => `public/${file}`), ...walk('scripts'), ...walk('test')].sort();
  const files = paths.map(path => {
    if (!/^[a-zA-Z0-9_./-]+$/.test(path) || path.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('UNSAFE_MANIFEST_PATH');
    const bytes = readFileSync(join(ROOT, path));
    return { path, bytes: bytes.byteLength, sha256: sha(bytes) };
  });
  return { scope: includeRecords ? 'Full candidate source, contracts and handoff; excludes dist/evidence' : 'Runtime source, scripts, tests and locked contracts; excludes HANDOFF/TASK-ENTRY/dist/evidence', count: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0), sha256: sha(`${JSON.stringify(files)}\n`), files };
}
function save(name, value) { writeFileSync(join(EVIDENCE, name), `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' }); }

function outputs() {
  const directory = join(EVIDENCE, 'outputs'); mkdirSync(directory, { recursive: true });
  const source = 'question,answer\r\n水的化學式？ / Formula of water?,H₂O\r\n"包含逗號, 引號""與 emoji 😀","第一行\r\n第二行 / line two"\r\n"</style><script>FAKE</script>","<img src=x onerror=""FAKE""> & \' """\r\n';
  const expected = [{ id: 1, question: '水的化學式？ / Formula of water?', answer: 'H₂O' }, { id: 2, question: '包含逗號, 引號"與 emoji 😀', answer: '第一行\r\n第二行 / line two' }, { id: 3, question: '</style><script>FAKE</script>', answer: '<img src=x onerror="FAKE"> & \' "' }];
  const files = [];
  const write = (name, text) => { const bytes = Buffer.from(text, 'utf8'); writeFileSync(join(directory, name), bytes, { flag: 'wx' }); files.push({ path: `outputs/${name}`, bytes: bytes.length, sha256: sha(bytes) }); };
  write('input.fake.csv', source);
  for (const locale of ['zh-Hant', 'en']) {
    const c = createController({ locale }); c.setSource(source); assert.equal(c.start(), true);
    assert.deepEqual(c.snapshot().session.cards, expected);
    c.dispatch({ type: 'reveal' }); c.dispatch({ type: 'assess', value: 'known' });
    if (locale === 'zh-Hant') {
      assert.equal(c.prepare('json'), true); const json = c.snapshot().prepared.text;
      assert.deepEqual(parseDeckJson(json), { schemaVersion: 1, cards: expected, known: [1] }); write('flashcards-deck.json', json);
    }
    assert.equal(c.prepare('html'), true); const html = c.snapshot().prepared.text;
    assert.ok(html.includes('&lt;/style&gt;&lt;script&gt;FAKE&lt;/script&gt;')); assert.ok(html.includes('&lt;img src=x onerror=&quot;FAKE&quot;&gt;'));
    assert.doesNotMatch(html, /<script|<img|<iframe|https?:\/\//);
    for (const number of [1, 2, 3]) { assert.ok(html.includes(`<span class="number">${number}</span>`)); assert.ok(html.includes(`<th scope="row">${number}</th>`)); }
    write(`flashcards-study-${locale}.html`, html); c.dispose();
  }
  save('output-files.json', { scope: 'Real local files produced by controller from synthetic CSV; not browser downloads or print acceptance', files });
  return files;
}

mkdirSync(EVIDENCE, { recursive: true });
if (process.argv[2] === 'manifest') {
  const result = inventory(true); save('candidate-manifest.json', result); process.stdout.write(`${JSON.stringify({ files: result.count, bytes: result.bytes, sha256: result.sha256 })}\n`);
} else {
  const npmCli = process.argv[2]; if (!npmCli) throw new Error('EXPLICIT_NPM_CLI_REQUIRED');
  const before = inventory(); save('source-before.json', before);
  const syntax = [];
  for (const file of before.files.filter(file => file.path.endsWith('.mjs'))) {
    const result = spawnSync(process.execPath, ['--check', join(ROOT, file.path)], { cwd: ROOT, shell: false, windowsHide: true, encoding: 'utf8', timeout: 30000 });
    syntax.push({ file: file.path, exit: result.status }); assert.equal(result.status, 0, `SYNTAX_FAILED ${file.path}`);
  }
  save('all-esm-syntax.json', { scope: 'node --check (no script execution)', files: syntax });
  const gate = spawnSync(process.execPath, [join(ROOT, 'scripts/run-gates.mjs'), 'final', npmCli], { cwd: ROOT, shell: false, windowsHide: true, encoding: 'utf8', timeout: 120000 });
  process.stdout.write(gate.stdout ?? ''); process.stderr.write(gate.stderr ?? ''); assert.equal(gate.status, 0, 'FINAL_GATES_FAILED');
  const generated = outputs();
  closedTree(join(ROOT, 'dist'), PUBLIC_FILES);
  const dist = PUBLIC_FILES.map(file => { const bytes = readFileSync(join(ROOT, 'dist', file)); assert.deepEqual(bytes, readFileSync(join(ROOT, 'public', file))); return { path: file, bytes: bytes.length, sha256: sha(bytes) }; });
  save('dist-files.json', { scope: 'Exact preview allowlist and byte identity to public', files: dist });
  const after = inventory(); save('source-after.json', after); assert.deepEqual(after, before, 'SOURCE_CHANGED_DURING_GATES');
  const count = gate.stdout.match(/(?:ℹ|#) tests (\d+)/)?.[1];
  save('final-summary.json', { status: 'PASS_M1_NODE_STATIC_ONLY', node: process.version, testCount: Number(count), npmGateExit: gate.status, sourceUnchanged: true, sourceFiles: before.count, sourceBytes: before.bytes, sourceSha256: before.sha256, syntaxCount: syntax.length, publicDistFiles: dist.length, outputFiles: generated.length, browser: 'NOT_RUN_USER_FOCUS_INCIDENT', publication: 'NOT_PUBLISHED_M2_NOT_AUTHORIZED', hosting: 'NOT_DEPLOYED_M3_PRIMARY_OWNED' });
  process.stdout.write(`${JSON.stringify({ sourceUnchanged: true, sourceFiles: before.count, sourceBytes: before.bytes, sourceSha256: before.sha256, tests: Number(count), outputFiles: generated.length })}\n`);
}
