// Markdown Preview controller.
//
// The rendered HTML string from the pure core is the single source of
// truth: it is assigned once to the preview container, copied by the
// copy control, and embedded by the export. Above the 200,000
// character limit the preview freezes at the last valid render and
// copy/export are disabled until the text is shortened.

import {
  MAX_SOURCE_CHARS,
  buildExportDocument,
  formatExportFilename,
  renderDocument,
} from "./core/markdown.mjs";
import { DICTIONARIES } from "./i18n.mjs";

function $(doc, id) {
  return doc.querySelector(`#${id}`);
}

function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}

export function createApp(doc, env = {}) {
  const language = doc.documentElement.lang === "en" ? "en" : "zh-Hant";
  const dict = DICTIONARIES[language];
  const ui = dict.ui;

  const clipboard = env.clipboard ?? globalThis.navigator?.clipboard;
  const setTimeoutFn = env.setTimeout ?? globalThis.setTimeout.bind(globalThis);
  const clearTimeoutFn = env.clearTimeout ?? globalThis.clearTimeout.bind(globalThis);
  const now = env.now ?? (() => new Date());
  const download = env.download ?? ((filename, text) => {
    const blob = new Blob([text], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = doc.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    doc.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  });

  const els = {
    editor: $(doc, "editor"),
    preview: $(doc, "preview"),
    counts: $(doc, "counts"),
    limitError: $(doc, "limit-error"),
    sample: $(doc, "sample-button"),
    clear: $(doc, "clear-button"),
    copy: $(doc, "copy-button"),
    exportButton: $(doc, "export-button"),
    sync: $(doc, "sync-toggle"),
    status: $(doc, "status-note"),
    announce: $(doc, "announce"),
  };

  let lastHtml = "";
  let lastTitle = null;
  let lastWords = 0;
  let overLimit = false;
  let sampleArmed = false;
  let debounceId = null;
  let syncing = false;

  function setStatus(text) {
    els.status.textContent = text;
  }

  function render() {
    const source = els.editor.value;
    const chars = [...source].length;
    if (chars > MAX_SOURCE_CHARS) {
      overLimit = true;
      els.limitError.textContent = fill(ui.LIMIT_ERROR, { chars });
      els.limitError.hidden = false;
      els.copy.disabled = true;
      els.exportButton.disabled = true;
      els.counts.textContent = fill(ui.COUNTS, { chars, words: lastWords });
      return;
    }
    overLimit = false;
    els.limitError.hidden = true;
    const result = renderDocument(source);
    lastHtml = result.html;
    lastTitle = result.title;
    lastWords = result.renderedWords;
    els.preview.innerHTML = source === ""
      ? `<p class="hint">${ui.EMPTY_HINT}</p>`
      : result.html;
    const empty = source === "";
    els.copy.disabled = empty;
    els.exportButton.disabled = empty;
    els.counts.textContent = fill(ui.COUNTS, {
      chars: result.sourceChars,
      words: result.renderedWords,
    });
    els.announce.textContent = ui.UPDATED;
  }

  function scheduleRender() {
    if (debounceId !== null) clearTimeoutFn(debounceId);
    debounceId = setTimeoutFn(() => {
      debounceId = null;
      render();
    }, 150);
  }

  els.editor.addEventListener("input", () => {
    sampleArmed = false;
    els.sample.textContent = ui.SAMPLE_BUTTON;
    scheduleRender();
  });

  els.sample.addEventListener("click", () => {
    if (els.editor.value !== "" && !sampleArmed) {
      sampleArmed = true;
      els.sample.textContent = ui.SAMPLE_CONFIRM;
      setStatus(ui.SAMPLE_CONFIRM);
      return;
    }
    sampleArmed = false;
    els.sample.textContent = ui.SAMPLE_BUTTON;
    els.editor.value = dict.sample;
    render();
    setStatus(ui.SAMPLE_LOADED);
  });

  els.clear.addEventListener("click", () => {
    els.editor.value = "";
    render();
    setStatus(ui.CLEARED);
  });

  els.copy.addEventListener("click", async () => {
    if (overLimit || lastHtml === "") return;
    await clipboard?.writeText(lastHtml);
    setStatus(ui.COPIED);
  });

  els.exportButton.addEventListener("click", () => {
    if (overLimit || lastHtml === "") return;
    const documentText = buildExportDocument({
      bodyHtml: lastHtml,
      title: lastTitle ?? ui.DEFAULT_EXPORT_TITLE,
      lang: language,
    });
    download(formatExportFilename(now()), documentText);
  });

  function fraction(el) {
    const range = el.scrollHeight - el.clientHeight;
    return range > 0 ? el.scrollTop / range : 0;
  }

  els.editor.addEventListener("scroll", () => {
    if (!els.sync.checked || syncing) return;
    syncing = true;
    const range = els.preview.scrollHeight - els.preview.clientHeight;
    els.preview.scrollTop = fraction(els.editor) * Math.max(range, 0);
    syncing = false;
  });

  els.preview.addEventListener("scroll", () => {
    if (!els.sync.checked || syncing) return;
    syncing = true;
    const range = els.editor.scrollHeight - els.editor.clientHeight;
    els.editor.scrollTop = fraction(els.preview) * Math.max(range, 0);
    syncing = false;
  });

  render();
  return { render };
}

if (typeof document !== "undefined") {
  createApp(document);
}
