import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuoteImport, parseBoundedJson } from '../public/js/core/import.mjs';
import { calculateQuote } from '../public/js/core/quote.mjs';
import { serializeQuoteJson } from '../public/js/core/safe-output.mjs';
import { quote } from './fixtures.mjs';
import { createQuoteSession } from '../public/js/app.js';
const bytes = value => new TextEncoder().encode(value);
test('A15: schema1 restores all inputs, recalculates, rejects five malformed types', () => {
  const json = serializeQuoteJson(quote());
  const restored = parseQuoteImport(bytes(json));
  assert.equal(restored.ok, true);
  assert.equal(calculateQuote(restored.validatedInput).totalMinor, 4998n);
  assert.deepEqual(restored.validatedInput, quote());
  const invalids = [json.replace('"version": 1', '"version": 2'), json.replace('"note": ""', '"note": "", "totalMinor": "1"'), json.replace('"note": ""', '"note": "\\ud800"'), json.replace('"note": ""', '"note": "", "note": "again"'), json.replace('"note": ""', '"no\\u0074e": "", "note": "again"')];
  assert.equal(parseQuoteImport(bytes(invalids[0])).code, 'IMPORT_SCHEMA');
  assert.equal(parseQuoteImport(bytes(invalids[1])).code, 'IMPORT_SCHEMA');
  assert.equal(parseQuoteImport(bytes(invalids[2])).errors[0].code, 'TEXT_SURROGATE');
  assert.equal(parseQuoteImport(bytes(invalids[3])).code, 'IMPORT_DUPLICATE');
  assert.equal(parseQuoteImport(bytes(invalids[4])).code, 'IMPORT_DUPLICATE');
});
test('bounded tokenizer rejects depth, nodes, malformed JSON and nested duplicate names', () => {
  assert.throws(() => parseBoundedJson('[[[[[[[0]]]]]]]'), /IMPORT_DEPTH/);
  assert.throws(() => parseBoundedJson(`[${'0,'.repeat(2000)}0]`), /IMPORT_NODES/);
  assert.throws(() => parseBoundedJson('{"a":{"x":1,"x":2}}'), /IMPORT_DUPLICATE/);
  for (const text of ['', '{} trailing', '{"a":1,}', '[1,]', '{"a":01}', '{"a":NaN}', '{"a":"\\x01"}', '"line\nnext"', '1e999', '{a:1}', 'true false']) assert.throws(() => parseBoundedJson(text), /IMPORT_JSON/);
  assert.equal(parseBoundedJson('{"__proto__":{"polluted":true}}').__proto__.polluted, true);
  assert.equal({}.polluted, undefined);
});
test('strict fields reject wrong decimal types, missing/unknown keys, bad UTF8 and byte overflow', () => {
  for (const input of [quote({ items: [{ ...quote().items[0], quantity: 1 }] }), quote({ items: [] }), quote({ note: null }), quote({ schema: 'other' }), quote({ parties: {} })]) assert.equal(parseQuoteImport(bytes(JSON.stringify(input))).ok, false);
  assert.equal(parseQuoteImport(new Uint8Array([0xc0, 0xaf])).code, 'IMPORT_UTF8');
  assert.equal(parseQuoteImport(new Uint8Array(524289)).code, 'IMPORT_SIZE');
  assert.equal(parseQuoteImport('text').code, 'IMPORT_TYPE');
  const valid = serializeQuoteJson(quote());
  const exact = valid.trimEnd() + ' '.repeat(524288 - bytes(valid.trimEnd()).length);
  assert.equal(parseQuoteImport(bytes(exact)).ok, true);
  assert.equal(parseQuoteImport(bytes(`${exact} `)).code, 'IMPORT_SIZE');
});

