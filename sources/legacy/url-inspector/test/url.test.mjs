import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectUrl, composeUrl, parseQuery, trackingRowIds, serializeEditedPair, ProductError } from '../public/js/core/url.mjs';
const base = 'https://example.com/';
const edited = (id, key, value) => new Map([[id, { key, value }]]);
const code = expected => error => error instanceof ProductError && error.code === expected && error.message === expected;

test('U01 no query and U02 parser normalization never changes raw output', () => {
  const a = inspectUrl('https://example.com/a'); assert.equal(a.rows.length, 0); assert.equal(a.parsed.hostname, 'example.com'); assert.deepEqual(composeUrl(a), { url: 'https://example.com/a', changedRows: 0 });
  const source = 'https://EXAMPLE.com:443/a/../b?x=1&x=2#ok'; const b = inspectUrl(source);
  assert.equal(b.parsed.hostname, 'example.com'); assert.equal(b.parsed.port, ''); assert.equal(b.parsed.pathname, '/b');
  assert.equal(b.rows.length, 2); assert.equal(composeUrl(b).url, source);
  assert.equal(composeUrl(inspectUrl('HTTPS://例子.測試:443/a')).url, 'HTTPS://例子.測試:443/a');
  assert.equal(inspectUrl('HTTPS://例子.測試:443/a').parsed.hostname, 'xn--fsqu00a.xn--g6w251d');
});
test('U03 form decode once and U04 duplicate/bare/empty segment preservation', () => {
  const source = base + '?q=a+b&plus=%2B&space=%20&nested=%2520'; const m = inspectUrl(source);
  assert.deepEqual(m.rows.map(r => r.decodedValue), ['a b', '+', ' ', '%20']); assert.equal(composeUrl(m).url, source);
  const raw = base + '?flag&x=&=v&&#f'; const rows = inspectUrl(raw).rows;
  assert.equal(rows.length, 5); assert.deepEqual(rows.map(r => r.hasEquals), [false, true, true, false, false]); assert.deepEqual(rows.map(r => r.raw), ['flag', 'x=', '=v', '', '']);
  assert.equal(composeUrl(inspectUrl(raw)).url, raw); assert.equal(parseQuery('').length, 0);
});
test('U05 only changed row encoded and U06 revert restores original percent spelling', () => {
  const m = inspectUrl(base + '?x=%2f&x=%2F');
  assert.deepEqual(composeUrl(m, edited('r1', 'x', 'a b+c')), { url: base + '?x=%2f&x=a+b%2Bc', changedRows: 1 });
  assert.equal(composeUrl(m, edited('r0', 'x', 'a')).url, base + '?x=a&x=%2F');
  assert.deepEqual(composeUrl(m, edited('r0', 'x', '/')), { url: base + '?x=%2f&x=%2F', changedRows: 0 });
});
test('U07 tracking fixed names, U08 unknown sensitive-like names untouched', () => {
  const m = inspectUrl(base + '?utm_source=a&%75tm_medium=b&UTM_CAMPAIGN=c&custom=d');
  assert.deepEqual(trackingRowIds(m), ['r0', 'r1', 'r2']); assert.equal(composeUrl(m, new Map(), new Set(trackingRowIds(m))).url, base + '?custom=d');
  assert.deepEqual(trackingRowIds(inspectUrl(base + '?utm_id=x&token=TEST_ONLY&xutm_source=a')), []);
  const all = inspectUrl(base + '?utm_term=1&utm_content=2&gclid=3&fbclid=4&msclkid=5&%2575tm_source=6'); assert.deepEqual(trackingRowIds(all), ['r0', 'r1', 'r2', 'r3', 'r4']);
});
test('U09 all deleted removes question, U10 empty question identity, U11 empty survivor retains question', () => {
  assert.equal(composeUrl(inspectUrl('https://example.com/p?a=1#fragment'), new Map(), new Set(['r0'])).url, 'https://example.com/p#fragment');
  for (const source of ['https://example.com/p?', 'https://example.com/p?#']) assert.equal(composeUrl(inspectUrl(source)).url, source);
  assert.equal(composeUrl(inspectUrl(base + '?x=1&'), new Map(), new Set(['r0'])).url, base + '?');
});
test('U12 invalid decode row is raw-only, can remove; U13 new Unicode pair', () => {
  const m = inspectUrl(base + '?q=%GG&x=%E0%A4&ok=1'); assert.deepEqual(m.rows.map(r => r.decodeError), [true, true, false]); assert.equal(m.rows[0].decodedKey, null);
  assert.equal(composeUrl(m).url, base + '?q=%GG&x=%E0%A4&ok=1');
  assert.equal(composeUrl(m, edited('r2', 'ok', '2'), new Set(['r0'])).url, base + '?x=%E0%A4&ok=2');
  assert.throws(() => composeUrl(m, edited('r0', 'q', '1')), code('UNEDITABLE_ROW'));
  assert.equal(composeUrl(inspectUrl(base + '#f'), new Map(), new Set(), [{ id: 'a0', key: 'a', value: '甲😀' }]).url, base + '?a=%E7%94%B2%F0%9F%98%80#f');
  assert.equal(serializeEditedPair('', ''), '=');
});
test('U14 explicit schemes only and U15 raw authority ahead of permissive parser', () => {
  for (const source of ['javascript:alert(1)', '//example.com', 'example.com', 'data:text/plain,x', 'file:///a', 'mailto:x@example.com', 'https:example.com']) assert.throws(() => inspectUrl(source), code('INVALID_SCHEME'));
  for (const source of ['https://user:pass@example.com', 'https://@example.com']) assert.throws(() => inspectUrl(source), code('CREDENTIALS'));
  for (const source of ['https:////@example.com', 'https:///example.com', 'https://?x=1', 'https://#f']) assert.throws(() => inspectUrl(source), code('INVALID_AUTHORITY'));
  assert.throws(() => inspectUrl('https://[bad]/'), code('INVALID_URL'));
});
test('U16 forbidden characters, ASCII trim only, malformed surrogate and fixed errors', () => {
  for (const char of ['\0', '\t', '\n', '\r', '\u001f', '\u007f', '\\', '\ud800', '\udc00', '\ud800x']) assert.throws(() => inspectUrl(base + '?a=' + char), code('INVALID_CHARACTERS'));
  assert.equal(inspectUrl('  ' + base + '?x=1  ').source, base + '?x=1');
  assert.throws(() => inspectUrl('\t' + base), code('INVALID_CHARACTERS'));
  assert.throws(() => inspectUrl('\u00a0' + base), code('INVALID_SCHEME'));
  assert.throws(() => inspectUrl(null), code('INVALID_SOURCE'));
  assert.throws(() => inspectUrl(base + 'a'.repeat(65536 - base.length) + ' '), code('SOURCE_LIMIT'));
  assert.throws(() => serializeEditedPair('a', '\ud800'), code('INVALID_DRAFT'));
});
test('U17 source 65536/65537 and 256/257 segments plus final encoded size', () => {
  const max = base + '?q=' + 'x'.repeat(65536 - base.length - 3); assert.equal(composeUrl(inspectUrl(max)).url, max);
  assert.throws(() => inspectUrl(max + 'x'), code('SOURCE_LIMIT'));
  const rows = Array.from({ length: 256 }, () => 'x').join('&'); assert.equal(inspectUrl(base + '?' + rows).rows.length, 256);
  assert.throws(() => inspectUrl(base + '?' + rows + '&x'), code('ROW_LIMIT'));
  assert.throws(() => composeUrl(inspectUrl(base + '?' + rows), new Map(), new Set(), [{ id: 'a0', key: 'a', value: 'b' }]), code('ROW_LIMIT'));
  assert.throws(() => composeUrl(inspectUrl(base), new Map(), new Set(), [{ id: 'a0', key: 'x', value: '甲'.repeat(8000) }]), code('SOURCE_LIMIT'));
});
test('U18 invalid IDs/types/model, removal priority and no mutation', () => {
  const m = inspectUrl(base + '?x=1'); const initial = structuredClone(m);
  assert.throws(() => composeUrl(m, edited('unknown', 'a', 'b')), code('INVALID_ROW_ID'));
  assert.throws(() => composeUrl(m, new Map(), new Set(['unknown'])), code('INVALID_ROW_ID'));
  for (const pairs of [[{ id: 'a0', key: '', value: '' }, { id: 'a0', key: '', value: '' }], [{ id: 'r0', key: '', value: '' }]]) assert.throws(() => composeUrl(m, new Map(), new Set(), pairs), code('INVALID_ROW_ID'));
  assert.throws(() => composeUrl(m, {}, new Set()), code('INVALID_DRAFT'));
  assert.throws(() => composeUrl(m, edited('r0', 'x', 1)), code('INVALID_DRAFT'));
  assert.throws(() => composeUrl({ ...m, prefix: 'https://elsewhere.test/' }), code('INVALID_MODEL'));
  assert.equal(composeUrl(m, edited('r0', 'x', '2'), new Set(['r0'])).url, base); assert.deepEqual(m, initial);
});
test('U22 hostile strings remain data and __proto__ is a string key', () => {
  const source = base + '?__proto__=TEST_ONLY&x=%3Cimg+src%3Dx+onerror%3Dalert%281%29%3E'; const m = inspectUrl(source);
  assert.equal(m.rows[1].decodedValue, '<img src=x onerror=alert(1)>'); assert.equal(composeUrl(m).url, source);
  assert.equal(composeUrl(m, edited('r0', '__proto__', 'safe')).url, base + '?__proto__=safe&x=%3Cimg+src%3Dx+onerror%3Dalert%281%29%3E'); assert.equal({}.TEST_ONLY, undefined);
});
test('U27 LF/tab/CR/CRLF original units survive changes elsewhere', () => {
  const source = base + '?q=a%0Ab%09c&cr=a%0Db%0D%0Ac&x=1'; const m = inspectUrl(source);
  assert.equal(m.rows[0].decodedValue, 'a\nb\tc'); assert.equal(m.rows[1].decodedValue, 'a\rb\r\nc');
  assert.equal(composeUrl(m, edited('r2', 'x', '2')).url, base + '?q=a%0Ab%09c&cr=a%0Db%0D%0Ac&x=2');
  assert.equal(composeUrl(m, edited('r1', 'cr', 'a\rb\r\nc')).url, source);
  assert.equal(serializeEditedPair('q', 'a\rb\r\nc\t'), 'q=a%0Db%0D%0Ac%09');
});
test('U28 draft budget counts removed edits; 65536 draft accepted before final URL gate', () => {
  const m = inspectUrl(base + '?x=1');
  assert.equal(composeUrl(m, edited('r0', '', 'a'.repeat(65536)), new Set(['r0'])).url, base);
  assert.throws(() => composeUrl(m, edited('r0', '', 'a'.repeat(65537)), new Set(['r0'])), code('DRAFT_LIMIT'));
  assert.throws(() => composeUrl(m, edited('r0', '', 'a'.repeat(65536))), code('SOURCE_LIMIT'));
  assert.throws(() => composeUrl(m, edited('r0', 'x', 'a'.repeat(32768)), new Set(['r0']), [{ id: 'a0', key: '', value: 'b'.repeat(32768) }]), code('DRAFT_LIMIT'));
  assert.throws(() => composeUrl(inspectUrl(base), new Map(), new Set(), [{ id: 'a0', key: '', value: 'a'.repeat(65537) }]), code('DRAFT_LIMIT'));
});
test('128 bounded fixture identities and one-row edit invariant', () => {
  for (let i = 0; i < 128; i++) {
    const source = `HTTPS://EXAMPLE.com:443/a/../b?x=%2f&x=${i}&flag&&q=a+b#f${i}`; const m = inspectUrl(source);
    assert.equal(composeUrl(m).url, source);
    assert.equal(composeUrl(m, edited('r1', 'x', 'changed')).url, `HTTPS://EXAMPLE.com:443/a/../b?x=%2f&x=changed&flag&&q=a+b#f${i}`);
  }
});
