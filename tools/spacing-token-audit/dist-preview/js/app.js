// Spacing Token Audit — page wiring.
// Safe DOM only (textContent / value). User input is never inserted as HTML.
// The work runs in a module Worker built from the embedded worker source
// (fixed core + handler bytes injected by scripts/build.mjs). When the
// Worker cannot be created (or when serving the unbuilt source tree, where
// the placeholder is still null), a synchronous in-page shim runs the same
// core and preserves the controller contract, including generation guards.

import {
  DEFAULT_DRAFT,
  EXAMPLE_DRAFT,
  REPORT_FILENAME,
  run,
} from "./core/audit.mjs";
import { createController } from "./controller.mjs";

// Replaced at build time by scripts/build.mjs with the embedded worker
// source string (JSON). Null in the unbuilt source tree.
const WORKER_SOURCE = "// Spacing Token Audit — pure core.\n// Implements docs/specs/spacing-token-audit/SPEC.md (spec-spacing-token-audit-20261109).\n// No DOM, network, or storage access. All arithmetic is exact BigInt thousandths\n// of a pixel; no floating point is used anywhere in validation or matching.\n\nconst SPEC_ID = \"spec-spacing-token-audit-20261109\";\nconst REPORT_FILENAME = \"spacing-token-audit-report.json\";\nconst REPORT_MAX_BYTES = 2097152;\nconst MAX_INPUT_UNITS = 8192;\nconst MAX_TOKEN_ROWS = 64;\nconst MAX_MEASUREMENT_ROWS = 100;\nconst MAX_PX_THOUSANDTHS = 2048000n;\n\n// Reset default draft (SPEC userFlow) and the load-example draft\n// (fixtures.json first core case).\nconst DEFAULT_DRAFT = Object.freeze({\n  tokens: \"\",\n  measurements: \"\",\n  tolerance: \"1\",\n});\nconst EXAMPLE_DRAFT = Object.freeze({\n  tokens: \"large\\t12\\nsmall\\t8\\nzero\\t0\",\n  measurements: \"gap\\t10\\ncard\\t12\\npad\\t14.001\",\n  tolerance: \"2\",\n});\n\n// Unsigned ASCII decimal, 0–2048, at most three fractional digits.\n// Grammar: (0|[1-9][0-9]{0,3})(\\.[0-9]{1,3})? — no trim, no suffix, no\n// exponent, no comma, no sign, no unit inference.\nconst DECIMAL_RE = /^(0|[1-9][0-9]{0,3})(\\.[0-9]{1,3})?$/;\nconst NAME_RE = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/;\n\nfunction fail(code, field, row) {\n  return { ok: false, error: { code, field, row } };\n}\n\nfunction isPlainObject(value) {\n  if (value === null || typeof value !== \"object\" || Array.isArray(value)) {\n    return false;\n  }\n  const proto = Object.getPrototypeOf(value);\n  return proto === Object.prototype || proto === null;\n}\n\n// Parse a decimal string to BigInt thousandths of a pixel.\n// Returns null when the grammar or the 0–2048 range fails.\nfunction parsePxThousandths(text) {\n  const match = DECIMAL_RE.exec(text);\n  if (match === null) return null;\n  const intPart = match[1];\n  const fracPart = match[2] === undefined ? \"\" : match[2].slice(1);\n  const thousandths =\n    BigInt(intPart) * 1000n + BigInt(fracPart.padEnd(3, \"0\") || \"0\");\n  if (thousandths > MAX_PX_THOUSANDTHS) return null;\n  return thousandths;\n}\n\n// Canonical ASCII decimal: no rounding, no trailing zeros, no \"-0\".\nfunction formatThousandths(value) {\n  const negative = value < 0n;\n  const abs = negative ? -value : value;\n  const intPart = abs / 1000n;\n  const fracPart = abs % 1000n;\n  if (fracPart === 0n) return (negative ? \"-\" : \"\") + intPart.toString();\n  const frac = fracPart.toString().padStart(3, \"0\").replace(/0+$/, \"\");\n  return (negative ? \"-\" : \"\") + intPart.toString() + \".\" + frac;\n}\n\nfunction hasUnpairedSurrogate(text) {\n  for (let i = 0; i < text.length; i += 1) {\n    const code = text.charCodeAt(i);\n    if (code >= 0xd800 && code <= 0xdbff) {\n      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : -1;\n      if (next < 0xdc00 || next > 0xdfff) return true;\n      i += 1;\n    } else if (code >= 0xdc00 && code <= 0xdfff) {\n      return true;\n    }\n  }\n  return false;\n}\n\n// Validate and parse one name/px table.\n// Returns { ok: true, rows: [{ name, thousandths }] } or a failure object.\n// Check order per SPEC: capacity, unpaired surrogate, empty, row count,\n// then per row in source order: column count / name syntax (ROW_FORMAT),\n// duplicate name (DUP_NAME), px grammar or range (PIXELS).\nfunction parseTable(text, field, maxRows) {\n  if (text.length > MAX_INPUT_UNITS) {\n    return fail(\"INPUT_LIMIT\", field, null);\n  }\n  if (hasUnpairedSurrogate(text)) {\n    return fail(\"UNICODE\", field, null);\n  }\n  const body = text.endsWith(\"\\n\") ? text.slice(0, -1) : text;\n  if (body === \"\") {\n    return fail(\"EMPTY\", field, null);\n  }\n  const lines = body.split(\"\\n\");\n  if (lines.length > maxRows) {\n    return fail(\"ROW_LIMIT\", field, null);\n  }\n  const seen = new Set();\n  const rows = [];\n  for (let i = 0; i < lines.length; i += 1) {\n    const rowNumber = i + 1;\n    const parts = lines[i].split(\"\\t\");\n    if (parts.length !== 2 || !NAME_RE.test(parts[0])) {\n      return fail(\"ROW_FORMAT\", field, rowNumber);\n    }\n    const name = parts[0];\n    if (seen.has(name)) {\n      return fail(\"DUP_NAME\", field, rowNumber);\n    }\n    seen.add(name);\n    const thousandths = parsePxThousandths(parts[1]);\n    if (thousandths === null) {\n      return fail(\"PIXELS\", field, rowNumber);\n    }\n    rows.push({ name, thousandths });\n  }\n  return { ok: true, rows };\n}\n\n// Core transform: run(input) -> { ok: true, result: { rows, outsideCount } }\n// or { ok: false, error: { code, field, row } }.\n// input must be a plain object with exact own fields tokens and measurements\n// (strings) and optional tolerance (string, defaults to \"1\"). Unknown fields,\n// missing tokens/measurements, wrong types, and accessor properties are SCHEMA.\n// Validation order: schema, tolerance grammar (TOLERANCE), tokens, measurements.\nfunction run(input) {\n  if (!isPlainObject(input)) {\n    return fail(\"SCHEMA\", null, null);\n  }\n  const ownKeys = Object.keys(input);\n  for (const key of ownKeys) {\n    if (key !== \"tokens\" && key !== \"measurements\" && key !== \"tolerance\") {\n      return fail(\"SCHEMA\", null, null);\n    }\n    const descriptor = Object.getOwnPropertyDescriptor(input, key);\n    if (descriptor === undefined || \"get\" in descriptor || \"set\" in descriptor) {\n      return fail(\"SCHEMA\", null, null);\n    }\n  }\n  if (!(\"tokens\" in input) || !(\"measurements\" in input)) {\n    return fail(\"SCHEMA\", null, null);\n  }\n  if (typeof input.tokens !== \"string\" || typeof input.measurements !== \"string\") {\n    return fail(\"SCHEMA\", null, null);\n  }\n  const toleranceText = \"tolerance\" in input ? input.tolerance : \"1\";\n  if (typeof toleranceText !== \"string\") {\n    return fail(\"SCHEMA\", null, null);\n  }\n  const tolerance = parsePxThousandths(toleranceText);\n  if (tolerance === null) {\n    return fail(\"TOLERANCE\", \"tolerance\", null);\n  }\n\n  const tokens = parseTable(input.tokens, \"tokens\", MAX_TOKEN_ROWS);\n  if (!tokens.ok) return tokens;\n  const measurements = parseTable(\n    input.measurements,\n    \"measurements\",\n    MAX_MEASUREMENT_ROWS,\n  );\n  if (!measurements.ok) return measurements;\n\n  const rows = [];\n  let outsideCount = 0;\n  for (const measurement of measurements.rows) {\n    let best = null;\n    let bestDiff = null;\n    for (let i = 0; i < tokens.rows.length; i += 1) {\n      const token = tokens.rows[i];\n      const diff =\n        measurement.thousandths >= token.thousandths\n          ? measurement.thousandths - token.thousandths\n          : token.thousandths - measurement.thousandths;\n      if (\n        best === null ||\n        diff < bestDiff ||\n        (diff === bestDiff && token.thousandths < best.thousandths)\n      ) {\n        best = token;\n        bestDiff = diff;\n      }\n    }\n    const delta = measurement.thousandths - best.thousandths;\n    const absDelta = delta < 0n ? -delta : delta;\n    let status;\n    if (delta === 0n) {\n      status = \"exact\";\n    } else if (absDelta <= tolerance) {\n      status = \"within\";\n    } else {\n      status = \"outside\";\n      outsideCount += 1;\n    }\n    rows.push({\n      label: measurement.name,\n      px: formatThousandths(measurement.thousandths),\n      token: best.name,\n      tokenPx: formatThousandths(best.thousandths),\n      delta: formatThousandths(delta),\n      status,\n    });\n  }\n  return { ok: true, result: { rows, outsideCount } };\n}\n\n// Canonical JSON: object own keys sorted by UTF-16 code units, recursively;\n// array order unchanged; strings via JSON literal escaping.\nfunction canonicalStringify(value) {\n  if (value === null) return \"null\";\n  if (typeof value === \"number\") {\n    if (!Number.isInteger(value)) {\n      throw new TypeError(\"report numbers must be integers\");\n    }\n    return JSON.stringify(value);\n  }\n  if (typeof value === \"string\") return JSON.stringify(value);\n  if (typeof value === \"boolean\") return value ? \"true\" : \"false\";\n  if (Array.isArray(value)) {\n    return \"[\" + value.map(canonicalStringify).join(\",\") + \"]\";\n  }\n  if (typeof value === \"object\") {\n    const keys = Object.keys(value).sort();\n    return (\n      \"{\" +\n      keys.map((k) => JSON.stringify(k) + \":\" + canonicalStringify(value[k])).join(\",\") +\n      \"}\"\n    );\n  }\n  throw new TypeError(\"unsupported report value\");\n}\n\nfunction isWellFormedResult(result) {\n  if (!isPlainObject(result)) return false;\n  if (!Array.isArray(result.rows)) return false;\n  if (typeof result.outsideCount !== \"number\") return false;\n  if (!Number.isInteger(result.outsideCount) || result.outsideCount < 0) {\n    return false;\n  }\n  for (const row of result.rows) {\n    if (!isPlainObject(row)) return false;\n    for (const key of [\"label\", \"px\", \"token\", \"tokenPx\", \"delta\", \"status\"]) {\n      if (typeof row[key] !== \"string\") return false;\n    }\n  }\n  return true;\n}\n\n// Serialize a run() result into the fixed report bytes:\n// compact canonical JSON + one trailing LF, UTF-8, no BOM.\n// Returns { ok: true, text } or { ok: false, error } with OUTPUT_LIMIT when\n// the report exceeds REPORT_MAX_BYTES, SCHEMA for a malformed result.\nfunction serializeReport(result) {\n  if (!isWellFormedResult(result)) {\n    return fail(\"SCHEMA\", null, null);\n  }\n  const text = canonicalStringify(result) + \"\\n\";\n  const bytes = new TextEncoder().encode(text).length;\n  if (bytes > REPORT_MAX_BYTES) {\n    return fail(\"OUTPUT_LIMIT\", null, null);\n  }\n  return { ok: true, text };\n}\n// Worker message handler fragment — NOT a standalone module and NOT loaded\n// directly. scripts/build.mjs concatenates the pure core\n// (public/js/core/audit.mjs, with leading `export ` stripped) with this\n// fragment into one self-contained module-worker source string, which is\n// embedded into the built app.js and instantiated from a Blob URL.\n// `run` is in scope from the concatenated core.\nself.onmessage = (event) => {\n  const data = event === null || event === undefined ? null : event.data;\n  const snapshot =\n    data !== null && typeof data === \"object\" ? data.snapshot : undefined;\n  const generation =\n    data !== null && typeof data === \"object\" ? data.generation : undefined;\n  let outcome;\n  try {\n    outcome = run(snapshot);\n  } catch {\n    outcome = { ok: false, error: { code: \"INTERNAL\", field: null, row: null } };\n  }\n  self.postMessage({ generation, outcome });\n};\n";

