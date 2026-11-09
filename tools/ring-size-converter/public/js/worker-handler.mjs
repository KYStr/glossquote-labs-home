// Worker message-handler FRAGMENT — not imported directly anywhere.
// scripts/build.mjs concatenates the pure core (public/js/core/ring.mjs)
// with this fragment, in that order, into the fixed worker source string
// (dist-preview/js/worker-source.js). The page creates a module Worker
// from a Blob URL of that fixed string, so the worker runs exactly the
// same `run` the tests import. `self` and `run` are provided by the worker
// global scope and the prepended core source respectively.

self.onmessage = (event) => {
  const data = event.data;
  let payload;
  try {
    payload = run(data.snapshot);
  } catch {
    payload = { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  self.postMessage({ generation: data.generation, ...payload });
};
