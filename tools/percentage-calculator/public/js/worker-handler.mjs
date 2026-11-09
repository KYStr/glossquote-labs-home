// Fixed Worker message handler. This file is never loaded directly: the
// build concatenates the pure core source with this handler into one fixed
// string, and the page creates a module Worker from a Blob URL of it.
// It receives only the current snapshot plus its generation, and never
// returns a stack trace.
self.onmessage = (event) => {
  const data = event && event.data ? event.data : {};
  const generation = data.generation;
  let outcome;
  try {
    outcome = run(data.input);
  } catch {
    outcome = { ok: false, error: { code: "WORKER_ERROR", field: null, row: null } };
  }
  self.postMessage({ generation, outcome });
};