const PAGE_SIZE = 25;
const DOWNLOAD_REVOKE_MS = 30000;

const isZh = document.documentElement.lang === "zh-Hant";

const STRINGS = isZh
  ? {
      statusEmpty: "尚未輸入。請輸入 Token 與量測，或載入範例。",
      statusDirty: "輸入已變更，請重新執行。",
      statusBusy: "處理中…",
      statusSuccess: "已完成對照。",
      statusCancelled: "已取消，可重新執行。",
      exampleLoaded: "已載入範例，請按「對照間距 Token」執行。",
      summary: (total, outside) =>
        `共 ${total} 筆量測，${outside} 列超出容許偏差。`,
      summaryNone: (total) => `共 ${total} 筆量測，沒有超出容許偏差的列。`,
      pageLabel: (page, pages) => `第 ${page} / ${pages} 頁`,
      errorTitle: "輸入有誤：",
      rowLabel: (row) => `第 ${row} 列`,
      fieldTokens: "設計 Token",
      fieldMeasurements: "量測",
      fieldTolerance: "容許偏差",
      errors: {
        SCHEMA: "輸入格式不正確。",
        TOLERANCE: "容許偏差必須是 0–2048 的數字，最多三位小數。",
        INPUT_LIMIT: "內容超過 8,192 個字元。",
        UNICODE: "內容含有不成對的代理字元。",
        EMPTY: "此欄不可為空。",
        ROW_LIMIT: "列數超過上限。",
        ROW_FORMAT:
          "每列須為「名稱 + Tab + px」，名稱以英文字母開頭，最多 32 個字元。",
        DUP_NAME: "名稱在同一份表內重複。",
        PIXELS: "px 必須是 0–2048 的數字，最多三位小數，不可帶單位。",
        OUTPUT_LIMIT: "報告超過 2,097,152 bytes，無法下載。",
        INTERNAL: "處理時發生內部錯誤，請重試。",
        WORKER_ERROR: "處理時發生內部錯誤，請重試。",
      },
      statusExact: "相符",
      statusWithin: "容許內",
      statusOutside: "超出",
    }
  : {
      statusEmpty: "Nothing entered yet. Enter tokens and measurements, or load the example.",
      statusDirty: "Input changed. Run again.",
      statusBusy: "Working…",
      statusSuccess: "Audit complete.",
      statusCancelled: "Cancelled. You can run again.",
      exampleLoaded: "Example loaded. Press “Match spacing tokens” to run it.",
      summary: (total, outside) =>
        `${total} measurements, ${outside} outside tolerance.`,
      summaryNone: (total) => `${total} measurements, none outside tolerance.`,
      pageLabel: (page, pages) => `Page ${page} of ${pages}`,
      errorTitle: "There is a problem with the input:",
      rowLabel: (row) => `row ${row}`,
      fieldTokens: "Design tokens",
      fieldMeasurements: "Measurements",
      fieldTolerance: "Tolerance",
      errors: {
        SCHEMA: "The input is not in the expected format.",
        TOLERANCE:
          "Tolerance must be a number from 0 to 2048 with at most three decimal places.",
        INPUT_LIMIT: "Content exceeds 8,192 characters.",
        UNICODE: "Content contains an unpaired surrogate.",
        EMPTY: "This field must not be empty.",
        ROW_LIMIT: "Too many rows.",
        ROW_FORMAT:
          "Each row must be “name, tab, pixels” with a name starting with a letter and at most 32 characters.",
        DUP_NAME: "A name is duplicated in the same table.",
        PIXELS:
          "Pixels must be a number from 0 to 2048 with at most three decimal places and no unit.",
        OUTPUT_LIMIT: "The report exceeds 2,097,152 bytes and cannot be downloaded.",
        INTERNAL: "An internal error occurred. Please try again.",
        WORKER_ERROR: "An internal error occurred. Please try again.",
      },
      statusExact: "Exact",
      statusWithin: "Within",
      statusOutside: "Outside",
    };

