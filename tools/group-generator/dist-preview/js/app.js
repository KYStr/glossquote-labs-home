// DOM wiring for the Group Generator. All user-visible text is set
// through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker
// source embedded by the preview build (WORKER_SOURCE). The controller
// owns the draft, sequence, and state machine; this file only renders
// it. Nothing is persisted: the draft lives only in this page and is
// discarded when the page is left. A blank seed is filled from the
// platform entropy source at run time and written back into the seed
// field before the core is called; if that source is unavailable the
// pinned message is shown and no grouping runs.

import { createController } from "./controller.mjs";
import {
  FIELDS,
  REPORT_FILENAME,
  TEXT_FILENAME,
  errorMessage,
  serializeGroupsText,
  serializeReport,
  trimName,
} from "./core/group-generator.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const DOWNLOAD_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    fairness:
      "以種子洗牌後依序輪流發牌，每人恰好一組、各組人數最多差 1；相同名單與種子會得到相同分組。",
    seedHelp: "留空時會自動產生一個種子並顯示出來，之後可用同一種子重現相同分組。",
    seedFillFailed:
      "此瀏覽器無法自動產生種子，請手動輸入種子。",
    exampleNote: "已載入範例，請按「隨機分組」執行。",
    namesCount: (kept) => `已保留 ${kept} 人`,
    summary: (totalNames, groupCount, seed) =>
      `共 ${totalNames} 人、分 ${groupCount} 組、種子 ${seed}`,
    groupHeading: (number, size) => `第 ${number} 組（${size} 人）`,
    rowSuffix: (row) => `（第 ${row} 行）`,
    draftNote: "切換語言或離開頁面會失去草稿。",
  },
  en: {
    fairness:
      "Names are shuffled with the seed and dealt round-robin: everyone lands in exactly one group, group sizes differ by at most one, and the same list and seed always give the same groups.",
    seedHelp:
      "Leave blank to have a seed generated and shown; reuse it to reproduce the same groups.",
    seedFillFailed:
      "This browser cannot generate a seed automatically; enter a seed manually.",
    exampleNote: "Example loaded. Run “Generate groups” to group them.",
    namesCount: (kept) => `${kept} name${kept === 1 ? "" : "s"} kept`,
    summary: (totalNames, groupCount, seed) =>
      `${totalNames} names, ${groupCount} groups, seed ${seed}`,
    groupHeading: (number, size) =>
      size === 1 ? `Group ${number} (1 member)` : `Group ${number} (${size} members)`,
    rowSuffix: (row) => ` (line ${row})`,
    draftNote: "Switching language or leaving the page discards the draft.",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("group-generator-form");
const inputs = {};
for (const field of FIELDS) {
  if (field === "mode") continue;
  inputs[field] = document.getElementById(`field-${field}`);
}
const modeCountInput = document.getElementById("field-mode-count");
const modeSizeInput = document.getElementById("field-mode-size");
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const namesCountEl = document.getElementById("names-count");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("result-summary");
const groupsEl = document.getElementById("groups-list");
const fairnessEl = document.getElementById("fairness-note");
const runBtn = document.getElementById("run-btn");
const cancelBtn = document.getElementById("cancel-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const downloadReportBtn = document.getElementById("download-report-btn");
const downloadTextBtn = document.getElementById("download-text-btn");
const exampleNoteEl = document.getElementById("example-note");

let reportUrl = null;
let reportUrlTimer = null;
let textUrl = null;
let textUrlTimer = null;
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

function fillSeed() {
  try {
    if (typeof crypto === "undefined" || typeof crypto.getRandomValues !== "function") {
      return null;
    }
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return String(values[0]);
  } catch {
    return null;
  }
}

function revokeDownloadUrls() {
  if (reportUrlTimer !== null) {
    clearTimeout(reportUrlTimer);
    reportUrlTimer = null;
  }
  if (reportUrl !== null) {
    URL.revokeObjectURL(reportUrl);
    reportUrl = null;
  }
  if (textUrlTimer !== null) {
    clearTimeout(textUrlTimer);
    textUrlTimer = null;
  }
  if (textUrl !== null) {
    URL.revokeObjectURL(textUrl);
    textUrl = null;
  }
}

function setFieldError(field, message) {
  const input = field === "mode" ? modeCountInput : inputs[field];
  const errorEl = fieldErrors[field];
  if (message === null) {
    if (input) {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-errormessage");
    }
    errorEl.textContent = "";
    return;
  }
  if (input) {
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-errormessage", `error-${field}`);
  }
  errorEl.textContent = message;
}

function clearFieldErrors() {
  for (const field of FIELDS) setFieldError(field, null);
}

function keptNameCount(namesRaw) {
  let kept = 0;
  for (const line of namesRaw.split("\n")) {
    if (trimName(line) !== "") kept += 1;
  }
  return kept;
}

function renderGroups(result) {
  while (groupsEl.firstChild !== null) groupsEl.removeChild(groupsEl.firstChild);
  for (const group of result.groups) {
    const section = document.createElement("section");
    section.className = "group";
    const heading = document.createElement("h3");
    heading.textContent = t.groupHeading(group.number, group.size);
    section.appendChild(heading);
    const list = document.createElement("ul");
    for (const member of group.members) {
      const item = document.createElement("li");
      item.textContent = member;
      list.appendChild(item);
    }
    section.appendChild(list);
    groupsEl.appendChild(section);
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error, seedFillFailed, status } = publicState;
  for (const field of ["names", "groupCount", "groupSize", "seed"]) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  modeCountInput.checked = draft.mode === "count";
  modeSizeInput.checked = draft.mode === "size";
  inputs.groupCount.disabled = draft.mode !== "count";
  inputs.groupSize.disabled = draft.mode !== "size";
  namesCountEl.textContent = t.namesCount(keptNameCount(draft.names));
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  statusEl.textContent = status[lang];
  cancelBtn.hidden = state !== "busy";
  runBtn.disabled = state === "busy";
  downloadReportBtn.hidden = state !== "success";
  downloadTextBtn.hidden = state !== "success";

  if (state !== "success") revokeDownloadUrls();

  if (state === "success" && result !== null) {
    summaryEl.textContent = t.summary(result.totalNames, result.groupCount, result.seed);
    renderGroups(result);
    fairnessEl.textContent = t.fairness;
    resultsEl.hidden = false;
    clearFieldErrors();
    return;
  }

  resultsEl.hidden = true;
  if (state === "error") {
    clearFieldErrors();
    if (error !== null) {
      const message = seedFillFailed
        ? t.seedFillFailed
        : errorMessage(error, lang) + (error.row !== null ? t.rowSuffix(error.row) : "");
      if (error.field !== null && FIELDS.includes(error.field)) {
        setFieldError(error.field, message);
        if (submitted) {
          submitted = false;
          const target = error.field === "mode" ? modeCountInput : inputs[error.field];
          if (target) target.focus();
        }
      } else {
        statusEl.textContent = message;
      }
    }
  } else {
    clearFieldErrors();
  }
}

const controller = createController({ createWorker, fillSeed, onChange: render });

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitted = true;
  controller.run();
});

