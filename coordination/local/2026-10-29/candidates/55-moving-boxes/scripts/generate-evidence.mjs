import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ROOT, PUBLIC_FILES } from './contract.mjs';
import { sourceManifest } from './run-gates.mjs';
import { createController } from '../public/js/controller.mjs';
import { validateProject, serializeProject, parseProject, LIMITS } from '../public/js/core/schema.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const save = (relative, value) => writeFile(path.join(ROOT, relative), JSON.stringify(value, null, 2) + '\n');
const finalGates = JSON.parse(await readFile(path.join(ROOT, 'evidence/m1/final-gates.json'), 'utf8'));
assert.equal(finalGates.results.length, 3, 'Final test/check/build must all finish first.');
assert.ok(finalGates.results.every(result => result.exit === 0), 'Final gates must pass.');
assert.equal(finalGates.sourceUnchanged, true);
assert.deepEqual(await sourceManifest(), finalGates.after, 'Evidence generation requires the same fixed source.');
const outputs = [];
for (const language of ['zh-Hant', 'en']) {
  const blobs = new Map(); let sequence = 0;
  const c = createController({ language, makeBlob: (parts, options) => new Blob(parts, options), createURL: blob => { const url = 'blob:offline-' + ++sequence; blobs.set(url, blob); return url; }, revokeURL: url => blobs.delete(url), setTimer: () => 1, clearTimer: () => {} });
  c.loadExample();
  await mkdir(path.join(ROOT, 'evidence/m1/outputs', language), { recursive: true });
  for (const mode of ['rooms', 'boxes', 'json']) {
    assert.equal(c.setMode(mode), true); assert.equal(c.prepareExport(), true);
    const file = c.download(); assert.ok(file);
    const bytes = Buffer.from(await blobs.get(file.url).arrayBuffer());
    assert.equal(bytes.subarray(0, 3).equals(Buffer.from([239, 187, 191])), false);
    assert.equal(bytes.at(-1), 10);
    const relative = 'evidence/m1/outputs/' + language + '/' + file.filename;
    await writeFile(path.join(ROOT, relative), bytes);
    outputs.push({ path: relative, bytes: bytes.length, sha256: hash(bytes), mode, language, scope: 'Real bytes from native Node Blob using fake inventory; not a browser download.' });
    if (mode === 'json') {
      const restored = parseProject(bytes.toString('utf8')); assert.equal(restored.boxes.length, 2); assert.equal(restored.boxes[1].items[0].quantity, 2);
    }
  }
  c.dispose(); assert.equal(blobs.size, 0);
}
await save('evidence/m1/output-files.json', outputs);

const capacityBoxes = Array.from({ length: 100 }, (_, b) => ({ id: '箱'.repeat(38) + String(b).padStart(2, '0'), room: '房'.repeat(80), priority: false, notes: '備'.repeat(500), items: Array.from({ length: 10 }, (_, i) => ({ id: 'I' + String(b * 10 + i + 1).padStart(6, '0'), name: '物'.repeat(120), quantity: 100000, notes: '備'.repeat(500) })) }));
const capacityProject = validateProject({ schemaVersion: 1, boxes: capacityBoxes });
const capacityJSON = serializeProject(capacityProject);
let restore = 'PASS';
try { parseProject(capacityJSON); } catch (error) { restore = error.code; }
await save('evidence/m1/capacity-review.json', {
  status: restore === 'PASS' ? 'PASS_ROUNDTRIP_FOR_REPRODUCTION' : 'FAIL_SPEC_CAPACITY_CONFLICT',
  boxes: 100, items: 1000, boxIdCharacters: 40, roomCharacters: 80, boxNotesCharacters: 500, nameCharacters: 120, itemNotesCharacters: 500,
  jsonBytes: Buffer.byteLength(capacityJSON), jsonSHA256: hash(capacityJSON), importByteLimit: LIMITS.importBytes, restore,
  reproduction: 'node scripts/generate-evidence.mjs',
  decision: 'B20-55-D01: primary authorized 8 MiB on 2026-10-23. Other limits and strict schema unchanged.',
  note: 'Fake data only. Original 2 MiB failure retained in capacity-conflict-original.json.'
});

const source = await sourceManifest();
const encoded = JSON.stringify(source, null, 2) + '\n';
await writeFile(path.join(ROOT, 'evidence/m1/source-files.json'), encoded);
await save('evidence/m1/source-identity.json', { algorithm: 'SHA-256 of source-files.json exact UTF-8 bytes', files: source.length, bytes: source.reduce((sum, file) => sum + file.bytes, 0), sha256: hash(encoded), manifest: 'source-files.json', node: process.version });
const dist = [];
for (const name of PUBLIC_FILES) {
  const original = await readFile(path.join(ROOT, 'public', name)), built = await readFile(path.join(ROOT, 'dist', name));
  assert.equal(original.equals(built), true, name);
  dist.push({ path: 'dist/' + name, bytes: built.length, sha256: hash(built) });
}
await save('evidence/m1/dist-files.json', dist);
await save('evidence/m1/artifact-summary.json', { sourceManifestSHA256: hash(encoded), distFiles: dist.length, distBytes: dist.reduce((sum, file) => sum + file.bytes, 0), sourceMatchesDist: true, outputFiles: outputs.length, outputBytes: outputs.reduce((sum, file) => sum + file.bytes, 0), sourceUnchangedByGeneration: JSON.stringify(source) === JSON.stringify(await sourceManifest()) });
const specifications = JSON.parse((await readFile(path.join(ROOT, 'evidence/m1/specifications-before.json'), 'utf8')).replace(/^\uFEFF/, ''));
const authorizedPaths = ['TECHNICAL.md', 'ACCEPTANCE.md'];
const authorizedChanges = [];
for (const file of specifications) {
  const bytes = await readFile(path.join(ROOT, file.Path));
  if (authorizedPaths.includes(file.Path)) {
    assert.notEqual(hash(bytes), file.SHA256, file.Path); assert.ok(bytes.toString('utf8').includes('B20-55-D01')); assert.ok(bytes.toString('utf8').includes('8MiB'));
    authorizedChanges.push({ path: file.Path, beforeBytes: file.Bytes, beforeSHA256: file.SHA256, bytes: bytes.length, sha256: hash(bytes), decision: 'B20-55-D01' });
  } else { assert.equal(bytes.length, file.Bytes, file.Path); assert.equal(hash(bytes), file.SHA256, file.Path); }
}
await save('evidence/m1/specifications-verified.json', { status: 'PASS', unchangedImmutableFiles: specifications.length - authorizedPaths.length, authorizedChanges, checkedAgainst: 'specifications-before.json' });
process.stdout.write('Evidence: ' + source.length + ' source files, ' + dist.length + ' byte-identical dist files, ' + outputs.length + ' actual fake-data export files. Capacity roundtrip: ' + restore + '.\n');
