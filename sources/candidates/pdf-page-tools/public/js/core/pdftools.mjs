// Pure core for the PDF Page Tools (SPEC sections 2 and 4).
//
// No DOM access and no PDF parsing: the core owns the file-validation
// results model, the input limits, the range-expression grammar, the
// output naming rules, rotation arithmetic and the plan builders. The
// engine adapter (core/engine.mjs) supplies facts about opened files
// (page counts, rotations, encryption); the core decides what those
// facts mean. File bytes are never seen here beyond a header probe.

export const LIMITS = Object.freeze({
  fileBytes: 200 * 1024 * 1024,
  mergeFiles: 20,
  mergeBytes: 200 * 1024 * 1024,
  totalPages: 2000,
});

export const PRODUCER = "GlossQuote Labs PDF Page Tools";

function fail(code, params) {
  const error = new Error(code);
  error.code = code;
  if (params) error.params = params;
  throw error;
}

// A file counts as a PDF only if the %PDF- header appears within the
// first 1024 bytes (SPEC 4); the parser check happens in the engine.
export function hasPdfHeader(bytes) {
  const limit = Math.min(bytes.length, 1024);
  const marker = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  for (let start = 0; start + marker.length <= limit; start += 1) {
    let found = true;
    for (let k = 0; k < marker.length; k += 1) {
      if (bytes[start + k] !== marker[k]) {
        found = false;
        break;
      }
    }
    if (found) return true;
  }
  return false;
}

export function checkFileSize(size) {
  if (size > LIMITS.fileBytes) fail("FILE_TOO_LARGE");
}

// Model one inspected file: `facts` is what the engine reported
// ({ pageCount, rotations }) or a coded failure ({ errorCode }).
// Returns { ok: true, pageCount, rotations } or throws the named error.
export function validateInspectedFile(facts) {
  if (facts.errorCode) fail(facts.errorCode);
  if (!Number.isInteger(facts.pageCount) || facts.pageCount < 1) fail("NO_PAGES");
  if (facts.pageCount > LIMITS.totalPages) fail("TOO_MANY_PAGES");
  return { ok: true, pageCount: facts.pageCount, rotations: facts.rotations ?? [] };
}

// Aggregate rules for merge mode (SPEC 4). Files are the valid,
// inspected entries in list order.
export function validateMergeSet(files) {
  if (files.length > LIMITS.mergeFiles) fail("TOO_MANY_FILES");
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > LIMITS.mergeBytes) fail("TOTAL_SIZE_EXCEEDED");
  const totalPages = files.reduce((sum, file) => sum + file.pageCount, 0);
  if (totalPages > LIMITS.totalPages) fail("TOO_MANY_PAGES");
  return { totalBytes, totalPages };
}

// ---- Range grammar (SPEC 4, normative) ----
// expression = item ("," item)* ; item = n | n-m | n- ; 1-based.
// ASCII spaces around items and around "-" are ignored.
// Every violation is a named coded error carrying the offending token.

export function parseRange(expression, pageCount, mode) {
  if (typeof expression !== "string" || expression.trim() === "") {
    fail("RANGE_EMPTY");
  }
  const rawItems = expression.split(",");
  const items = [];
  for (const raw of rawItems) {
    const token = raw.trim();
    if (token === "") fail("RANGE_EMPTY_ITEM", { token: raw });
    const ranged = token.match(/^(\d+)\s*-\s*(\d*)$/);
    const single = token.match(/^(\d+)$/);
    let first;
    let last;
    if (ranged) {
      first = Number(ranged[1]);
      last = ranged[2] === "" ? pageCount : Number(ranged[2]);
    } else if (single) {
      first = Number(single[1]);
      last = first;
    } else {
      fail("RANGE_NON_NUMERIC", { token });
    }
    if (first < 1 || last < 1) fail("RANGE_BAD_PAGE", { token });
    if (last < first) fail("RANGE_REVERSED", { token });
    if (first > pageCount || last > pageCount) fail("RANGE_BEYOND", { token });
    const pages = [];
    for (let page = first; page <= last; page += 1) pages.push(page);
    items.push({ token, first, last, pages });
  }
  if (mode === "split") {
    const seen = new Set();
    for (const item of items) {
      for (const page of item.pages) {
        if (seen.has(page)) fail("RANGE_OVERLAP", { token: item.token });
        seen.add(page);
      }
    }
  }
  if (mode === "extract" || mode === "rotate") {
    const seen = new Set();
    for (const item of items) {
      for (const page of item.pages) {
        if (seen.has(page)) fail("RANGE_DUPLICATE", { token: item.token });
        seen.add(page);
      }
    }
  }
  const groups = items.map((item) => item.pages);
  const pages = groups.flat();
  return { items, groups, pages };
}