function lifecycle() {
  const readers = [], created = [], revoked = [];
  class Reader {
    readyState = 0;
    aborts = 0;
    result = null;
    readAsArrayBuffer() { this.readyState = 1; }
    abort() { this.aborts++; this.readyState = 2; this.onabort?.(); }
    load(input = quote()) { this.result = bytes(JSON.stringify(input)).buffer; this.readyState = 2; this.onload?.(); }
  }
  const session = createQuoteSession({ readerFactory: () => { const reader = new Reader(); readers.push(reader); return reader; }, blobFactory: (payload, type) => ({ payload, type }), createUrl: blob => { const url = `blob:fake-${created.length + 1}`; created.push({ url, blob }); return url; }, revokeUrl: url => revoked.push(url) });
  session.edit(quote());
  return { session, readers, created, revoked };
}
test('A17: editing immediately revokes both URLs; invalid retry cannot resurrect output', () => {
  const { session, created, revoked } = lifecycle();
  assert.equal(session.generate(), true);
  assert.equal(created.length, 0, 'generation never starts a download or creates a Blob');
  assert.equal(session.download('html').filename, 'quote.html');
  assert.equal(session.download('json').filename, 'quote.json');
  assert.equal(created.length, 2);
  session.edit(quote({ items: [{ description: 'Edit', quantity: '1', unitPrice: '2' }] }));
  assert.equal(session.state.phase, 'stale');
  assert.equal(session.state.preview, null);
  assert.deepEqual(revoked, ['blob:fake-1', 'blob:fake-2']);
  session.edit(quote({ taxRate: 'invalid' }));
  assert.equal(session.generate(), false);
  assert.equal(session.download('html').ok, false);
  assert.equal(session.download('json').ok, false);
  assert.equal(created.length, 2);
});
test('A18: cancel reading / cancel confirmation preserve draft; late load ignored', () => {
  const { session, readers, created } = lifecycle();
  const original = structuredClone(session.state.draft);
  session.beginImport({ size: 500 });
  const first = readers[0]; const late = first.onload;
  session.cancelImport();
  assert.equal(first.aborts, 1);
  first.result = bytes(JSON.stringify(quote({ note: 'Must not replace' }))).buffer;
  late();
  assert.deepEqual(session.state.draft, original);
  assert.equal(session.state.pending, null);
  session.beginImport({ size: 500 });
  readers[1].load(quote({ note: 'Pending replacement' }));
  assert.equal(session.state.phase, 'confirm-import');
  assert.deepEqual(session.state.draft, original);
  session.cancelImport();
  assert.deepEqual(session.state.draft, original);
  assert.equal(session.confirmImport(), false);
  assert.equal(created.length, 0);
});
test('A19: clear and pagehide release every reader, buffer reference and URL', () => {
  const { session, readers, revoked } = lifecycle();
  session.generate(); session.download('html'); session.download('json');
  session.clear();
  assert.deepEqual(revoked, ['blob:fake-1', 'blob:fake-2']);
  assert.equal(session.state.draft.parties.from, '');
  assert.equal(session.state.preview, null);
  session.beginImport({ size: 100 });
  const late = readers[0].onload;
  session.clear({ dispose: true });
  assert.equal(readers[0].aborts, 1);
  assert.equal(session.state.draft, null);
  assert.equal(session.state.importReader, null);
  assert.equal(session.state.pending, null);
  assert.equal(session.state.blobUrls.size, 0);
  late(); assert.equal(session.state.phase, 'disposed');
  assert.equal(session.resume(), true);
  assert.equal(session.state.draft.parties.from, '');
  assert.equal(session.resume(), false);
});
test('A20: four failure types have no partial/stale output and allow valid retries', () => {
  const { session, readers } = lifecycle();
  function validRetry() {
    session.edit(quote()); assert.equal(session.generate(), true);
    assert.equal(session.state.preview.totals.totalMinor, 4998n);
    assert.equal(session.download('json').ok, true);
  }
  validRetry();
  session.edit(quote({ items: Array.from({ length: 51 }, () => quote().items[0]) }));
  assert.equal(session.generate(), false);
  assert.equal(session.state.preview, null);
  assert.equal(session.state.blobUrls.size, 0);
  validRetry();
  session.beginImport({ size: 524289 });
  assert.equal(readers.length, 0, 'oversize rejected before reader construction');
  assert.equal(session.state.errors[0].code, 'IMPORT_SIZE');
  assert.equal(session.state.preview, null);
  validRetry();
  session.beginImport({ size: 100 });
  readers[0].load(quote({ version: 2 }));
  assert.equal(session.state.errors[0].code, 'IMPORT_SCHEMA');
  assert.equal(session.state.preview, null);
  validRetry();
  session.edit(quote({ items: [{ description: 'Padded quantity', quantity: `${'0'.repeat(524288)}1`, unitPrice: '1' }] }));
  assert.equal(session.generate(), false);
  assert.equal(session.state.errors[0].code, 'EXPORT_LIMIT');
  assert.equal(session.state.preview, null);
  assert.equal(session.download('html').ok, false);
  assert.equal(session.download('json').ok, false);
  validRetry();
});
test('import confirmation replaces all fields and recalculates; edits/new files stale old reads', () => {
  const { session, readers } = lifecycle();
  session.beginImport({ size: 100 });
  const obsolete = readers[0].onload;
  session.beginImport({ size: 100 });
  obsolete(); assert.equal(session.state.phase, 'importing');
  readers[1].load(quote({ currency: 'USD', parties: { from: '', to: 'New' }, items: [{ description: 'Imported', quantity: '1', unitPrice: '0.01' }], taxRate: '50', note: 'Changed' }));
  assert.equal(session.confirmImport(), true);
  assert.equal(session.state.preview.totals.totalMinor, 2n);
  assert.equal(session.state.draft.currency, 'USD');
  assert.equal(session.state.draft.parties.from, '');
  assert.equal(session.state.draft.note, 'Changed');
  session.beginImport({ size: 100 });
  const late = readers[2].onload;
  session.edit(quote({ note: 'Typed now' })); late();
  assert.equal(readers[2].aborts, 1);
  assert.equal(session.state.draft.note, 'Typed now');
  assert.equal(session.state.pending, null);
});
test('reader and Blob failures use fixed recoverable errors and revoke earlier kind', () => {
  const { session, readers } = lifecycle();
  session.beginImport({ size: 5 }); readers[0].onerror();
  assert.equal(session.state.errors[0].code, 'IMPORT_READ');
  assert.equal(session.state.importReader, null);
  const revoked = [];
  let calls = 0;
  const broken = createQuoteSession({ blobFactory: () => { if (++calls === 2) throw new Error('private detail'); return {}; }, createUrl: () => 'blob:first', revokeUrl: url => revoked.push(url) });
  broken.edit(quote()); broken.generate(); broken.download('html');
  assert.equal(broken.download('json').ok, false);
  assert.deepEqual(revoked, ['blob:first']);
  assert.equal(broken.state.preview, null);
  assert.deepEqual(broken.state.errors, [{ code: 'DOWNLOAD_FAILED', field: 'root' }]);
});
