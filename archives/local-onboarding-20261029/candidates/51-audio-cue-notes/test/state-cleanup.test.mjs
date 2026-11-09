import test from 'node:test';
import assert from 'node:assert/strict';
import { Workspace } from '../public/js/workspace.js';
import { AudioController } from '../public/js/audio-controller.js';
import { serializeJson } from '../public/js/core/serialize-json.js';
import { FakeAudio, fakeUrls, audioFile, result, one, fileOf, encode, deferred } from './fixtures.mjs';

function setup() {
  const audio = new FakeAudio();
  const urls = fakeUrls();
  let invalidations = 0;
  const workspace = new Workspace(audio, { urls, discardDownloads: () => { invalidations += 1; } });
  const ready = (seconds = 123.4569) => {
    workspace.selectSource(audioFile()); audio.metadata(seconds);
  };
  const capture = (text = 'Key point', seconds = 12.345) => {
    audio.currentTime = seconds;
    assert.ok(workspace.beginDraft().ok);
    assert.ok(workspace.saveNote(text).ok);
  };
  return { audio, urls, workspace, ready, capture, invalidations: () => invalidations };
}

test('64 MiB source inclusive boundary; oversized rejected before URL or state change', () => {
  const s = setup();
  assert.ok(s.workspace.selectSource(audioFile(67108864)).ok);
  assert.equal(s.urls.created.length, 1);
  s.audio.metadata(); s.capture();
  const before = structuredClone(s.workspace.result);
  const url = s.workspace.audio.url;
  s.audio.calls = [];
  assert.equal(s.workspace.selectSource(audioFile(67108865)).error, 'AUDIO_TOO_LARGE');
  assert.deepEqual(s.workspace.result, before);
  assert.equal(s.workspace.audio.url, url);
  assert.equal(s.urls.created.length, 1);
  assert.deepEqual(s.audio.calls, []);
});

test('unknown MIME/extension only attempts metadata; no readiness or auto-play claimed', () => {
  const s = setup();
  assert.equal(s.workspace.beginDraft().error, 'BUSY');
  assert.ok(s.workspace.selectSource(audioFile(8, 'fake.unknown', '')).ok);
  assert.equal(s.workspace.loading, true);
  assert.equal(s.workspace.audio.durationMs, null);
  assert.equal(s.audio.autoplay, false);
  assert.equal(s.audio.preload, 'metadata');
  assert.equal(s.audio.calls.includes('play'), false);
  s.audio.emit('error');
  assert.equal(s.workspace.result, null);
  assert.equal(s.workspace.audio.url, null);
  assert.equal(s.workspace.error, 'AUDIO_UNSUPPORTED');
});

test('unrecognized MIME hint does not veto actual metadata decoding; actual error still fails closed', () => {
  const s = setup(); s.audio.support = '';
  assert.ok(s.workspace.selectSource(audioFile(8, 'synthetic.wav', 'audio/not-recognized')).ok);
  assert.equal(s.urls.created.length, 1);
  assert.equal(s.workspace.loading, true);
  s.audio.metadata(3);
  assert.equal(s.workspace.audio.durationMs, 3000);
  assert.equal(s.workspace.loading, false);
  assert.equal(s.workspace.result.durationMs, 3000);
  const failure = setup(); failure.audio.support = '';
  failure.workspace.selectSource(audioFile(8, 'synthetic.wav', 'audio/not-recognized'));
  failure.audio.emit('error');
  assert.equal(failure.workspace.result, null);
  assert.equal(failure.workspace.error, 'AUDIO_UNSUPPORTED');
  assert.equal(failure.workspace.audio.url, null);
  assert.equal(failure.audio.listenerCount, 0);
  assert.equal(failure.urls.revoked.length, 1);
});

test('invalid initial durations fail safely with no fake ready workspace', () => {
  for (const duration of [Infinity, NaN, -1, Number.MAX_SAFE_INTEGER]) {
    const s = setup(); s.workspace.selectSource(audioFile()); s.audio.metadata(duration);
    assert.equal(s.workspace.error, 'AUDIO_DURATION');
    assert.equal(s.workspace.audio.durationMs, null);
    assert.equal(s.workspace.audio.file, null);
    assert.equal(s.audio.listenerCount, 0);
    assert.equal(s.urls.revoked.length, 1);
  }
});

