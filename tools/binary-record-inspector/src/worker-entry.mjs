// Worker message handler. Build input only: scripts/build.mjs concatenates
// public/js/core/inspector.mjs (which defines `run`) with this file into one
// self-contained module string for the module Worker Blob URL. This file
// must not contain import statements; `run` resolves from the core above it.

self.onmessage = (event) => {
  const data = event && event.data;
  if (!data || typeof data !== 'object') return;
  const { snapshot, generation } = data;
  let outcome;
  try {
    outcome = run(snapshot);
  } catch {
    outcome = { ok: false, error: { code: 'INTERNAL', field: null, row: null } };
  }
  self.postMessage({ generation, ...outcome });
};
