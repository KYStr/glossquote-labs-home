// DOM wiring for the SemVer precedence tool. The controller owns state;
// this module only renders snapshots and forwards user actions. All text
// is set with textContent/value; user input never becomes HTML.

import { createController } from "./controller.mjs";
import { parseVersion } from "./core/semver.mjs";
import { WORKER_SOURCE } from "./worker-source.mjs";

const LANG = document.documentElement.lang === "en" ? "en" : "zh";

/** First core case of docs/specs/semver-precedence/fixtures.json. */
const EXAMPLE = Object.freeze({ left: "1.0.0-rc.10", right: "1.0.0-rc.2" });

const STRINGS = {
  zh: {
    badge: {
      empty: "尚未開始",
      dirty: "已變更，請重新執行",
      busy: "處理中",
      success: "已完成",
      error: "有錯誤",
      cancelled: "已取消",
    },
    status: {
      empty: "請輸入兩個版本，或載入範例。",
      dirty: "輸入已變更，請重新執行。",
      busy: "處理中…",
      success: "比較完成，可下載報告。",
      cancelled: "已取消，可重新執行。",
      fieldError: "輸入有誤，請修正標示的欄位。",
    },
    errors: {
      EMPTY: "請輸入版本。",
      INPUT_LIMIT: "版本過長（最多 256 個字元）。",
      UNICODE: "含有不成對的代理字元。",
      SEMVER_SYNTAX: "不是有效的 SemVer 2.0.0 版本。",
      IDENTIFIER_LIMIT:
        "識別符超出上限（主欄每欄最多 32 位數字；prerelease 與 build 各最多 16 個識別符，每個最多 32 個字元）。",
      SCHEMA: "輸入格式錯誤。",
      INTERNAL: "發生內部錯誤，請再試一次。",
      WORKER_ERROR: "背景工作失敗，草稿已保留，請再試一次。",
      OUTPUT_LIMIT: "報告超出大小上限。",
    },
    summary: {
      lt: (left, right) => `左側版本 ${left} 的順位低於右側版本 ${right}。`,
      gt: (left, right) => `左側版本 ${left} 的順位高於右側版本 ${right}。`,
      eq: (left, right) =>
        left === right
          ? "兩個版本順位相同。"
          : "兩個版本順位相同；原始標籤不同，但 build metadata 不參與順位比較。",
    },
    deciding: {
      major: (a, b) => `決定因素：主版本，${a} 對 ${b}。`,
      minor: (a, b) => `決定因素：次版本，${a} 對 ${b}。`,
      patch: (a, b) => `決定因素：修訂版本，${a} 對 ${b}。`,
      release: () => "決定因素：只有一邊是正式版；正式版高於 prerelease。",
      "prerelease-number": (a, b, index) =>
        `決定因素：prerelease 第 ${index} 個識別符，${a} 對 ${b}（按數值比較）。`,
      "prerelease-type": (a, b, index) =>
        `決定因素：prerelease 第 ${index} 個識別符；數字識別符小於文字識別符。`,
      "prerelease-text": (a, b, index) =>
        `決定因素：prerelease 第 ${index} 個識別符，${a} 對 ${b}（按 ASCII 順序）。`,
      "prerelease-length": () =>
        "決定因素：共同前綴相同，prerelease 識別符較少者順位較低。",
      equal: () => "決定因素：所有欄位順位相同。",
    },
    fields: { major: "主版本", minor: "次版本", patch: "修訂版本", prerelease: "prerelease", build: "build" },
    none: "無",
    decides: "決定順位",
    equal: "相同",
    ignored: "不參與順位比較",
  },
  en: {
    badge: {
      empty: "Not started",
      dirty: "Changed — run again",
      busy: "Working",
      success: "Done",
      error: "Error",
      cancelled: "Cancelled",
    },
    status: {
      empty: "Enter two versions, or load the example.",
      dirty: "Input changed. Run again.",
      busy: "Working…",
      success: "Comparison complete. You can download the report.",
      cancelled: "Cancelled. You can run again.",
      fieldError: "There is an input error. Fix the marked field.",
    },
    errors: {
      EMPTY: "Enter a version.",
      INPUT_LIMIT: "Version is too long (maximum 256 characters).",
      UNICODE: "Contains an unpaired surrogate.",
      SEMVER_SYNTAX: "Not a valid SemVer 2.0.0 version.",
      IDENTIFIER_LIMIT:
        "An identifier exceeds its limit (core fields up to 32 digits; prerelease and build up to 16 identifiers, each up to 32 characters).",
      SCHEMA: "Invalid input format.",
      INTERNAL: "An internal error occurred. Please try again.",
      WORKER_ERROR: "The background worker failed. Your draft is kept; please try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit.",
    },
    summary: {
      lt: (left, right) => `The left version ${left} has lower precedence than the right version ${right}.`,
      gt: (left, right) => `The left version ${left} has higher precedence than the right version ${right}.`,
      eq: (left, right) =>
        left === right
          ? "Both versions have equal precedence."
          : "Both versions have equal precedence; the raw labels differ, but build metadata does not affect precedence.",
    },
    deciding: {
      major: (a, b) => `Decided by major: ${a} vs ${b}.`,
      minor: (a, b) => `Decided by minor: ${a} vs ${b}.`,
      patch: (a, b) => `Decided by patch: ${a} vs ${b}.`,
      release: () => "Decided by release status: a release version outranks a prerelease.",
      "prerelease-number": (a, b, index) =>
        `Decided by prerelease identifier ${index}: ${a} vs ${b} (compared numerically).`,
      "prerelease-type": (a, b, index) =>
        `Decided by prerelease identifier ${index}: a numeric identifier is smaller than an alphanumeric one.`,
      "prerelease-text": (a, b, index) =>
        `Decided by prerelease identifier ${index}: ${a} vs ${b} (ASCII order).`,
      "prerelease-length": () =>
        "Decided by prerelease length: with a shared prefix, the shorter list has lower precedence.",
      equal: () => "Decided by nothing: every field has equal precedence.",
    },
    fields: { major: "Major", minor: "Minor", patch: "Patch", prerelease: "Prerelease", build: "Build" },
    none: "none",
    decides: "Decides precedence",
    equal: "Equal",
    ignored: "Ignored in precedence",
  },
};