test('R01: established notes and metadata survive playback error/abort/emptied; bad media is fully released', () => {
  for (const event of ['error', 'abort', 'emptied']) {
    const s = setup(); s.ready(); s.capture('keep this note');
    s.workspace.setMetadata('Retain this timeline', '00:03:00.000');
    const original = structuredClone(s.workspace.result);
    const originalBytes = serializeJson(s.workspace.result);
    const url = s.workspace.audio.url;
    s.audio.emit(event);
    assert.deepEqual(s.workspace.result, original, event);
    assert.deepEqual(serializeJson(s.workspace.result), originalBytes, event);
    assert.ok(serializeJson(s.workspace.result) instanceof Uint8Array);
    assert.equal(s.workspace.counter, 2);
    assert.equal(s.workspace.loading, false);
    assert.equal(s.workspace.audio.url, null);
    assert.equal(s.workspace.audio.file, null);
    assert.equal(s.workspace.audio.durationMs, null);
    assert.equal(s.audio.src, '');
    assert.equal(s.audio.listenerCount, 0);
    assert.deepEqual(s.urls.revoked, [url]);
    assert.equal(s.workspace.error, event === 'error' ? 'AUDIO_UNSUPPORTED' : 'AUDIO_ABORTED');
    s.workspace.selectSource(audioFile(8, 'replacement.wav'));
    assert.equal(s.workspace.pending.kind, 'attach');
    s.workspace.confirmSource(true); s.audio.metadata(5);
    assert.deepEqual(s.workspace.result, original, event);
  }
});

test('R01: first-load error/abort never creates a fake successful workspace; initial emptied is not ready', () => {
  for (const event of ['error', 'abort']) {
    const s = setup(); s.workspace.selectSource(audioFile());
    s.audio.emit(event);
    assert.equal(s.workspace.result, null);
    assert.equal(s.workspace.audio.url, null);
    assert.equal(s.audio.listenerCount, 0);
    assert.equal(s.workspace.status, 'failed');
    assert.equal(s.urls.revoked.length, 1);
  }
  const s = setup(); s.workspace.selectSource(audioFile());
  s.audio.emit('emptied');
  assert.equal(s.workspace.loading, true);
  assert.equal(s.workspace.audio.durationMs, null);
  assert.equal(s.workspace.beginDraft().error, 'BUSY');
  s.audio.emit('error');
  assert.equal(s.workspace.result, null);
});

test('metadata duration floors; draft fixed while player moves, cancel excludes draft from exports', () => {
  const s = setup(); s.ready();
  assert.equal(s.workspace.result.durationMs, 123456);
  assert.equal(s.workspace.audio.durationMs, 123456);
  s.audio.currentTime = 12.345;
  s.workspace.beginDraft();
  s.audio.currentTime = 99;
  assert.equal(s.workspace.draft.timeMs, 12345);
  assert.equal(s.workspace.beginDraft().error, 'BUSY');
  assert.equal(JSON.parse(new TextDecoder().decode(serializeJson(s.workspace.result))).notes.length, 0);
  s.workspace.cancelEditor();
  assert.equal(s.workspace.draft, null);
  assert.equal(s.workspace.result.notes.length, 0);
  s.capture();
  assert.deepEqual(s.workspace.result.notes, [one()]);
});

test('source replacement cancel retains same source, notes, draft, position, playback and counter', () => {
  const s = setup(); s.ready(); s.capture();
  s.audio.paused = false;
  s.audio.currentTime = 12.345;
  s.workspace.beginDraft();
  const original = structuredClone(s.workspace.result);
  const url = s.workspace.audio.url;
  s.audio.calls = [];
  assert.ok(s.workspace.selectSource(audioFile(8, 'synthetic.wav')).preview);
  assert.equal(s.urls.created.length, 1);
  s.workspace.cancelPending();
  assert.deepEqual(s.workspace.result, original);
  assert.equal(s.workspace.audio.url, url);
  assert.equal(s.workspace.draft.timeMs, 12345);
  assert.equal(s.audio.currentTime, 12.345);
  assert.equal(s.audio.paused, false);
  assert.equal(s.workspace.counter, 2);
  assert.deepEqual(s.audio.calls, []);
});

test('confirmed source replacement releases old URL once; failed new source cannot revive old notes', () => {
  const s = setup(); s.ready(); s.capture();
  const old = s.workspace.audio.url;
  s.workspace.selectSource(audioFile(8, 'next.wav'));
  s.workspace.confirmSource();
  assert.equal(s.workspace.loading, true);
  assert.deepEqual(s.workspace.result.notes, []);
  assert.equal(s.workspace.result.sourceTitle, 'next.wav');
  assert.equal(s.urls.revoked.filter(url => url === old).length, 1);
  assert.ok(s.audio.calls.includes('pause'));
  assert.ok(s.audio.calls.includes('remove:src'));
  s.audio.emit('error');
  assert.equal(s.workspace.result, null);
  assert.equal(s.workspace.error, 'AUDIO_UNSUPPORTED');
  assert.equal(s.audio.src, '');
  assert.equal(s.audio.listenerCount, 0);
  assert.equal(s.urls.revoked.length, 2);
});

