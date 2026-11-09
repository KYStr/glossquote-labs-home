// Fixed Worker message handler. Embedded verbatim after the core source by
// scripts/build.mjs; never generated from user content.
// The core module (public/js/core/validate.mjs) defines run() in scope.
self.onmessage = (event) => {
  const data = event.data !== null && typeof event.data === 'object' ? event.data : {};
  const generation = typeof data.generation === 'number' ? data.generation : null;
  try {
    const out = run({ entries: data.entries });
    self.postMessage({
      generation,
      ok: out.ok,
      result: out.ok ? out.result : undefined,
      error: out.ok ? undefined : out.error,
    });
  } catch {
    self.postMessage({
      generation,
      ok: false,
      error: { code: 'INTERNAL', field: null, row: null },
    });
  }
};
