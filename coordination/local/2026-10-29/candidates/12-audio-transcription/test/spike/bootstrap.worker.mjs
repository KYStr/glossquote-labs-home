import { AssetLoader } from '/js/asset-loader.mjs';
import { SELECTED_MODEL, validateSelectedManifest } from '/js/core/manifest.mjs';
import { configurePlainWhisperSessions } from '/js/core/plain-whisper.mjs';
import { chunkedResponse, RESPONSE_CHUNK_BYTES } from './chunked-response.mjs';
class StreamLoader extends AssetLoader { createResponse(entry) { return chunkedResponse(entry); } }
let memorySnapshot = () => ({ wasmHeapBytes: 0 });
let loader, transcriber, busy = false, repetition = 0, constructions = 0, firstText;
let verifiedOwnedBytes = 0, deliveredModelBytes = 0, responseConstructorCopyBytes = 0;
const calls = { encoder_model: 0, decoder_model_merged: 0 };
const output = { encoderMaxBytes: 0, decoderMaxBytes: 0 };
let decoderRepetitionTraced = 0;
let sessions;
const snapshot = () => ({ ...memorySnapshot(), verifiedOwnedBytes, deliveredModelBytes, responseConstructorCopyBytes, modelConstructions: constructions, sessionCount: transcriber ? Object.keys(transcriber.model.sessions).length : 0, ...calls, ...output });
const phase = (label, values = {}) => self.postMessage({ type: 'phase', label, at: new Date().toISOString(), repetition, ...snapshot(), ...values });
async function load(message) {
  validateSelectedManifest(message.manifest);
  if (!['baseline', 'chunked-stream', 'no-prepacking'].includes(message.variant)) throw new Error('DIAGNOSTIC_VARIANT_INVALID');
  loader = new (message.variant === 'chunked-stream' ? StreamLoader : AssetLoader)({ origin: self.location.origin });
  phase('verified-download-start');
  const timing = await loader.load(message.manifest, { onProgress: values => self.postMessage({ type: 'progress', ...values }) });
  verifiedOwnedBytes = timing.loadedBytes; phase('verified-download-end');
  const diagnostic = await import('./bootstrap.factory.mjs');
  memorySnapshot = diagnostic.memorySnapshot; diagnostic.observe((label, values) => phase(label, values), message.manifest.files.filter(file => file.path.endsWith('.onnx')).map(file => file.bytes));
  const { env, pipeline } = await import('/vendor/transformers/transformers.min.js');
  env.allowRemoteModels = false; env.allowLocalModels = true; env.localModelPath = '/models/';
  env.useBrowserCache = false; env.useFSCache = false; env.useCustomCache = false; env.useFS = false;
  env.backends.onnx.wasm.numThreads = 1; env.backends.onnx.wasm.proxy = false;
  env.backends.onnx.wasm.wasmPaths = { mjs: self.location.origin + '/spike/bootstrap.factory.mjs', wasm: self.location.origin + '/vendor/onnx/ort-wasm-simd-threaded.jsep.wasm' };
  env.backends.onnx.wasm.wasmBinary = loader.getVerifiedBytes('/vendor/onnx/ort-wasm-simd-threaded.jsep.wasm');
  self.fetch = async (...args) => {
    const response = await loader.fetch(...args), url = new URL(args[0] instanceof Request ? args[0].url : String(args[0]), self.location.origin);
    if (url.pathname.endsWith('.onnx')) {
      const bytes = Number(response.headers.get('content-length'));
      const asset = url.pathname.endsWith('/encoder_model_quantized.onnx') ? 'encoder-model' : 'decoder-model';
      if (message.variant !== 'chunked-stream') responseConstructorCopyBytes += bytes;
      phase('model-response-created', { asset, assetBytes: bytes, maximumResponseChunkBytes: message.variant === 'chunked-stream' ? RESPONSE_CHUNK_BYTES : bytes });
      const read = response.arrayBuffer.bind(response);
      response.arrayBuffer = async () => {
        phase('model-consumer-read-start', { asset, assetBytes: bytes });
        const result = await read(); deliveredModelBytes += result.byteLength;
        phase('model-consumer-read-end', { asset, consumerBufferBytes: result.byteLength });
        return result;
      };
    }
    return response;
  };
  const options = { device: 'wasm', dtype: message.manifest.dtype, local_files_only: true };
  if (message.variant === 'no-prepacking') options.session_options = { extra: { session: { disable_prepacking: '1' } } };
  const started = performance.now(); phase('pipeline-init-start');
  transcriber = await pipeline('automatic-speech-recognition', `whisper-base/${SELECTED_MODEL.revision}`, options); constructions += 1;
  configurePlainWhisperSessions(transcriber.model);
  sessions = Object.values(transcriber.model.sessions);
  for (const [name, session] of Object.entries(transcriber.model.sessions)) {
    const encoder = session.outputNames.includes('last_hidden_state');
    const counter = encoder ? 'encoder_model' : 'decoder_model_merged';
    const run = session.run.bind(session);
    session.run = async (...args) => {
      calls[counter] += 1;
      const traced = encoder || decoderRepetitionTraced !== repetition;
      if (!encoder && traced) decoderRepetitionTraced = repetition;
      if (traced) phase(encoder ? 'encoder-start' : 'decoder-start');
      const result = await run(...args);
      const bytes = Object.values(result).reduce((sum, tensor) => sum + (tensor.location === 'cpu' ? tensor.data.byteLength : 0), 0);
      const key = encoder ? 'encoderMaxBytes' : 'decoderMaxBytes'; output[key] = Math.max(output[key], bytes);
      if (traced) phase(encoder ? 'encoder-end' : 'decoder-end', { returnedTensorBytes: bytes });
      return result;
    };
  }
  if (sessions.length !== 2 || memorySnapshot().nativeModelStagingReleased !== 2 || (message.variant === 'no-prepacking' && memorySnapshot().prepackingDisabledEntries !== 2)) throw new Error('DIAGNOSTIC_SESSION_INVALID');
  phase('pipeline-init-end');
  self.postMessage({ type: 'ready', ...timing, initMs: performance.now() - started, diagnostics: snapshot() });
}
self.addEventListener('message', async event => {
  const message = event.data; if (!message || busy) return; busy = true;
  try {
    if (message.type === 'load' && !transcriber) await load(message);
    else if (message.type === 'identify') {
      const pulses = [];
      for (let index = 0; index < 4; index += 1) {
        const start = new Date().toISOString(), until = performance.now() + 300; let checksum = 0;
        while (performance.now() < until) checksum = Math.imul(checksum + 1, 31);
        pulses.push({ start, end: new Date().toISOString(), checksum }); await new Promise(resolve => setTimeout(resolve, 2500));
      }
      self.postMessage({ type: 'identity', pulses });
    } else if (message.type === 'transcribe' && transcriber && message.audioBuffer instanceof ArrayBuffer && message.audioBuffer.byteLength === 320000) {
      const samples = new Float32Array(message.audioBuffer);
      if (samples.some(value => !Number.isFinite(value) || value < -1 || value > 1)) throw new Error('DIAGNOSTIC_AUDIO_INVALID');
      repetition += 1; phase('inference-start'); const started = performance.now();
      const result = await transcriber(samples, { language: 'chinese', task: 'transcribe', return_timestamps: false, do_sample: false, output_attentions: false, return_dict_in_generate: false, return_token_timestamps: false });
      if (typeof result.text !== 'string' || Array.from(result.text).length > 20000) throw new Error('DIAGNOSTIC_RESULT_INVALID');
      if (firstText === undefined) firstText = result.text;
      phase('inference-end');
      self.postMessage({ type: 'result', resultText: result.text, identicalToFirst: result.text === firstText, sameSessions: Object.values(transcriber.model.sessions).every((session, index) => session === sessions[index]), inferenceMs: performance.now() - started, diagnostics: snapshot() });
    } else if (message.type === 'snapshot') self.postMessage({ type: 'snapshot', diagnostics: snapshot() });
    else throw new Error('DIAGNOSTIC_MESSAGE_INVALID');
  } catch (error) { self.postMessage({ type: 'error', code: ['DIAGNOSTIC_SESSION_INVALID', 'DIAGNOSTIC_AUDIO_INVALID', 'DIAGNOSTIC_RESULT_INVALID'].includes(error.message) ? error.message : 'BOOTSTRAP_DIAGNOSTIC_FAILED', diagnostics: snapshot() }); }
  finally { busy = false; }
});
self.postMessage({ type: 'boot' });
