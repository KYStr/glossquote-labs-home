// Static module Worker fallback, used only when the page is served from
// public/ directly (no preview build, so no generated worker-source.mjs).
// Same core, same message contract as the Blob-URL worker built by
// scripts/build.mjs. The documented preview path always uses the Blob URL.

import { run } from './core/audit.mjs';

self.onmessage = (event) => {
  const data = event && event.data ? event.data : {};
  try {
    const out = run(data.input);
    self.postMessage({ generation: data.generation, ...out });
  } catch {
    self.postMessage({
      generation: data.generation,
      ok: false,
      error: { code: 'INTERNAL', field: null, row: null },
    });
  }
};
