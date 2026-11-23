// Worker message handler fragment.
//
// This file is not a module on its own: the preview build concatenates
// the core source and this fragment into the fixed worker source the
// page turns into a module Worker. It expects `run` to be in scope.

self.onmessage = (event) => {
  const data = event === null || event === undefined ? null : event.data;
  const generation =
    data !== null && typeof data === "object" && typeof data.generation === "number"
      ? data.generation
      : null;
  let payload;
  try {
    payload = run(data === null || typeof data !== "object" ? null : data.snapshot);
  } catch {
    payload = { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  self.postMessage({ generation, ...payload });
};
