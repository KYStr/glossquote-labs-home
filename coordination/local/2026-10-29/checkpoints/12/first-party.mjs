import { createHash } from 'node:crypto';
import { FIXTURE, requireValue } from './evidence.mjs';

export function makeReaderExpression(readerSource) {
  requireValue(typeof readerSource === 'string' && createHash('sha256').update(readerSource).digest('hex') === FIXTURE.readerSha256, 'READER_SOURCE_MISMATCH');
  const expression = `(async () => {
const pageReadDiagnostics = await import('/js/core/memory-phases.mjs');
const receipts = []; let overflow = false;
pageReadDiagnostics.enableMemoryTrace(record => { if (receipts.length >= 128) overflow = true; else receipts.push(record); });
let pageReadId = 0; const pageReadReceipts = new Map();
${readerSource}
let outcome;
try {
  const bytes = await getBytes(${JSON.stringify(FIXTURE.path)}, ${FIXTURE.bytes}, 1);
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('');
  const hashOk = bytes.length === ${FIXTURE.bytes} && digest === ${JSON.stringify(FIXTURE.sha256)};
  pageReadReceipts.get(1)?.record(pageReadDiagnostics.READ_EVENT.HASH_RESULT, { hashChecked: 1, hashOk: Number(hashOk), reasonCode: hashOk ? 0 : pageReadDiagnostics.READ_REASON.HASH_MISMATCH });
  outcome = { outcome: hashOk ? 'SUCCESS' : 'ERROR', receivedBytes: bytes.length, sha256: digest };
} catch (error) {
  const allowed = ['FIXTURE_OR_MANIFEST_UNAVAILABLE', 'FIXTURE_OR_MANIFEST_TOO_LARGE'];
  outcome = { outcome: 'ERROR', code: allowed.includes(error?.message) ? error.message : 'FIRST_PARTY_READ_FAILED' };
} finally { pageReadDiagnostics.disableMemoryTrace(); }
return { ...outcome, receipts, overflow, readerSha256: ${JSON.stringify(FIXTURE.readerSha256)} };
})()`;
  return { expression, sha256: createHash('sha256').update(expression).digest('hex'), bytes: Buffer.byteLength(expression) };
}
