import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../public/js/session.mjs';
import { projectDraft } from '../public/js/draft.mjs';

const timed = { mode: 'timed', title: 'Fake event', location: '', notes: '', startDate: '2026-10-22', startTime: '09:00', endDate: '2026-10-22', endTime: '10:00', zone: 'Asia/Taipei' };
function fixture(extra = {}) {
  const created = []; const revoked = []; let number = 0; let timestamps = 0;
  const session = createSession({ randomUUID: () => `00000000-0000-4000-8000-${String(++number).padStart(12, '0')}`, now: () => Date.UTC(2026, 9, 22, 0, 0, timestamps++),
    createFileUrl: ics => { created.push(ics); return `blob:offline-${created.length}`; }, revokeFileUrl: url => revoked.push(url), ...extra });
  return { session, created, revoked };
}

test('Offline lifecycle (C20 supplementary): same revision is stable; edit revokes old URL and changes UID/stamp', () => {
  const { session, created, revoked } = fixture();
  const first = session.preview(timed); const repeat = session.preview(timed);
  assert.equal(first.ok, true); assert.equal(first, repeat); assert.equal(created.length, 1);
  assert.equal(first.uid, '00000000-0000-4000-8000-000000000001@glossquote.com'); assert.equal(first.dtstamp, '20261022T000000Z');
  session.invalidate(); assert.deepEqual(revoked, ['blob:offline-1']);
  const next = session.preview({ ...timed, title: 'Changed fake event' });
  assert.equal(next.uid, '00000000-0000-4000-8000-000000000002@glossquote.com'); assert.equal(next.dtstamp, '20261022T000001Z');
  assert.equal(created.length, 2); session.reset(); assert.deepEqual(revoked, ['blob:offline-1', 'blob:offline-2']);
});
test('Invalid/unsupported results revoke a previous result and never retain its ICS or URL', () => {
  const { session, revoked } = fixture(); session.preview(timed);
  const result = session.preview({ ...timed, title: '' });
  assert.equal(result.ok, false); assert.equal(result.ics, undefined); assert.equal(result.url, undefined); assert.equal(result.event, undefined);
  assert.deepEqual(revoked, ['blob:offline-1']);
  const unsupported = session.preview({ ...timed, zone: 'Pacific/Chatham' }); assert.equal(unsupported.status, 'unsupported');
});
test('Download unsupported keeps valid summary and complete ICS; UUID failure keeps summary without a file', () => {
  const noDownload = fixture({ createFileUrl: undefined }).session.preview(timed);
  assert.equal(noDownload.status, 'ready'); assert.equal(noDownload.url, null); assert.ok(noDownload.ics.startsWith('BEGIN:VCALENDAR\r\n')); assert.ok(noDownload.event);
  const thrown = fixture({ createFileUrl: () => { throw Error('fake failure'); } }).session.preview(timed);
  assert.equal(thrown.ok, true); assert.equal(thrown.url, null);
  const cryptoFailure = fixture({ randomUUID: () => { throw Error('private-canary'); } }).session.preview(timed);
  assert.equal(cryptoFailure.status, 'unsupported'); assert.ok(cryptoFailure.event); assert.equal(cryptoFailure.ics, undefined);
  assert.deepEqual(cryptoFailure.errors, [{ code: 'GENERATION_UNAVAILABLE', field: 'form' }]); assert.equal(JSON.stringify(cryptoFailure).includes('private-canary'), false);
});
test('Only blob URLs may become ready download links', () => {
  const { session, revoked } = fixture({ createFileUrl: () => 'https://invalid.example/fake' });
  assert.equal(session.preview(timed).url, null); assert.deepEqual(revoked, ['https://invalid.example/fake']);
});
test('C22 supplementary projection: both drafts survive switching; hidden values never cross active schema', () => {
  const { session, revoked } = fixture();
  const full = { ...timed, startChoice: '', endChoice: '', allStartDate: '2024-02-28', lastDate: '2024-02-29' };
  const original = structuredClone(full);
  const first = session.preview(projectDraft(full)); assert.equal(first.ok, true); assert.equal(first.event.mode, 'timed');
  session.invalidate();
  const all = projectDraft({ ...full, mode: 'all-day', zone: 'invalid hidden zone', startDate: 'invalid hidden date', startTime: 'invalid hidden time' });
  assert.deepEqual(all, { mode: 'all-day', title: 'Fake event', location: '', notes: '', startDate: '2024-02-28', lastDate: '2024-02-29' });
  const second = session.preview(all); assert.equal(second.ok, true); assert.equal(second.event.exclusiveEnd, '2024-03-01');
  session.invalidate();
  const third = session.preview(projectDraft({ ...full, allStartDate: 'invalid hidden date', lastDate: 'also hidden' })); assert.equal(third.ok, true);
  assert.deepEqual(full, original); assert.notEqual(third.uid, first.uid); assert.equal(revoked.length, 2);
  session.reset(); assert.equal(revoked.length, 3);
});
test('C21 supplementary: re-resolved repeated time cannot generate without a new explicit choice', () => {
  const { session } = fixture();
  const repeat = { ...timed, zone: 'America/New_York', startDate: '2026-11-01', startTime: '01:30', endDate: '2026-11-01', endTime: '02:30', startChoice: 'late', endChoice: '' };
  assert.equal(session.preview(repeat).ok, true); session.invalidate();
  const cleared = session.preview({ ...repeat, startTime: '01:45', startChoice: '' });
  assert.equal(cleared.ok, false); assert.equal(cleared.errors[0].code, 'AMBIGUOUS_TIME'); assert.equal(cleared.url, undefined);
});
