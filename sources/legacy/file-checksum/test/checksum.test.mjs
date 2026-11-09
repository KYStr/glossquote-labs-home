import test from 'node:test';
import assert from 'node:assert/strict';
import { ProductError, validateFileSize, parseExpected, bytesToHex, compareHash, serializeHash } from '../public/js/core/checksum.mjs';

const ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const errorCode = code => error => error instanceof ProductError && error.code === code && error.message === code;

test('size gate includes empty and 128MiB; +1 rejects without reading or allocating bytes', () => {
  for (const size of [0, 1, 134217727, 134217728]) assert.equal(validateFileSize(size), size);
  assert.throws(() => validateFileSize(134217729), errorCode('SIZE_LIMIT'));
  assert.throws(() => validateFileSize(Number.MAX_SAFE_INTEGER), errorCode('SIZE_LIMIT'));
  for (const size of [-1, 0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, '3', null, undefined, 3n, {}]) {
    assert.throws(() => validateFileSize(size), errorCode('SIZE_INVALID'));
  }
});

test('expected accepts only 64 ASCII hex; trims exactly space/tab/CR/LF', () => {
  const source = ` \t\r\n${ABC.toUpperCase()} \t\r\n`;
  const parsed = parseExpected(source);
  assert.deepEqual(parsed, { state: 'valid', hex: ABC, code: null });
  assert.equal(source, ` \t\r\n${ABC.toUpperCase()} \t\r\n`);
  assert.equal(Object.isFrozen(parsed), true);
  for (const empty of ['', ' ', '\t\r\n', ' \t\r\n '.repeat(20)]) assert.deepEqual(parseExpected(empty), { state: 'empty', hex: null, code: null });
});

test('expected raw UTF-16 length 256/257 is checked before trim and never truncated', () => {
  const atLimit = ' '.repeat(96) + ABC + '\t'.repeat(96);
  assert.equal(atLimit.length, 256);
  assert.deepEqual(parseExpected(atLimit), { state: 'valid', hex: ABC, code: null });
  const tooLong = ' ' + atLimit;
  assert.equal(tooLong.length, 257);
  assert.deepEqual(parseExpected(tooLong), { state: 'invalid', hex: null, code: 'EXPECTED_LENGTH' });
  assert.deepEqual(parseExpected(' '.repeat(257)), { state: 'invalid', hex: null, code: 'EXPECTED_LENGTH' });
  assert.equal(parseExpected('😀'.repeat(128)).code, 'EXPECTED_FORMAT');
  assert.equal(parseExpected('😀'.repeat(129)).code, 'EXPECTED_LENGTH');
});

test('expected rejects prefixes, lists, internal whitespace and Unicode lookalikes', () => {
  const invalid = [
    ABC.slice(1), `${ABC}0`, `${ABC.slice(0, -1)}g`, `0x${ABC}`, `SHA256:${ABC}`, `${ABC} file.bin`,
    `${ABC.slice(0, 32)} ${ABC.slice(32)}`, `${ABC.slice(0, 32)}\n${ABC.slice(32)}`,
    `\u00a0${ABC}\u00a0`, `\u200b${ABC}`, `${ABC}\u3000`, `\f${ABC}`, `\v${ABC}`,
    '０'.repeat(64), '\ud800', null, 64, {}, new String(ABC),
  ];
  for (const source of invalid) assert.deepEqual(parseExpected(source), { state: 'invalid', hex: null, code: 'EXPECTED_FORMAT' });
});

test('hex preserves all leading zero bytes and accepts exactly Uint8Array(32)', () => {
  const bytes = Uint8Array.from({ length: 32 }, (_, index) => index);
  assert.equal(bytesToHex(bytes), '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f');
  assert.deepEqual([...bytes], Array.from({ length: 32 }, (_, index) => index));
  assert.equal(bytesToHex(new Uint8Array(32)), '0'.repeat(64));
  for (const bytes of [new Uint8Array(31), new Uint8Array(33), new Uint16Array(32), new ArrayBuffer(32), new DataView(new ArrayBuffer(32)), [], null, '00']) {
    assert.throws(() => bytesToHex(bytes), errorCode('HASH_LENGTH'));
  }
});

test('comparison has five states and validates both hash and parsed expected schema', () => {
  const expected = Object.freeze({ state: 'valid', hex: ABC, code: null });
  assert.equal(compareHash(null, expected), 'pending');
  assert.equal(compareHash(null, parseExpected('not a checksum')), 'pending');
  assert.equal(compareHash(ABC, { state: 'empty', hex: null, code: null }), 'not-provided');
  assert.equal(compareHash(ABC, { state: 'invalid', hex: null, code: 'EXPECTED_FORMAT' }), 'invalid');
  assert.equal(compareHash(ABC, expected), 'match');
  assert.equal(compareHash(ABC, { state: 'valid', hex: '0'.repeat(64), code: null }), 'mismatch');
  for (const hash of [ABC.toUpperCase(), ABC.slice(1), `${ABC}0`, '', undefined, 64, {}, null]) {
    if (hash !== null) assert.throws(() => compareHash(hash, expected), errorCode('HASH_FORMAT'));
    assert.throws(() => serializeHash(hash), errorCode('HASH_FORMAT'));
  }
  for (const malformed of [null, {}, { ...expected, extra: true }, { ...expected, hex: ABC.toUpperCase() }, { ...expected, state: 'match' }, { state: 'empty', hex: ABC, code: null }, { state: 'invalid', hex: null, code: 'RAW_FAKE_ERROR' }]) {
    assert.throws(() => compareHash(ABC, malformed), errorCode('EXPECTED_FORMAT'));
  }
});

test('serialization is precisely 65 UTF-8 bytes, one LF, no BOM or filename', () => {
  const text = serializeHash(ABC);
  assert.equal(text, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad\n');
  const bytes = Buffer.from(text, 'utf8');
  assert.equal(bytes.length, 65);
  assert.equal(bytes[64], 10);
  assert.equal(bytes.subarray(0, 3).toString(), 'ba7');
  assert.equal((text.match(/\n/g) ?? []).length, 1);
});

test('ProductError exposes only fixed codes even when constructed with a fake raw value', () => {
  const error = new ProductError('FAKE_RAW_EXCEPTION_DO_NOT_RETURN');
  assert.equal(error.code, 'WORKER_PROTOCOL');
  assert.equal(error.message, 'WORKER_PROTOCOL');
  assert.doesNotMatch(error.message, /FAKE_RAW/);
});