inputs.names.addEventListener("input", () => {
  controller.edit({ names: inputs.names.value });
});
inputs.groupCount.addEventListener("input", () => {
  controller.edit({ groupCount: inputs.groupCount.value });
});
inputs.groupSize.addEventListener("input", () => {
  controller.edit({ groupSize: inputs.groupSize.value });
});
inputs.seed.addEventListener("input", () => {
  controller.edit({ seed: inputs.seed.value });
});
modeCountInput.addEventListener("change", () => {
  controller.edit({ mode: "count" });
});
modeSizeInput.addEventListener("change", () => {
  controller.edit({ mode: "size" });
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.names.focus();
});

function download(serialized, filename, slot) {
  const blob = new Blob([serialized.text], {
    type: filename.endsWith(".json") ? "application/json" : "text/plain",
  });
  const url = URL.createObjectURL(blob);
  if (slot === "report") {
    if (reportUrlTimer !== null) clearTimeout(reportUrlTimer);
    if (reportUrl !== null) URL.revokeObjectURL(reportUrl);
    reportUrl = url;
    reportUrlTimer = setTimeout(revokeDownloadUrls, DOWNLOAD_URL_TTL_MS);
  } else {
    if (textUrlTimer !== null) clearTimeout(textUrlTimer);
    if (textUrl !== null) URL.revokeObjectURL(textUrl);
    textUrl = url;
    textUrlTimer = setTimeout(revokeDownloadUrls, DOWNLOAD_URL_TTL_MS);
  }
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

downloadReportBtn.addEventListener("click", () => {
  const current = controller.getState();
  if (current.state !== "success" || current.result === null) return;
  const serialized = serializeReport(current.result);
  if (!serialized.ok) {
    statusEl.textContent = errorMessage(serialized.error, lang);
    return;
  }
  download(serialized, REPORT_FILENAME, "report");
});

downloadTextBtn.addEventListener("click", () => {
  const current = controller.getState();
  if (current.state !== "success" || current.result === null) return;
  const serialized = serializeGroupsText(current.result, lang);
  if (!serialized.ok) {
    statusEl.textContent = errorMessage(serialized.error, lang);
    return;
  }
  download(serialized, TEXT_FILENAME, "text");
});

window.addEventListener("pagehide", () => {
  revokeDownloadUrls();
  controller.destroy();
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    revokeDownloadUrls();
    controller.reset();
  }
});

render(controller.getState());