const T = STRINGS[LANG];

const $ = (id) => document.getElementById(id);
const leftInput = $("left-input");
const rightInput = $("right-input");
const leftError = $("left-error");
const rightError = $("right-error");
const form = $("compare-form");
const compareButton = $("compare-button");
const exampleButton = $("example-button");
const cancelButton = $("cancel-button");
const resetButton = $("reset-button");
const downloadButton = $("download-button");
const statusBadge = $("status-badge");
const statusLine = $("status-line");
const resultSection = $("result");
const resultSummary = $("result-summary");
const resultDeciding = $("result-deciding");
const breakdownBody = $("breakdown-body");

function createRealWorker() {
  const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const inner = new Worker(url, { type: "module" });
  return {
    postMessage(message) {
      inner.postMessage(message);
    },
    terminate() {
      inner.terminate();
      URL.revokeObjectURL(url);
    },
    set onmessage(handler) {
      inner.onmessage = handler;
    },
    get onmessage() {
      return inner.onmessage;
    },
    set onerror(handler) {
      inner.onerror = handler;
    },
    get onerror() {
      return inner.onerror;
    },
  };
}

const controller = createController({ createWorker: createRealWorker });

let submittedRun = false;
let downloadUrl = null;
let downloadTimer = null;

function revokeDownload() {
  if (downloadTimer !== null) {
    clearTimeout(downloadTimer);
    downloadTimer = null;
  }
  if (downloadUrl !== null) {
    URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }
}

function setFieldError(input, errorElement, message) {
  if (message === null) {
    errorElement.hidden = true;
    errorElement.textContent = "";
    input.removeAttribute("aria-invalid");
    return;
  }
  errorElement.hidden = false;
  errorElement.textContent = message;
  input.setAttribute("aria-invalid", "true");
}

function breakdownRow(label, leftValue, rightValue, note, deciding) {
  const row = document.createElement("tr");
  if (deciding) row.className = "deciding-row";
  const labelCell = document.createElement("th");
  labelCell.scope = "row";
  labelCell.textContent = label;
  const leftCell = document.createElement("td");
  leftCell.className = "version";
  leftCell.textContent = leftValue;
  const rightCell = document.createElement("td");
  rightCell.className = "version";
  rightCell.textContent = rightValue;
  const noteCell = document.createElement("td");
  noteCell.textContent = note;
  row.append(labelCell, leftCell, rightCell, noteCell);
  return row;
}

