// 受控資源測試不冒充真音訊解碼、下載或 BFCache。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudioSession, createDownloads } from '../public/resources.mjs';
function fake() {
  const audios = [], revoked = [], timers = new Map(), downloads = [], blobs = [];
  let id = 0;
  const env = {
    createAudio() { const listeners = new Map(); const audio = { duration: 5, pauses: 0, loads: 0, addEventListener(k, fn) { listeners.set(k, fn); }, removeEventListener(k) { listeners.delete(k); }, removeAttribute() {}, pause() { this.pauses++; }, load() { this.loads++; }, emit(k) { listeners.get(k)?.(); }, handler(k) { return listeners.get(k); } }; audios.push(audio); return audio; },
    createObjectURL(blob) { blobs.push(blob); return 'blob:' + (++id); }, revokeObjectURL(url) { revoked.push(url); },
    setTimeout(fn) { const key = ++id; timers.set(key, fn); return key; }, clearTimeout(key) { timers.delete(key); },
    clickDownload(url, filename) { downloads.push({ url, filename }); },
  };
  return { env, audios, revoked, timers, downloads, blobs };
}
const file = { size: 10, type: 'audio/wav', name: 'private.wav' };
test('audio ready converts duration; clear releases once and cancels timers', () => { const f = fake(), ready = []; const session = createAudioSession(f.env, (...a) => ready.push(a), assert.fail); session.load(file); assert.equal(session.loading, true); f.audios[0].duration = 2.0019; f.audios[0].emit('loadedmetadata'); assert.equal(ready[0][1], 2001); assert.equal(session.audio, f.audios[0]); assert.equal(f.timers.size, 0); session.clear(); session.clear(); assert.equal(session.audio, null); assert.equal(f.revoked.length, 1); });
test('latest candidate owns success/error/timeout even if old handlers fire', () => { const f = fake(), ready = [], errors = []; const session = createAudioSession(f.env, (...a) => ready.push(a), x => errors.push(x)); session.load(file); const oldReady = f.audios[0].handler('loadedmetadata'), oldError = f.audios[0].handler('error'), oldTimer = [...f.timers.values()][0]; session.load(file); oldReady(); oldError(); oldTimer(); assert.equal(ready.length, 0); assert.equal(errors.length, 0); assert.equal(session.loading, true); f.audios[1].emit('loadedmetadata'); assert.equal(ready.length, 1); assert.equal(session.audio, f.audios[1]); assert.equal(f.revoked.length, 1); });
test('failed replacement preserves current audio until new successful replacement', () => { const f = fake(), ready = [], errors = []; const session = createAudioSession(f.env, (...a) => ready.push(a), x => errors.push(x)); session.load(file); f.audios[0].emit('loadedmetadata'); session.load(file); f.audios[1].duration = Infinity; f.audios[1].emit('loadedmetadata'); assert.equal(session.audio, f.audios[0]); assert.deepEqual(errors, ['DURATION']); session.load(file); f.audios[2].emit('loadedmetadata'); assert.equal(session.audio, f.audios[2]); assert.equal(f.revoked.length, 2); });
test('timeout clears only pending and late ready is no-op', () => { const f = fake(), errors = []; const session = createAudioSession(f.env, assert.fail, x => errors.push(x)); session.load(file); const oldReady = f.audios[0].handler('loadedmetadata'); [...f.timers.values()][0](); oldReady(); assert.deepEqual(errors, ['TIMEOUT']); assert.equal(session.loading, false); assert.equal(f.revoked.length, 1); });
test('clear during pending fences all late events', () => { const f = fake(); const session = createAudioSession(f.env, assert.fail, assert.fail); session.load(file); const ready = f.audios[0].handler('loadedmetadata'), error = f.audios[0].handler('error'), timer = [...f.timers.values()][0]; session.clear(); ready(); error(); timer(); assert.equal(f.revoked.length, 1); assert.equal(f.timers.size, 0); });
test('cancel pending preserves current and prevents superseded readiness', () => { const f = fake(), ready = []; const session = createAudioSession(f.env, a => ready.push(a), assert.fail); session.load(file); f.audios[0].emit('loadedmetadata'); session.load(file); const late = f.audios[1].handler('loadedmetadata'); session.cancelPending(); late(); assert.equal(ready.length, 1); assert.equal(session.audio, f.audios[0]); assert.equal(session.loading, false); });
test('metadata event cannot commit twice', () => { const f = fake(), ready = []; const session = createAudioSession(f.env, a => ready.push(a), assert.fail); session.load(file); f.audios[0].emit('loadedmetadata'); f.audios[0].emit('loadedmetadata'); assert.equal(ready.length, 1); });
test('runtime audio error reports without discarding saved file', () => { const f = fake(), errors = []; const session = createAudioSession(f.env, () => {}, e => errors.push(e)); session.load(file); f.audios[0].emit('loadedmetadata'); f.audios[0].emit('error'); assert.deepEqual(errors, ['PLAYBACK']); assert.equal(session.audio, f.audios[0]); });
test('download bytes/mime/filename exact, revocation deferred', async () => { const f = fake(), pool = createDownloads(f.env); pool.start('字\nline', 'txt'); assert.equal(f.revoked.length, 0); assert.equal(f.downloads[0].filename, 'glossquote-audio-notes.txt'); assert.equal(f.blobs[0].type, 'text/plain;charset=utf-8'); assert.deepEqual(Buffer.from(await f.blobs[0].arrayBuffer()), Buffer.from('字\nline')); pool.start('{}', 'json'); assert.equal(f.downloads[1].filename, 'glossquote-audio-notes.json'); assert.equal(f.blobs[1].type, 'application/json;charset=utf-8'); });
test('eight downloads cap, independent timers and cleanup', () => { const f = fake(), pool = createDownloads(f.env); for (let i = 0; i < 8; i++) pool.start('a', 'txt'); assert.throws(() => pool.start('a', 'txt'), { message: 'DOWNLOAD_LIMIT' }); [...f.timers.values()][0](); assert.equal(pool.size, 7); pool.start('a', 'txt'); pool.clear(); pool.clear(); assert.equal(pool.size, 0); assert.equal(f.timers.size, 0); assert.equal(f.revoked.length, 9); });
test('download failure cleans resource without success', () => { const f = fake(); f.env.clickDownload = () => { throw new Error('blocked'); }; const pool = createDownloads(f.env); assert.throws(() => pool.start('a', 'txt'), { message: 'DOWNLOAD' }); assert.equal(pool.size, 0); assert.equal(f.revoked.length, 1); assert.equal(f.timers.size, 0); });
test('invalid download type cannot inject filename', () => { const f = fake(), pool = createDownloads(f.env); assert.throws(() => pool.start('a', '../x'), { message: 'EXPORT' }); assert.equal(f.downloads.length, 0); });
test('current playback error cannot surrender newer pending load ownership', () => {
  const f = fake(), ready = [], errors = [];
  let uiLoading = false;
  const session = createAudioSession(f.env, audio => { ready.push(audio); uiLoading = false; }, code => { uiLoading = session.loading; errors.push(code); });
  session.load(file); f.audios[0].emit('loadedmetadata');
  uiLoading = true; session.load(file); f.audios[0].emit('error');
  assert.equal(session.loading, true); assert.equal(uiLoading, true); assert.deepEqual(errors, ['PLAYBACK']);
  f.audios[1].emit('loadedmetadata');
  assert.equal(uiLoading, false); assert.equal(session.audio, f.audios[1]); assert.equal(ready.length, 2);
});
