// Worker message handler. This file is not shipped on its own: scripts/build.mjs
// appends it verbatim after the export-stripped core source to form the fixed
// worker bundle string that app.js turns into a module Worker Blob URL.
// It therefore references core's run() directly and uses only `self`.
//
// Protocol: in  { generation, input }
//           out { generation, response }  where response is core.run's return.
self.onmessage = (event) => {
  const data = event !== null && typeof event === 'object' ? event.data : null;
  const generation = data !== null && typeof data === 'object' ? data.generation : null;
  let response;
  try {
    response = run(data !== null && typeof data === 'object' ? data.input : null);
  } catch {
    response = { ok: false, error: { code: 'INTERNAL', field: null, row: null } };
  }
  self.postMessage({ generation, response });
};
