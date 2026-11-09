
// This fragment is concatenated after the pure core module by
// scripts/build.mjs to form the Worker entry (worker-source.js).

function handleWorkerMessage(event) {
  const data = event?.data ?? {};
  let outcome;
  try {
    outcome = run(data.snapshot);
  } catch {
    outcome = { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  const payload = outcome.ok === true
    ? { ok: true, result: outcome.result }
    : { ok: false, error: outcome.error };
  globalThis.postMessage({ generation: data.generation, ...payload });
}

globalThis.addEventListener("message", handleWorkerMessage);
