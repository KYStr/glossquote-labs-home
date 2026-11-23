import { FFmpegAdapter } from '/js/ffmpeg-adapter.mjs';
import { validateManifest } from '/js/core/manifest.mjs';
import { fixtureArgs, FIXTURE_KINDS, pcmArgs } from './fixtures.mjs';
import { runUnblockProof } from './unblock.mjs';
import { observeWorkers } from './worker-observer.mjs';

const node = (id) => document.getElementById(id);
performance.setResourceTimingBufferSize(10000);
const report = { schemaVersion: 1, startedAt: new Date().toISOString(), browser: { userAgent: navigator.userAgent }, runtime: null, fixtures: {}, cold: null, warm: [], quality: [], cancellation: [], timeouts: [], offline: null, missingAssets: null, heartbeatMaxDelayMs: 0, network: [], errors: [], processMemory: { status: 'NOT_RUN', reason: 'Requires renderer plus related worker process sampling; JS heap is not a substitute.' }, manualListening: 'NOT_RUN' };
let manifest, adapter, active = false, generation = 0, abort, outputURL;
report.events = []; report.workers = []; report.storage = null; report.origin = location.origin;
const workerObserver = observeWorkers((records) => { report.workers = records; });
const listening = {};
const downloadCancelCase = new URLSearchParams(location.search).get('case') === 'cancel-download';
let downloadCancelRequested = false;
const fixtureData = new Map();
const now = () => performance.now();
const hash = async (bytes) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (value) => value.toString(16).padStart(2, '0')).join('');
function render() {
  report.network = [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')].map((entry) => ({ url: entry.name, initiator: entry.initiatorType, startedAt: new Date(performance.timeOrigin + entry.startTime).toISOString(), durationMs: entry.duration, responseStatus: entry.responseStatus, transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize }));
  node('report').textContent = JSON.stringify(report, null, 2);
}
function state(text) { report.events.push({ at: new Date().toISOString(), elapsedMs: now(), state: text }); node('state').textContent = text; render(); }
function controls() {
  const loaded = adapter && !adapter.disposed;
  node('load').disabled = active;
  node('load').disabled ||= loaded;
  node('fixtures').disabled = active || !loaded;
  node('unblock').disabled = active || !loaded;
  node('retry').disabled = active || !loaded;
  for (const id of ['warm', 'quality', 'cancels', 'offline', 'timeouts']) node(id).disabled = active || !loaded || fixtureData.size !== FIXTURE_KINDS.length;
  node('cancel').disabled = !active;
}
let lastBeat = now();
setInterval(() => {
  const t = now();
  if (active) report.heartbeatMaxDelayMs = Math.max(report.heartbeatMaxDelayMs, t - lastBeat - 100);
  lastBeat = t;
}, 100);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const requireLive = (id) => { if (generation !== id || abort.signal.aborted) throw new Error('JOB_CANCELLED'); };
async function execute(name, action) {
  if (active) return;
  active = true; const id = ++generation; abort = new AbortController(); controls(); state(`${name}: running`);
  const storage = async () => ({ localStorageEntries: localStorage.length, sessionStorageEntries: sessionStorage.length, indexedDBDatabases: (await indexedDB.databases()).length, cacheStorageCaches: (await caches.keys()).length });
  report.storage ??= { before: await storage() };
  try { await action(id); requireLive(id); state(`${name}: complete`); }
  catch (error) {
    const code = ['JOB_CANCELLED', 'JOB_TIMEOUT', 'RUNTIME_LOAD_FAILED', 'RUNTIME_INTEGRITY_FAILED', 'CONVERT_FAILED', 'MEDIA_UNSUPPORTED', 'OUTPUT_INVALID', 'INVALID_QUALITY_FIXTURE'].includes(error?.message) ? error.message : 'SPIKE_FAILED';
    report.errors.push({ phase: name, code, ...(Number.isInteger(error?.probeExit) ? {probeExit: error.probeExit} : {}) }); state(`${name}: ${code}`);
  } finally { report.storage.after = await storage(); active = false; controls(); render(); }
}
node('cancel').addEventListener('click', () => {
  const start = now(); ++generation; abort?.abort(); adapter?.dispose(); state('Cancelled'); controls();
  report.cancelUI = { at: new Date().toISOString(), uiMs: now() - start, received: report.downloadProgress?.received, noResult: !outputURL, liveWorkers: workerObserver.records.filter((record) => record.terminatedMs === null).length }; render();
});

async function loadEngine(signal, { measureCold = false } = {}) {
  if (!manifest) {
    const response = await fetch('/runtime-manifest.json', { credentials: 'omit', redirect: 'error' });
    if (!response.ok) throw new Error('RUNTIME_LOAD_FAILED');
    manifest = await response.json();
    const valid = validateManifest(manifest);
    report.runtime = { id: valid.runtimeId, bytes: valid.totalBytes, assets: manifest.files };
  }
  const engine = new FFmpegAdapter();
  const start = now(); let initializedAt;
  try { await engine.load(manifest, { signal,
    onPhase: (phase) => { if (phase === 'initializing') initializedAt = now(); state(`Engine: ${phase}`); },
    onDownload: ({ received, total }) => {
      report.downloadProgress = { received, total };
      node('budget').textContent = `Verified engine download: ${received.toLocaleString('en-US')} / ${total.toLocaleString('en-US')} bytes`;
      if (downloadCancelCase && !downloadCancelRequested && received > 200000) { downloadCancelRequested = true; node('cancel').click(); }
    },
  }); } catch (error) {
    if (measureCold) report.cold = { downloadMs: (initializedAt ?? now()) - start, initializeMs: initializedAt ? now() - initializedAt : null, totalBytes: report.runtime.bytes, error: error.message, disposed: engine.disposed, pass: false };
    throw error;
  }
  if (measureCold) report.cold = { downloadMs: initializedAt - start, initializeMs: now() - initializedAt, totalBytes: report.runtime.bytes, pass: initializedAt - start <= 120000 && now() - initializedAt <= 60000 };
  return engine;
}
node('load').addEventListener('click', () => execute('Cold engine load', async () => {
  adapter = await loadEngine(abort.signal, { measureCold: true });
  report.buildInfo = await adapter.spikeBuildInfo();
  if (navigator.userAgentData?.getHighEntropyValues) report.browser.full = await navigator.userAgentData.getHighEntropyValues(['fullVersionList', 'platformVersion', 'architecture', 'bitness']);
}));
node('unblock').addEventListener('click', () => execute('ffprobe unblock proof', async () => {
  const result = await runUnblockProof(adapter, {
    onPhase: state,
    onReport: (value) => { report.unblock = value; render(); },
  });
  if (result.status !== 'PASS') throw new Error('MEDIA_UNSUPPORTED');
}));

node('fixtures').addEventListener('click', () => execute('Fixture generation', async (id) => {
  for (const kind of FIXTURE_KINDS) {
    state(`Generating ${kind}`); requireLive(id);
    const start = now(); const exit = await adapter.spikeExec(fixtureArgs(kind));
    if (exit !== 0) throw new Error('CONVERT_FAILED');
    const bytes = await adapter.spikeRead('input.mp4');
    report.fixtures[kind] = { bytes: bytes.length, sha256: await hash(bytes), generationMs: now() - start, generationExit: exit, probeStatus: 'NOT_RUN' };
    render();
    const probeStart = now();
    try {
      const probe = await adapter.probe();
      report.fixtures[kind].probe = probe; report.fixtures[kind].probeStatus = 'PASS';
      fixtureData.set(kind, bytes);
    } catch (error) {
      report.fixtures[kind].probeStatus = 'FAIL';
      report.fixtures[kind].probeExit = Number.isInteger(error?.probeExit) ? error.probeExit : null;
      throw error;
    } finally { report.fixtures[kind].probeMs = now() - probeStart; render(); }
    await adapter.cleanup(); render();
  }
}));
node('retry').addEventListener('click', () => execute('Fresh 10 second retry', async () => {
  const generationExit = await adapter.spikeExec(fixtureArgs('tone440'));
  if (generationExit !== 0) throw new Error('CONVERT_FAILED');
  const bytes = await adapter.spikeRead('input.mp4'); await adapter.cleanup();
  const retry = await conversion(adapter, bytes);
  report.freshRetry = { fixtureBytes: bytes.length, fixtureSha256: await hash(bytes), ...retry.result };
  await adapter.cleanup(); if (!retry.result.pass) throw new Error('OUTPUT_INVALID');
}));

async function conversion(engine, bytes) {
  const jobStart = now();
  await engine.write(bytes.slice());
  const inputProbe = await engine.probe();
  const start = now(); const exit = await engine.convert(); const convertMs = now() - start;
  const output = await engine.readOutput();
  const outputProbe = await engine.probe('output.mp3');
  const inputDuration = Number(inputProbe.format.duration), outputDuration = Number(outputProbe.format.duration);
  const audio = outputProbe.streams[0];
  return { output, result: { exit, convertMs, completeJobMs: now() - jobStart, outputBytes: output.length, outputProbe, durationDifferenceSeconds: Math.abs(inputDuration - outputDuration), pass: exit === 0 && output.length > 0 && output.length <= 4 * 1024 * 1024 && audio.codec_name === 'mp3' && audio.sample_rate === '44100' && audio.channels === 2 && Number(audio.bit_rate) === 128000 && Math.abs(inputDuration - outputDuration) <= .1 && convertMs <= 180000 } };
}
node('warm').addEventListener('click', () => execute('Warm conversions', async (id) => {
  for (let round = 1; round <= 3; round++) {
    for (const kind of ['tone440', 'long180']) {
      requireLive(id); state(`Warm ${kind}, round ${round}`);
      const { output, result } = await conversion(adapter, fixtureData.get(kind));
      report.warm.push({ fixture: kind, round, ...result });
      if (!result.pass) throw new Error('OUTPUT_INVALID');
      if (outputURL) URL.revokeObjectURL(outputURL);
      outputURL = URL.createObjectURL(new Blob([output], { type: 'audio/mpeg' }));
      node('listen').src = outputURL;
      await adapter.cleanup(); render(); await wait(300);
    }
    state(`Warm round ${round}: 30 second idle sample`); await wait(30000);
    state(`Warm round ${round}: idle sample complete`);
  }
}));

function metrics(reference, actual, options) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./audio-metrics.mjs', import.meta.url), { type: 'module' });
    const timer = setTimeout(() => { worker.terminate(); reject(new Error('JOB_TIMEOUT')); }, 15000);
    worker.onmessage = ({ data }) => { clearTimeout(timer); worker.terminate(); if (data.error) reject(new Error(data.error)); else resolve(data.result); };
    worker.onerror = () => { clearTimeout(timer); worker.terminate(); reject(new Error('INVALID_QUALITY_FIXTURE')); };
    worker.postMessage({ reference: reference.buffer, actual: actual.buffer, options }, [reference.buffer, actual.buffer]);
  });
}
node('quality').addEventListener('click', () => execute('Audio quality', async (id) => {
  for (const kind of ['tone440', 'tone1000', 'pulse', 'stereo']) {
    requireLive(id); state(`Audio quality: ${kind}`);
    const { output, result } = await conversion(adapter, fixtureData.get(kind));
    let binary = ''; for (const byte of output) binary += String.fromCharCode(byte);
    listening[kind] = { base64: btoa(binary), bytes: output.length, sha256: await hash(output) };
    node('audio-export').textContent = JSON.stringify(listening);
    let exit = await adapter.spikeExec(pcmArgs('input.mp4', 'reference.f32'));
    if (exit !== 0) throw new Error('INVALID_QUALITY_FIXTURE');
    exit = await adapter.spikeExec(pcmArgs('output.mp3', 'actual.f32'));
    if (exit !== 0) throw new Error('INVALID_QUALITY_FIXTURE');
    const reference = await adapter.spikeRead('reference.f32');
    const actual = await adapter.spikeRead('actual.f32');
    const expected = kind === 'tone440' ? [440, 440] : kind === 'tone1000' ? [1000, 1000] : kind === 'stereo' ? [440, 1000] : null;
    const measured = await metrics(reference, actual, { alignPulse: kind === 'pulse', expectedFrequencies: expected });
    const context = new AudioContext();
    let browserDecode;
    try { const decoded = await context.decodeAudioData(output.buffer.slice(0)); browserDecode = { sampleRate: decoded.sampleRate, channels: decoded.numberOfChannels, durationSeconds: decoded.duration }; }
    finally { await context.close(); }
    report.quality.push({ fixture: kind, ...result, ...measured, browserDecode, pass: result.pass && measured.pass });
    await adapter.cleanup(); render();
    if (!measured.pass || !result.pass) throw new Error('INVALID_QUALITY_FIXTURE');
  }
}));

