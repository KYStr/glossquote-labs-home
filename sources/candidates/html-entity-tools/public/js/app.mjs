// Controller for the HTML Entity Encoder and Decoder.
//
// All conversion rules live in the pure core; this layer wires the
// panes, options and tables to it. Input and output are text only —
// decoded output that happens to be markup stays inert because it is
// rendered through text assignments and textareas, never parsed
// (SPEC sections 3 and 5). Nothing is stored or sent anywhere.

import { codePointLabel, convertText, MAX_INPUT } from "./core/convert.mjs";
import { errorMessage, translate } from "./i18n.mjs";

const MAX_ROWS = 500;

export function createApp(doc, env = {}) {
  const lang = doc.documentElement?.lang === "en" ? "en" : "zh-Hant";
  const t = (code, params) => translate(lang, code, params);
  const te = (code, params) => errorMessage(lang, code, params);
  const $ = (id) => doc.querySelector(`#${id}`);

  const clipboardWrite = env.clipboardWrite ?? ((text) => globalThis.navigator.clipboard.writeText(text));
  const setTimeoutFn = env.setTimeout ?? globalThis.setTimeout.bind(globalThis);
  const clearTimeoutFn = env.clearTimeout ?? globalThis.clearTimeout.bind(globalThis);

  const els = {
    mode: $("mode-select"),
    input: $("input-text"),
    output: $("output-text"),
    encodeOptions: $("encode-options"),
    nonAscii: $("opt-nonascii"),
    style: $("opt-style"),
    counts: $("counts-line"),
    inputError: $("input-error"),
    changesBody: $("changes-body"),
    changesSummary: $("changes-summary"),
    unresolvedBody: $("unresolved-body"),
    unresolvedSummary: $("unresolved-summary"),
    doubleHint: $("double-hint"),
    decodeAgain: $("decode-again"),
    copyOutput: $("copy-output"),
    announce: $("announce"),
  };

  let debounceId = null;

  function cell(text) {
    const element = doc.createElement("td");
    element.textContent = text;
    return element;
  }

  function renderRows(body, rows, buildCells) {
    body.textContent = "";
    for (const row of rows.slice(0, MAX_ROWS)) {
      const tr = doc.createElement("tr");
      for (const text of buildCells(row)) tr.appendChild(cell(text));
      body.appendChild(tr);
    }
  }

  function run() {
    const mode = els.mode.value === "encode" ? "encode" : "decode";
    els.encodeOptions.hidden = mode !== "encode";
    const input = els.input.value;
    const result = convertText(mode, input, {
      nonAscii: els.nonAscii.checked,
      style: els.style.value,
    });
    if (!result.ok) {
      els.inputError.textContent = te(result.code, result);
      els.output.value = "";
      els.counts.textContent = "";
      renderRows(els.changesBody, [], () => []);
      renderRows(els.unresolvedBody, [], () => []);
      els.changesSummary.textContent = "";
      els.unresolvedSummary.textContent = "";
      els.doubleHint.hidden = true;
      return;
    }
    els.inputError.textContent = "";
    els.output.value = result.output;
    els.counts.textContent = t("COUNTS", {
      input: [...input].length,
      output: [...result.output].length,
    });
    renderRows(els.changesBody, result.changes, (row) => [
      String(row.index),
      row.source,
      mode === "decode" ? `${row.output} ${codePointLabel(row.output)}` : row.output,
      row.notes.length > 0 ? row.notes.map((note) => t(`NOTE_${note}`)).join(", ") : "—",
    ]);
    const unresolved = result.unresolved ?? [];
    renderRows(els.unresolvedBody, unresolved, (row) => [
      String(row.index),
      row.source,
      t(`REASON_${row.reason}`),
    ]);
    if (result.changes.length === 0 && unresolved.length === 0) {
      els.changesSummary.textContent = t("NO_REFERENCES");
      els.unresolvedSummary.textContent = "";
    } else {
      els.changesSummary.textContent = t("CHANGES_COUNT", { count: result.changes.length })
        + (result.changes.length > MAX_ROWS
          ? ` ${t("ROWS_MORE", { shown: MAX_ROWS, total: result.changes.length })}`
          : "");
      els.unresolvedSummary.textContent = unresolved.length > 0
        ? t("UNRESOLVED_COUNT", { count: unresolved.length })
        : "";
    }
    els.doubleHint.hidden = !(mode === "decode" && result.doubleEncoded);
  }

  function schedule() {
    if (debounceId !== null) clearTimeoutFn(debounceId);
    debounceId = setTimeoutFn(() => {
      debounceId = null;
      run();
    }, 150);
  }

  async function onCopy() {
    try {
      await clipboardWrite(els.output.value);
      els.announce.textContent = t("COPIED");
    } catch {
      els.announce.textContent = t("COPY_FAILED");
    }
  }

  function onDecodeAgain() {
    els.input.value = els.output.value;
    run();
  }

  els.input.addEventListener("input", schedule);
  els.mode.addEventListener("change", run);
  els.nonAscii.addEventListener("change", run);
  els.style.addEventListener("change", run);
  els.copyOutput.addEventListener("click", onCopy);
  els.decodeAgain.addEventListener("click", onDecodeAgain);
  run();

  return { els, run };
}

const isBrowser = typeof document !== "undefined" && typeof window !== "undefined";
if (isBrowser) {
  createApp(document);
}