const STATUS_TEXT = {
  exact: () => STRINGS.statusExact,
  within: () => STRINGS.statusWithin,
  outside: () => STRINGS.statusOutside,
};

const $ = (id) => document.getElementById(id);
const tokensInput = $("tokens");
const measurementsInput = $("measurements");
const toleranceInput = $("tolerance");
const runButton = $("run");
const exampleButton = $("example");
const cancelButton = $("cancel");
const resetButton = $("reset");
const downloadButton = $("download");
const statusEl = $("status");
const errorEl = $("error");
const resultsEl = $("results");
const summaryEl = $("summary");
const resultsBody = $("results-body");
const prevButton = $("prev");
const nextButton = $("next");
const pageLabelEl = $("page-label");
const pagerEl = $("pager");

let currentPage = 1;
let downloadUrl = null;
let downloadRevokeTimer = 0;
let workerBlobUrl = null;
let lastErrorKey = null;

function readDraft() {
  return {
    tokens: tokensInput.value,
    measurements: measurementsInput.value,
    tolerance: toleranceInput.value,
  };
}

function writeDraft(draft) {
  tokensInput.value = draft.tokens;
  measurementsInput.value = draft.measurements;
  toleranceInput.value = draft.tolerance;
}

function revokeDownload() {
  if (downloadUrl !== null) {
    URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }
  if (downloadRevokeTimer !== 0) {
    clearTimeout(downloadRevokeTimer);
    downloadRevokeTimer = 0;
  }
}

