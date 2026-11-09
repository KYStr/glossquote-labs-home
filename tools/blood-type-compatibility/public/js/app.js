import { createController } from "./controller.mjs";
import { buildReport } from "./core/blood.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const isEnglish = document.documentElement.lang.toLowerCase().startsWith("en");

const TEXT = isEnglish
  ? {
      fieldLabel: {
        mode: "Mode",
        bloodType: "Blood type",
        donor: "Donor blood type",
        recipient: "Recipient blood type",
      },
      badgeLabel: {
        "rbc-universal-donor": "Universal red-cell donor",
        "rbc-universal-recipient": "Universal red-cell recipient",
        "plasma-universal-donor": "Universal plasma donor",
        "plasma-universal-recipient": "Universal plasma recipient",
      },
      none: "None",
      compatible: "Compatible",
      notCompatible: "Not compatible",
      status: {
        empty: "Nothing checked yet. Select a blood type or load the example.",
        dirty: "Input changed. Run again.",
        busy: "Working",
        cancelled: "Cancelled. You can run again.",
      },
      error: {
        SCHEMA: "The input format is invalid.",
        INPUT_LIMIT: "Input is too long.",
        UNICODE: "Input contains an invalid character.",
        INTERNAL: "Something went wrong. Try again.",
        WORKER_ERROR: "Something went wrong. Try again.",
        OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
      },
      errorByField: {
        EMPTY: {
          mode: "Select a mode.",
          bloodType: "Select a blood type.",
          donor: "Select the donor blood type.",
          recipient: "Select the recipient blood type.",
        },
        ENUM: {
          mode: "That mode is not valid.",
          bloodType: "That blood type code is not valid.",
          donor: "That donor blood type code is not valid.",
          recipient: "That recipient blood type code is not valid.",
        },
      },
      downloaded: "Report downloaded.",
    }
  : {
      fieldLabel: {
        mode: "模式",
        bloodType: "血型",
        donor: "捐贈者血型",
        recipient: "受血者血型",
      },
      badgeLabel: {
        "rbc-universal-donor": "紅血球萬用捐贈者",
        "rbc-universal-recipient": "紅血球萬用受血者",
        "plasma-universal-donor": "血漿萬用捐贈者",
        "plasma-universal-recipient": "血漿萬用受血者",
      },
      none: "無",
      compatible: "相容",
      notCompatible: "不相容",
      status: {
        empty: "尚未查詢。選擇血型，或載入範例。",
        dirty: "輸入已變更，請重新執行",
        busy: "處理中",
        cancelled: "已取消，可重新執行",
      },
      error: {
        SCHEMA: "輸入格式不正確",
        INPUT_LIMIT: "輸入太長",
        UNICODE: "輸入含有無效字元",
        INTERNAL: "處理失敗，請重試",
        WORKER_ERROR: "處理失敗，請重試",
        OUTPUT_LIMIT: "報告超過大小上限，無法下載。",
      },
      errorByField: {
        EMPTY: {
          mode: "請選擇模式",
          bloodType: "請選擇血型",
          donor: "請選擇捐贈者血型",
          recipient: "請選擇受血者血型",
        },
        ENUM: {
          mode: "模式不正確",
          bloodType: "血型代碼不正確",
          donor: "捐贈者血型代碼不正確",
          recipient: "受血者血型代碼不正確",
        },
      },
      downloaded: "報告已下載。",
    };

const TYPE_FIELDS = ["bloodType", "donor", "recipient"];

const elements = {
  form: document.querySelector("#lookup-form"),
  modeSingle: document.querySelector("#field-mode-single"),
  modePair: document.querySelector("#field-mode-pair"),
  groupSingle: document.querySelector("#group-single"),
  groupPair: document.querySelector("#group-pair"),
  status: document.querySelector("#status-line"),
  exampleNote: document.querySelector("#example-note"),
  run: document.querySelector("#action-run"),
  example: document.querySelector("#action-example"),
  reset: document.querySelector("#action-reset"),
  cancel: document.querySelector("#action-cancel"),
  resultContent: document.querySelector("#result-content"),
  badges: document.querySelector("#result-badges"),
  singleResults: document.querySelector("#single-results"),
  pairResults: document.querySelector("#pair-results"),
  listRbcGive: document.querySelector("#list-rbc-give"),
  listRbcReceive: document.querySelector("#list-rbc-receive"),
  listPlasmaGive: document.querySelector("#list-plasma-give"),
  listPlasmaReceive: document.querySelector("#list-plasma-receive"),
  verdictRbc: document.querySelector("#verdict-rbc"),
  verdictPlasma: document.querySelector("#verdict-plasma"),
  download: document.querySelector("#action-download"),
  downloadStatus: document.querySelector("#download-status"),
  inputs: {},
  errors: {},
};
for (const field of TYPE_FIELDS) {
  elements.inputs[field] = document.querySelector(`#field-${field}`);
  elements.errors[field] = document.querySelector(`#error-${field}`);
}

let workerUrl = null;
let downloadUrl = null;
let downloadTimer = null;
let liveResult = null;
let focusSubmitOnError = false;

function ensureWorkerUrl() {
  if (workerUrl === null) {
    const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
    workerUrl = URL.createObjectURL(blob);
  }
  return workerUrl;
}

