// Worker message handler fragment — NOT a standalone module and NOT loaded
// directly. scripts/build.mjs concatenates the pure core
// (public/js/core/audit.mjs, with leading `export ` stripped) with this
// fragment into one self-contained module-worker source string, which is
// embedded into the built app.js and instantiated from a Blob URL.
// `run` is in scope from the concatenated core.
self.onmessage = (event) => {
  const data = event === null || event === undefined ? null : event.data;
  const snapshot =
    data !== null && typeof data === "object" ? data.snapshot : undefined;
  const generation =
    data !== null && typeof data === "object" ? data.generation : undefined;
  let outcome;
  try {
    outcome = run(snapshot);
  } catch {
    outcome = { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  self.postMessage({ generation, outcome });
};
