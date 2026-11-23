// Generator Size Calculator — DOM app.
// All rendering uses textContent/value. The Worker is created from a
// fixed source string (pure core + fixed handler) embedded by the build;
// no user content ever becomes code. No storage or network use.

import { Controller, EMPTY_ROW } from "./core/controller.mjs";
import { MAX_ROWS, PRESETS, REPORT_FILENAME } from "./core/core.mjs";

// Replaced by scripts/build.mjs with the fixed worker source string.
const WORKER_SOURCE = __WORKER_SOURCE__;

const LANG = document.documentElement.lang === "en" ? "en" : "zh";

const STRINGS = {
  zh: {
    presetPlaceholder: "填入預設值…",
    addRow: "新增一列",
    removeRow: "刪除此列",
    rowLabel: "家電",
    nameLabel: "名稱",
    runningLabel: "運轉瓦數（W）",
    startingLabel: "啟動瓦數（W）",
    status: {
      empty: "請輸入家電清單，或載入範例。",
      dirty: "輸入已變更，請重新執行",
      example: "已載入範例，按「計算發電機容量」執行。",
      busy: "處理中",
      cancelled: "已取消，可重新執行",
    },
    errors: {
      SCHEMA: "輸入格式不正確。",
      INPUT_LIMIT_NAME: "名稱太長（最多 40 個字元）。",
      INPUT_LIMIT_WATTS: "瓦數太長（最多 8 個字元）。",
      EMPTY_NAME: "名稱不可空白。",
      EMPTY_WATTS: "此欄不可空白。",
      EMPTY_LIST: "請至少加入一列家電。",
      UNICODE: "輸入含有不完整的文字字元。",
      INTEGER_FORMAT: "請輸入整數瓦數，例如 192；不接受小數、符號或空白。",
      RANGE_RUNNING: "運轉瓦數需介於 1 至 20000 W。",
      RANGE_STARTING: "啟動瓦數需介於 1 至 30000 W，且不可小於運轉瓦數。",
      DUPLICATE_NAME: "名稱重複，請使用不同的名稱。",
      ROW_LIMIT: "家電清單最多 12 列。",
      INTERNAL: "計算失敗，請重試。",
      WORKER_ERROR: "計算失敗，請重試。",
      OUTPUT_LIMIT: "報告太大，無法下載。",
    },
    rowPrefix: "第",
    rowSuffix: "列",
    oversizeNote: "超出常見家用機型範圍，請諮詢專業人員或評估並聯／備用機型。",
    noSurge: "無（全為電阻負載）",
    surgeFrom: "最大啟動增量來自",
    wattsUnit: "W",
    kvaUnit: "kVA",
  },
  en: {
    presetPlaceholder: "Fill preset…",
    addRow: "Add a row",
    removeRow: "Remove this row",
    rowLabel: "Appliance",
    nameLabel: "Name",
    runningLabel: "Running watts (W)",
    startingLabel: "Starting watts (W)",
    status: {
      empty: "Enter your appliance list, or load the example.",
      dirty: "Input changed. Run again.",
      example: "Example loaded. Run it when ready.",
      busy: "Working",
      cancelled: "Cancelled. You can run again.",
    },
    errors: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT_NAME: "Name is too long (at most 40 characters).",
      INPUT_LIMIT_WATTS: "Watts are too long (at most 8 characters).",
      EMPTY_NAME: "Name is required.",
      EMPTY_WATTS: "This field is required.",
      EMPTY_LIST: "Add at least one appliance.",
      UNICODE: "The input contains an incomplete text character.",
      INTEGER_FORMAT: "Enter whole-number watts, such as 192; no decimals, symbols or spaces.",
      RANGE_RUNNING: "Running watts must be between 1 and 20000 W.",
      RANGE_STARTING: "Starting watts must be between 1 and 30000 W and not below running watts.",
      DUPLICATE_NAME: "This name is already used. Use a different name.",
      ROW_LIMIT: "The appliance list holds at most 12 rows.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    rowPrefix: "Row",
    rowSuffix: "",
    oversizeNote: "Above common portable sizes; consult a professional or consider a standby unit.",
    noSurge: "None (all resistive loads)",
    surgeFrom: "Largest starting jump from",
    wattsUnit: "W",
    kvaUnit: "kVA",
  },
};

const T = STRINGS[LANG];