// Synchronous in-page fallback worker: runs the same core, preserves the
// async controller contract, and honours termination via the generation
// guard (a terminated shim never delivers).
function createSyncWorker() {
  let onmessage = null;
  let terminated = false;
  let timer = 0;
  return {
    set onmessage(fn) {
      onmessage = fn;
    },
    get onmessage() {
      return onmessage;
    },
    postMessage(message) {
      timer = setTimeout(() => {
        if (terminated) return;
        let outcome;
        try {
          outcome = run(message.snapshot);
        } catch {
          outcome = {
            ok: false,
            error: { code: "INTERNAL", field: null, row: null },
          };
        }
        if (onmessage) {
          onmessage({ data: { generation: message.generation, outcome } });
        }
      }, 0);
    },
    terminate() {
      terminated = true;
      clearTimeout(timer);
    },
  };
}

function createWorker() {
  if (typeof WORKER_SOURCE === "string" && WORKER_SOURCE.length > 0) {
    try {
      if (workerBlobUrl === null) {
        workerBlobUrl = URL.createObjectURL(
          new Blob([WORKER_SOURCE], { type: "text/javascript" }),
        );
      }
      return new Worker(workerBlobUrl, { type: "module" });
    } catch {
      // Fall through to the synchronous shim below.
    }
  }
  return createSyncWorker();
}

