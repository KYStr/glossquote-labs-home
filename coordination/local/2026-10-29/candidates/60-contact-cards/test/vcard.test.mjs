import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeVcards, escapeVcardText, foldVcardLine, encodeVcardLines, VCARD_MIME, VCARD_FILENAME } from '../public/js/core/vcard.mjs';
import { parseCsvUtf8 } from '../public/js/core/csv.mjs';
import { mapContacts } from '../public/js/core/map-contacts.mjs';

const contact = (more = {}) => ({ name: '王小明', phone: '+886912345678', email: '', organization: '', note: '', ...more });
const decode = (bytes) => new TextDecoder('utf-8', { fatal: true }).decode(bytes);

// Independent strict reader for output assertions. Does not import writer internals.
function inspect(bytes) {
  const text = decode(bytes);
  assert.equal(text.startsWith('\ufeff'), false);
  assert.equal(text.replaceAll('\r\n', '').includes('\n'), false);
  assert.equal(text.replaceAll('\r\n', '').includes('\r'), false);
  const physical = text.split('\r\n');
  assert.equal(physical.pop(), '');
  for (const line of physical) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75);
    assert.equal(line.includes('\ufffd'), false);
  }
  const logical = [];
  for (const line of physical) {
    if (line.startsWith(' ')) { assert.ok(logical.length); logical[logical.length - 1] += line.slice(1); }
    else logical.push(line);
  }
  const cards = []; let current = null;
  for (const line of logical) {
    if (line === 'BEGIN:VCARD') { assert.equal(current, null); current = []; }
    else if (line === 'END:VCARD') { assert.ok(current); cards.push(current); current = null; }
    else { assert.ok(current); current.push(line); }
  }
  assert.equal(current, null);
  for (const card of cards) {
    assert.equal(card.filter((line) => line === 'VERSION:3.0').length, 1);
    assert.equal(card.filter((line) => line.startsWith('N:')).length, 1);
    assert.ok(card.includes('N:;;;;'));
    assert.equal(card.filter((line) => line.startsWith('FN:')).length, 1);
    assert.equal(card.some((line) => line.includes('CHARSET')), false);
  }
  return cards;
}
function readText(value) {
  let result = '';
  for (let i = 0; i < value.length; i++) {
    if (value[i] !== '\\') result += value[i];
    else {
      const token = value[++i]; assert.ok(['n', 'N', ',', ';', '\\'].includes(token));
      result += token === 'n' || token === 'N' ? '\n' : token;
    }
  }
  return result;
}
test('A01 exact CSV→mapping→vCard3 bytes + MIME + filename', () => {
  const { rows } = parseCsvUtf8(new TextEncoder().encode('姓名,電話\n王小明,+886912345678'));
  const { contacts } = mapContacts(rows, { name: 0, phone: 1 });
  const bytes = serializeVcards(contacts);
  assert.equal(decode(bytes), 'BEGIN:VCARD\r\nVERSION:3.0\r\nN:;;;;\r\nFN:王小明\r\nTEL;TYPE=VOICE:+886912345678\r\nEND:VCARD\r\n');
  assert.equal(inspect(bytes).length, 1);
  assert.equal(VCARD_MIME, 'text/vcard;charset=utf-8'); assert.equal(VCARD_FILENAME, 'contacts.vcf');
});
test('A02 two adjacent cards, CRLF endings, no blank records', () => {
  const bytes = serializeVcards([contact(), contact({ name: 'Second', phone: '', email: 'x@example.test' })]);
  assert.equal(inspect(bytes).length, 2);
  const text = decode(bytes);
  assert.equal(text.split('BEGIN:VCARD\r\n').length - 1, 2);
  assert.equal(text.split('END:VCARD\r\n').length - 1, 2);
  assert.ok(text.includes('END:VCARD\r\nBEGIN:VCARD\r\n'));
  assert.equal(text.includes('\r\n\r\n'), false);
});
test('A03/A04 phone remains exact; full English and Chinese names remain FN only', () => {
  const cards = inspect(serializeVcards([contact({ name: 'Mary Jane Watson', phone: '001-02 +886' }), contact()]));
  assert.ok(cards[0].includes('FN:Mary Jane Watson'));
  assert.ok(cards[0].includes('TEL;TYPE=VOICE:001-02 +886'));
  assert.ok(cards[1].includes('FN:王小明'));
});
test('A05/A17 exact escaping and independent unescape', () => {
  const cards = inspect(serializeVcards([contact({ name: 'A,B;C\\D', note: 'line1\r\nline2,;\\', organization: 'Smith;Unit, East\\Lab' })]));
  assert.ok(cards[0].includes('FN:A\\,B\\;C\\\\D'));
  assert.ok(cards[0].includes('NOTE:line1\\nline2\\,\\;\\\\'));
  assert.ok(cards[0].includes('ORG:Smith\\;Unit\\, East\\\\Lab'));
  assert.equal(readText(cards[0].find((s) => s.startsWith('NOTE:')).slice(5)), 'line1\nline2,;\\');
  assert.equal(escapeVcardText('a:b"c'), 'a:b"c');
});
test('A06 exact 75-octet Chinese split; continuation prefix counts toward limit', () => {
  assert.deepEqual(foldVcardLine('FN:' + '王'.repeat(36)), ['FN:' + '王'.repeat(24), ' ' + '王'.repeat(12)]);
  inspect(serializeVcards([contact({ name: '王'.repeat(36) })]));
});
test('fold never splits escape tokens or astral code points, unfolding roundtrip', () => {
  assert.deepEqual(foldVcardLine('NOTE:' + 'x'.repeat(69) + '\\,'), ['NOTE:' + 'x'.repeat(69), ' \\,']);
  const value = '😀,;\\'.repeat(95);
  const cards = inspect(serializeVcards([contact({ note: value })]));
  assert.equal(readText(cards[0].find((line) => line.startsWith('NOTE:')).slice(5)), value);
  assert.throws(() => foldVcardLine('FN:x\nEND:VCARD'), { code: 'VCARD_LINE' });
});
test('A10 quoted multiline note produces one escaped NOTE property', () => {
  const { rows } = parseCsvUtf8(new TextEncoder().encode('n,p,e,o,t\n"王, 小明","001234","a@example.test","Org","第一行\r\n第二行"'));
  const cards = inspect(serializeVcards(mapContacts(rows, { name: 0, phone: 1, email: 2, organization: 3, note: 4 }).contacts));
  assert.ok(cards[0].includes('NOTE:第一行\\n第二行'));
});
test('A15 malicious note cannot add card/property; invalid name rejects serializer', () => {
  const cards = inspect(serializeVcards([contact({ note: 'x\r\nEND:VCARD\r\nBEGIN:VCARD' })]));
  assert.equal(cards.length, 1); assert.ok(cards[0].includes('NOTE:x\\nEND:VCARD\\nBEGIN:VCARD'));
  assert.throws(() => serializeVcards([contact({ name: 'N\r\nTEL:999' })]), { code: 'VCARD_CONTACTS' });
});
test('empty optional properties omitted; email-only supported', () => {
  assert.deepEqual(inspect(serializeVcards([contact({ name: 'N', phone: '', email: 'x@a.test' })]))[0], ['VERSION:3.0', 'N:;;;;', 'FN:N', 'EMAIL;TYPE=INTERNET:x@a.test']);
});
test('A18 shared serializer byte packer exact 4 MiB; one extra byte rejects without truncation', () => {
  function* fixture(extra = 0) { for (let i = 0; i < 55924; i++) yield 'A'.repeat(73); yield 'A'.repeat(2 + extra); }
  const bytes = encodeVcardLines(fixture());
  assert.equal(bytes.length, 4194304);
  assert.equal(bytes[0], 65); assert.deepEqual([...bytes.slice(-4)], [65, 65, 13, 10]);
  assert.throws(() => encodeVcardLines(fixture(1)), { code: 'OUTPUT_LIMIT' });
  const exact = serializeVcards([contact()]).length;
  assert.equal(serializeVcards([contact()], { maxBytes: exact }).length, exact);
  assert.throws(() => serializeVcards([contact()], { maxBytes: exact - 1 }), { code: 'OUTPUT_LIMIT' });
});
