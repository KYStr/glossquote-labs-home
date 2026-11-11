import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const here = (path) => new URL(path, import.meta.url);
const load = async (path) => JSON.parse(await readFile(here(path), 'utf8'));
const source = await load('source-check.json');
const handoff = await load('handoff-check.json');
const raw = 'https://raw.githubusercontent.com/' + source.repository + '/';
const records = [
  { ref: source.head, path: 'coordination/work-registry.json', blob: source.registry.blob },
  { ref: handoff.currentSnapshot.head, path: 'coordination/work-registry.json', blob: handoff.currentSnapshot.blob },
  { ref: source.baseline.commit, path: source.baseline.path, blob: source.baseline.blob },
  ...source.rules.map((entry) => ({ ref: source.head, ...entry })),
  ...source.dispatch.files,
  ...source.targets.flatMap(({ files }) => files),
];
const blob = (bytes) => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

for (let start = 0; start < records.length; start += 6) {
  const outcomes = await Promise.allSettled(records.slice(start, start + 6).map(async (file) => {
    const response = await fetch(raw + file.ref + '/' + file.path, { signal: AbortSignal.timeout(25000) });
    assert(response.ok, file.path + ': HTTP ' + response.status);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(blob(bytes), file.blob, file.path + ' Git blob');
    if (file.sha256) assert.equal(sha256(bytes), file.sha256, file.path + ' SHA-256');
  }));
  assert.deepEqual(outcomes.filter(({ status }) => status === 'rejected').map(({ reason }) => String(reason)), []);
}
for (const target of source.targets) {
  const bytes = await readFile(here(target.slug + '/source-fixtures.json'));
  const original = target.files.find(({ path }) => path.endsWith('/fixtures.json'));
  assert.equal(blob(bytes), original.blob, target.slug + ' archived fixture Git blob');
  assert.equal(sha256(bytes), original.sha256, target.slug + ' archived fixture SHA-256');
}
console.log('PASS ' + records.length + ' pinned public Git blobs and ' + source.targets.length + ' archived fixture files');