test('import preview and cancel never replace existing notes or seek/pause media', async () => {
  const s = setup(); s.ready(); s.capture();
  const current = structuredClone(s.workspace.result);
  const incoming = result([one('new', 1000, 'note-000042')], 2000, 'Imported');
  s.audio.calls = [];
  await s.workspace.previewImport(fileOf(encode(incoming)));
  assert.equal(s.workspace.pending.kind, 'import');
  assert.equal(s.workspace.pending.result.durationMs, 2000);
  assert.equal(s.workspace.audio.durationMs, 123456);
  assert.deepEqual(s.workspace.result, current);
  s.workspace.cancelPending();
  assert.deepEqual(s.workspace.result, current);
  assert.equal(s.audio.currentTime, 12.345);
  assert.deepEqual(s.audio.calls, []);
});

test('confirmed import retains media but authoritative timeline, order and next ID come from JSON', async () => {
  const s = setup(); s.ready(2);
  s.audio.currentTime = 1;
  const url = s.workspace.audio.url;
  const incoming = result([one('outside', 3000, 'note-000042'), one('inside', 1000, 'note-000010')], 4000, 'Imported');
  await s.workspace.previewImport(fileOf(encode(incoming)));
  s.workspace.confirmImport();
  assert.deepEqual(s.workspace.result, incoming);
  assert.equal(s.workspace.audio.url, url);
  assert.equal(s.workspace.audio.durationMs, 2000);
  assert.equal(s.workspace.counter, 43);
  assert.equal(s.workspace.seek('note-000042').error, 'SEEK_RANGE');
  assert.ok(s.workspace.seek('note-000010').ok);
  assert.equal(s.audio.currentTime, 1);
  assert.equal(s.audio.calls.includes('play'), false);
  s.capture('after import', 1.5);
  assert.equal(s.workspace.result.notes[2].noteId, 'note-000043');
});

test('import-only notes can export; attach retaining metadata or cancel, with failed attach preserving notes', async () => {
  const s = setup();
  const incoming = result([one('restored', 3000, 'note-000042')], 4000, 'Imported');
  await s.workspace.previewImport(fileOf(encode(incoming))); s.workspace.confirmImport();
  assert.equal(s.workspace.beginDraft().error, 'AUDIO_TIME');
  assert.ok(serializeJson(s.workspace.result) instanceof Uint8Array);
  s.workspace.selectSource(audioFile());
  assert.equal(s.workspace.pending.kind, 'attach');
  s.workspace.cancelPending();
  assert.deepEqual(s.workspace.result, incoming);
  assert.equal(s.urls.created.length, 0);
  s.workspace.selectSource(audioFile()); s.workspace.confirmSource(true); s.audio.metadata(2);
  assert.deepEqual(s.workspace.result, incoming);
  assert.equal(s.workspace.audio.durationMs, 2000);
  assert.equal(s.workspace.seek('note-000042').error, 'SEEK_RANGE');
  // Remove via cleanup and re-import to exercise failure of a retained attach.
  s.workspace.reset();
  await s.workspace.previewImport(fileOf(encode(incoming))); s.workspace.confirmImport();
  s.workspace.selectSource(audioFile()); s.workspace.confirmSource(true); s.audio.emit('error');
  assert.deepEqual(s.workspace.result, incoming);
  assert.equal(s.workspace.audio.url, null);
});

test('clear-and-start-new from imported-only workspace rebuilds title, duration and counter', async () => {
  const s = setup();
  await s.workspace.previewImport(fileOf(encode(result([one('restored', 0, 'note-000042')]))));
  s.workspace.confirmImport();
  s.workspace.selectSource(audioFile()); s.workspace.confirmSource(false); s.audio.metadata(4.9999);
  assert.deepEqual(s.workspace.result.notes, []);
  assert.equal(s.workspace.result.sourceTitle, 'synthetic.wav');
  assert.equal(s.workspace.result.durationMs, 4999);
  assert.equal(s.workspace.counter, 1);
});

test('metadata bound, explicit adopt duration, deletion and edits preserve monotonic ID counter', () => {
  const s = setup(); s.ready(20);
  assert.ok(s.workspace.setMetadata('Edited', '00:00:10.000').ok);
  s.audio.currentTime = 12.345;
  assert.equal(s.workspace.beginDraft().error, 'DURATION_RANGE');
  assert.equal(s.workspace.result.durationMs, 10000);
  assert.ok(s.workspace.adoptDuration().ok);
  s.capture('A');
  assert.equal(s.workspace.setMetadata('Edited', '00:00:01.000').error, 'DURATION_RANGE');
  assert.equal(s.workspace.result.durationMs, 20000);
  s.workspace.beginEdit('note-000001');
  assert.equal(s.workspace.saveNote('x'.repeat(2001)).error, 'NOTE_TOO_LONG');
  assert.equal(s.workspace.result.notes[0].text, 'A');
  s.workspace.saveNote('B');
  s.workspace.deleteNote('note-000001');
  s.capture('C');
  assert.equal(s.workspace.result.notes[0].noteId, 'note-000002');
});

