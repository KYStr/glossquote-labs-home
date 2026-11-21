// Worker message-handler FRAGMENT — not imported directly anywhere.
// The preview build concatenates public/js/core/interval-timer.mjs with
// this file into dist-preview/js/worker-source.js. The page creates a
// module Worker from a Blob URL of exactly that string.

self.onmessage = (event) => {
  const data = event?.data;
  if (!data || data.type !== "run") return;
  let outcome;
  try {
    outcome = run(data.input);
  } catch {
    outcome = { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  self.postMessage({ type: "result", sequence: data.sequence, outcome });
};
