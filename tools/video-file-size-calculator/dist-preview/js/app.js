// DOM wiring for the Video File Size Calculator. All user-visible text
// is set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. Mode and bitrate-source switches only change which
// fields are enabled — no typed value is ever cleared. The fixed
// report download (video-file-size-report.json) is created only on an
// explicit click while the controller reports it available, and its
// object URL is revoked after 30 seconds or as soon as the result is
// invalidated, whichever comes first.

import { createController } from "./controller.mjs";
import { FIELDS, buildReport } from "./core/video-size.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      mode: "模式",
      duration: "片長（時：分：秒）",
      bitrateSource: "位元率來源",
      preset: "解析度預設",
      customBitrateMbps: "自訂視訊位元率（Mbps）",
      codec: "編碼",
      audioKbps: "音訊位元率",
      targetSize: "目標大小",
      targetUnit: "單位",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有無效字元",
      EMPTY: "此欄位不可空白",
      DURATION_FORMAT: "片長格式須為 時：分：秒（分、秒為 00–59）",
      DECIMAL_FORMAT: "請輸入整數或最多兩位小數的數字",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    errorEnum: {
      mode: "請選擇模式",
      bitrateSource: "請選擇位元率來源",
      preset: "請選擇解析度預設",
      codec: "請選擇編碼",
      audioKbps: "請選擇音訊位元率",
      targetUnit: "請選擇單位",
    },
    errorRange: {
      duration: "片長至少 1 秒",
      customBitrateMbps: "自訂位元率須在 0.1–1000 Mbps 之間",
      targetSize: "目標大小換算後須在 1 位元組至 2^53−1 位元組之間",
    },
    statusEmpty: "尚未計算。輸入片長與位元率設定，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例），請按「計算」執行。",
    downloaded: "報告已下載。",
    summarySize: (result) => `檔案大小 ${result.sizeGB} GB（${result.sizeGiB} GiB）`,
    summaryDuration: (result) => `最長時長 ${result.maxDurationText}`,
    rows: {
      durationText: "片長",
      targetBytes: "目標大小（位元組）",
      videoBps: "視訊位元率（bps）",
      audioBps: "音訊位元率（bps）",
      totalBps: "合計位元率（bps）",
      sizeMB: "大小（MB）",
      sizeGiB: "大小（GiB）",
      sizeMiB: "大小（MiB）",
      bytes: "總位元組",
      usedBytes: "實際占用（位元組）",
      headroomBytes: "剩餘（位元組）",
    },
  },
  en: {
    fieldLabel: {
      mode: "Mode",
      duration: "Duration (H:MM:SS)",
      bitrateSource: "Bitrate source",
      preset: "Resolution preset",
      customBitrateMbps: "Custom video bitrate (Mbps)",
      codec: "Codec",
      audioKbps: "Audio bitrate",
      targetSize: "Target size",
      targetUnit: "Unit",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains invalid characters.",
      EMPTY: "This field must not be empty.",
      DURATION_FORMAT: "Use H:MM:SS with minutes and seconds from 00 to 59.",
      DECIMAL_FORMAT: "Enter a whole number or a number with at most two decimal places.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    errorEnum: {
      mode: "Choose a mode.",
      bitrateSource: "Choose a bitrate source.",
      preset: "Choose a resolution preset.",
      codec: "Choose a codec.",
      audioKbps: "Choose an audio bitrate.",
      targetUnit: "Choose a unit.",
    },
    errorRange: {
      duration: "Duration must be at least 1 second.",
      customBitrateMbps: "Custom bitrate must be between 0.1 and 1000 Mbps.",
      targetSize: "Target size must convert to between 1 byte and 2^53−1 bytes.",
    },
    statusEmpty: "Nothing calculated yet. Enter a duration and bitrate settings, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case). Press “Calculate” to run it.",
    downloaded: "Report downloaded.",
    summarySize: (result) => `File size ${result.sizeGB} GB (${result.sizeGiB} GiB)`,
    summaryDuration: (result) => `Maximum duration ${result.maxDurationText}`,
    rows: {
      durationText: "Duration",
      targetBytes: "Target size (bytes)",
      videoBps: "Video bitrate (bps)",
      audioBps: "Audio bitrate (bps)",
      totalBps: "Total bitrate (bps)",
      sizeMB: "Size (MB)",
      sizeGiB: "Size (GiB)",
      sizeMiB: "Size (MiB)",
      bytes: "Total bytes",
      usedBytes: "Used (bytes)",
      headroomBytes: "Headroom (bytes)",
    },
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("video-form");
const inputs = {
  duration: document.getElementById("field-duration"),
  preset: document.getElementById("field-preset"),
  customBitrateMbps: document.getElementById("field-customBitrateMbps"),
  codec: document.getElementById("field-codec"),
  audioKbps: document.getElementById("field-audioKbps"),
  targetSize: document.getElementById("field-targetSize"),
  targetUnit: document.getElementById("field-targetUnit"),
};
const modeRadios = {
  size: document.getElementById("field-mode-size"),
  duration: document.getElementById("field-mode-duration"),
};
const sourceRadios = {
  preset: document.getElementById("field-source-preset"),
  custom: document.getElementById("field-source-custom"),
};
const fieldErrors = {
  mode: document.getElementById("error-mode"),
  duration: document.getElementById("error-duration"),
  bitrateSource: document.getElementById("error-bitrateSource"),
  preset: document.getElementById("error-preset"),
  customBitrateMbps: document.getElementById("error-customBitrateMbps"),
  codec: document.getElementById("error-codec"),
  audioKbps: document.getElementById("error-audioKbps"),
  targetSize: document.getElementById("error-targetSize"),
  targetUnit: document.getElementById("error-targetUnit"),
};
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const zeroNoteEl = document.getElementById("zero-note");
const tableBody = document.getElementById("detail-rows");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");

let submitted = false;

function createWorker() {
  const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url, { type: "module" });
  const originalTerminate = worker.terminate.bind(worker);
  worker.terminate = () => {
    originalTerminate();
    URL.revokeObjectURL(url);
  };
  return worker;
}