test('max imported ID rejects add with exact code without mutation or collision', async () => {
  const s = setup(); s.ready();
  const incoming = result([one('last ID', 0, 'note-999999999999')]);
  await s.workspace.previewImport(fileOf(encode(incoming))); s.workspace.confirmImport();
  assert.equal(s.workspace.counter, 1000000000000);
  assert.equal(s.workspace.beginDraft().error, 'NOTE_ID_EXHAUSTED');
  assert.deepEqual(s.workspace.result, incoming);
});

test('reset/pagehide cleanup discards pending source/file/draft/notes and revokes exactly once', () => {
  const s = setup(); s.ready(); s.capture();
  s.workspace.beginDraft();
  s.workspace.selectSource(audioFile());
  s.workspace.reset(); s.workspace.reset();
  assert.equal(s.workspace.result, null);
  assert.equal(s.workspace.pending, null);
  assert.equal(s.workspace.draft, null);
  assert.equal(s.workspace.audio.file, null);
  assert.equal(s.workspace.audio.url, null);
  assert.equal(s.audio.src, '');
  assert.equal(s.audio.listenerCount, 0);
  assert.equal(s.urls.revoked.length, 1);
  assert.ok(s.invalidations() >= 3);
});

test('stale media metadata/error handlers cannot resurrect a released or replaced source', () => {
  const audio = new FakeAudio(); const urls = fakeUrls(); const reports = [];
  const controller = new AudioController(audio, { onReady: ms => reports.push(ms), onError: code => reports.push(code) }, urls);
  controller.load(audioFile());
  const metadata = [...audio.listeners.get('loadedmetadata')][0];
  const error = [...audio.listeners.get('error')][0];
  controller.release(); controller.load(audioFile(8, 'new.wav'));
  metadata(); error();
  assert.deepEqual(reports, []);
  assert.equal(controller.file.name, 'new.wav');
  audio.metadata(2);
  assert.deepEqual(reports, [2000]);
});

test('cancel, reset, new import or source change ignores delayed import completion', async () => {
  for (const operation of ['cancel', 'reset', 'new-import', 'source']) {
    const s = setup();
    const pending = deferred();
    const old = s.workspace.previewImport({ size: 12, arrayBuffer: () => pending.promise });
    if (operation === 'cancel') s.workspace.cancelPending();
    if (operation === 'reset') s.workspace.reset();
    if (operation === 'new-import') await s.workspace.previewImport(fileOf(encode(result([], 0, 'New'))));
    if (operation === 'source') { s.workspace.selectSource(audioFile()); s.audio.metadata(3); }
    pending.resolve(encode(result([], 0, 'Stale')).buffer);
    assert.deepEqual(await old, { stale: true });
    assert.notEqual(s.workspace.pending?.result?.sourceTitle, 'Stale');
    assert.notEqual(s.workspace.result?.sourceTitle, 'Stale');
  }
});

test('failed/oversized import keeps existing workspace; oversized file is never read', async () => {
  const s = setup(); s.ready(); s.capture();
  const before = structuredClone(s.workspace.result);
  let reads = 0;
  assert.equal((await s.workspace.previewImport({ size: 4194305, arrayBuffer: () => { reads += 1; } })).error, 'IMPORT_TOO_LARGE');
  assert.equal(reads, 0);
  assert.equal((await s.workspace.previewImport(fileOf(encode('{')))).error, 'IMPORT_JSON');
  assert.deepEqual(s.workspace.result, before);
  const read = await s.workspace.previewImport({ size: 1, arrayBuffer: async () => { throw new Error('synthetic failure'); } });
  assert.equal(read.error, 'IMPORT_READ');
  assert.deepEqual(s.workspace.result, before);
});

test('clear confirmation cancellation leaves loading job valid; confirm invalidates late metadata', () => {
  const s = setup(); s.workspace.selectSource(audioFile());
  s.workspace.requestClear(); s.workspace.cancelPending(); s.audio.metadata(3);
  assert.equal(s.workspace.result.durationMs, 3000);
  s.workspace.requestClear();
  assert.equal(s.workspace.pending.kind, 'clear');
  s.workspace.reset(); s.audio.emit('loadedmetadata');
  assert.equal(s.workspace.result, null);
});
