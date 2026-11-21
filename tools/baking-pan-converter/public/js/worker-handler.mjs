// Worker message-handler FRAGMENT — not imported directly anywhere.
// scripts/build.mjs concatenates the pure core
// (public/js/core/baking-pan-converter.mjs) with this fragment, in that
// order, into the fixed worker source string
// (dist-preview/js/worker-source.js). The page creates a module Worker
// from a Blob URL of that fixed string, so the worker runs exactly the
// same `run` the tests import. `self` and `run` are provided by the
// worker global scope and the prepended core source respectively.
// Messages carry { sequence, draft } and replies echo
// { sequence, draft, outcome }, where `outcome` is the exact core
// return value.

self.onmessage = (event) => {
  const data = event.data;
  let outcome;
  try {
    outcome = run(data.draft);
  } catch {
    outcome = { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  self.postMessage({ sequence: data.sequence, draft: data.draft, outcome });
};