let reportUrl = null;
let reportRevokeTimer = null;

function revokeReportUrl() {
  if (reportRevokeTimer !== null) {
    clearTimeout(reportRevokeTimer);
    reportRevokeTimer = null;
  }
  if (reportUrl !== null) {
    URL.revokeObjectURL(reportUrl);
    reportUrl = null;
  }
}

function focusTargetFor(field) {
  if (field === "mode") return modeRadios.size;
  if (field === "bitrateSource") return sourceRadios.preset;
  return inputs[field] ?? null;
}

function setFieldError(field, message) {
  const errorEl = fieldErrors[field];
  const target = focusTargetFor(field);
  if (message === null) {
    if (target !== null) {
      target.removeAttribute("aria-invalid");
      target.removeAttribute("aria-errormessage");
    }
    errorEl.textContent = "";
    return;
  }
  if (target !== null) {
    target.setAttribute("aria-invalid", "true");
    target.setAttribute("aria-errormessage", `error-${field}`);
  }
  errorEl.textContent = message;
}

function clearFieldErrors() {
  for (const field of FIELDS) setFieldError(field, null);
}

function errorMessage(error) {
  if (error.code === "RANGE") return t.errorRange[error.field] ?? t.error.INTERNAL;
  if (error.code === "ENUM") return t.errorEnum[error.field] ?? t.error.INTERNAL;
  return t.error[error.code] ?? t.error.INTERNAL;
}

