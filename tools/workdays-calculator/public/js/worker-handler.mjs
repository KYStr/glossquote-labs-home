// Appended to the pure core by the build. The generated source runs in a
// dedicated module Worker, with the same run function used by the core tests.
self.onmessage = ({ data }) => {
  let outcome;
  try {
    outcome = run(data.snapshot);
  } catch {
    outcome = { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  self.postMessage({ generation: data.generation, ...outcome });
};
