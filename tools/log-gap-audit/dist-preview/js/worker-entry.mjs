// Worker message handler fragment.
// scripts/build.mjs concatenates public/js/core/audit.mjs + this file into
// one self-contained module (the "fixed message handler"), embeds it as a
// string, and the page creates a module Worker from a Blob URL of that
// string. This file has no imports: `run` is in scope from the core source
// it is concatenated after. It is never loaded on its own.

self.onmessage = (event) => {
  const data = event && event.data ? event.data : {};
  try {
    const out = run(data.input);
    self.postMessage({ generation: data.generation, ...out });
  } catch {
    self.postMessage({
      generation: data.generation,
      ok: false,
      error: { code: 'INTERNAL', field: null, row: null },
    });
  }
};
