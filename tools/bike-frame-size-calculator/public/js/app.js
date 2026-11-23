// Bike Frame Size Calculator — DOM app.
// All rendering uses textContent/value. The Worker is created from a fixed
// source string (pure core + fixed handler) embedded by the build; no user
// content ever becomes code. No fetch, storage, or network use.

import { Controller } from "./core/controller.mjs";
import { normalizeEcho, REPORT_FILENAME } from "./core/core.mjs";

// Replaced by scripts/build.mjs with the fixed worker source string.
const WORKER_SOURCE = __WORKER_SOURCE__;

const LANG = document.documentElement.lang === "en" ? "en" : "zh";

const STRINGS = {
  zh: {
    bikeType: { road: "公路車", mountain: "登山車", hybrid: "混合車" },
    status: {
      empty: "請輸入身高與跨高，選擇車型，或載入範例。",
      dirty: "輸入已變更，請重新執行",
      example: "已載入範例，按「計算建議尺寸」執行。",
      busy: "處理中",
      cancelled: "已取消，可重新執行",
    },
    errors: {
      SCHEMA: "輸入格式不正確。",
      INPUT_LIMIT: "輸入太長（最多 6 個字元）。",
      UNICODE: "輸入含有不完整的文字字元。",
      EMPTY: "此欄不可空白。",
      DECIMAL_FORMAT: "請輸入十進位數字，例如 175.5；最多 1 位小數。",
      RANGE_HEIGHT: "身高需介於 120 至 220 公分。",
      RANGE_INSEAM: "跨高需介於 50 至 110 公分。",
      RANGE_INSEAM_TALL: "跨高不可大於身高，請重新量測跨高。",
      ENUM: "請選擇車型：公路車、登山車或混合車。",
      INTERNAL: "計算失敗，請重試。",
      WORKER_ERROR: "計算失敗，請重試。",
      OUTPUT_LIMIT: "報告太大，無法下載。",
    },
    warning: "跨高佔身高比例異常，請重新量測跨高（書本法）。",
    conversionNote: "換算對照",
    rangeUnitCm: "公分",
    rangeUnitIn: "英吋",
  },
  en: {
    bikeType: { road: "Road", mountain: "Mountain", hybrid: "Hybrid" },
    status: {
      empty: "Enter your height and inseam, pick a bike type, or load the example.",
      dirty: "Input changed. Run again.",
      example: "Example loaded. Run it when ready.",
      busy: "Working",
      cancelled: "Cancelled. You can run again.",
    },
    errors: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long (at most 6 characters).",
      UNICODE: "The input contains an incomplete text character.",
      EMPTY: "This field is required.",
      DECIMAL_FORMAT: "Enter a decimal number, such as 175.5, with at most 1 decimal place.",
      RANGE_HEIGHT: "Height must be between 120 and 220 cm.",
      RANGE_INSEAM: "Inseam must be between 50 and 110 cm.",
      RANGE_INSEAM_TALL: "Inseam must not exceed height. Re-measure your inseam.",
      ENUM: "Pick a bike type: road, mountain, or hybrid.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    warning: "Unusual inseam-to-height ratio. Re-measure your inseam with the book method.",
    conversionNote: "conversion",
    rangeUnitCm: "cm",
    rangeUnitIn: "in",
  },
};

const T = STRINGS[LANG];

const $ = (id) => document.getElementById(id);
const form = $("calc-form");
const heightInput = $("input-height");
const inseamInput = $("input-inseam");
const typeInputs = {
  road: $("input-type-road"),
  mountain: $("input-type-mountain"),
  hybrid: $("input-type-hybrid"),
};
const statusEl = $("status");
const resultEl = $("result");
const sentenceEl = $("result-sentence");
const centreEl = $("result-centre");
const rangeCmEl = $("result-range-cm");
const rangeInEl = $("result-range-in");
const letterEl = $("result-letter");
const saddleEl = $("result-saddle");
const warningEl = $("result-warning");
const runBtn = $("btn-run");
const exampleBtn = $("btn-example");
const cancelBtn = $("btn-cancel");
const resetBtn = $("btn-reset");
const downloadBtn = $("btn-download");
const errorEls = {
  heightCm: $("error-height"),
  inseamCm: $("error-inseam"),
  bikeType: $("error-type"),
};
const fieldEls = { heightCm: heightInput, inseamCm: inseamInput, bikeType: typeInputs.road };

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

// --- Rendering ---------------------------------------------------------------

let focusFirstErrorOnError = false;

function format1(n) {
  return n.toFixed(1);
}

function errorMessage(error) {
  if (!error) return "";
  if (error.code === "RANGE") {
    if (error.field === "heightCm") return T.errors.RANGE_HEIGHT;
    if (error.field === "inseamCm") {
      // Cross-field (inseam > height) shares the RANGE code; tell it apart
      // from the 50–110 cm range by the draft values themselves.
      const h = Number(controller.draft.heightCm);
      const s = Number(controller.draft.inseamCm);
      if (Number.isFinite(h) && Number.isFinite(s) && s > h) {
        return T.errors.RANGE_INSEAM_TALL;
      }
      return T.errors.RANGE_INSEAM;
    }
  }
  return T.errors[error.code] || T.errors.WORKER_ERROR;
}

