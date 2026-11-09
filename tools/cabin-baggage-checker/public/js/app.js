// DOM wiring for the Cabin Baggage Checker. All user-visible text is
// set through textContent/value only; user input never becomes markup.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, generation, and state machine; this file only renders it. The
// fixed report download (cabin-baggage-report.json) is created only on
// an explicit click while the controller reports it available, and its
// object URL is revoked after 30 seconds or as soon as the result is
// invalidated, whichever comes first.

import { createController } from "./controller.mjs";
import { AIRLINE_IDS, FIELDS, buildReport } from "./core/baggage.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const TEXT_FIELDS = FIELDS.slice(0, 8);

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      bagLength: "主行李長（公分）",
      bagWidth: "主行李寬（公分）",
      bagHeight: "主行李高（公分）",
      bagWeightKg: "主行李重量（公斤）",
      personalLength: "個人物品長（公分）",
      personalWidth: "個人物品寬（公分）",
      personalHeight: "個人物品高（公分）",
      personalWeightKg: "個人物品重量（公斤）",
      airlines: "要比對的航空公司",
    },
    airlineName: {
      eva: "長榮航空",
      "china-airlines": "中華航空",
      starlux: "星宇航空",
      "tigerair-taiwan": "台灣虎航",
      ana: "全日空",
      jal: "日本航空",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有無效字元",
      EMPTY: "請輸入數值",
      DECIMAL_FORMAT: "請輸入最多一位小數的數字",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    errorRangeDimension: "尺寸須大於 0、至多 200 公分",
    errorRangeWeight: "重量須大於 0、至多 100 公斤",
    errorAirlinesEmpty: "請至少選擇一家航空公司",
    errorAirlinesInvalid: "航空公司選擇不正確，請重新選擇",
    statusEmpty: "尚未檢查。輸入行李尺寸與重量，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例），請按「檢查行李」執行。",
    downloaded: "報告已下載。",
    summaryPass: (fits, compared) => `全部符合（${fits}/${compared}）`,
    summaryPartial: (fits, compared) => `符合所選 ${compared} 家中的 ${fits} 家`,
    sortedNote: (bag, personal) =>
      personal === null
        ? `主行李三邊（由大到小）：${bag.join(" × ")} 公分；無個人物品。`
        : `主行李三邊（由大到小）：${bag.join(" × ")} 公分；個人物品三邊（由大到小）：${personal.join(" × ")} 公分。`,
    passText: "符合",
    failText: "不符合",
    weightText: (mode, checked, limit, margin) =>
      mode === "main"
        ? `主行李 ${checked} / 上限 ${limit} 公斤，差距 ${margin} 公斤`
        : `合計 ${checked} / 上限 ${limit} 公斤，差距 ${margin} 公斤`,
    personalNotApplicable: "無個人物品",
    personalNotSpecified: "未公告尺寸",
    personalPass: (margins) => `符合，差距 ${margins.join(" / ")} 公分`,
    personalFail: (margins) => `不符合，差距 ${margins.join(" / ")} 公分`,
    triple: (values) => values.join(" × "),
    margins: (values) => values.join(" / "),
  },
  en: {
    fieldLabel: {
      bagLength: "Main bag length (cm)",
      bagWidth: "Main bag width (cm)",
      bagHeight: "Main bag height (cm)",
      bagWeightKg: "Main bag weight (kg)",
      personalLength: "Personal item length (cm)",
      personalWidth: "Personal item width (cm)",
      personalHeight: "Personal item height (cm)",
      personalWeightKg: "Personal item weight (kg)",
      airlines: "Airlines to check",
    },
    airlineName: {
      eva: "EVA Air",
      "china-airlines": "China Airlines",
      starlux: "STARLUX Airlines",
      "tigerair-taiwan": "Tigerair Taiwan",
      ana: "ANA",
      jal: "Japan Airlines",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains invalid characters.",
      EMPTY: "Enter a value.",
      DECIMAL_FORMAT: "Enter a number with at most one decimal place.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    errorRangeDimension: "Each side must be over 0 and at most 200 cm.",
    errorRangeWeight: "Weight must be over 0 and at most 100 kg.",
    errorAirlinesEmpty: "Select at least one airline.",
    errorAirlinesInvalid: "The airline selection is invalid. Choose again.",
    statusEmpty: "Nothing checked yet. Enter your bag's size and weight, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case). Press “Check baggage” to run it.",
    downloaded: "Report downloaded.",
    summaryPass: (fits, compared) => `Fits all selected airlines (${fits}/${compared})`,
    summaryPartial: (fits, compared) => `Fits ${fits} of the ${compared} selected airlines`,
    sortedNote: (bag, personal) =>
      personal === null
        ? `Main bag sides (largest first): ${bag.join(" × ")} cm; no personal item.`
        : `Main bag sides (largest first): ${bag.join(" × ")} cm; personal item sides (largest first): ${personal.join(" × ")} cm.`,
    passText: "Pass",
    failText: "Fail",
    weightText: (mode, checked, limit, margin) =>
      mode === "main"
        ? `Main bag ${checked} / limit ${limit} kg, margin ${margin} kg`
        : `Combined ${checked} / limit ${limit} kg, margin ${margin} kg`,
    personalNotApplicable: "No personal item",
    personalNotSpecified: "Dimensions not published",
    personalPass: (margins) => `Pass, margins ${margins.join(" / ")} cm`,
    personalFail: (margins) => `Fail, margins ${margins.join(" / ")} cm`,
    triple: (values) => values.join(" × "),
    margins: (values) => values.join(" / "),
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("baggage-form");
const inputs = {};
const fieldErrors = {};
for (const field of TEXT_FIELDS) {
  inputs[field] = document.getElementById(`field-${field}`);
  fieldErrors[field] = document.getElementById(`error-${field}`);
}
const airlineBoxes = {};
for (const id of AIRLINE_IDS) {
  airlineBoxes[id] = document.getElementById(`field-airline-${id}`);
}
fieldErrors.airlines = document.getElementById("error-airlines");
const formErrorEl = document.getElementById("error-form");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const sortedNoteEl = document.getElementById("sorted-note");
const tableBody = document.getElementById("result-rows");
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
  if (field === "airlines") return airlineBoxes[AIRLINE_IDS[0]];
  return inputs[field] ?? null;
}

function errorSlotFor(field) {
  return fieldErrors[field] ?? null;
}

function setFieldError(field, message) {
  const errorEl = errorSlotFor(field);
  const target = focusTargetFor(field);
  if (errorEl === null) {
    if (message !== null) formErrorEl.textContent = message;
    return;
  }
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
    target.setAttribute("aria-errormessage", errorEl.id);
  }
  errorEl.textContent = message;
}

