import factory from '/vendor/onnx/ort-wasm-simd-threaded.jsep.mjs';
import { installBridgeObserver } from './bootstrap-observer.mjs';
let snapshot = () => ({ wasmHeapBytes: 0 }), emit = () => {}, modelSizes = [];
export function observe(callback, sizes) { emit = callback; modelSizes = sizes; }
export function memorySnapshot() { return snapshot(); }
export default async function (...args) {
  const instance = await factory(...args);
  snapshot = installBridgeObserver(instance, emit, modelSizes);
  emit('wasm-ready', snapshot());
  return instance;
}