const $ = (id) => document.getElementById(id);
const form = $("calc-form");
const rowsEl = $("rows");
const addRowBtn = $("btn-add-row");
const statusEl = $("status");
const resultEl = $("result");
const sentenceEl = $("result-sentence");
const totalEl = $("result-total");
const surgeEl = $("result-max-surge");
const surgeRowEl = $("result-surge-row");
const peakEl = $("result-peak");
const requiredEl = $("result-required");
const requiredKvaEl = $("result-required-kva");
const peakKvaEl = $("result-peak-kva");
const recommendedEl = $("result-recommended");
const sizeEl = $("result-size");
const oversizeEl = $("result-oversize");
const rowsBodyEl = $("result-rows-body");
const runBtn = $("btn-run");
const exampleBtn = $("btn-example");
const cancelBtn = $("btn-cancel");
const resetBtn = $("btn-reset");
const downloadBtn = $("btn-download");

// --- Worker transport ------------------------------------------------------

let worker = null;
let workerUrl = null;

function terminateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  if (workerUrl) {
    URL.revokeObjectURL(workerUrl);
    workerUrl = null;
  }
}

function completeJob(generation, outcome) {
  if (controller.deliver(generation, outcome)) render();
}

function failJob(generation) {
  completeJob(generation, {
    ok: false,
    error: { code: "WORKER_ERROR", field: null, row: null },
  });
}

const transport = {
  send(snapshot, generation) {
    try {
      const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
      workerUrl = URL.createObjectURL(blob);
      const jobWorker = new Worker(workerUrl, { type: "module" });
      worker = jobWorker;
      jobWorker.onmessage = ({ data }) => {
        if (worker === jobWorker && data?.generation === generation) {
          completeJob(generation, data.outcome);
        }
      };
      jobWorker.onerror = () => {
        if (worker === jobWorker) failJob(generation);
      };
      jobWorker.postMessage({ generation, input: snapshot });
    } catch {
      // Let the submit handler render busy before reporting a startup failure.
      queueMicrotask(() => failJob(generation));
    }
  },
  terminate() {
    terminateWorker();
  },
};

const controller = new Controller(transport);

// --- Download handling -----------------------------------------------------

let downloadUrl = null;
let downloadTimer = null;

function revokeDownload() {
  if (downloadTimer !== null) {
    clearTimeout(downloadTimer);
    downloadTimer = null;
  }
  if (downloadUrl) {
    URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }
}

downloadBtn.addEventListener("click", () => {
  if (!controller.reportAvailable || !controller.reportBytes) return;
  revokeDownload();
  const blob = new Blob([controller.reportBytes], { type: "application/json" });
  downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = REPORT_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  downloadTimer = setTimeout(revokeDownload, 30000);
});

// --- Row DOM -----------------------------------------------------------------

let rowEls = [];

function makeField(rowIndex, field, labelText, inputMode) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = inputMode;
  input.autocomplete = "off";
  input.spellcheck = false;
  input.id = `input-${field}-${rowIndex}`;
  label.htmlFor = input.id;
  wrap.appendChild(label);
  wrap.appendChild(input);
  return { wrap, input };
}

