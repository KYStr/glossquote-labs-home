// Controller for the UUID Generator and Inspector.
//
// All parsing, generation and timestamp rules live in the pure core;
// this layer wires native controls to it. Randomness and the clock
// come from the injected production adapter below (crypto.getRandomValues
// and Date.now); tests inject deterministic fakes. Nothing is stored,
// nothing is sent anywhere, and inspected or generated values are
// rendered as text only (SPEC sections 3 and 5).

import { batchText, generateBatch, inspectUuid, validateCount } from "./core/uuid.mjs";
import { errorMessage, translate } from "./i18n.mjs";

function defaultFormatLocal(ms, lang) {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "local";
  const format = new Intl.DateTimeFormat(lang === "en" ? "en" : "zh-Hant", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZoneName: "short",
  });
  return `${format.format(new Date(ms))} (${zone})`;
}

function defaultDownload(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

const VERSION_KEYS = ["VER_0", "VER_1", "VER_2", "VER_3", "VER_4", "VER_5", "VER_6", "VER_7", "VER_8"];
const VARIANT_KEYS = {
  "ncs-legacy": "VAR_NCS",
  rfc9562: "VAR_RFC",
  "microsoft-legacy": "VAR_MS",
  reserved: "VAR_RESERVED",
};

export function createApp(doc, env = {}) {
  const lang = doc.documentElement?.lang === "en" ? "en" : "zh-Hant";
  const t = (code, params) => translate(lang, code, params);
  const te = (code, params) => errorMessage(lang, code, params);
  const $ = (id) => doc.querySelector(`#${id}`);

  const fillRandom = env.fillRandom ?? ((array) => globalThis.crypto.getRandomValues(array));
  const nowMs = env.nowMs ?? (() => Date.now());
  const clipboardWrite = env.clipboardWrite ?? ((text) => globalThis.navigator.clipboard.writeText(text));
  const download = env.download ?? defaultDownload;
  const setTimeoutFn = env.setTimeout ?? globalThis.setTimeout.bind(globalThis);
  const clearTimeoutFn = env.clearTimeout ?? globalThis.clearTimeout.bind(globalThis);
  const formatLocal = env.formatLocal ?? ((ms) => defaultFormatLocal(ms, lang));

  const els = {
    version: $("version-select"),
    count: $("count-input"),
    countError: $("count-error"),
    uppercase: $("opt-uppercase"),
    hyphens: $("opt-hyphens"),
    generate: $("generate-button"),
    batchLabel: $("batch-label"),
    results: $("results-list"),
    copyAll: $("copy-all"),
    download: $("download-button"),
    inspectInput: $("inspect-input"),
    inspectReport: $("inspect-report"),
    announce: $("announce"),
  };

  let batch = [];
  let debounceId = null;

  function line(text) {
    const element = doc.createElement("div");
    element.textContent = text;
    return element;
  }

  function renderReport() {
    const report = inspectUuid(els.inspectInput.value);
    els.inspectReport.textContent = "";
    if (report.code === "EMPTY") {
      els.inspectReport.appendChild(line(te("EMPTY")));
      return;
    }
    if (!report.ok) {
      els.inspectReport.appendChild(line(t("STATUS_INVALID")));
      els.inspectReport.appendChild(line(te(report.code, report)));
      return;
    }
    els.inspectReport.appendChild(line(t("STATUS_OK")));
    els.inspectReport.appendChild(line(`${t("CANONICAL_LABEL")}: ${report.canonical}`));
    if (report.isNil) {
      els.inspectReport.appendChild(line(t("NIL_TEXT")));
      return;
    }
    if (report.isMax) {
      els.inspectReport.appendChild(line(t("MAX_TEXT")));
      return;
    }
    const versionText = report.versionNibble <= 8
      ? t(VERSION_KEYS[report.versionNibble])
      : t("VER_RESERVED", { nibble: report.versionNibble });
    els.inspectReport.appendChild(line(`${t("VERSION_LABEL")}: ${versionText}`));
    els.inspectReport.appendChild(line(`${t("VARIANT_LABEL")}: ${t(VARIANT_KEYS[report.variant])}`));
    if (report.versionCaveat) {
      els.inspectReport.appendChild(line(t("VERSION_CAVEAT")));
    }
    if (report.timestamp.kind === "unix-ms") {
      els.inspectReport.appendChild(line(
        `${t("TIMESTAMP_LABEL")}: ${report.timestamp.iso} UTC · ${t("TIMESTAMP_LOCAL")}: ${formatLocal(report.timestamp.ms)}`,
      ));
    } else if (report.timestamp.kind === "v6-not-decoded") {
      els.inspectReport.appendChild(line(`${t("TIMESTAMP_LABEL")}: ${t("TIMESTAMP_V6")}`));
    } else {
      els.inspectReport.appendChild(line(`${t("TIMESTAMP_LABEL")}: ${t("TIMESTAMP_NONE")}`));
    }
  }

  function scheduleReport() {
    if (debounceId !== null) clearTimeoutFn(debounceId);
    debounceId = setTimeoutFn(() => {
      debounceId = null;
      renderReport();
    }, 150);
  }

  function loadIntoInspector(value) {
    els.inspectInput.value = value;
    if (debounceId !== null) {
      clearTimeoutFn(debounceId);
      debounceId = null;
    }
    renderReport();
  }

  function renderBatch() {
    els.results.textContent = "";
    for (const value of batch) {
      const item = doc.createElement("li");
      item.textContent = value;
      item.addEventListener("click", () => loadIntoInspector(value));
      els.results.appendChild(item);
    }
    const hasBatch = batch.length > 0;
    els.copyAll.disabled = !hasBatch;
    els.download.disabled = !hasBatch;
    els.batchLabel.textContent = hasBatch
      ? t("BATCH_LABEL", { count: batch.length, version: els.version.value })
      : t("BATCH_EMPTY");
  }

  function onGenerate() {
    const checked = validateCount(els.count.value);
    if (!checked.ok) {
      els.countError.textContent = te(checked.code);
      return;
    }
    els.countError.textContent = "";
    const result = generateBatch({
      version: Number(els.version.value),
      count: checked.count,
      uppercase: els.uppercase.checked,
      hyphens: els.hyphens.checked,
      fillRandom,
      nowMs,
    });
    if (!result.ok) {
      els.countError.textContent = te(result.code);
      return;
    }
    batch = result.values;
    renderBatch();
  }

  async function onCopyAll() {
    if (batch.length === 0) return;
    try {
      await clipboardWrite(batchText(batch));
      els.announce.textContent = t("COPIED");
    } catch {
      els.announce.textContent = t("COPY_FAILED");
    }
  }

  function onDownload() {
    if (batch.length === 0) return;
    download("uuids.txt", batchText(batch));
  }

  els.generate.addEventListener("click", onGenerate);
  els.copyAll.addEventListener("click", onCopyAll);
  els.download.addEventListener("click", onDownload);
  els.inspectInput.addEventListener("input", scheduleReport);
  renderBatch();
  renderReport();

  return { els, getBatch: () => [...batch], renderReport, loadIntoInspector };
}

const isBrowser = typeof document !== "undefined" && typeof window !== "undefined";
if (isBrowser) {
  createApp(document);
}
