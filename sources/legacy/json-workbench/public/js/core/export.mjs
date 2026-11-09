import { LIMITS, failure, unpairedSurrogate } from './lexer.mjs';
export function encodeOutput(text) {
  if (typeof text !== 'string') return failure('WORKER_FAILED');
  if (typeof TextEncoder !== 'function') return failure('UNSUPPORTED');
  if (text.length > LIMITS.outputBytes) return failure('OUTPUT_TOO_LARGE');
  if (unpairedSurrogate(text) !== -1) return failure('INVALID_UNICODE');
  const bytes = new TextEncoder().encode(text);
  return bytes.byteLength <= LIMITS.outputBytes ? {ok:true,value:bytes} : failure('OUTPUT_TOO_LARGE');
}

export function createExporter({ urlAPI = URL, BlobClass = Blob, schedule = setTimeout, cancelTimer = clearTimeout, triggerDownload, clipboard } = {}) {
  let objectURL = null;
  let timer = null;
  function release() {
    if (timer !== null) cancelTimer(timer);
    timer = null;
    if (objectURL !== null) urlAPI.revokeObjectURL(objectURL);
    objectURL = null;
  }
  return {
    release,
    async copy(text) {
      const encoded = encodeOutput(text);
      if (!encoded.ok || typeof clipboard?.writeText !== 'function') return false;
      try { await clipboard.writeText(text); return true; } catch { return false; }
    },
    download(text) {
      release();
      const encoded = encodeOutput(text);
      if (!encoded.ok) return encoded;
      if (typeof BlobClass !== 'function' || typeof urlAPI?.createObjectURL !== 'function' || typeof triggerDownload !== 'function') return failure('UNSUPPORTED');
      try {
        objectURL = urlAPI.createObjectURL(new BlobClass([encoded.value],{type:'application/json'}));
        triggerDownload(objectURL,'formatted.json');
        timer = schedule(release,1000);
        return {ok:true,value:undefined};
      } catch { release(); return failure('WORKER_FAILED'); }
    },
  };
}