function renderResult(state) {
  const { draft, result } = state;
  const leftParsed = parseVersion(draft.left).value;
  const rightParsed = parseVersion(draft.right).value;
  resultSummary.textContent = T.summary[result.relation](draft.left, draft.right);

  const { kind, index } = result.reason;
  let decidingText;
  if (kind === "major" || kind === "minor" || kind === "patch") {
    decidingText = T.deciding[kind](leftParsed[kind], rightParsed[kind]);
  } else if (kind === "prerelease-number" || kind === "prerelease-text") {
    decidingText = T.deciding[kind](
      leftParsed.prerelease[index - 1],
      rightParsed.prerelease[index - 1],
      index,
    );
  } else if (kind === "prerelease-type") {
    decidingText = T.deciding[kind](null, null, index);
  } else {
    decidingText = T.deciding[kind]();
  }
  resultDeciding.textContent = decidingText;

  breakdownBody.replaceChildren();
  const joinOrNone = (tokens) => (tokens === null ? T.none : tokens.join("."));
  const rows = [
    {
      label: T.fields.major,
      left: leftParsed.major,
      right: rightParsed.major,
      deciding: kind === "major",
    },
    {
      label: T.fields.minor,
      left: leftParsed.minor,
      right: rightParsed.minor,
      deciding: kind === "minor",
    },
    {
      label: T.fields.patch,
      left: leftParsed.patch,
      right: rightParsed.patch,
      deciding: kind === "patch",
    },
    {
      label: T.fields.prerelease,
      left: joinOrNone(leftParsed.prerelease),
      right: joinOrNone(rightParsed.prerelease),
      deciding:
        kind === "release" ||
        kind === "prerelease-number" ||
        kind === "prerelease-type" ||
        kind === "prerelease-text" ||
        kind === "prerelease-length",
    },
    {
      label: T.fields.build,
      left: joinOrNone(leftParsed.build),
      right: joinOrNone(rightParsed.build),
      deciding: false,
      ignored: true,
    },
  ];
  for (const row of rows) {
    const note = row.deciding ? T.decides : row.ignored ? T.ignored : row.left === row.right ? T.equal : "";
    breakdownBody.append(breakdownRow(row.label, row.left, row.right, note, row.deciding));
  }
}

function render(state) {
  statusBadge.textContent = T.badge[state.state];
  statusBadge.dataset.tone =
    state.state === "success"
      ? "success"
      : state.state === "error"
        ? "danger"
        : state.state === "dirty" || state.state === "cancelled"
          ? "warning"
          : "info";

  if (state.state !== "success") revokeDownload();

  if (state.state === "error" && state.error !== null) {
    const { code, field } = state.error;
    const message = T.errors[code] ?? T.errors.INTERNAL;
    if (field === "left") {
      setFieldError(leftInput, leftError, message);
      setFieldError(rightInput, rightError, null);
      statusLine.textContent = T.status.fieldError;
      statusLine.dataset.tone = "danger";
      if (submittedRun) {
        leftInput.focus();
        submittedRun = false;
      }
    } else if (field === "right") {
      setFieldError(leftInput, leftError, null);
      setFieldError(rightInput, rightError, message);
      statusLine.textContent = T.status.fieldError;
      statusLine.dataset.tone = "danger";
      if (submittedRun) {
        rightInput.focus();
        submittedRun = false;
      }
    } else {
      setFieldError(leftInput, leftError, null);
      setFieldError(rightInput, rightError, null);
      statusLine.textContent = message;
      statusLine.dataset.tone = "danger";
    }
  } else {
    setFieldError(leftInput, leftError, null);
    setFieldError(rightInput, rightError, null);
    statusLine.textContent = T.status[state.state];
    statusLine.dataset.tone = state.state === "dirty" ? "warning" : "";
  }

  compareButton.disabled = state.state === "busy";
  exampleButton.disabled = state.state === "busy";
  resetButton.disabled = state.state === "busy";
  cancelButton.hidden = state.state !== "busy";
  if (state.state === "busy") {
    form.setAttribute("aria-busy", "true");
  } else {
    form.removeAttribute("aria-busy");
  }

  if (state.state === "success" && state.result !== null) {
    resultSection.hidden = false;
    renderResult(state);
  } else {
    resultSection.hidden = true;
    resultSummary.textContent = "";
    resultDeciding.textContent = "";
    breakdownBody.replaceChildren();
  }
}

controller.onChange(render);

leftInput.addEventListener("input", () => {
  controller.setDraft({ left: leftInput.value, right: rightInput.value });
});
rightInput.addEventListener("input", () => {
  controller.setDraft({ left: leftInput.value, right: rightInput.value });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submittedRun = true;
  controller.setDraft({ left: leftInput.value, right: rightInput.value });
  controller.run();
});

exampleButton.addEventListener("click", () => {
  controller.loadExample(EXAMPLE);
  leftInput.value = EXAMPLE.left;
  rightInput.value = EXAMPLE.right;
  leftInput.focus();
});

cancelButton.addEventListener("click", () => {
  controller.cancel();
});

resetButton.addEventListener("click", () => {
  controller.reset();
  leftInput.value = "";
  rightInput.value = "";
  leftInput.focus();
});

downloadButton.addEventListener("click", () => {
  const report = controller.getReport();
  if (report === null) return;
  revokeDownload();
  const blob = new Blob([report], { type: "application/json" });
  downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = "semver-precedence-report.json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // The SPEC requires the download URL to be revoked within 30 seconds.
  downloadTimer = window.setTimeout(revokeDownload, 30000);
});

window.addEventListener("pagehide", () => {
  revokeDownload();
  if (controller.getState().state === "busy") controller.cancel();
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    controller.reset();
    leftInput.value = "";
    rightInput.value = "";
  }
});

render(controller.getState());
