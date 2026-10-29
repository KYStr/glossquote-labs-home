// 這些是 checkpoint maker 單元案例，並非獨立驗收或瀏覽器驗證。
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAgenda, validateDraft } from '../public/js/core.mjs';
const row = (id, room, start, end, speakers = 'Ada') => ({ id, titleRaw: id, roomRaw: room, speakersRaw: speakers, startRaw: start, endRaw: end });
const draft = rows => ({ dateRaw: '2026-10-28', timeBasisRaw: 'UTC+08:00', roomBufferRaw: '0', speakerBufferRaw: '0', rows });
test('endpoint contact is not overlap when buffers are zero', () => {
  const value = checkAgenda(draft([row('r1','A','09:00','10:00'), row('r2','A','10:00','11:00')]));
  assert.equal(value.ok, true); assert.deepEqual(value.value.conflicts, []);
});
test('cross-room speaker overlap remains overlap, not buffer', () => {
  const d = draft([row('r1','A','09:00','10:00'), row('r2','B','09:30','10:30')]); d.speakerBufferRaw = '10';
  assert.deepEqual(checkAgenda(d).value.conflicts, [{ a: 1, b: 2, reasons: ['SPEAKER_OVERLAP'], overlap: 30, gap: null, speakers: ['Ada'] }]);
});
test('different-room transition checks exact buffer boundary', () => {
  const d = draft([row('r1','A','09:00','10:00'), row('r2','B','10:09','10:30')]); d.speakerBufferRaw = '10';
  assert.deepEqual(checkAgenda(d).value.conflicts[0].reasons, ['SPEAKER_BUFFER']);
  d.rows[1].startRaw = '10:10'; assert.equal(checkAgenda(d).value.conflicts.length, 0);
});
test('overnight is rejected, 24:00 is an end only', () => {
  assert.equal(checkAgenda(draft([row('r1','A','23:00','01:00')])).error.code, 'ORDER');
  assert.equal(checkAgenda(draft([row('r1','A','23:00','24:00')])).ok, true);
  assert.equal(checkAgenda(draft([row('r1','A','24:00','24:00')])).error.code, 'CLOCK');
});
test('ordinary getter is rejected without execution', () => {
  let calls = 0; const d = draft([row('r1','A','09:00','10:00')]);
  Object.defineProperty(d, 'dateRaw', { enumerable: true, get() { calls++; return '2026-10-28'; } });
  assert.equal(validateDraft(d).error.code, 'SCHEMA'); assert.equal(calls, 0);
});
test('exact duplicates are retained with applicable resource conflicts', () => {
  const a = row('r1','A','09:00','10:00'); const b = { ...a, id: 'r2' };
  const r = checkAgenda(draft([a,b])).value;
  assert.equal(r.rows.length, 2); assert.deepEqual(r.conflicts[0].reasons, ['DUPLICATE','ROOM_OVERLAP','SPEAKER_OVERLAP']);
});
test('maximum rows produces all 1770 pairs without truncation', () => {
  const r = checkAgenda(draft(Array.from({length:60},(_,i)=>row(`r${i+1}`,'A','09:00','10:00'))));
  assert.equal(r.ok, true); assert.equal(r.value.conflicts.length,1770);
});
