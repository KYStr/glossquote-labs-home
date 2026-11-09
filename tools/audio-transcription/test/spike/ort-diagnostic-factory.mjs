import factory from '/vendor/onnx/ort-wasm-simd-threaded.jsep.mjs';
let instance;
const observedSessionOptions = [];
export function wasmMemorySnapshot() { return { wasmHeapBytes: instance?.HEAPU8?.buffer.byteLength ?? null, wasmBufferType: instance ? Object.prototype.toString.call(instance.HEAPU8.buffer) : null, observedSessionOptions: observedSessionOptions.map(value => ({ ...value })) }; }
export default async function (...args) {
  instance = await factory(...args);
  const original = instance._OrtCreateSessionOptions;
  instance._OrtCreateSessionOptions = (...options) => { observedSessionOptions.push({ cpuArena: Boolean(options[1]), memoryPattern: Boolean(options[2]) }); return original.apply(instance, options); };
  return instance;
}
