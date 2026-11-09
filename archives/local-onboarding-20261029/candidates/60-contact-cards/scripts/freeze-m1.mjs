import assert from 'node:assert/strict';
import { readFile, writeFile, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, PUBLIC_FILES, readPublic } from './files.mjs';
import { parseCsvUtf8 } from '../public/js/core/csv.mjs';
import { mapContacts } from '../public/js/core/map-contacts.mjs';
import { serializeVcards } from '../public/js/core/vcard.mjs';

const evidence = join(ROOT, 'evidence', 'm1');
const readJson = async (name) => JSON.parse(await readFile(join(evidence, name), 'utf8'));
const before = await readJson('environment-before.json'), after = await readJson('environment-after.json');
assert.equal(before.Status, 'PASS'); assert.equal(after.Status, 'PASS'); assert.deepEqual(after.Snapshots, before.Snapshots);
const commands = await readJson('commands.json');
assert.equal(commands.results.length, 4); for (const command of commands.results) assert.equal(command.exit, 0);
for (const item of await readJson('contracts-before.json')) {
  const bytes = await readFile(join(ROOT, item.Path));
  assert.equal(bytes.length, item.Bytes); assert.equal(createHash('sha256').update(bytes).digest('hex'), item.Sha256);
}

const csv = '姓名,電話,Email,組織,備註\r\n"王, 小明",001-02 +886,a@example.test,"Smith;Unit, East\\Lab","第一行\r\n第二行"\r\n"王, 小明",001-02 +886,a@example.test,"Smith;Unit, East\\Lab",Another note\r\nMary Jane Watson,,mary@example.test,,\r\n';
const expected = [
  'BEGIN:VCARD', 'VERSION:3.0', 'N:;;;;', 'FN:王\\, 小明', 'TEL;TYPE=VOICE:001-02 +886', 'EMAIL;TYPE=INTERNET:a@example.test', 'ORG:Smith\\;Unit\\, East\\\\Lab', 'NOTE:第一行\\n第二行', 'END:VCARD',
  'BEGIN:VCARD', 'VERSION:3.0', 'N:;;;;', 'FN:王\\, 小明', 'TEL;TYPE=VOICE:001-02 +886', 'EMAIL;TYPE=INTERNET:a@example.test', 'ORG:Smith\\;Unit\\, East\\\\Lab', 'NOTE:Another note', 'END:VCARD',
  'BEGIN:VCARD', 'VERSION:3.0', 'N:;;;;', 'FN:Mary Jane Watson', 'EMAIL;TYPE=INTERNET:mary@example.test', 'END:VCARD', ''
].join('\r\n');
const { rows } = parseCsvUtf8(new TextEncoder().encode(csv));
const mapped = mapContacts(rows, { name: 0, phone: 1, email: 2, organization: 3, note: 4 });
assert.deepEqual(mapped.duplicateGroups, [[{ rowIndex: 0, line: 2 }, { rowIndex: 1, line: 4 }]]);
const bytes = serializeVcards(mapped.contacts);
assert.equal(new TextDecoder('utf-8', { fatal: true }).decode(bytes), expected);
await writeFile(join(evidence, 'synthetic-contacts.csv'), csv);
await writeFile(join(evidence, 'expected-contacts.vcf'), expected);
await writeFile(join(evidence, 'actual-contacts.vcf'), bytes);
const publicFiles = await readPublic(), builtFiles = await readPublic(join(ROOT, 'dist'));
for (const [name, content] of publicFiles) assert.ok(content.equals(builtFiles.get(name)));
const digest = (content) => createHash('sha256').update(content).digest('hex');
const distManifest = [...builtFiles].map(([path, content]) => ({ path, bytes: content.length, sha256: digest(content) }));
await writeFile(join(evidence, 'dist-manifest.json'), JSON.stringify({ candidate: 'preview-noindex', files: distManifest }, null, 2) + '\n');
const sources = [
  '.gitignore', 'package.json', 'TASK-ENTRY.md', 'HANDOFF.md', ...PUBLIC_FILES.map((name) => `public/${name}`),
  ...['files', 'check', 'build', 'serve', 'verify-m1', 'freeze-m1'].map((name) => `scripts/${name}.mjs`),
  ...['csv', 'map-contacts', 'vcard', 'lifecycle', 'tooling'].map((name) => `test/${name}.test.mjs`)
].sort();
const manifest = [];
for (const path of sources) {
  assert.equal((await lstat(join(ROOT, path))).isSymbolicLink(), false);
  const content = await readFile(join(ROOT, path)); manifest.push({ path, bytes: content.length, sha256: digest(content) });
}
const manifestText = JSON.stringify({ task: 'B20-60-M1', version: '0.1.0-m1', candidate: 'preview-noindex', files: manifest }, null, 2) + '\n';
await writeFile(join(evidence, 'source-manifest.json'), manifestText);
const result = { task: 'B20-60-M1', sourceFiles: manifest.length, sourceBytes: manifest.reduce((sum, file) => sum + file.bytes, 0), sourceManifestSha256: digest(manifestText), distFiles: distManifest.length, syntheticContacts: 3, duplicateGroups: 1, vcfBytes: bytes.length, vcfSha256: digest(bytes), environmentSnapshotsEqual: true, protectedContractsUnchanged: 13, browserGates: 'NOT_RUN_USER_FOCUS_INCIDENT', serverHttp: 'NOT_RUN_TASK_NO_SERVER', publication: 'NOT_PUBLISHED' };
await writeFile(join(evidence, 'freeze-result.json'), JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