function renderDetailRows(result) {
  tableBody.replaceChildren();
  const entries =
    result.mode === "size"
      ? [
          ["durationText", result.durationText],
          ["videoBps", String(result.videoBps)],
          ["audioBps", String(result.audioBps)],
          ["totalBps", String(result.totalBps)],
          ["sizeMB", result.sizeMB],
          ["sizeMiB", result.sizeMiB],
          ["bytes", String(result.bytes)],
        ]
      : [
          ["targetBytes", String(result.targetBytes)],
          ["videoBps", String(result.videoBps)],
          ["audioBps", String(result.audioBps)],
          ["totalBps", String(result.totalBps)],
          ["usedBytes", String(result.usedBytes)],
          ["headroomBytes", String(result.headroomBytes)],
        ];
  for (const [key, value] of entries) {
    const tr = document.createElement("tr");
    const labelCell = document.createElement("td");
    labelCell.textContent = t.rows[key];
    const valueCell = document.createElement("td");
    valueCell.textContent = value;
    tr.appendChild(labelCell);
    tr.appendChild(valueCell);
    tableBody.appendChild(tr);
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error, reportAvailable } = publicState;
  if (inputs.duration.value !== draft.duration) inputs.duration.value = draft.duration;
  if (inputs.preset.value !== draft.preset) inputs.preset.value = draft.preset;
  if (inputs.customBitrateMbps.value !== draft.customBitrateMbps) {
    inputs.customBitrateMbps.value = draft.customBitrateMbps;
  }
  if (inputs.codec.value !== draft.codec) inputs.codec.value = draft.codec;
  if (inputs.audioKbps.value !== draft.audioKbps) inputs.audioKbps.value = draft.audioKbps;
  if (inputs.targetSize.value !== draft.targetSize) inputs.targetSize.value = draft.targetSize;
  if (inputs.targetUnit.value !== draft.targetUnit) inputs.targetUnit.value = draft.targetUnit;
  modeRadios.size.checked = draft.mode === "size";
  modeRadios.duration.checked = draft.mode === "duration";
  sourceRadios.preset.checked = draft.bitrateSource === "preset";
  sourceRadios.custom.checked = draft.bitrateSource === "custom";
  // Inactive fields are disabled but keep their values, exactly as the
  // SPEC's userFlow pins.
  inputs.duration.disabled = draft.mode !== "size";
  inputs.targetSize.disabled = draft.mode !== "duration";
  inputs.targetUnit.disabled = draft.mode !== "duration";
  inputs.preset.disabled = draft.bitrateSource !== "preset";
  inputs.customBitrateMbps.disabled = draft.bitrateSource !== "custom";
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  cancelBtn.hidden = state !== "busy";
  runBtn.disabled = state === "busy";
  downloadBtn.hidden = !reportAvailable;
  if (!reportAvailable) revokeReportUrl();

  if (state === "empty") {
    statusEl.textContent = t.statusEmpty;
    resultsEl.hidden = true;
    clearFieldErrors();
  } else if (state === "dirty") {
    statusEl.textContent = t.statusDirty;
    resultsEl.hidden = true;
    clearFieldErrors();
  } else if (state === "busy") {
    statusEl.textContent = t.statusBusy;
    resultsEl.hidden = true;
  } else if (state === "cancelled") {
    statusEl.textContent = t.statusCancelled;
    resultsEl.hidden = true;
    clearFieldErrors();
  } else if (state === "error") {
    clearFieldErrors();
    if (error !== null) {
      const message = errorMessage(error);
      if (error.field !== null && FIELDS.includes(error.field)) {
        setFieldError(error.field, message);
        statusEl.textContent = `${t.fieldLabel[error.field]}：${message}`;
        if (submitted) {
          submitted = false;
          const target = focusTargetFor(error.field);
          if (target !== null) target.focus();
        }
      } else {
        statusEl.textContent = message;
      }
    } else {
      statusEl.textContent = t.error.INTERNAL;
    }
    resultsEl.hidden = true;
  } else if (state === "success" && result !== null) {
    const summary =
      result.mode === "size" ? t.summarySize(result) : t.summaryDuration(result);
    summaryEl.textContent = summary;
    statusEl.textContent = summary;
    zeroNoteEl.hidden = !(result.mode === "duration" && result.maxDurationSec === 0);
    renderDetailRows(result);
    resultsEl.hidden = false;
    clearFieldErrors();
  }
}

const controller = createController({ createWorker, onChange: render });

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitted = true;
  controller.run();
});

for (const radio of [modeRadios.size, modeRadios.duration]) {
  radio.addEventListener("change", () => {
    if (radio.checked) controller.edit({ mode: radio.value });
  });
}
for (const radio of [sourceRadios.preset, sourceRadios.custom]) {
  radio.addEventListener("change", () => {
    if (radio.checked) controller.edit({ bitrateSource: radio.value });
  });
}
inputs.duration.addEventListener("input", () => {
  controller.edit({ duration: inputs.duration.value });
});
inputs.preset.addEventListener("change", () => {
  controller.edit({ preset: inputs.preset.value });
});
inputs.customBitrateMbps.addEventListener("input", () => {
  controller.edit({ customBitrateMbps: inputs.customBitrateMbps.value });
});
inputs.codec.addEventListener("change", () => {
  controller.edit({ codec: inputs.codec.value });
});
inputs.audioKbps.addEventListener("change", () => {
  controller.edit({ audioKbps: inputs.audioKbps.value });
});
inputs.targetSize.addEventListener("input", () => {
  controller.edit({ targetSize: inputs.targetSize.value });
});
inputs.targetUnit.addEventListener("change", () => {
  controller.edit({ targetUnit: inputs.targetUnit.value });
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  modeRadios.size.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  runBtn.focus();
});

downloadBtn.addEventListener("click", () => {
  const snapshot = controller.getState();
  if (!snapshot.reportAvailable || snapshot.result === null) return;
  const report = buildReport(snapshot.result);
  if (!report.ok) {
    statusEl.textContent = errorMessage(report.error);
    return;
  }
  revokeReportUrl();
  const blob = new Blob([report.text], { type: "application/json" });
  reportUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = reportUrl;
  anchor.download = report.filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  reportRevokeTimer = setTimeout(revokeReportUrl, 30000);
  statusEl.textContent = t.downloaded;
});

window.addEventListener("pagehide", () => {
  controller.destroy();
  revokeReportUrl();
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) controller.reset();
});

render(controller.getState());
