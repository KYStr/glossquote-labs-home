import { AssetLoader } from '/js/asset-loader.mjs';
import { SELECTED_MODEL, validateSelectedManifest } from '/js/core/manifest.mjs';
import { installCpuTensorLifecycle } from './tensor-lifecycle.mjs';
import { installEncoderCacheOutputReuse } from './cache-output-reuse.mjs';
import { configurePlainWhisperSessions } from '/js/core/plain-whisper.mjs';
const loader = new AssetLoader({ origin: self.location.origin });
let transcriber, heap = () => ({}), lifecycle = () => ({}), busy = false, modelConstructions = 0;
const trace = { calls: 0, maxCacheBytes: 0 };
let reuse = () => ({});
const runProfiles = [];
function sample(phase) { return { phase, at: new Date().toISOString(), ...heap(), ...trace, lifecycle: lifecycle(), cacheReuse: reuse(), modelConstructions, sessionCount: transcriber ? Object.keys(transcriber.model.sessions).length : 0, sessionOutputs: transcriber ? Object.fromEntries(Object.entries(transcriber.model.sessions).map(([name, session]) => [name, session.outputNames])) : {}, runProfiles: runProfiles.map(value => ({ ...value })) }; }
function traceSessions(model) {
  for (const [name, session] of Object.entries(model.sessions)) {
    const original = session.run.bind(session);
    session.run = async (...args) => {
      const start = new Date().toISOString(), beforeHeap = heap().wasmHeapBytes;
      const result = await original(...args);
      if (runProfiles.length < 512) runProfiles.push({ session: name, start, end: new Date().toISOString(), beforeHeap, afterHeap: heap().wasmHeapBytes, encoderOutputBytes: Object.entries(result).filter(([key]) => key.includes('.encoder.')).reduce((bytes, [, value]) => bytes + (value.location === 'cpu' ? value.data.byteLength : 0), 0), totalOutputBytes: Object.values(result).reduce((bytes, value) => bytes + (value.location === 'cpu' ? value.data.byteLength : 0), 0) });
      return result;
    };
  }
}
function traceCache(model) {
  const original = model.getPastKeyValues.bind(model);
  model.getPastKeyValues = (...args) => {
    const result = original(...args);
    const unique = [...new Map(Object.values(result).map(tensor => [tensor.ort_tensor ?? tensor, tensor])).values()];
    trace.calls += 1; trace.maxCacheBytes = Math.max(trace.maxCacheBytes, unique.reduce((size, tensor) => size + (tensor.location === 'cpu' ? tensor.data.byteLength : 0), 0));
    return result;
  };
}
async function load(message) {
  validateSelectedManifest(message.manifest);
  if (!['baseline', 'cpu-release', 'arena-pattern', 'baseline-traced', 'cache-reuse', 'essential-outputs'].includes(message.variant)) throw new Error('DIAGNOSTIC_VARIANT_INVALID');
  const timing = await loader.load(message.manifest);
  self.postMessage({ type: 'stage', stage: 'initializing' });
  const { env, pipeline } = await import('/vendor/transformers/transformers.min.js');
  env.allowRemoteModels = false; env.allowLocalModels = true; env.localModelPath = '/models/';
  env.useBrowserCache = false; env.useFSCache = false; env.useCustomCache = false; env.useFS = false;
  env.backends.onnx.wasm.numThreads = 1; env.backends.onnx.wasm.proxy = false;
  const diagnostic = await import('./ort-diagnostic-factory.mjs'); heap = diagnostic.wasmMemorySnapshot;
  env.backends.onnx.wasm.wasmPaths = { mjs: self.location.origin + '/spike/ort-diagnostic-factory.mjs', wasm: self.location.origin + '/vendor/onnx/ort-wasm-simd-threaded.jsep.wasm' };
  env.backends.onnx.wasm.wasmBinary = loader.getVerifiedBytes('/vendor/onnx/ort-wasm-simd-threaded.jsep.wasm');
  self.fetch = loader.fetch.bind(loader);
  const started = performance.now();
  const options = { device: 'wasm', dtype: message.manifest.dtype, local_files_only: true };
  if (message.variant === 'arena-pattern') options.session_options = { enableCpuMemArena: true, enableMemPattern: true };
  transcriber = await pipeline('automatic-speech-recognition', `whisper-base/${SELECTED_MODEL.revision}`, options); modelConstructions += 1;
  if (message.variant === 'cpu-release') lifecycle = installCpuTensorLifecycle(transcriber.model);
  if (message.variant === 'cache-reuse') reuse = installEncoderCacheOutputReuse(transcriber.model.sessions.decoder_model_merged);
  if (message.variant === 'essential-outputs') configurePlainWhisperSessions(transcriber.model);
  if (['baseline-traced', 'cache-reuse', 'essential-outputs'].includes(message.variant)) traceSessions(transcriber.model);
  traceCache(transcriber.model);
  self.postMessage({ type: 'ready', ...timing, initMs: performance.now() - started, diagnostics: sample('ready') });
}
self.addEventListener('message', async event => {
  const message = event.data; if (!message || busy) return;
  busy = true;
  try {
    if (message.type === 'load' && !transcriber) await load(message);
    else if (message.type === 'transcribe' && transcriber && message.audioBuffer instanceof ArrayBuffer && message.audioBuffer.byteLength === 1_920_000) {
      const samples = new Float32Array(message.audioBuffer);
      if (samples.some(value => !Number.isFinite(value) || value < -1 || value > 1)) throw new Error('DIAGNOSTIC_AUDIO_INVALID');
      const before = sample('before-inference'), started = performance.now();
      const result = await transcriber(samples, { language: 'english', task: 'transcribe', return_timestamps: false, do_sample: false, output_attentions: false, return_dict_in_generate: false, return_token_timestamps: false });
      self.postMessage({ type: 'result', text: result.text, inferenceMs: performance.now() - started, before, diagnostics: sample('after-inference'), assetReads: loader.audit() });
    } else if (message.type === 'snapshot') self.postMessage({ type: 'snapshot', diagnostics: sample('idle') });
    else if (message.type === 'identify') {
      const pulses = [];
      for (let pulse = 0; pulse < 4; pulse += 1) {
        const start = new Date().toISOString(), until = performance.now() + 300; let checksum = 0;
        while (performance.now() < until) checksum = Math.imul(checksum + 1, 31);
        pulses.push({ start, end: new Date().toISOString(), checksum }); await new Promise(resolve => setTimeout(resolve, 1000));
      }
      self.postMessage({ type: 'identity', pulses });
    }
    else throw new Error('DIAGNOSTIC_MESSAGE_INVALID');
  } catch { self.postMessage({ type: 'error', code: 'DIAGNOSTIC_FAILED', diagnostics: sample('error') }); }
  finally { busy = false; }
});
self.postMessage({ type: 'boot' });