function buildSentence(result, draft) {
  const height = normalizeEcho(draft.heightCm);
  const inseam = normalizeEcho(draft.inseamCm);
  const type = T.bikeType[result.bikeType];
  if (LANG === "zh") {
    let sentence = `身高 ${height} 公分，跨高 ${inseam} 公分，${type}建議車架 ${format1(result.centreCm)} 公分（範圍 ${format1(result.rangeCm.low)}–${format1(result.rangeCm.high)} 公分），尺碼 ${result.letter}，起始座墊高度 ${format1(result.saddleHeightCm)} 公分。`;
    if (result.warning) sentence += T.warning;
    return sentence;
  }
  let sentence = `Height ${height} cm, inseam ${inseam} cm: ${type.toLowerCase()} bike frame ${format1(result.centreCm)} cm (range ${format1(result.rangeCm.low)}–${format1(result.rangeCm.high)} cm), size ${result.letter}, starting saddle height ${format1(result.saddleHeightCm)} cm.`;
  if (result.warning) sentence += ` ${T.warning}`;
  return sentence;
}

function setFieldError(field, message) {
  const el = errorEls[field];
  if (!el) return;
  if (message) {
    el.textContent = message;
    el.hidden = false;
  } else {
    el.textContent = "";
    el.hidden = true;
  }
  const input = fieldEls[field];
  if (input) {
    if (message) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-errormessage", el.id);
    } else {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-errormessage");
    }
  }
}

function currentBikeType() {
  for (const key of ["road", "mountain", "hybrid"]) {
    if (typeInputs[key] && typeInputs[key].checked) return key;
  }
  return controller.draft.bikeType;
}

function render() {
  const snap = controller.snapshot();

  form.setAttribute("aria-busy", snap.state === "busy" ? "true" : "false");
  runBtn.disabled = snap.state === "busy";
  cancelBtn.hidden = snap.state !== "busy";
  downloadBtn.hidden = !snap.reportAvailable;
  if (!snap.reportAvailable) revokeDownload();

  setFieldError("heightCm", null);
  setFieldError("inseamCm", null);
  setFieldError("bikeType", null);

  if (snap.state === "success" && snap.result) {
    const result = snap.result;
    sentenceEl.textContent = buildSentence(result, snap.draft);
    centreEl.textContent = `${format1(result.centreCm)} ${T.rangeUnitCm} (${format1(result.centreIn)} ${T.rangeUnitIn} · ${T.conversionNote})`;
    rangeCmEl.textContent = `${format1(result.rangeCm.low)} – ${format1(result.rangeCm.high)} ${T.rangeUnitCm}`;
    rangeInEl.textContent = `${format1(result.rangeIn.low)} – ${format1(result.rangeIn.high)} ${T.rangeUnitIn} · ${T.conversionNote}`;
    letterEl.textContent = result.letter;
    saddleEl.textContent = `${format1(result.saddleHeightCm)} ${T.rangeUnitCm}`;
    if (result.warning) {
      warningEl.textContent = `${T.warning} (${result.warning.ratio.toFixed(3)})`;
      warningEl.hidden = false;
    } else {
      warningEl.textContent = "";
      warningEl.hidden = true;
    }
    resultEl.hidden = false;
    statusEl.textContent = sentenceEl.textContent;
  } else {
    resultEl.hidden = true;
    if (snap.state === "error" && snap.error) {
      const message = errorMessage(snap.error);
      statusEl.textContent = message;
      if (snap.error.field && errorEls[snap.error.field]) {
        setFieldError(snap.error.field, message);
      }
      if (focusFirstErrorOnError) {
        focusFirstErrorOnError = false;
        const target =
          snap.error.field && fieldEls[snap.error.field]
            ? fieldEls[snap.error.field]
            : heightInput;
        target.focus();
      }
    } else if (snap.state === "dirty" && snap.exampleLoaded) {
      statusEl.textContent = T.status.example;
    } else {
      statusEl.textContent = T.status[snap.state] || "";
    }
  }
}

function syncDomFromDraft() {
  const draft = controller.draft;
  heightInput.value = draft.heightCm;
  inseamInput.value = draft.inseamCm;
  for (const key of ["road", "mountain", "hybrid"]) {
    if (typeInputs[key]) typeInputs[key].checked = draft.bikeType === key;
  }
}

// --- Events ------------------------------------------------------------------

form.addEventListener("submit", (event) => {
  event.preventDefault();
  focusFirstErrorOnError = true;
  controller.run();
  render();
});

heightInput.addEventListener("input", () => {
  controller.edit({ heightCm: heightInput.value });
  render();
});
inseamInput.addEventListener("input", () => {
  controller.edit({ inseamCm: inseamInput.value });
  render();
});
for (const key of ["road", "mountain", "hybrid"]) {
  if (typeInputs[key]) {
    typeInputs[key].addEventListener("change", () => {
      controller.edit({ bikeType: currentBikeType() });
      render();
    });
  }
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
  syncDomFromDraft();
  render();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  render();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  syncDomFromDraft();
  render();
  heightInput.focus();
});

window.addEventListener("pagehide", () => {
  controller.stopWork();
  revokeDownload();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    controller.reset();
    syncDomFromDraft();
    render();
  }
});

syncDomFromDraft();
render();