node('cancels').addEventListener('click', () => execute('Cancellation', async (id) => {
  // Server is in slow-download mode. The spike-only entry bypasses the HTTP
  // cache but retains the real native fetch, byte/hash verification and timers.
  for (const stage of ['download', 'probe', 'convert']) for (let round = 1; round <= 3; round++) {
    requireLive(id); state(`Cancel ${stage}, round ${round}`);
    adapter.dispose(); const engine = new FFmpegAdapter();
    if (outputURL) { node('listen').removeAttribute('src'); node('listen').load(); URL.revokeObjectURL(outputURL); outputURL = null; }
    let operation, observed, uiMs, receivedAtCancel;
    if (stage === 'download') {
      operation = engine.spikeLoadUncached(manifest, { signal: abort.signal, onDownload: ({ received, total }) => {
        if (receivedAtCancel === undefined && received > 200000 && received < total) {
          receivedAtCancel = received; const start = now(); engine.dispose(); node('state').textContent = 'Cancelled download'; uiMs = now() - start;
        }
      } });
    } else {
      await engine.load(manifest, { signal: abort.signal });
      await engine.write(fixtureData.get('long180').slice());
      const started = workerObserver.waitStart(stage === 'probe' ? 'FFPROBE' : 'EXEC', now());
      operation = stage === 'probe' ? engine.probe() : engine.convert();
      operation.catch(() => {}); observed = await started;
    }
    const settled = operation.then(() => 'completed', () => 'rejected');
    if (stage !== 'download') { const cancelStart = now(); engine.dispose(); node('state').textContent = `Cancelled ${stage}`; uiMs = now() - cancelStart; }
    const outcome = await settled;
    const cancelledAt = new Date().toISOString();
    state(`Cancel ${stage}, round ${round}: 30 second sample`); await wait(30000);
    adapter = await loadEngine(abort.signal);
    const retry = await conversion(adapter, fixtureData.get('tone440'));
    await adapter.cleanup();
    report.cancellation.push({ stage, round, cancelledAt, uiMs, receivedAtCancel, actualWorkerStarted: observed?.id ?? null, terminationCalls: engine.terminationCount, probeTerminationCalls: engine.probeWorkerTerminationCount, workerTerminatedMs: observed?.terminatedMs ?? null, staleOperation: outcome, retryPass: retry.result.pass, noStaleResult: !outputURL, pass: uiMs <= 1000 && outcome === 'rejected' && (stage === 'download' ? receivedAtCancel > 200000 && engine.terminationCount === 0 : engine.terminationCount === 1 && observed.terminatedMs !== null) && retry.result.pass && !outputURL, observation: stage === 'download' ? 'actual uncached HTTP WASM stream interrupted before verification/Worker creation' : 'real Worker dispatch/start/termination observed; OS thread disappearance is separately sampled' });
    render();
  }
}));