// ---- Output naming (SPEC 4, normative) ----

const NAME_KEEP = /[A-Za-z0-9._\-㐀-䶿一-鿿豈-﫿]/;

export function baseName(fileName) {
  const noPath = String(fileName).split(/[\\/]/).pop() ?? "";
  const dot = noPath.lastIndexOf(".");
  const stem = dot >= 0 ? noPath.slice(0, dot) : noPath;
  let cleaned = "";
  let lastWasDash = false;
  for (const char of stem) {
    if (NAME_KEEP.test(char)) {
      cleaned += char;
      lastWasDash = false;
    } else if (!lastWasDash) {
      cleaned += "-";
      lastWasDash = true;
    }
  }
  cleaned = cleaned.replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/g, "");
  return cleaned === "" ? "document" : cleaned;
}

export function outputName(base, mode, group) {
  if (mode === "merge") return `${base}-merged.pdf`;
  if (mode === "extract") return `${base}-extract.pdf`;
  if (mode === "rotate") return `${base}-rotated.pdf`;
  if (mode === "split") {
    if (!group) return `${base}-split.pdf`;
    if (group.first === group.last) return `${base}-p${group.first}.pdf`;
    return `${base}-p${group.first}-${group.last}.pdf`;
  }
  throw new Error(`unknown mode ${mode}`);
}

// ---- Rotation arithmetic (SPEC 4) ----

export function normaliseRotation(existing, chosen) {
  const sum = (((existing + chosen) % 360) + 360) % 360;
  return sum;
}

// ---- Plan builders ----
// Files carry { name, size, pageCount, rotations } after validation.

export function planMerge(files) {
  if (files.length < 2) fail("TOO_FEW_FILES");
  const { totalPages } = validateMergeSet(files);
  return {
    mode: "merge",
    totalPages,
    outputName: outputName(baseName(files[0].name), "merge"),
  };
}

export function planSplit(file, expression, perGroup) {
  const parsed = parseRange(expression, file.pageCount, "split");
  const base = baseName(file.name);
  const outputs = perGroup
    ? parsed.items.map((item) => ({
        pages: item.pages,
        outputName: outputName(base, "split", { first: item.first, last: item.last }),
      }))
    : [{ pages: parsed.pages, outputName: outputName(base, "split") }];
  return {
    mode: "split",
    groups: parsed.groups,
    totalPages: parsed.pages.length,
    outputs,
  };
}

export function planExtract(file, expression) {
  const parsed = parseRange(expression, file.pageCount, "extract");
  return {
    mode: "extract",
    pages: parsed.pages,
    totalPages: parsed.pages.length,
    outputs: [{ pages: parsed.pages, outputName: outputName(baseName(file.name), "extract") }],
  };
}

export function planRotate(file, expression, angle) {
  const parsed = parseRange(expression, file.pageCount, "rotate");
  const results = parsed.pages.map((page) => {
    const from = file.rotations[page - 1] ?? 0;
    return { page, from, to: normaliseRotation(from, angle) };
  });
  return {
    mode: "rotate",
    pages: parsed.pages,
    results,
    sample: results[0] ?? null,
    totalPages: parsed.pages.length,
    outputs: [{ pages: parsed.pages, outputName: outputName(baseName(file.name), "rotate") }],
  };
}
