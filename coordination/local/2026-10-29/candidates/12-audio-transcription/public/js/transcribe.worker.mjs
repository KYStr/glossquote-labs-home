import { AssetLoader } from './asset-loader.mjs';
import { SELECTED_MODEL, validateSelectedManifest } from './core/manifest.mjs';
import { configurePlainWhisperSessions } from './core/plain-whisper.mjs';
import { memoryPhase, setMemoryTraceJob } from './core/memory-phases.mjs';

const loader = new AssetLoader({ origin: self.location.origin });
let transcriber;
let jobId = 0;
let busy = false;
const send = (type, fields = {}) => self.postMessage({ type, jobId, ...fields });
const exact = (value, fields) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === fields.length && Object.keys(value).every(key => fields.includes(key));
performance.setResourceTimingBufferSize(128);
const resources = () => performance.getEntriesByType('resource').slice(0, 128).map(entry => {
  const url = new URL(entry.name);
  return { url: url.origin + url.pathname, initiatorType: entry.initiatorType, transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize, decodedBodySize: entry.decodedBodySize };
});

async function load(manifest) {
  validateSelectedManifest(manifest);
  const timing = await loader.load(manifest, { onProgress: progress => send('progress', progress) });
  send('stage', { stage: 'initializing' });
  const started = performance.now();
  memoryPhase('runtime-bootstrap-start');
  const { env, pipeline } = await import('/vendor/transformers/transformers.min.js');
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = '/models/';
  env.useBrowserCache = false;
  env.useFSCache = false;
  env.useCustomCache = false;
  env.useFS = false;
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.proxy = false;
  env.backends.onnx.wasm.wasmPaths = {
    mjs: self.location.origin + '/vendor/onnx/ort-wasm-simd-threaded.jsep.mjs',
    wasm: self.location.origin + '/vendor/onnx/ort-wasm-simd-threaded.jsep.wasm',
  };
  // This fixed ORT version accepts verified bytes directly and skips its native WASM download.
  env.backends.onnx.wasm.wasmBinary = loader.getVerifiedBytes('/vendor/onnx/ort-wasm-simd-threaded.jsep.wasm');
  self.fetch = loader.fetch.bind(loader);
  transcriber = await pipeline('automatic-speech-recognition', `whisper-base/${SELECTED_MODEL.revision}`, {
    device: 'wasm', dtype: manifest.dtype, local_files_only: true,
  });
  configurePlainWhisperSessions(transcriber.model);
  memoryPhase('runtime-bootstrap-end', { sessionCount: Object.keys(transcriber.model.sessions).length });
  send('ready', { ...timing, initMs: performance.now() - started, assetReads: loader.audit(), resources: resources() });
}

async function transcribe(audioBuffer, language) {
  if (!transcriber || !(audioBuffer instanceof ArrayBuffer) || audioBuffer.byteLength === 0 || audioBuffer.byteLength % 4 !== 0 || audioBuffer.byteLength > 480_000 * 4 || !['chinese', 'english'].includes(language)) throw new Error('TRANSCRIBE_FAILED');
  const samples = new Float32Array(audioBuffer);
  let energy = 0;
  for (const sample of samples) {
    if (!Number.isFinite(sample) || sample < -1 || sample > 1) throw new Error('TRANSCRIBE_FAILED');
    energy += sample * sample;
  }
  if (Math.sqrt(energy / samples.length) <= 0.0001) { send('empty', { text: '', inferenceMs: 0, modelCalls: 0, assetReads: loader.audit(), resources: resources() }); return; }
  const started = performance.now();
  memoryPhase('inference-start', { inputPcmBytes: samples.byteLength });
  const result = await transcriber(samples, { language, task: 'transcribe', return_timestamps: false, do_sample: false, output_attentions: false, return_dict_in_generate: false, return_token_timestamps: false });
  memoryPhase('inference-end', { inputPcmBytes: samples.byteLength });
  if (!result || typeof result !== 'object' || Array.isArray(result) || typeof result.text !== 'string' || result.text.length > 40_000) throw new Error('TRANSCRIBE_FAILED');
  const text = result.text.replaceAll(/\r\n?/gu, '\n').trim();
  if (Array.from(text).length > 20_000) throw new Error('OUTPUT_TOO_LARGE');
  if (/[\u0000-\u0008\u000b-\u001f\u007f]/u.test(text)) throw new Error('TRANSCRIBE_FAILED');
  send(text ? 'result' : 'empty', { text, inferenceMs: performance.now() - started, modelCalls: 1, assetReads: loader.audit(), resources: resources() });
}

self.addEventListener('message', async event => {
  const message = event.data;
  if (!message || !Number.isSafeInteger(message.jobId) || message.jobId < 1 || busy) return;
  if (message.type === 'load' && exact(message, ['type', 'jobId', 'manifest']) && !transcriber) {
    jobId = message.jobId; setMemoryTraceJob(jobId); busy = true;
    try { await load(message.manifest); }
    catch (error) { send('error', { code: error.message === 'ASSET_INTEGRITY_FAILED' ? 'ASSET_INTEGRITY_FAILED' : 'MODEL_LOAD_FAILED' }); }
    finally { busy = false; }
  } else if (message.type === 'transcribe' && exact(message, ['type', 'jobId', 'audioBuffer', 'language']) && message.jobId >= jobId) {
    jobId = message.jobId; setMemoryTraceJob(jobId); busy = true;
    try { await transcribe(message.audioBuffer, message.language); }
    catch (error) { send('error', { code: error.message === 'OUTPUT_TOO_LARGE' ? error.message : 'TRANSCRIBE_FAILED' }); }
    finally { busy = false; }
  }
});
self.postMessage({ type: 'boot', jobId: 0 });
