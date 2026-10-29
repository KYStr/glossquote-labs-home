import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, parseCards, decodeUtf8 } from '../public/js/core/csv.mjs';
import { createSession, reduceSession, shuffledOrder } from '../public/js/core/deck.mjs';
import { parseDeckJson, validateDeck, LIMITS } from '../public/js/core/schema.mjs';
import { serializeDeck, renderStudyHtml } from '../public/js/core/export.mjs';

const cards = [{ id: 1, question: 'A', answer: 'a' }, { id: 2, question: 'B', answer: 'b' }, { id: 3, question: 'C', answer: 'c' }];
const error = code => value => value.code === code;
const knownA = () => reduceSession(reduceSession(createSession(cards), { type: 'reveal' }), { type: 'assess', value: 'known' });

test('A01 imported three cards start hidden in source order', () => {
  const state = createSession(parseCards('question,answer\nA,a\nB,b\nC,c'));
  assert.deepEqual(state.cards, cards);
  assert.equal(state.currentId, 1); assert.equal(state.revealed, false);
  assert.equal(state.known.size, 0); assert.equal(state.cards.length - state.known.size, 3);
});
test('A02 revealed known card advances and hides next answer, without mutating prior state', () => {
  const start = createSession(cards), revealed = reduceSession(start, { type: 'reveal' });
  const state = reduceSession(revealed, { type: 'assess', value: 'known' });
  assert.deepEqual([...state.known], [1]); assert.equal(state.cards.length - state.known.size, 2);
  assert.equal(state.currentId, 2); assert.equal(state.revealed, false); assert.equal(start.known.size, 0);
});
test('A03 assessment while hidden is refused', () => {
  const state = createSession(cards);
  assert.throws(() => reduceSession(state, { type: 'assess', value: 'known' }), error('ANSWER_HIDDEN'));
  assert.equal(state.known.size, 0);
});
test('A04 review batch contains only B/C; navigation retains progress', () => {
  const state = reduceSession(knownA(), { type: 'setMode', mode: 'review' });
  assert.deepEqual(state.order, [2, 3]); assert.equal(state.currentId, 2); assert.equal(state.revealed, false);
  const previous = reduceSession(reduceSession(state, { type: 'next' }), { type: 'previous' });
  assert.deepEqual([...previous.known], [1]); assert.equal(previous.currentId, 2);
});
test('A05 all known gives a deliberate empty review batch', () => {
  const state = reduceSession(createSession(cards, { known: [1, 2, 3] }), { type: 'setMode', mode: 'review' });
  assert.deepEqual(state.order, []); assert.equal(state.currentId, null); assert.equal(state.ended, true);
});
test('A06 Fisher-Yates/xorshift32 seed 42 has fixed expected permutation', () => {
  assert.deepEqual(shuffledOrder([1, 2, 3], 42), [3, 2, 1]);
  assert.deepEqual(createSession(cards, { shuffle: true, seed: 42 }).order, [3, 2, 1]);
  assert.deepEqual(createSession(cards, { shuffle: true, seed: 42 }).order, [3, 2, 1]);
  assert.deepEqual([...new Set(shuffledOrder([1, 2, 3], 42))].sort(), [1, 2, 3]);
});
test('A07 CSV comma and escaped quote', () => {
  assert.deepEqual(parseCards('"問題,一","答""案"', { header: false }), [{ id: 1, question: '問題,一', answer: '答"案' }]);
});
test('A08 whitespace-only face rejects the entire CSV', () => {
  assert.throws(() => parseCards('q,a\nA,a\nB,  '), error('EMPTY_FACE'));
});
test('A09 repeated questions with different answers stay distinct', () => {
  assert.deepEqual(parseCards('q,a\nx,one\nx,two'), [{ id: 1, question: 'x', answer: 'one' }, { id: 2, question: 'x', answer: 'two' }]);
});
test('A10 JSON unknown reference refuses the deck', () => {
  assert.throws(() => parseDeckJson('{"schemaVersion":1,"cards":[{"id":1,"question":"A","answer":"a"}],"known":[99]}'), error('INVALID_REFERENCE'));
});
test('A11 HTML injection is escaped in both question and answer, fixed template has no executable tags', () => {
  const html = renderStudyHtml([{ id: 99, question: '</style><script>x</script>', answer: '<img src=x onerror="x">&\'"' }]);
  assert.ok(html.includes('&lt;/style&gt;&lt;script&gt;x&lt;/script&gt;'));
  assert.ok(html.includes('&lt;img src=x onerror=&quot;x&quot;&gt;&amp;&#39;&quot;'));
  assert.doesNotMatch(html, /<script|<img|<iframe|<[^>]*\sonerror=/);
  assert.ok(html.includes('<span class="number">1</span>')); assert.ok(html.includes('<th scope="row">1</th>'));
});
test('CSV preserves BOM removal, spaces, Unicode, CRLF/LF inside quotes', () => {
  assert.deepEqual(parseCards('\uFEFFq,a\r\n" A\r\n😀 "," a\nb "\r\n'), [{ id: 1, question: ' A\r\n😀 ', answer: ' a\nb ' }]);
});
test('UTF-8 fatal decoding rejects invalid bytes and over-limit files', () => {
  assert.equal(decodeUtf8(Uint8Array.from([239, 187, 191, 65])), 'A');
  assert.throws(() => decodeUtf8(Uint8Array.from([195, 40])), error('INVALID_UTF8'));
  assert.throws(() => decodeUtf8(new Uint8Array(LIMITS.csvBytes + 1)), error('SOURCE_TOO_LARGE'));
});
test('CSV strict grammar and blank/ragged rows are refused, never dropped', () => {
  for (const source of ['q,a\n"A,a', 'q,a\nA"x,a', 'q,a\n"A" ,a', 'q,a\rA,a']) assert.throws(() => parseCards(source), error('INVALID_CSV'));
  for (const source of ['q,a\nA,a\n\n', 'q,a\nA', 'q,a\nA,a,extra']) assert.throws(() => parseCards(source), error('COLUMN_COUNT'));
  assert.throws(() => parseCards('q,a\n,answer'), error('EMPTY_FACE'));
  assert.throws(() => parseCards('q,a'), error('EMPTY_DECK'));
  assert.throws(() => parseCards(''), error('EMPTY_DECK'));
});
test('CSV settings use different numeric column indexes, including duplicate headers', () => {
  assert.deepEqual(parseCards('same,same,extra\nA,a,z', { questionColumn: 1, answerColumn: 0 }), [{ id: 1, question: 'a', answer: 'A' }]);
  for (const settings of [{ questionColumn: 0, answerColumn: 0 }, { questionColumn: 0, answerColumn: 2 }, { questionColumn: -1 }, { questionColumn: 0.5 }, { header: 'true' }]) assert.throws(() => parseCards('A,a', settings), error('INVALID_COLUMNS'));
});
test('CSV card, record and column caps accept boundary and reject excess', () => {
  const rows = Array.from({ length: 500 }, (_, i) => `Q${i},A${i}`).join('\n');
  assert.equal(parseCards(`q,a\n${rows}`).length, 500); assert.equal(parseCards(rows, { header: false }).length, 500);
  assert.throws(() => parseCards(`${rows}\nextra,answer`, { header: false }), error('TOO_MANY_CARDS'));
  assert.throws(() => parseCards(`q,a\n${rows}\nextra,answer`), error('TOO_MANY_CARDS'));
  assert.equal(parseCsv(Array(30).fill('x').join(',')).length, 1);
  assert.throws(() => parseCsv(Array(31).fill('x').join(',')), error('TOO_MANY_COLUMNS'));
});
test('2000 UTF-16 face limit preserves emoji and rejects malformed Unicode/control characters', () => {
  assert.equal(parseCards(`q,a\n${'😀'.repeat(1000)},ok`)[0].question.length, 2000);
  assert.throws(() => parseCards(`q,a\n${'😀'.repeat(1001)},ok`), error('FACE_TOO_LONG'));
  for (const text of ['bad\u0000text', 'bad\u007Ftext', 'bad\u0085text', '\uD800']) assert.throws(() => parseCards(`q,a\n${text},answer`), error('INVALID_TEXT'));
  assert.throws(() => parseCsv('x'.repeat(1048577)), error('SOURCE_TOO_LARGE'));
});
test('JSON exact schema rejects extra/prototype keys, bad IDs, duplicate IDs and invalid faces', () => {
  const base = { schemaVersion: 1, cards: [cards[0]], known: [] };
  for (const value of [{ ...base, extra: true }, { ...base, schemaVersion: 2 }, { ...base, cards: [] }, { ...base, cards: [{ ...cards[0], extra: 1 }] }, { ...base, cards: [{ ...cards[0], id: 0 }] }, { ...base, cards: [cards[0], cards[0]] }, { ...base, known: [1, 1] }, { ...base, cards: [{ ...cards[0], answer: ' ' }] }]) assert.throws(() => validateDeck(value));
  assert.throws(() => parseDeckJson('{"schemaVersion":1,"cards":[],"known":[],"__proto__":{"polluted":true}}'), error('INVALID_SCHEMA'));
  assert.equal({}.polluted, undefined);
  assert.throws(() => parseDeckJson('{'), error('INVALID_JSON'));
  assert.throws(() => parseDeckJson(' '.repeat(2097153)), error('SOURCE_TOO_LARGE'));
});
test('JSON round trip keeps IDs, exact strings and progress with LF formatting', () => {
  const source = serializeDeck(cards, new Set([1, 3]));
  assert.ok(source.endsWith('\n')); assert.ok(source.includes('\n  "schemaVersion": 1,')); assert.ok(!source.startsWith('\uFEFF'));
  assert.deepEqual(parseDeckJson(source), { schemaVersion: 1, cards, known: [1, 3] });
});
test('escaped/formatted JSON over 2 MiB is refused before offering a file that cannot be restored', () => {
  const manyTabs = Array.from({ length: 500 }, (_, i) => ({ id: i + 1, question: `Q${'\t'.repeat(1040)}`, answer: `A${'\t'.repeat(1040)}` }));
  assert.throws(() => serializeDeck(manyTabs), error('EXPORT_TOO_LARGE'));
  assert.ok(renderStudyHtml(manyTabs).includes('<title>'));
});
test('review assessment, round end and restart never silently loop', () => {
  let state = createSession([cards[0]], { known: [1] });
  state = reduceSession(reduceSession(state, { type: 'reveal' }), { type: 'assess', value: 'review' });
  assert.equal(state.known.size, 0); assert.equal(state.currentId, null); assert.equal(state.ended, true); assert.equal(state.revealed, false);
  assert.equal(reduceSession(state, { type: 'next' }), state);
  assert.equal(reduceSession(state, { type: 'restart' }).currentId, 1);
  assert.equal(reduceSession(state, { type: 'previous' }).currentId, 1);
});
test('reshuffle/reset preserve the specified progress and hide answers', () => {
  let state = reduceSession(knownA(), { type: 'reveal' });
  state = reduceSession(state, { type: 'reshuffle', seed: 42 });
  assert.deepEqual(state.order, [3, 2, 1]); assert.deepEqual([...state.known], [1]); assert.equal(state.revealed, false);
  const reset = reduceSession(state, { type: 'reset' });
  assert.equal(reset.known.size, 0); assert.equal(reset.cards.length - reset.known.size, 3);
  for (const seed of [0, -1, 4294967296, 1.2, NaN]) assert.throws(() => shuffledOrder([1, 2], seed), error('INVALID_SEED'));
  assert.throws(() => reduceSession(state, { type: 'setMode', mode: 'unknown' }), error('INVALID_EVENT'));
});
test('both print languages number questions and answers independently of imported IDs', () => {
  for (const locale of ['zh-Hant', 'en']) {
    const html = renderStudyHtml([{ ...cards[0], id: 17 }], { locale });
    assert.ok(html.includes(`<html lang="${locale}">`));
    assert.ok(html.includes('<meta charset="utf-8">')); assert.ok(html.includes('noindex,nofollow'));
    assert.ok(html.includes('<span class="number">1</span>')); assert.ok(html.includes('<th scope="row">1</th>'));
    assert.doesNotMatch(html, /<script|https?:\/\/|\bonclick=|window\.print/);
  }
});