function clearFieldErrors() {
  formErrorEl.textContent = "";
  for (const field of FIELDS) setFieldError(field, null);
}

function errorMessage(error) {
  if (error.code === "RANGE") {
    return error.field !== null && error.field.endsWith("WeightKg")
      ? t.errorRangeWeight
      : t.errorRangeDimension;
  }
  if (error.field === "airlines") {
    if (error.code === "EMPTY" || error.code === "INPUT_LIMIT") return t.errorAirlinesEmpty;
    if (error.code === "ENUM" || error.code === "DUPLICATE") return t.errorAirlinesInvalid;
  }
  if (error.code === "EMPTY" && error.field === "airlines") return t.errorAirlinesEmpty;
  return t.error[error.code] ?? t.error.INTERNAL;
}

function renderResultRows(result) {
  tableBody.replaceChildren();
  for (const entry of result.airlines) {
    const tr = document.createElement("tr");
    const nameCell = document.createElement("td");
    nameCell.textContent = t.airlineName[entry.id];
    const verdictCell = document.createElement("td");
    verdictCell.textContent = entry.pass ? t.passText : t.failText;
    const limitCell = document.createElement("td");
    limitCell.textContent = t.triple(entry.limitCm);
    const marginsCell = document.createElement("td");
    marginsCell.textContent = t.margins(entry.marginsCm);
    const weightCell = document.createElement("td");
    weightCell.textContent = t.weightText(
      entry.weight.mode,
      entry.weight.checkedKg,
      entry.weight.limitKg,
      entry.weight.marginKg,
    );
    const personalCell = document.createElement("td");
    if (entry.personal.status === "notApplicable") {
      personalCell.textContent = t.personalNotApplicable;
    } else if (entry.personal.status === "notSpecified") {
      personalCell.textContent = t.personalNotSpecified;
    } else if (entry.personal.status === "pass") {
      personalCell.textContent = t.personalPass(entry.personal.marginsCm);
    } else {
      personalCell.textContent = t.personalFail(entry.personal.marginsCm);
    }
    tr.append(nameCell, verdictCell, limitCell, marginsCell, weightCell, personalCell);
    tableBody.appendChild(tr);
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error, reportAvailable } = publicState;
  for (const field of TEXT_FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  for (const id of AIRLINE_IDS) {
    airlineBoxes[id].checked = draft.airlines.includes(id);
  }
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
        formErrorEl.textContent = message;
        statusEl.textContent = message;
      }
    } else {
      statusEl.textContent = t.error.INTERNAL;
    }
    resultsEl.hidden = true;
  } else if (state === "success" && result !== null) {
    const { compared, fits, overallPass } = result.summary;
    const summary = overallPass
      ? t.summaryPass(fits, compared)
      : t.summaryPartial(fits, compared);
    summaryEl.textContent = summary;
    statusEl.textContent = summary;
    sortedNoteEl.textContent = t.sortedNote(result.bagSortedCm, result.personalSortedCm);
    renderResultRows(result);
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

for (const field of TEXT_FIELDS) {
  inputs[field].addEventListener("input", () => {
    controller.edit({ [field]: inputs[field].value });
  });
}

for (const id of AIRLINE_IDS) {
  airlineBoxes[id].addEventListener("change", () => {
    const selected = AIRLINE_IDS.filter((candidate) => airlineBoxes[candidate].checked);
    controller.edit({ airlines: selected });
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.bagLength.focus();
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