const controller = createController({ createWorker });

function fieldElement(field) {
  if (field === "tokens") return tokensInput;
  if (field === "measurements") return measurementsInput;
  if (field === "tolerance") return toleranceInput;
  return null;
}

function errorMessage(error) {
  const base =
    STRINGS.errors[error.code] || STRINGS.errors.INTERNAL;
  const parts = [base];
  if (error.field) {
    const fieldName =
      error.field === "tokens"
        ? STRINGS.fieldTokens
        : error.field === "measurements"
          ? STRINGS.fieldMeasurements
          : STRINGS.fieldTolerance;
    parts.push(fieldName);
  }
  if (error.row !== null && error.row !== undefined) {
    parts.push(STRINGS.rowLabel(error.row));
  }
  return parts.join(" ");
}

function renderResults(state) {
  const rows = state.result === null ? [] : state.result.rows;
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  summaryEl.textContent =
    state.result.outsideCount > 0
      ? STRINGS.summary(rows.length, state.result.outsideCount)
      : STRINGS.summaryNone(rows.length);

  resultsBody.textContent = "";
  for (const row of pageRows) {
    const tr = document.createElement("tr");
    for (const value of [
      row.label,
      row.px,
      row.token,
      row.tokenPx,
      row.delta,
      STATUS_TEXT[row.status](),
    ]) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    resultsBody.appendChild(tr);
  }

  const showPager = rows.length > PAGE_SIZE;
  pagerEl.hidden = !showPager;
  if (showPager) {
    pageLabelEl.textContent = STRINGS.pageLabel(currentPage, totalPages);
    prevButton.disabled = currentPage <= 1;
    nextButton.disabled = currentPage >= totalPages;
  }
}