function buildRow(rowIndex, row) {
  const root = document.createElement("div");
  root.className = "appliance-row";
  const heading = document.createElement("h3");
  heading.textContent = `${T.rowLabel} ${rowIndex + 1}`;
  root.appendChild(heading);

  const nameField = makeField(rowIndex, "name", T.nameLabel, "text");
  const runningField = makeField(rowIndex, "running", T.runningLabel, "numeric");
  const startingField = makeField(rowIndex, "starting", T.startingLabel, "numeric");
  nameField.input.value = row.name;
  runningField.input.value = row.runningWatts;
  startingField.input.value = row.startingWatts;

  const preset = document.createElement("select");
  preset.id = `select-preset-${rowIndex}`;
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = T.presetPlaceholder;
  preset.appendChild(placeholder);
  for (const p of PRESETS) {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = LANG === "zh" ? p.nameZh : p.nameEn;
    preset.appendChild(option);
  }
  const presetLabel = document.createElement("label");
  presetLabel.textContent = T.presetPlaceholder;
  presetLabel.htmlFor = preset.id;
  const presetWrap = document.createElement("div");
  presetWrap.className = "field preset-field";
  presetWrap.appendChild(presetLabel);
  presetWrap.appendChild(preset);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = T.removeRow;

  const errorEl = document.createElement("p");
  errorEl.className = "field-error";
  errorEl.id = `error-row-${rowIndex}`;
  errorEl.hidden = true;

  root.appendChild(nameField.wrap);
  root.appendChild(runningField.wrap);
  root.appendChild(startingField.wrap);
  root.appendChild(presetWrap);
  root.appendChild(removeBtn);
  root.appendChild(errorEl);

  const entry = {
    root,
    name: nameField.input,
    running: runningField.input,
    starting: startingField.input,
    preset,
    remove: removeBtn,
    error: errorEl,
  };

  const onInput = () => {
    controller.edit(collectFromDom());
    render();
  };
  nameField.input.addEventListener("input", onInput);
  runningField.input.addEventListener("input", onInput);
  startingField.input.addEventListener("input", onInput);

  preset.addEventListener("change", () => {
    const found = PRESETS.find((p) => p.id === preset.value);
    if (found) {
      nameField.input.value = LANG === "zh" ? found.nameZh : found.nameEn;
      runningField.input.value = found.runningWatts;
      startingField.input.value = found.startingWatts;
    }
    preset.value = "";
    controller.edit(collectFromDom());
    render();
  });

  removeBtn.addEventListener("click", () => {
    const index = rowEls.indexOf(entry);
    if (index !== -1) {
      controller.removeRow(index);
      syncRowsFromDraft();
      render();
    }
  });

  return entry;
}

function collectFromDom() {
  return rowEls.map((entry) => ({
    name: entry.name.value,
    runningWatts: entry.running.value,
    startingWatts: entry.starting.value,
  }));
}

function syncRowsFromDraft() {
  for (const entry of rowEls) entry.root.remove();
  rowEls = controller.draft.appliances.map((row, i) => buildRow(i, row));
  for (const entry of rowEls) rowsEl.appendChild(entry.root);
}

// --- Rendering ---------------------------------------------------------------

let focusFirstErrorOnError = false;

function rowLabel(row) {
  if (LANG === "zh") return `${T.rowPrefix} ${row} ${T.rowSuffix}`;
  return `${T.rowPrefix} ${row}`;
}

function errorMessage(error) {
  if (!error) return "";
  switch (error.code) {
    case "INPUT_LIMIT":
      return error.field === "name" ? T.errors.INPUT_LIMIT_NAME : T.errors.INPUT_LIMIT_WATTS;
    case "EMPTY":
      if (error.field === "appliances") return T.errors.EMPTY_LIST;
      return error.field === "name" ? T.errors.EMPTY_NAME : T.errors.EMPTY_WATTS;
    case "RANGE":
      return error.field === "runningWatts" ? T.errors.RANGE_RUNNING : T.errors.RANGE_STARTING;
    case "DUPLICATE_NAME":
      return T.errors.DUPLICATE_NAME;
    case "ROW_LIMIT":
      return T.errors.ROW_LIMIT;
    default:
      return T.errors[error.code] || T.errors.WORKER_ERROR;
  }
}

function statusForError(error) {
  const message = errorMessage(error);
  if (error.row) return `${rowLabel(error.row)}：${message}`;
  return message;
}

function buildSentence(result) {
  if (LANG === "zh") {
    let sentence = `總運轉瓦數 ${result.totalRunningW} ${T.wattsUnit}，啟動突波 ${result.peakW} ${T.wattsUnit}，建議發電機 ${result.recommendedKva} ${T.kvaUnit}，市售規格 ${result.recommendedSizeKva} ${T.kvaUnit}。`;
    if (result.oversize) sentence += T.oversizeNote;
    return sentence;
  }
  let sentence = `Total running watts ${result.totalRunningW} ${T.wattsUnit}, starting surge ${result.peakW} ${T.wattsUnit}. Recommended generator ${result.recommendedKva} ${T.kvaUnit} (retail size ${result.recommendedSizeKva} ${T.kvaUnit}).`;
  if (result.oversize) sentence += ` ${T.oversizeNote}`;
  return sentence;
}

function clearRowErrors() {
  for (const entry of rowEls) {
    entry.error.textContent = "";
    entry.error.hidden = true;
    for (const input of [entry.name, entry.running, entry.starting]) {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-errormessage");
    }
  }
}

