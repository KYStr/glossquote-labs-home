import { mkdir, writeFile, readFile, readdir, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { root, PUBLIC_FILES, requireNode24 } from './files.mjs';
import { serializeJson } from '../public/js/core/serialize-json.js';
import { serializeMarkdown } from '../public/js/core/serialize-markdown.js';
import { parseImport, validateResult } from '../public/js/core/validate-json.js';
import { result, one, many, exactExportResult } from '../test/fixtures.mjs';

requireNode24();
const tag = process.argv[2] ?? 'validation-final';
if (!/^validation-[a-z0-9-]+$/.test(tag)) throw new Error('Invalid evidence tag.');
const evidence = new URL(`evidence/m1/${tag}/`, root);
await mkdir(evidence, { recursive: false });
const commands = [ ['--version'], ['--test'], ['scripts/check.mjs'], ['scripts/build.mjs'] ];
const records = [];
for (let i = 0; i < commands.length; i += 1) {
  const args = commands[i];
  const startedAt = new Date().toISOString();
  const run = spawnSync(process.execPath, args, {
    cwd: fileURLToPath(root), shell: false, windowsHide: true, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024
  });
  const stdout = `${i + 1}-stdout.txt`;
  const stderr = `${i + 1}-stderr.txt`;
  await writeFile(new URL(stdout, evidence), run.stdout ?? '');
  await writeFile(new URL(stderr, evidence), run.stderr ?? '');
  records.push({ executable: process.execPath, args, startedAt, finishedAt: new Date().toISOString(), exitCode: run.status,
    signal: run.signal, spawnError: run.error ? run.error.code : null, stdout, stderr });
  console.log(`${args.join(' ')}: exit ${run.status}`);
  if (run.status !== 0 || run.error) break;
}
await writeFile(new URL('commands.json', evidence), `${JSON.stringify(records, null, 2)}\n`);
if (records.length !== commands.length || records.some(record => record.exitCode !== 0)) {
  process.exitCode = 1;
} else {
  const output = new URL('outputs/', evidence);
  await mkdir(output);
  const oracle = result([
    one('Later point', 3723004, 'note-000001'),
    one('重點 / Key point\r\nSecond line\rThird line', 12345, 'note-000002'),
    one('Same-time note', 12345, 'note-000003')
  ], 3723004, 'Synthetic interview / 合成訪談');
  const markdown = serializeMarkdown(oracle);
  const json = serializeJson(oracle);
  const expectedMarkdown = '# Synthetic interview / 合成訪談\nDuration: 01:02:03.004\n\n' +
    '[00:12.345] 重點 / Key point\n    Second line\n    Third line\n' +
    '[00:12.345] Same-time note\n[01:02:03.004] Later point\n';
  assert.deepEqual(markdown, new TextEncoder().encode(expectedMarkdown));
  assert.deepEqual(parseImport(json), { result: oracle });
  await writeFile(new URL('notes.md', output), markdown);
  await writeFile(new URL('notes.json', output), json);
  const exact = serializeJson(exactExportResult());
  assert.equal(exact.byteLength, 4194304);
  const exactImport = parseImport(exact);
  assert.ok(exactImport.result);
  await writeFile(new URL('exact-4mib.notes.json', output), exact);
  const multiline = result([...many(524, `x${'\n'.repeat(1999)}`), one(`x${'\n'.repeat(575)}`, 0, 'note-000525')], 0);
  assert.ok(validateResult(multiline).result);
  assert.equal(serializeMarkdown(multiline).error, 'EXPORT_TOO_LARGE');
  const multilineJson = serializeJson(multiline);
  assert.ok(multilineJson instanceof Uint8Array);
  await writeFile(new URL('multiline-expansion.notes.json', output), multilineJson);
  // Independent byte oracle for LF indentation, with all times fixed at zero:
  // header 46 + raw text 1,048,576 + 4 per continuation line (1,048,051)
  // + 13 per note (525) = 5,247,651 bytes, above the unchanged cap.
  const expansion = {
    noteCount: 525, rawTextUtf8Bytes: 1048576, continuationLines: 1048051,
    markdownSerializedByteOracle: 5247651, capEach: 4194304, capBoth: 8388608,
    actualMarkdownResult: serializeMarkdown(multiline), actualJsonBytes: multilineJson.byteLength,
    actualJsonReimport: parseImport(multilineJson).result ? 'PASS' : 'FAIL',
    partialBlobUrlDownload: 'ZERO (offline Downloads tests, not browser evidence)',
    formula: '46 + 1048576 + 4 * 1048051 + 13 * 525'
  };
  await writeFile(new URL('multiline-expansion.json', evidence), `${JSON.stringify(expansion, null, 2)}\n`);
  const paths = ['package.json', '.gitignore'];
  for (const folder of ['public', 'scripts', 'test']) {
    const walk = async (dir, prefix) => {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const target = new URL(entry.name, dir);
        if ((await lstat(target)).isSymbolicLink()) throw new Error('Refusing linked source in manifest.');
        if (entry.isDirectory()) await walk(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`);
        else paths.push(`${prefix}${entry.name}`);
      }
    };
    await walk(new URL(`${folder}/`, root), `${folder}/`);
  }
  const hash = async (path, base = root) => {
    const bytes = await readFile(new URL(path, base));
    return { path, bytes: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex') };
  };
  const sources = [];
  for (const path of paths.sort()) sources.push(await hash(path));
  const manifestDigest = createHash('sha256').update(JSON.stringify(sources)).digest('hex');
  await writeFile(new URL('sources.sha256.json', evidence), `${JSON.stringify({ algorithm: 'SHA-256', manifestDigest, files: sources }, null, 2)}\n`);
  const built = [];
  for (const path of PUBLIC_FILES) built.push(await hash(path, new URL('dist/', root)));
  await writeFile(new URL('dist.sha256.json', evidence), `${JSON.stringify(built, null, 2)}\n`);
  const artifacts = [];
  for (const path of ['notes.md', 'notes.json', 'exact-4mib.notes.json', 'multiline-expansion.notes.json']) artifacts.push(await hash(path, output));
  await writeFile(new URL('outputs.sha256.json', evidence), `${JSON.stringify(artifacts, null, 2)}\n`);
  const specs = [];
  for (const path of ['AGENTS.md', 'START-HERE.md', 'README.md', 'PRODUCT.md', 'TECHNICAL.md', 'UX-SEO.md', 'ACCEPTANCE.md', 'TASKS.md',
    'docs/BRAND.md', 'docs/DESIGN-SYSTEM.md', 'docs/ENGINEERING.md', 'docs/GIT-PUBLICATION-SAFETY.md', 'docs/PRIVACY-SECURITY.md']) specs.push(await hash(path));
  await writeFile(new URL('specifications.sha256.json', evidence), `${JSON.stringify(specs, null, 2)}\n`);
  console.log(`Frozen ${sources.length} source files; source manifest digest ${manifestDigest}.`);
  console.log('Real synthetic Markdown/JSON files saved; exact 4 MiB JSON and newline expansion verified.');
}
