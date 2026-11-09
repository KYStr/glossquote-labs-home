import { parseManifest, validateSelectedManifest, totalAssetBytes } from '/js/core/manifest.mjs';
import { scoreSpeech, aggregateScores } from './scoring.mjs';

// Test harness only. No user file input, upload, console transcript or persistent result storage.
const ids = ['load', 'quality', 'cancellations', 'offline', 'cold', 'fault', 'dispose', 'status', 'transcript', 'report', 'asset-size'];
const controls = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
const report = { scope: 'T02-synthetic-only', startedAt: new Date().toISOString(), browser: { userAgent: navigator.userAgent }, modelReady: false, loads: [], inferences: [], rounds: [], cancellations: [], failures: [], events: [], maximumHeartbeatDelayMs: 0, maximumActiveHeartbeatDelayMs: 0, heartbeatSamples: 0, unexpectedMessages: 0, acceptedLateResults: 0 };
let worker, pending, bootPending, manifest, fixtures;
let jobId = 0, busy = false, phase = 'idle', cancelPlan;
let lastHeartbeat = performance.now();
const memoryProbeMode = ['#u19-memory-baseline', '#u19-memory-trace'].includes(location.hash) ? location.hash.slice(1) : undefined;
if (memoryProbeMode) report.memoryProbe = { mode: memoryProbeMode, diagnosticOnly: true, finished: false, phases: [] };
let pageReadDiagnostics, pageReadId = 0;
const pageReadReceipts = new Map();
const fixtureSamples = new Map();
const heartbeat = setInterval(() => {
  const now = performance.now(), delay = Math.max(0, now - lastHeartbeat - 100);
  report.maximumHeartbeatDelayMs = Math.max(report.maximumHeartbeatDelayMs, delay);
  if (['download', 'initializing', 'inference'].includes(phase)) report.maximumActiveHeartbeatDelayMs = Math.max(report.maximumActiveHeartbeatDelayMs, delay);
  report.heartbeatSamples += 1; lastHeartbeat = now;
}, 100);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function mark(name, details = {}) { report.events.push({ name, at: new Date().toISOString(), pageMs: performance.now(), ...details }); }
function setPhase(next) { phase = next; mark(next); render(); }
function resources() {
  return performance.getEntriesByType('resource').slice(0, 256).map(entry => {
    const url = new URL(entry.name);
    return { url: url.origin + url.pathname, queryPresent: Boolean(url.search), initiatorType: entry.initiatorType, transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize, decodedBodySize: entry.decodedBodySize };
  });
}
function render() {
  report.phase = phase; report.pageResources = resources(); report.visibility = document.visibilityState;
  controls.report.textContent = JSON.stringify(report, null, 2);
  controls.load.disabled = busy || report.modelReady || !manifest;
  for (const id of ['quality', 'offline']) controls[id].disabled = busy || !report.modelReady;
  for (const id of ['cancellations', 'cold', 'fault']) controls[id].disabled = busy || !manifest;
}
function dispose(reason = 'disposed') {
  jobId += 1; clearTimeout(pending?.timer); clearTimeout(cancelPlan?.timer);
  worker?.terminate(); worker = undefined; report.modelReady = false;
  const previous = pending; pending = undefined; previous?.reject(new Error(reason));
  bootPending?.reject(new Error(reason)); bootPending = undefined;
  mark('worker-terminated', { reason }); phase = 'idle'; render();
}
function settle(error, message) {
  if (!pending) return;
  const previous = pending; pending = undefined; clearTimeout(previous.timer);
  error ? previous.reject(new Error(error)) : previous.resolve(message);
}
function armTimeout(ms, code) {
  clearTimeout(pending?.timer);
  pending.timer = setTimeout(() => { settle(code); dispose(code); }, ms);
}
function scheduleCancel(targetPhase) {
  if (!cancelPlan || cancelPlan.phase !== targetPhase || cancelPlan.timer) return;
  const plan = cancelPlan;
  plan.timer = setTimeout(() => {
    if (cancelPlan !== plan || phase !== targetPhase || !pending) return;
    const pressed = performance.now(); const pendingPhase = phase;
    dispose('CANCELLED'); controls.status.textContent = 'Cancelled';
    plan.observation = { phase: pendingPhase, triggerAt: new Date().toISOString(), uiUpdateMs: performance.now() - pressed, workerTerminated: worker === undefined, modelReady: report.modelReady, acceptedLateResults: report.acceptedLateResults };
    render();
  }, 50);
}
async function createWorker() {
  if (worker) return;
  const current = new Worker(memoryProbeMode === 'u19-memory-trace' ? '/spike/u19-memory-entry.worker.mjs' : '/js/transcribe.worker.mjs', { type: 'module' }); worker = current;
  const boot = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('WORKER_BOOT_TIMEOUT')), 10000);
    bootPending = { resolve: () => { clearTimeout(timeout); resolve(); }, reject: error => { clearTimeout(timeout); reject(error); } };
  });
  current.addEventListener('error', () => { bootPending?.reject(new Error('WORKER_FAILED')); bootPending = undefined; settle('WORKER_FAILED'); });
  current.addEventListener('message', event => {
    const message = event.data;
    if (current !== worker) { report.unexpectedMessages += 1; return; }
    if (memoryProbeMode === 'u19-memory-trace' && message?.type === 'u19-memory-phase') {
      if (report.memoryProbe.phases.length > 512) { report.memoryProbe.overflow = true; return; }
      report.memoryProbe.phases.push(message); return;
    }
    if (message?.type === 'boot' && message.jobId === 0) { bootPending?.resolve(); bootPending = undefined; mark('worker-booted'); return; }
    if (!message || message.jobId !== jobId || !pending) { report.unexpectedMessages += 1; return; }
    if (message.type === 'progress') { controls.status.textContent = `Verifying ${message.loaded}/${message.total} bytes`; }
    else if (message.type === 'stage' && message.stage === 'initializing') {
      setPhase('initializing'); controls.status.textContent = 'Initializing single-thread WASM'; armTimeout(120000, 'MODEL_INIT_TIMEOUT'); scheduleCancel('initializing');
    } else if (['ready', 'result', 'empty'].includes(message.type)) {
      if (message.type === 'ready') report.modelReady = true;
      settle(undefined, message); phase = 'idle';
    } else if (message.type === 'error') { settle(message.code); phase = 'idle'; }
    else report.unexpectedMessages += 1;
  });
  await boot;
}
function send(message, transfer, timeout, code) {
  if (pending) throw new Error('SPIKE_BUSY');
  jobId += 1;
  const promise = new Promise((resolve, reject) => { pending = { resolve, reject }; armTimeout(timeout, code); });
  worker.postMessage({ ...message, jobId }, transfer); return promise;
}
async function load() {
  await createWorker(); setPhase('download'); controls.status.textContent = 'Downloading fixed local assets';
  const promise = send({ type: 'load', manifest }, [], 180000, 'MODEL_DOWNLOAD_TIMEOUT'); scheduleCancel('download');
  const message = await promise;
  report.loads.push({ at: new Date().toISOString(), loadedBytes: message.loadedBytes, downloadMs: message.downloadMs, integrityMs: message.integrityMs, initMs: message.initMs, assetReads: message.assetReads, ...(report.loads.length === 0 ? { resources: message.resources } : { resourceCount: message.resources.length }), pass: message.downloadMs <= 180000 && message.initMs <= 120000 });
  mark('model-ready', { loadIndex: report.loads.length });
  controls.status.textContent = 'Model ready'; render(); return message;
}
async function getBytes(assetPath, cap, ordinal) {
  const receipt = pageReadDiagnostics?.createReadReceipt({ scopeCode: 2, ordinal, readId: ++pageReadId, expectedBytes: cap });
  if (receipt) pageReadReceipts.set(ordinal, receipt);
  const events = pageReadDiagnostics?.READ_EVENT, reasons = pageReadDiagnostics?.READ_REASON;
  let response, size = 0, completed = false, reasonCode = 0;
  const snapshot = () => ({ receivedBytes: size, readerLocked: Number(Boolean(response?.body?.locked)), lockObserved: 1 });
  try {
    response = await fetch(assetPath, { credentials: 'omit', redirect: 'error', cache: 'no-store' });
    if (response.status !== 200 || !response.body) { reasonCode = reasons?.RESPONSE_REJECTED ?? 0; throw new Error('FIXTURE_OR_MANIFEST_UNAVAILABLE'); }
    const reader = response.body.getReader(), buffer = new Uint8Array(cap);
    receipt?.record(events.READER_ACQUIRED, snapshot());
    for (;;) {
      const { done, value } = await reader.read();
      if (done) { receipt?.record(events.EOF, { ...snapshot(), eof: 1 }); break; }
      if (size + value.byteLength > cap) { reasonCode = reasons?.SIZE_CAP ?? 0; receipt?.record(events.CANCEL_CALLED, { ...snapshot(), reasonCode }); await reader.cancel(); throw new Error('FIXTURE_OR_MANIFEST_TOO_LARGE'); }
      buffer.set(value, size); size += value.byteLength; receipt?.update({ receivedBytes: size });
    }
    completed = true; return buffer.subarray(0, size);
  } catch (error) {
    receipt?.record(events.ERROR, { ...snapshot(), outcomeCode: 2, reasonCode: reasonCode || reasons.READ_ERROR }); throw error;
  } finally {
    // Observe the current lock without releasing or cancelling a successful read.
    receipt?.record(events.FINISH, { ...snapshot(), outcomeCode: completed ? 1 : 2, reasonCode: reasonCode || (completed ? 0 : reasons.READ_ERROR) });
  }
}
function fixturePcm(bytes) {
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), four = offset => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  if (bytes.byteLength < 44 || four(0) !== 'RIFF' || four(8) !== 'WAVE' || data.getUint32(4, true) + 8 !== bytes.byteLength) throw new Error('FIXTURE_WAV_INVALID');
  let offset = 12, fmt, pcm, chunks = 0;
  while (offset < bytes.byteLength) {
    if (++chunks > 128 || offset + 8 > bytes.byteLength) throw new Error('FIXTURE_WAV_INVALID');
    const name = four(offset), size = data.getUint32(offset + 4, true), content = offset + 8;
    if (content + size > bytes.byteLength) throw new Error('FIXTURE_WAV_INVALID');
    if (name === 'fmt ') {
      if (fmt || size < 16 || data.getUint16(content, true) !== 1 || data.getUint16(content + 2, true) !== 1 || data.getUint32(content + 4, true) !== 16000 || data.getUint32(content + 8, true) !== 32000 || data.getUint16(content + 12, true) !== 2 || data.getUint16(content + 14, true) !== 16) throw new Error('FIXTURE_WAV_INVALID');
      fmt = true;
    } else if (name === 'data') {
      if (pcm || !size || size % 2 || size > 960000) throw new Error('FIXTURE_WAV_INVALID'); pcm = { offset: content, size };
    }
    offset = content + size + size % 2;
  }
  if (!fmt || !pcm || offset !== bytes.byteLength) throw new Error('FIXTURE_WAV_INVALID');
  const samples = new Float32Array(pcm.size / 2);
  for (let index = 0; index < samples.length; index += 1) samples[index] = data.getInt16(pcm.offset + index * 2, true) / 32768;
  return samples;
}
async function transcribe(id, label) {
  const item = fixtures.cases.find(entry => entry.id === id), samples = fixtureSamples.get(id)?.slice();
  if (!item || !samples || !report.modelReady) throw new Error('FIXTURE_NOT_READY');
  setPhase('inference'); controls.status.textContent = `${label}: ${id}`;
  const started = performance.now();
  const promise = send({ type: 'transcribe', language: item.language, audioBuffer: samples.buffer }, [samples.buffer], 180000, 'TRANSCRIBE_TIMEOUT'); scheduleCancel('inference');
  const message = await promise;
  const observed = { label, id, reference: item.reference, actual: message.text, durationSeconds: item.durationSeconds, inferenceMs: message.inferenceMs, wallMs: performance.now() - started, modelCalls: message.modelCalls, type: message.type, resourceCount: message.resources?.length, assetReadCount: Object.values(message.assetReads.reads).reduce((sum, value) => sum + value, 0), blockedReadCount: message.assetReads.blockedReads };
  if (item.reference) observed.score = scoreSpeech(item.reference, message.text, item.language);
  report.inferences.push(observed); report.lastWorkerResources = message.resources;
  controls.transcript.textContent = message.text || '(empty)'; mark('inference-complete', { label, id }); render(); return observed;
}
async function storageEvidence() {
  // Clean loopback test origin, synthetic fixtures only. Do not open database contents.
  const canaries = [...fixtures.cases.map(item => item.reference), ...report.inferences.map(item => item.actual)].filter(value => value.length > 8);
  const inspect = storage => ({ count: storage.length, keys: Object.keys(storage), syntheticTextFound: Object.keys(storage).some(key => canaries.some(text => storage.getItem(key)?.includes(text))), syntheticAudioMarkerFound: Object.keys(storage).some(key => /(?:data:audio|audioBuffer|RIFF.{0,8}WAVE)/u.test(storage.getItem(key) || '')) });
  report.storage = { localStorage: inspect(localStorage), sessionStorage: inspect(sessionStorage), cacheNames: await caches.keys(), indexedDBNames: indexedDB.databases ? (await indexedDB.databases()).map(item => item.name) : 'unavailable', serviceWorkers: (await navigator.serviceWorker.getRegistrations()).length };
}
async function run(action) {
  if (busy) return; busy = true; delete report.error; render();
  try { await action(); await storageEvidence(); }
  catch (error) { report.error = error.message; controls.status.textContent = error.message; if (memoryProbeMode) controls.status.dataset.u19ProbeState = 'failed'; dispose(error.message); }
  finally { busy = false; render(); }
}
controls.load.addEventListener('click', () => run(async () => {
  await load(); controls.status.textContent = 'Model ready; 10 second memory baseline'; render(); await sleep(10000); mark('loaded-baseline-end'); controls.status.textContent = 'Model ready';
  if (memoryProbeMode) {
    await sleep(13000); mark('u19-first-zh-01-start');
    await transcribe('zh-01', 'u19-first-zh-01');
    mark('u19-first-zh-01-end'); await sleep(5000); mark('u19-post-inference-rest-end');
    dispose('u19-memory-clear'); controls.status.textContent = 'U19 short probe cleared; 30 second observation'; render();
    await sleep(30000); mark('u19-clear-plus-30-seconds'); report.memoryProbe.finished = true;
    controls.status.dataset.u19ProbeState = 'finished';
    controls.status.textContent = 'U19 first zh-01 diagnostic finished; full T02 remains unverified';
  }
}));
controls.quality.addEventListener('click', () => run(async () => {
  mark('quality-start');
  for (let round = 1; round <= 3; round += 1) {
    const values = []; mark('round-start', { round });
    for (const item of fixtures.cases.filter(item => item.id !== 'silence-30')) values.push(await transcribe(item.id, `round-${round}`));
    const scores = Object.fromEntries(['chinese', 'english'].map(language => [language, aggregateScores(values.filter(value => value.id.startsWith(language === 'chinese' ? 'zh-' : 'en-') && !value.id.endsWith('-30')).map(value => value.score))]));
    report.rounds.push({ round, scores, maxThirtySecondInferenceMs: Math.max(...values.filter(value => value.id.endsWith('-30')).map(value => value.inferenceMs)), pass: Object.values(scores).every(value => value.pass) && values.every(value => value.inferenceMs <= 180000) });
    mark('round-end', { round }); controls.status.textContent = `Round ${round} complete; 10 second memory observation`; render(); await sleep(10000); mark('round-rest-end', { round });
  }
  const silence = await transcribe('silence-30', 'silence'); report.silencePass = silence.modelCalls === 0 && silence.actual === '';
  mark('quality-complete'); dispose('quality-clear'); controls.status.textContent = 'Worker cleared; observing memory for 30 seconds'; render();
  await sleep(30000); mark('clear-plus-30-seconds'); report.qualityFinished = true;
  controls.status.textContent = 'Three rounds finished; inspect actual gates';
}));
controls.cancellations.addEventListener('click', () => run(async () => {
  for (const targetPhase of ['download', 'initializing', 'inference']) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      dispose('cancel-case-reset');
      if (targetPhase === 'inference') await load();
      cancelPlan = { phase: targetPhase }; const plan = cancelPlan;
      try { targetPhase === 'inference' ? await transcribe('en-30', 'cancel-case') : await load(); throw new Error('CANCEL_DID_NOT_INTERRUPT'); }
      catch (error) { if (error.message !== 'CANCELLED') throw error; }
      cancelPlan = undefined; await sleep(300);
      const lateBeforeRetry = report.acceptedLateResults;
      await load(); const retry = await transcribe('en-01', 'cancel-retry');
      report.cancellations.push({ targetPhase, attempt, ...plan.observation, lateBeforeRetry, retryResult: retry.actual, retryModelCalls: retry.modelCalls, pass: plan.observation?.uiUpdateMs < 1000 && plan.observation.workerTerminated && !plan.observation.modelReady && lateBeforeRetry === 0 && retry.modelCalls === 1 });
      render();
    }
  }
  dispose('cancellation-suite-clear'); report.cancellationsFinished = true; controls.status.textContent = 'Nine cancellation cases finished';
}));
controls.offline.addEventListener('click', () => run(async () => {
  mark('offline-inference-start'); const before = report.inferences.length;
  await transcribe('en-30', 'offline'); await transcribe('zh-30', 'offline');
  report.loadedOffline = { completed: report.inferences.length - before, serverConnectionRefused: null, networkCondition: 'Operator must stop the task-owned loopback server; corroborate the unavailable origin in external evidence' };
  mark('offline-inference-end'); controls.status.textContent = 'Offline inferences complete';
}));
controls.cold.addEventListener('click', () => run(async () => { dispose('offline-cold-prepare'); await createWorker(); mark('unloaded-worker-booted'); report.coldWorkerPrepared = true; controls.status.textContent = 'Unloaded worker booted; stop own server before testing cold load'; }));
controls.fault.addEventListener('click', () => run(async () => {
  if (!report.coldWorkerPrepared) dispose('fault-test-reset');
  delete report.coldWorkerPrepared; let failure;
  try { await load(); } catch (error) { failure = error.message; }
  report.failures.push({ at: new Date().toISOString(), code: failure || 'UNEXPECTED_LOAD_SUCCESS', inferenceCalls: 0, failedBeforeInference: Boolean(failure) && !report.modelReady });
  dispose('fault-test-clear'); controls.status.textContent = failure || 'Unexpected load success';
}));
controls.dispose.addEventListener('click', () => { dispose('manual-clear'); busy = false; controls.status.textContent = 'Worker disposed'; render(); });
window.addEventListener('pagehide', () => { clearInterval(heartbeat); dispose('pagehide'); });
document.addEventListener('visibilitychange', () => { mark('visibility', { state: document.visibilityState }); render(); });

