import { parseManifest, validateSelectedManifest } from '/js/core/manifest.mjs';
import { scoreSpeech } from './scoring.mjs';
const controls = Object.fromEntries(['variant', 'identify', 'load', 'run', 'dispose', 'status', 'report'].map(id => [id, document.getElementById(id)]));
const report = { diagnosticOnly: true, startedAt: new Date().toISOString(), modelReady: false, probes: [], events: [], browser: { userAgent: navigator.userAgent }, maximumHeartbeatDelayMs: 0 };
let manifest, fixture, samples, worker, pending, probe, baselineText, busy = false, lastBeat = performance.now();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const interval = setInterval(() => { const now = performance.now(); report.maximumHeartbeatDelayMs = Math.max(report.maximumHeartbeatDelayMs, now - lastBeat - 100); lastBeat = now; }, 100);
function mark(name, values = {}) { const event = { name, at: new Date().toISOString(), ...values }; report.events.push(event); if (probe) probe.events.push(event); }
function render() {
  controls.report.textContent = JSON.stringify(report, null, 2);
  controls.load.disabled = busy || report.modelReady || !manifest; controls.run.disabled = busy || !report.modelReady; controls.variant.disabled = busy || report.modelReady;
  controls.identify.disabled = busy || !manifest;
}
function dispose() {
  worker?.terminate(); worker = undefined; report.modelReady = false; mark('worker-terminated');
  if (pending) { clearTimeout(pending.timer); pending.reject(new Error('DIAGNOSTIC_CANCELLED')); pending = undefined; }
  render();
}
function send(message, transfer = []) {
  if (!worker || pending) return Promise.reject(new Error('DIAGNOSTIC_STATE_INVALID'));
  return new Promise((resolve, reject) => {
    pending = { resolve, reject, timer: setTimeout(() => { dispose(); controls.status.textContent = 'Diagnostic timed out'; }, 180000) };
    worker.postMessage(message, transfer);
  });
}
async function boot() {
  probe = { variant: controls.variant.value, events: [], results: [], finished: false }; report.probes.push(probe);
  worker = new Worker('/spike/bootstrap.worker.mjs', { type: 'module' });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { dispose(); reject(new Error('DIAGNOSTIC_BOOT_FAILED')); }, 10000);
    worker.addEventListener('message', event => {
      const data = event.data;
      if (data?.type === 'boot') { clearTimeout(timer); resolve(); return; }
      if (data?.type === 'phase') { mark(data.label, data); render(); return; }
      if (data?.type === 'progress') { controls.status.textContent = 'Verifying fixed asset bytes'; return; }
      if (data?.type === 'stage') { mark(data.stage); controls.status.textContent = data.stage; render(); return; }
      if (!pending) return;
      const waiting = pending; pending = undefined; clearTimeout(waiting.timer);
      data?.type === 'error' ? waiting.reject(new Error(data.code)) : waiting.resolve(data);
    });
    worker.addEventListener('error', () => { clearTimeout(timer); reject(new Error('DIAGNOSTIC_WORKER_FAILED')); dispose(); });
  });
}
async function run(action) {
  busy = true; render();
  try { await action(); }
  catch (error) { report.error = error.message; dispose(); controls.status.textContent = error.message; }
  finally { busy = false; render(); }
}
controls.load.addEventListener('click', () => run(async () => {
  if (!worker) await boot(); report.variant = probe.variant; mark('download'); controls.status.textContent = 'Loading fixed diagnostic assets';
  const loaded = await send({ type: 'load', manifest, variant: report.variant }); probe.load = loaded; report.modelReady = true; mark('model-ready');
  controls.status.textContent = 'Model ready; 10-second OS memory baseline'; render(); await sleep(10000); mark('loaded-baseline-end'); controls.status.textContent = 'Model ready; first inference scheduled 23 seconds after ready'; await sleep(13000); await shortRepetitions();
}));
controls.identify.addEventListener('click', () => run(async () => {
  if (!worker) await boot(); probe.identity = { purpose: 'Bounded CPU pulses correlate this main thread and dedicated worker with OS counters; not a memory gate', main: [], worker: [] };
  controls.status.textContent = 'Identifying own main thread and worker';
  for (let pulse = 0; pulse < 4; pulse += 1) {
    const start = new Date().toISOString(), until = performance.now() + 300; let checksum = 0;
    while (performance.now() < until) checksum = Math.imul(checksum + 1, 31);
    probe.identity.main.push({ start, end: new Date().toISOString(), checksum }); render(); await sleep(2500);
  }
  if (!worker) await boot(); const result = await send({ type: 'identify' }); probe.identity.worker = result.pulses;
  controls.status.textContent = 'CPU identity markers complete'; render();
}));
async function shortRepetitions() {
  for (let repetition = 1; repetition <= 3; repetition += 1) {
    mark('inference-start', { repetition }); controls.status.textContent = `Warm repetition ${repetition}`; const audio = samples.slice();
    const result = await send({ type: 'transcribe', audioBuffer: audio.buffer }, [audio.buffer]);
    if (typeof result.resultText !== 'string' || Array.from(result.resultText).length > 20000) throw new Error('DIAGNOSTIC_OUTPUT_INVALID');
    const quality = scoreSpeech(fixture.reference, result.resultText, 'chinese');
    if (baselineText === undefined && probe.variant === 'baseline') baselineText = result.resultText;
    probe.results.push({ repetition, inferenceMs: result.inferenceMs, identicalToFirst: result.identicalToFirst, identicalToBaseline: baselineText !== undefined && result.resultText === baselineText, sameSessions: result.sameSessions, diagnostics: result.diagnostics, quality: { errors: quality.errors, referenceUnits: quality.referenceUnits, rate: quality.rate } }); mark('inference-end', { repetition }); render();
    await sleep(5000); const snapshot = await send({ type: 'snapshot' }); mark('rest-end', { repetition, ...snapshot.diagnostics }); render();
  }
  dispose(); controls.status.textContent = 'Worker cleared; 30-second OS memory observation'; render(); await sleep(30000); mark('clear-plus-30-seconds'); probe.finished = true; controls.status.textContent = 'Diagnostic repetitions finished';
}
controls.run.addEventListener('click', () => run(shortRepetitions));
controls.dispose.addEventListener('click', () => { dispose(); busy = false; controls.status.textContent = 'Diagnostic worker disposed'; render(); });
window.addEventListener('pagehide', () => { clearInterval(interval); dispose(); });
try {
  if (navigator.userAgentData?.getHighEntropyValues) report.browser.details = await navigator.userAgentData.getHighEntropyValues(['fullVersionList', 'architecture', 'bitness', 'platformVersion']);
  const read = async (url, cap) => {
    const response = await fetch(url, { credentials: 'omit', redirect: 'error', cache: 'no-store' });
    if (response.status !== 200 || Number(response.headers.get('content-length')) > cap) throw new Error('DIAGNOSTIC_ASSET_INVALID');
    const data = new Uint8Array(await response.arrayBuffer()); if (data.length > cap) throw new Error('DIAGNOSTIC_ASSET_INVALID'); return data;
  };
  manifest = validateSelectedManifest(parseManifest(new TextDecoder().decode(await read('/model-manifest.json', 65536))));
  const metadata = JSON.parse(new TextDecoder().decode(await read('/fixtures/generated/t02-v1/quality-speech.json', 65536)));
  fixture = metadata.cases.find(item => item.id === 'zh-01');
  if (!metadata.syntheticOnly || fixture?.path !== '/fixtures/generated/t02-v1/zh-01.wav' || fixture.bytes !== 160044 || fixture.durationSeconds !== 5 || !/^[a-f0-9]{64}$/u.test(fixture.sha256)) throw new Error('DIAGNOSTIC_FIXTURE_INVALID');
  const wav = await read(fixture.path, fixture.bytes), digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', wav)), byte => byte.toString(16).padStart(2, '0')).join('');
  if (wav.length !== fixture.bytes || digest !== fixture.sha256) throw new Error('DIAGNOSTIC_FIXTURE_INTEGRITY_FAILED');
  const view = new DataView(wav.buffer), four = offset => String.fromCharCode(...wav.subarray(offset, offset + 4));
  if (four(0) !== 'RIFF' || four(8) !== 'WAVE' || view.getUint32(4, true) !== wav.length - 8 || four(12) !== 'fmt ' || view.getUint32(16, true) !== 16 || view.getUint16(20, true) !== 1 || view.getUint16(22, true) !== 1 || view.getUint32(24, true) !== 16000 || view.getUint16(34, true) !== 16 || four(36) !== 'data' || view.getUint32(40, true) !== 160000) throw new Error('DIAGNOSTIC_FIXTURE_FORMAT_INVALID');
  samples = new Float32Array(80000); for (let i = 0; i < samples.length; i += 1) samples[i] = view.getInt16(44 + 2 * i, true) / 32768;
  report.fixture = { id: fixture.id, bytes: fixture.bytes, durationSeconds: fixture.durationSeconds, sha256: fixture.sha256 }; mark('preflight-complete'); controls.status.textContent = 'Ready; acquire measurement lock before loading'; render();
} catch (error) { report.error = error.message; controls.status.textContent = error.message; render(); }
