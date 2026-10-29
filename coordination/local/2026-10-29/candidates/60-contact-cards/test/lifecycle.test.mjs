import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, COPY } from '../public/js/app.js';

function harness({ downloadError = false } = {}) {
  const readers = [], revoked = [], blobs = [], downloads = [], snapshots = [];
  const session = createSession({
    readerFactory: () => {
      const reader = { readyState: 0, result: null, aborted: 0, readAsArrayBuffer() { this.readyState = 1; }, abort() { this.aborted++; this.readyState = 2; this.onabort?.(); } };
      readers.push(reader); return reader;
    },
    urlApi: { createObjectURL(blob) { blobs.push(blob); return `blob:synthetic-${blobs.length}`; }, revokeObjectURL(url) { revoked.push(url); } },
    onDownload: (url, filename) => { if (downloadError) throw new Error('SYNTHETIC_PRIVATE_ERROR'); downloads.push({ url, filename }); },
    onChange: (state) => snapshots.push({ phase: state.phase, bytes: state.bytes?.length ?? 0, generation: state.generation })
  });
  function read(text = 'Name,Phone\nSynthetic,001', name = 'synthetic.csv') {
    const bytes = new TextEncoder().encode(text);
    session.readFile({ name, size: bytes.length });
    return { reader: readers.at(-1), bytes };
  }
  function finish({ reader, bytes }) {
    reader.result = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); reader.readyState = 2; reader.onload?.();
  }
  function ready() { finish(read()); session.setMapping({ name: 0, phone: 1, email: null, organization: null, note: null }); session.preview(); }
  return { session, readers, revoked, blobs, downloads, snapshots, read, finish, ready };
}
test('File.size cap before reader creation; no read/decode of oversized input', () => {
  const h = harness(); h.session.readFile({ name: 'oversized.csv', size: 1048577 });
  assert.equal(h.readers.length, 0); assert.equal(h.session.state.error.code, 'CSV_BYTE_LIMIT'); assert.equal(h.session.state.bytes, null);
});
test('manual download creates actual Node Blob only on explicit action; exact MIME and contents', async () => {
  const h = harness(); h.ready();
  assert.equal(h.blobs.length, 0); assert.equal(h.downloads.length, 0);
  assert.equal(h.session.download(), true);
  assert.equal(h.blobs[0].type, 'text/vcard;charset=utf-8');
  assert.equal(await h.blobs[0].text(), 'BEGIN:VCARD\r\nVERSION:3.0\r\nN:;;;;\r\nFN:Synthetic\r\nTEL;TYPE=VOICE:001\r\nEND:VCARD\r\n');
  assert.deepEqual(h.downloads, [{ url: 'blob:synthetic-1', filename: 'contacts.vcf' }]);
  assert.equal(h.session.state.phase, 'exported');
});
test('A19 mapping synchronously clears old preview/bytes/URL; saved late load ignored', () => {
  const h = harness(); const first = h.read(); const lateLoad = first.reader.onload;
  h.finish(first); h.session.setMapping({ name: 0, phone: 1 }); h.session.preview(); h.session.download();
  const before = h.session.state.generation;
  h.session.setMapping({ name: 1, phone: 0 });
  assert.equal(h.session.state.generation, before + 1);
  assert.deepEqual(h.session.state.contacts, []); assert.deepEqual(h.session.state.duplicateGroups, []);
  assert.equal(h.session.state.bytes, null); assert.equal(h.session.state.url, null);
  assert.deepEqual(h.revoked, ['blob:synthetic-1']); assert.equal(h.session.download(), false);
  lateLoad(); assert.equal(h.session.state.phase, 'mapping'); assert.equal(h.session.state.bytes, null);
  assert.deepEqual(h.session.state.mapping, { name: 1, phone: 0 });
});
test('new file aborts pending read; old callback cannot replace newer file', () => {
  const h = harness(); const first = h.read('n,p\nOld,001', 'old.csv'); const lateLoad = first.reader.onload;
  const second = h.read('n,p\nNew,+002', 'new.csv');
  assert.equal(first.reader.aborted, 1); assert.equal(first.reader.onload, null);
  first.reader.result = first.bytes.buffer; lateLoad(); assert.equal(h.session.state.parsed, null);
  h.finish(second); assert.equal(h.session.state.parsed.rows[0].cells[0], 'New');
});
test('A20 cancel/clear/pagehide cleanup contract drops references, aborts and ignores stale events', () => {
  const h = harness(); h.ready(); h.session.download();
  h.session.clear();
  assert.deepEqual(h.revoked, ['blob:synthetic-1']);
  assert.equal(h.session.state.parsed, null); assert.equal(h.session.state.source, null);
  assert.deepEqual(h.session.state.mapping, { name: null, phone: null, email: null, organization: null, note: null });
  assert.deepEqual(h.session.state.contacts, []); assert.deepEqual(h.session.state.duplicateGroups, []);
  assert.equal(h.session.state.bytes, null); assert.equal(h.session.state.url, null);
  const pending = h.read(); const lateLoad = pending.reader.onload;
  h.session.cancelRead(); assert.equal(pending.reader.aborted, 1); lateLoad();
  assert.equal(h.session.state.phase, 'idle'); assert.equal(h.session.state.parsed, null); assert.equal(h.session.state.error.code, 'READ_CANCELLED');
  const pendingAgain = h.read(); const oldLoad = pendingAgain.reader.onload;
  h.session.clear(); oldLoad(); assert.equal(pendingAgain.reader.aborted, 1); assert.equal(h.session.state.source, null);
});
test('failed preview/new invalid source never keeps prior result; mapping stays editable', () => {
  const h = harness(); h.ready(); h.session.download();
  h.session.setMapping({ name: 0, phone: 0 }); h.session.preview();
  assert.equal(h.session.state.error.code, 'MAPPING_REUSED'); assert.equal(h.session.state.bytes, null);
  assert.deepEqual(h.session.state.mapping, { name: 0, phone: 0 }); assert.equal(h.session.state.parsed.rows.length, 1);
  h.finish(h.read('n,p\n"bad')); assert.equal(h.session.state.error.code, 'CSV_UNCLOSED_QUOTE');
  assert.equal(h.session.state.parsed, null); assert.equal(h.session.state.bytes, null); assert.deepEqual(h.session.state.contacts, []);
});
test('reader error, byte size mismatch and download failure produce fixed errors with no old URL', () => {
  const h = harness(); const input = h.read(); input.reader.onerror();
  assert.equal(h.session.state.error.code, 'READ_ERROR');
  const next = h.read(); next.reader.result = new ArrayBuffer(0); next.reader.onload();
  assert.equal(h.session.state.error.code, 'READ_ERROR');
  const bad = harness({ downloadError: true }); bad.ready(); assert.equal(bad.session.download(), false);
  assert.equal(bad.session.state.error.code, 'DOWNLOAD_ERROR'); assert.equal(bad.session.state.bytes, null); assert.equal(bad.session.state.url, null);
  assert.deepEqual(bad.revoked, ['blob:synthetic-1']); assert.equal(JSON.stringify(bad.session.state.error).includes('PRIVATE'), false);
});
test('both languages have every fixed error code and field/status translation', () => {
  assert.deepEqual(Object.keys(COPY.en.errors).sort(), Object.keys(COPY['zh-Hant'].errors).sort());
  assert.deepEqual(Object.keys(COPY.en.fields).sort(), Object.keys(COPY['zh-Hant'].fields).sort());
  for (const lang of Object.values(COPY)) for (const text of Object.values(lang.errors)) assert.ok(typeof text === 'string' && text.length > 10);
});