function fieldInput(entry, field) {
  if (field === "name") return entry.name;
  if (field === "runningWatts") return entry.running;
  if (field === "startingWatts") return entry.starting;
  return null;
}

function render() {
  const snap = controller.snapshot();

  form.setAttribute("aria-busy", snap.state === "busy" ? "true" : "false");
  runBtn.disabled = snap.state === "busy";
  cancelBtn.hidden = snap.state !== "busy";
  downloadBtn.hidden = !snap.reportAvailable;
  if (!snap.reportAvailable) revokeDownload();
  addRowBtn.disabled = snap.draft.appliances.length >= MAX_ROWS;
  for (const entry of rowEls) {
    entry.remove.disabled = snap.draft.appliances.length <= 1;
  }

  clearRowErrors();

  if (snap.state === "success" && snap.result) {
    const result = snap.result;
    sentenceEl.textContent = buildSentence(result);
    totalEl.textContent = `${result.totalRunningW} ${T.wattsUnit}`;
    surgeEl.textContent = `${result.maxSurgeExtraW} ${T.wattsUnit}`;
    surgeRowEl.textContent =
      result.largestSurgeRow === null ? T.noSurge : `${T.surgeFrom} ${result.largestSurgeRow}`;
    peakEl.textContent = `${result.peakW} ${T.wattsUnit}`;
    requiredEl.textContent = `${result.requiredRunningW} ${T.wattsUnit}`;
    requiredKvaEl.textContent = `${result.requiredKva} ${T.kvaUnit}`;
    peakKvaEl.textContent = `${result.peakKva} ${T.kvaUnit}`;
    recommendedEl.textContent = `${result.recommendedKva} ${T.kvaUnit}`;
    sizeEl.textContent = `${result.recommendedSizeKva} ${T.kvaUnit}`;
    oversizeEl.textContent = result.oversize ? T.oversizeNote : "";
    oversizeEl.hidden = !result.oversize;
    while (rowsBodyEl.children.length > 0) rowsBodyEl.children[0].remove();
    for (const row of result.rows) {
      const tr = document.createElement("tr");
      for (const value of [row.name, String(row.runningWatts), String(row.startingWatts), String(row.surgeExtraW)]) {
        const td = document.createElement("td");
        td.textContent = value;
        tr.appendChild(td);
      }
      rowsBodyEl.appendChild(tr);
    }
    resultEl.hidden = false;
    statusEl.textContent = sentenceEl.textContent;
  } else {
    resultEl.hidden = true;
    if (snap.state === "error" && snap.error) {
      const message = errorMessage(snap.error);
      statusEl.textContent = statusForError(snap.error);
      if (snap.error.row && snap.error.field) {
        const entry = rowEls[snap.error.row - 1];
        const input = entry ? fieldInput(entry, snap.error.field) : null;
        if (entry && input) {
          entry.error.textContent = message;
          entry.error.hidden = false;
          input.setAttribute("aria-invalid", "true");
          input.setAttribute("aria-errormessage", entry.error.id);
        }
      }
      if (focusFirstErrorOnError) {
        focusFirstErrorOnError = false;
        let target = null;
        if (snap.error.row && snap.error.field) {
          const entry = rowEls[snap.error.row - 1];
          target = entry ? fieldInput(entry, snap.error.field) : null;
        }
        (target || rowEls[0]?.name || runBtn).focus();
      }
    } else if (snap.state === "dirty" && snap.exampleLoaded) {
      statusEl.textContent = T.status.example;
    } else {
      statusEl.textContent = T.status[snap.state] || "";
    }
  }
}

// --- Events ------------------------------------------------------------------

form.addEventListener("submit", (event) => {
  event.preventDefault();
  focusFirstErrorOnError = true;
  controller.run();
  render();
});

addRowBtn.addEventListener("click", () => {
  controller.addRow();
  syncRowsFromDraft();
  render();
  const last = rowEls[rowEls.length - 1];
  if (last) last.name.focus();
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
  syncRowsFromDraft();
  render();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  render();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  syncRowsFromDraft();
  render();
  if (rowEls[0]) rowEls[0].name.focus();
});

window.addEventListener("pagehide", () => {
  controller.stopWork();
  revokeDownload();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    controller.reset();
    syncRowsFromDraft();
    render();
  }
});

syncRowsFromDraft();
render();