function errorMessage(error) {
  if (error === null) return "";
  const byField = TEXT.errorByField[error.code];
  if (byField !== undefined && error.field !== null && byField[error.field] !== undefined) {
    return byField[error.field];
  }
  return TEXT.error[error.code] ?? TEXT.error.INTERNAL;
}

function clearDownload(invalidateResult) {
  if (downloadTimer !== null) {
    clearTimeout(downloadTimer);
    downloadTimer = null;
  }
  if (downloadUrl !== null) {
    URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }
  elements.downloadStatus.hidden = true;
  elements.downloadStatus.textContent = "";
  if (invalidateResult) liveResult = null;
}

function formatList(types) {
  return types.length === 0 ? TEXT.none : types.join(isEnglish ? ", " : "、");
}

function renderSingle(result) {
  elements.badges.replaceChildren(
    ...result.badges.map((badge) => {
      const chip = document.createElement("span");
      chip.className = "badge";
      chip.textContent = TEXT.badgeLabel[badge] ?? badge;
      return chip;
    }),
  );
  elements.listRbcGive.textContent = formatList(result.rbcDonateTo);
  elements.listRbcReceive.textContent = formatList(result.rbcReceiveFrom);
  elements.listPlasmaGive.textContent = formatList(result.plasmaDonateTo);
  elements.listPlasmaReceive.textContent = formatList(result.plasmaReceiveFrom);
}

function renderPair(result) {
  elements.badges.replaceChildren();
  elements.verdictRbc.textContent = result.rbc ? TEXT.compatible : TEXT.notCompatible;
  elements.verdictPlasma.textContent = result.plasma ? TEXT.compatible : TEXT.notCompatible;
}

function render(state) {
  const mode = state.draft.mode;
  elements.modeSingle.checked = mode === "single";
  elements.modePair.checked = mode === "pair";
  elements.groupSingle.hidden = mode !== "single";
  elements.groupPair.hidden = mode !== "pair";
  for (const field of TYPE_FIELDS) {
    const input = elements.inputs[field];
    const value = state.draft[field] ?? "";
    if (input.value !== value) input.value = value;
    const showError = state.state === "error" && state.error?.field === field;
    elements.errors[field].textContent = showError ? errorMessage(state.error) : "";
    if (showError) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }

  const busy = state.state === "busy";
  elements.run.disabled = busy;
  elements.example.disabled = busy;
  elements.reset.disabled = busy;
  elements.cancel.hidden = !busy;
  elements.exampleNote.hidden = !(state.isExample && state.state !== "error");

  if (state.state === "success" && state.result !== null) {
    clearDownload(false);
    liveResult = state.result;
    elements.resultContent.hidden = false;
    elements.singleResults.hidden = state.result.mode !== "single";
    elements.pairResults.hidden = state.result.mode !== "pair";
    if (state.result.mode === "single") renderSingle(state.result);
    else renderPair(state.result);
  } else {
    if (state.state !== "error" || liveResult === null) clearDownload(true);
    elements.resultContent.hidden = true;
    elements.badges.replaceChildren();
  }
  elements.download.hidden = !state.reportAvailable;

  if (state.state === "error") {
    const message = errorMessage(state.error);
    const label = state.error?.field !== null && state.error?.field !== undefined
      ? TEXT.fieldLabel[state.error.field]
      : null;
    elements.status.textContent = label === null ? message : `${label}：${message}`;
    if (focusSubmitOnError) {
      focusSubmitOnError = false;
      elements.run.focus();
    }
  } else if (state.state === "cancelled") {
    elements.status.textContent = TEXT.status.cancelled;
  } else {
    elements.status.textContent = TEXT.status[state.state] ?? "";
  }
}

const controller = createController({
  createWorker: () => new Worker(ensureWorkerUrl(), { type: "module" }),
  onChange: render,
});

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  focusSubmitOnError = true;
  controller.run();
});
for (const radio of [elements.modeSingle, elements.modePair]) {
  radio.addEventListener("change", () => {
    if (radio.checked) controller.edit({ mode: radio.value });
  });
}
for (const field of TYPE_FIELDS) {
  elements.inputs[field].addEventListener("change", () => {
    controller.edit({ [field]: elements.inputs[field].value });
  });
}
elements.example.addEventListener("click", () => controller.loadExample());
elements.reset.addEventListener("click", () => controller.reset());
elements.cancel.addEventListener("click", () => controller.cancel());
elements.download.addEventListener("click", () => {
  if (liveResult === null) return;
  const report = buildReport(structuredClone(liveResult));
  elements.downloadStatus.hidden = false;
  if (!report.ok) {
    elements.downloadStatus.textContent = errorMessage(report.error);
    return;
  }
  clearDownload(false);
  const blob = new Blob([report.text], { type: "application/json" });
  downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = report.filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  elements.downloadStatus.hidden = false;
  elements.downloadStatus.textContent = TEXT.downloaded;
  downloadTimer = setTimeout(() => clearDownload(false), 30000);
});

window.addEventListener("pagehide", () => {
  controller.destroy();
  clearDownload(true);
  if (workerUrl !== null) {
    URL.revokeObjectURL(workerUrl);
    workerUrl = null;
  }
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) controller.reset();
});

render(controller.snapshot());