function render(state) {
  revokeDownload();
  statusEl.setAttribute("aria-busy", state.state === "busy" ? "true" : "false");
  cancelButton.disabled = state.state !== "busy";

  if (state.state === "empty") {
    statusEl.textContent = STRINGS.statusEmpty;
  } else if (state.state === "dirty") {
    statusEl.textContent = STRINGS.statusDirty;
  } else if (state.state === "busy") {
    statusEl.textContent = STRINGS.statusBusy;
  } else if (state.state === "success") {
    statusEl.textContent = STRINGS.statusSuccess;
  } else if (state.state === "cancelled") {
    statusEl.textContent = STRINGS.statusCancelled;
  } else if (state.state === "error") {
    statusEl.textContent = "";
  }

  if (state.state === "error" && state.error !== null) {
    errorEl.hidden = false;
    errorEl.textContent = STRINGS.errorTitle + " " + errorMessage(state.error);
    const key = state.error.code + "|" + state.error.field + "|" + state.error.row;
    // Only a failed submission moves focus to the first error field.
    if (key !== lastErrorKey) {
      lastErrorKey = key;
      const target = fieldElement(state.error.field);
      if (target !== null) target.focus();
    }
  } else {
    errorEl.hidden = true;
    errorEl.textContent = "";
    if (state.state !== "error") lastErrorKey = null;
  }

  const showResults = state.state === "success" && state.result !== null;
  resultsEl.hidden = !showResults;
  downloadButton.hidden = !showResults;
  if (showResults) renderResults(state);
}

controller.subscribe(render);

tokensInput.addEventListener("input", () => controller.edit(readDraft()));
measurementsInput.addEventListener("input", () => controller.edit(readDraft()));
toleranceInput.addEventListener("input", () => controller.edit(readDraft()));

$("audit-form").addEventListener("submit", (event) => {
  event.preventDefault();
  currentPage = 1;
  controller.run();
});

exampleButton.addEventListener("click", () => {
  writeDraft(EXAMPLE_DRAFT);
  currentPage = 1;
  controller.loadExample({ ...EXAMPLE_DRAFT });
  statusEl.textContent = STRINGS.exampleLoaded;
});

cancelButton.addEventListener("click", () => controller.cancel());

resetButton.addEventListener("click", () => {
  writeDraft(DEFAULT_DRAFT);
  currentPage = 1;
  controller.reset();
  tokensInput.focus();
});

prevButton.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage -= 1;
    render(controller.getState());
  }
});

nextButton.addEventListener("click", () => {
  const state = controller.getState();
  if (state.result === null) return;
  const totalPages = Math.max(
    1,
    Math.ceil(state.result.rows.length / PAGE_SIZE),
  );
  if (currentPage < totalPages) {
    currentPage += 1;
    render(state);
  }
});

downloadButton.addEventListener("click", () => {
  const text = controller.getReportText();
  if (text === null) return;
  revokeDownload();
  const blob = new Blob([text], { type: "application/json" });
  downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = REPORT_FILENAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  downloadRevokeTimer = setTimeout(revokeDownload, DOWNLOAD_REVOKE_MS);
});

// Leaving the page (including bfcache restore) discards the draft and any
// worker/blob references; the controller contract has no persistence.
window.addEventListener("pagehide", () => {
  controller.dispose();
  revokeDownload();
  if (workerBlobUrl !== null) {
    URL.revokeObjectURL(workerBlobUrl);
    workerBlobUrl = null;
  }
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    writeDraft(DEFAULT_DRAFT);
    currentPage = 1;
    controller.reset();
  }
});

render(controller.getState());
