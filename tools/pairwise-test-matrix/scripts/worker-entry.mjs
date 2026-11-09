// Fixed Worker entry code, appended after the pure core source by
// scripts/build.mjs to form the single embedded Worker script.
// The core defines `run`; this handler only routes messages. It never
// receives code, only the { generation, input } snapshot, and it only
// posts back the current generation's outcome.

export const WORKER_ENTRY = `
// ---- worker entry (fixed; appended to the core source) ----
self.onmessage = (event) => {
  const data = event.data;
  if (!data || typeof data.generation !== 'number' || !data.input) return;
  let outcome;
  try {
    outcome = run(data.input);
  } catch (err) {
    outcome = { ok: false, error: { code: 'INTERNAL', field: null, row: null } };
  }
  self.postMessage({ generation: data.generation, outcome });
};
`;
