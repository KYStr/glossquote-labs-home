// Controller for the Word and Character Frequency Counter.
//
// All tokenisation, folding and counting rules live in the pure
// core; this layer wires the input, options and tables to it.
// Pasted text renders as text only (table cells are text nodes);
// nothing is stored or sent anywhere, and stopword edits live in
// the session only (SPEC sections 3 and 5).

import { analyze, foldText, toCsv } from "./core/frequency.mjs";
import { STOPWORDS_EN } from "./core/stopwords-en.mjs";
import { STOPWORDS_CJK } from "./core/stopwords-cjk.mjs";
import { errorMessage, translate } from "./i18n.mjs";

const DEFAULT_STOPWORDS = [...STOPWORDS_EN, ...STOPWORDS_CJK].join("\n");
const DISPLAY_LIMIT = 100;

function defaultDownload(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function createApp(doc, env = {}) {
  const lang = doc.documentElement?.lang === "en" ? "en" : "zh-Hant";
  const t = (code, params) => translate(lang, code, params);
  const te = (code, params) => errorMessage(lang, code, params);
  const $ = (id) => doc.querySelector(`#${id}`);

  const download = env.download ?? defaultDownload;
  const setTimeoutFn = env.setTimeout ?? globalThis.setTimeout.bind(globalThis);
  const clearTimeoutFn = env.clearTimeout ?? globalThis.clearTimeout.bind(globalThis);

  const els = {
    input: $("input-text"),
    inputError: $("input-error"),
    stopwordsOn: $("opt-stopwords"),
    stopwordsText: $("stopwords-text"),
    stopwordsRestore: $("stopwords-restore"),
    minCount: $("opt-mincount"),
    minLength: $("opt-minlength"),
    numbers: $("opt-numbers"),
    tabs: {
      words: $("tab-words"),
      characters: $("tab-chars"),
      bigrams: $("tab-bigrams"),
    },
    totals: $("totals-line"),
    body: $("result-body"),
    rowsNote: $("rows-note"),
    showAll: $("opt-showall"),
    exportCsv: $("export-csv"),
    announce: $("announce"),
  };

  let active = "words";
  let result = null;
  let debounceId = null;

  function parseStopwords() {
    const words = new Set();
    const chars = new Set();
    for (const line of els.stopwordsText.value.split("\n")) {
      const entry = line.trim();
      if (entry === "") continue;
      words.add(foldText(entry));
      if ([...entry].length === 1) chars.add(entry);
    }
    return { words, chars };
  }

  function positiveInt(element) {
    const value = Number.parseInt(element.value, 10);
    return Number.isInteger(value) && value >= 1 ? value : 1;
  }

  function cell(text) {
    const element = doc.createElement("td");
    element.textContent = text;
    return element;
  }

  function render() {
    const table = result?.[active];
    els.body.textContent = "";
    if (!result || !table) {
      els.totals.textContent = "";
      els.rowsNote.textContent = "";
      return;
    }
    els.totals.textContent = t("TOTALS", {
      total: table.total,
      unique: table.unique,
      input: result.inputChars,
    });
    if (table.rows.length === 0) {
      const tr = doc.createElement("tr");
      const td = cell(t("EMPTY_TABLE"));
      tr.appendChild(td);
      els.body.appendChild(tr);
      els.rowsNote.textContent = "";
      return;
    }
    const shown = els.showAll.checked ? table.rows : table.rows.slice(0, DISPLAY_LIMIT);
    for (const row of shown) {
      const tr = doc.createElement("tr");
      tr.appendChild(cell(String(row.rank)));
      tr.appendChild(cell(row.item));
      tr.appendChild(cell(String(row.count)));
      tr.appendChild(cell(`${row.percent.toFixed(1)}%`));
      els.body.appendChild(tr);
    }
    els.rowsNote.textContent = shown.length < table.rows.length
      ? t("ROWS_NOTE", { shown: shown.length, total: table.rows.length })
      : "";
  }

  function run() {
    const { words, chars } = parseStopwords();
    result = analyze(els.input.value, {
      stopwordsOn: els.stopwordsOn.checked,
      stopwordWords: words,
      stopwordChars: chars,
      minCount: positiveInt(els.minCount),
      minLength: positiveInt(els.minLength),
      includeNumbers: els.numbers.checked,
    });
    if (!result.ok) {
      els.inputError.textContent = te(result.code, result);
      result = null;
      render();
      return;
    }
    els.inputError.textContent = "";
    render();
  }

  function schedule() {
    if (debounceId !== null) clearTimeoutFn(debounceId);
    debounceId = setTimeoutFn(() => {
      debounceId = null;
      run();
    }, 250);
  }

  function onExport() {
    if (!result) return;
    download("frequency.csv", toCsv(result[active].rows));
    els.announce.textContent = t("EXPORTED");
  }

  function onRestore() {
    els.stopwordsText.value = DEFAULT_STOPWORDS;
    run();
  }

  els.input.addEventListener("input", schedule);
  els.stopwordsText.addEventListener("input", schedule);
  for (const element of [els.stopwordsOn, els.minCount, els.minLength, els.numbers, els.showAll]) {
    element.addEventListener("change", run);
  }
  els.stopwordsRestore.addEventListener("click", onRestore);
  els.exportCsv.addEventListener("click", onExport);
  for (const [name, element] of Object.entries(els.tabs)) {
    element.addEventListener("click", () => {
      active = name;
      render();
    });
  }
  els.stopwordsText.value = DEFAULT_STOPWORDS;
  run();

  return { els, run, getResult: () => result, getActive: () => active };
}

const isBrowser = typeof document !== "undefined" && typeof window !== "undefined";
if (isBrowser) {
  createApp(document);
}
