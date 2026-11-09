// Fixed Worker message handler. The build concatenates the pure core source
// (public/js/core/core.mjs) with this file into one self-contained module
// string, which the page loads as a module Worker from a Blob URL.
// This file must not import anything and must not use dynamic code
// execution, dynamic import, fetch, or any DOM/storage API. It only calls run() from
// the concatenated core and posts the outcome back with the same generation.

self.onmessage = (event) => {
  const data = event.data || {};
  const generation = data.generation;
  let payload;
  try {
    const outcome = run(data.input);
    payload = { generation, ok: outcome.ok };
    if (outcome.ok) {
      payload.result = outcome.result;
    } else {
      payload.error = outcome.error;
    }
  } catch {
    payload = {
      generation,
      ok: false,
      error: { code: 'INTERNAL', field: null, row: null },
    };
  }
  self.postMessage(payload);
};
