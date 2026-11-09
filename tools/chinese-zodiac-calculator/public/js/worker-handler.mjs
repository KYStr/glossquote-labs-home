// Worker-side fragment. The preview build concatenates
// public/js/core/zodiac.mjs with this file (in that order) into the
// embedded worker source, so `run` is already in scope here; this
// fragment is never loaded directly by a page. Protocol: the page
// posts { generation, snapshot }; the worker answers with
// { generation, ...payload } where payload is the core outcome, or an
// INTERNAL error if anything unexpected throws.

self.onmessage = (event) => {
  const data = event.data ?? {};
  let payload;
  try {
    payload = run(data.snapshot);
  } catch {
    payload = { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  self.postMessage({ generation: data.generation, ...payload });
};