try {
  if (memoryProbeMode === 'u19-memory-trace') {
    pageReadDiagnostics = await import('/js/core/memory-phases.mjs');
    report.memoryProbe.readReceipts = [];
    pageReadDiagnostics.enableMemoryTrace(record => report.memoryProbe.readReceipts.push(record));
  }
  performance.setResourceTimingBufferSize(256);
  if (navigator.userAgentData?.getHighEntropyValues) report.browser.details = await navigator.userAgentData.getHighEntropyValues(['fullVersionList', 'platformVersion', 'architecture', 'bitness']);
  manifest = validateSelectedManifest(parseManifest(new TextDecoder().decode(await getBytes('/model-manifest.json', 64 * 1024, 1))));
  fixtures = JSON.parse(new TextDecoder().decode(await getBytes('/fixtures/generated/t02-v1/quality-speech.json', 64 * 1024, 2)));
  if (fixtures.mode !== 't02-quality-v1' || !fixtures.syntheticOnly || !Array.isArray(fixtures.cases) || fixtures.cases.length !== 13) throw new Error('FIXTURE_INVALID');
  for (const [index, item] of fixtures.cases.entries()) {
    if (!/^(?:zh|en)-(?:0[1-5]|30)$|^silence-30$/u.test(item.id) || item.path !== `/fixtures/generated/t02-v1/${item.id}.wav` || !Number.isSafeInteger(item.bytes) || item.bytes > 1000000 || !/^[a-f\d]{64}$/u.test(item.sha256)) throw new Error('FIXTURE_INVALID');
    const ordinal = index + 3, bytes = await getBytes(item.path, item.bytes, ordinal);
    let digest;
    try { digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join(''); }
    catch (error) { pageReadReceipts.get(ordinal)?.record(pageReadDiagnostics.READ_EVENT.ERROR, { outcomeCode: 2, reasonCode: pageReadDiagnostics.READ_REASON.READ_ERROR }); throw error; }
    pageReadReceipts.get(ordinal)?.record(pageReadDiagnostics.READ_EVENT.HASH_RESULT, { hashChecked: 1, hashOk: Number(bytes.length === item.bytes && digest === item.sha256), reasonCode: bytes.length === item.bytes && digest === item.sha256 ? 0 : pageReadDiagnostics.READ_REASON.HASH_MISMATCH });
    if (bytes.length !== item.bytes || digest !== item.sha256) throw new Error('FIXTURE_INTEGRITY_FAILED');
    const samples = fixturePcm(bytes);
    if (samples.length / 16000 !== item.durationSeconds) throw new Error('FIXTURE_DURATION_INVALID');
    fixtureSamples.set(item.id, samples);
  }
  report.model = { modelId: manifest.modelId, revision: manifest.revision, runtimeVersion: manifest.runtimeVersion, dtype: manifest.dtype, bytes: totalAssetBytes(manifest), largestFileBytes: Math.max(...manifest.files.map(file => file.bytes)) };
  report.fixtures = fixtures;
  controls['asset-size'].textContent = `${totalAssetBytes(manifest).toLocaleString('en-US')} verified asset bytes, same-origin only. Synthetic fixtures are prefetched before inference.`;
  mark('preflight-complete'); await storageEvidence(); controls.status.textContent = 'Idle; acquire measurement lock before loading'; if (memoryProbeMode) controls.status.dataset.u19ProbeState = 'ready'; render();
} catch (error) { report.error = error.message; controls.status.textContent = 'SPIKE_PREFLIGHT_FAILED'; if (memoryProbeMode) controls.status.dataset.u19ProbeState = 'failed'; render(); }