node('timeouts').addEventListener('click', () => execute('Timeout boundaries', async () => {
  for (const [stage, productionMs, type] of [['initialize', 60000, 'LOAD'], ['probe', 15000, 'FFPROBE'], ['convert', 180000, 'EXEC']]) {
    state(`Production timeout: ${stage}, ${productionMs} ms`);
    const engine = new FFmpegAdapter(); let observed;
    if (stage === 'initialize') workerObserver.holdNext(type);
    else {
      await engine.load(manifest); await engine.write(fixtureData.get('tone440').slice());
      if (stage === 'probe') workerObserver.holdNext(type);
      else { observed = workerObserver.records.findLast((record) => record.role === 'ffmpeg' && record.terminatedMs === null); workerObserver.hold(observed, type); }
    }
    const start = now();
    let code = null;
    try { if (stage === 'initialize') await engine.load(manifest); else if (stage === 'probe') await engine.probe(); else await engine.convert(); }
    catch (error) { code = error.message; }
    const elapsedMs = now() - start;
    observed ??= workerObserver.records.findLast((record) => record.nativeCompleted.some((entry) => entry.type === type));
    report.timeouts.push({ stage, productionMs, elapsedMs, code, disposed: engine.disposed, workerId: observed?.id, realNativeCompletion: observed?.nativeCompleted, pass: code === 'JOB_TIMEOUT' && engine.disposed && elapsedMs >= productionMs && elapsedMs <= productionMs + 3000 && observed?.nativeCompleted.some((entry) => entry.type === type), evidence: 'actual verified native operation; test Worker suppresses one response to inject unresponsive transport; unchanged production outer timer' }); render();
    if (!report.timeouts.at(-1).pass) throw new Error('SPIKE_FAILED');
  }
}));

node('offline').addEventListener('click', () => execute('Unreachable origin conversion', async () => {
  let unreachable = false;
  try { await fetch('/runtime-manifest.json', { cache: 'no-store', credentials: 'omit' }); }
  catch { unreachable = true; }
  if (!unreachable) throw new Error('SPIKE_FAILED');
  const result = await conversion(adapter, fixtureData.get('tone440'));
  report.offline = { originRequestFailed: unreachable, loadedRuntimePass: result.result.pass, pass: unreachable && result.result.pass, evidence: 'real native same-origin request failed; native Worker imports use HTTP-cached same-origin code and verified WASM Blob; network condition is independently recorded in the evidence' };
  await adapter.cleanup();
}));
window.addEventListener('pagehide', () => { adapter?.dispose(); if (outputURL) URL.revokeObjectURL(outputURL); });
controls(); render();
