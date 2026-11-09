// Parking Fee Calculator — DOM wiring. Rendering uses textContent/value
// only; user input never becomes markup, selectors, or code. Work runs in
// a module Worker built from the fixed embedded source (worker-source.mjs,
// generated at build time from the pure core bytes). No fetch, storage, or
// analytics.

import { ParkingController } from "./controller.mjs";
import { ERROR_MESSAGES, UI_STRINGS } from "./core/messages.mjs";
import { WORKER_SOURCE } from "./worker-source.mjs";

const lang = document.documentElement.lang && document.documentElement.lang.startsWith("zh") ? "zh" : "en";
const S = UI_STRINGS[lang];
const E = ERROR_MESSAGES[lang];

const FIELDS = [
  "entry",
  "exit",
  "graceMinutes",
  "firstPeriodMinutes",
  "firstPrice",
  "nextPeriodMinutes",
  "nextPrice",
  "dailyCap",
  "lostTicketFee"
];

const els = {};
function el(id) {
  if (!els[id]) els[id] = document.getElementById(id);
  return els[id];
}

function readDraft() {
  const draft = {};
  for (const field of FIELDS) draft[field] = el("f-" + field).value;
  draft.lostTicket = el("f-lostTicket").checked;
  return draft;
}

function writeDraft(draft) {
  for (const field of FIELDS) el("f-" + field).value = draft[field];
  el("f-lostTicket").checked = draft.lostTicket === true;
}

// --- Worker port -----------------------------------------------------------
let worker = null;
let workerUrl = null;
let messageHandler = null;
let lastGeneration = -1;

function ensureWorker() {
  if (worker !== null) return worker;
  if (workerUrl === null) {
    workerUrl = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
  }
  worker = new Worker(workerUrl, { type: "module" });
  worker.onmessage = (event) => {
    if (messageHandler !== null) messageHandler(event.data);
  };
  worker.onerror = () => {
    if (messageHandler !== null) {
      messageHandler({
        generation: lastGeneration,
        outcome: { ok: false, error: { code: "WORKER_ERROR", field: null, row: null } }
      });
    }
    terminateWorker();
  };
  return worker;
}

function terminateWorker() {
  if (worker !== null) {
    worker.terminate();
    worker = null;
  }
}

const port = {
  post(message) {
    lastGeneration = message.generation;
    ensureWorker().postMessage(message);
  },
  setOnMessage(fn) {
    messageHandler = fn;
  },
  terminate() {
    terminateWorker();
  }
};

const controller = new ParkingController(port);

// --- Download --------------------------------------------------------------
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

function onDownload() {
  const report = controller.getReport();
  if (report === null) return;
  if (report.ok !== true) {
    el("status").textContent = E[report.error.code] || E.WORKER_ERROR;
    return;
  }
  revokeDownload();
  downloadUrl = URL.createObjectURL(new Blob([report.bytes], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = "parking-fee-report.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  downloadTimer = setTimeout(revokeDownload, 30000);
}

// --- Rendering ---------------------------------------------------------------
function clearFieldErrors() {
  for (const field of [...FIELDS, "lostTicket"]) {
    const input = el("f-" + field);
    const slot = el("err-" + field);
    if (input) input.removeAttribute("aria-invalid");
    if (slot) {
      slot.hidden = true;
      slot.textContent = "";
    }
  }
}

function showFieldError(error) {
  clearFieldErrors();
  if (!error) return;
  let code = error.code;
  if (code === "RANGE" && error.field === "exit") code = "RANGE_EXIT_LIMIT";
  const message = E[code] || E.WORKER_ERROR;
  el("status").textContent = message;
  if (error.field && el("f-" + error.field)) {
    const input = el("f-" + error.field);
    const slot = el("err-" + error.field);
    input.setAttribute("aria-invalid", "true");
    if (slot) {
      slot.textContent = message;
      slot.hidden = false;
    }
    input.focus();
  }
}

function renderResult(result) {
  const box = el("result");
  const summary = el("result-summary");
  summary.textContent = "";
  const lines = [
    S.totalMinutes + ": " + String(result.totalMinutes),
    S.totalFee + ": " + String(result.totalFee)
  ];
  for (const line of lines) {
    const p = document.createElement("p");
    p.textContent = line;
    summary.appendChild(p);
  }
  const notes = [];
  if (result.lostTicketApplied) notes.push(S.lostTicketNote);
  if (result.graceApplied) notes.push(S.graceNote);
  if (result.days.some((d) => d.capped)) notes.push(S.cappedNote);
  for (const note of notes) {
    const p = document.createElement("p");
    p.textContent = note;
    summary.appendChild(p);
  }

  const tbody = el("days-body");
  tbody.textContent = "";
  for (const day of result.days) {
    const tr = document.createElement("tr");
    const cells = [
      day.date,
      String(day.minutes),
      String(day.firstPeriods),
      String(day.nextPeriods),
      String(day.rawFee),
      day.capped ? S.yes : S.no,
      String(day.fee)
    ];
    for (const cell of cells) {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  el("days-wrap").hidden = result.days.length === 0;
  box.hidden = false;
}

function render() {
  const state = controller.state;
  el("main-region").setAttribute("aria-busy", state === "busy" ? "true" : "false");
  el("btn-run").disabled = state === "busy";
  el("btn-cancel").hidden = state !== "busy";
  el("btn-download").hidden = !controller.reportAvailable;
  if (!controller.reportAvailable) revokeDownload();

  if (state === "success") {
    el("status").textContent = "";
    clearFieldErrors();
    renderResult(controller.result);
    return;
  }
  el("result").hidden = true;
  if (state === "empty") {
    el("status").textContent = S.emptyNotice;
    clearFieldErrors();
  } else if (state === "dirty") {
    el("status").textContent = S.dirtyNotice;
  } else if (state === "busy") {
    el("status").textContent = S.working;
  } else if (state === "cancelled") {
    el("status").textContent = S.cancelledNotice;
  } else if (state === "error") {
    showFieldError(controller.error);
  }
}

controller.onChange = render;

// --- Events ------------------------------------------------------------------
function onEdit() {
  controller.edit(readDraft());
}

for (const field of FIELDS) {
  el("f-" + field).addEventListener("input", onEdit);
  el("f-" + field).addEventListener("change", onEdit);
}
el("f-lostTicket").addEventListener("change", onEdit);

el("calc-form").addEventListener("submit", (event) => {
  event.preventDefault();
  controller.run();
});
el("btn-cancel").addEventListener("click", () => controller.cancel());
el("btn-reset").addEventListener("click", () => {
  controller.reset();
  writeDraft(controller.draft);
  clearFieldErrors();
  el("f-entry").focus();
});
el("btn-example").addEventListener("click", () => {
  const example = {
    entry: "2026-11-09T09:00",
    exit: "2026-11-09T11:10",
    graceMinutes: "15",
    firstPeriodMinutes: "60",
    firstPrice: "40",
    nextPeriodMinutes: "30",
    nextPrice: "20",
    dailyCap: "200",
    lostTicketFee: "1000",
    lostTicket: false
  };
  writeDraft(example);
  controller.edit(example);
  el("status").textContent = S.exampleLoaded;
});
el("btn-download").addEventListener("click", onDownload);

window.addEventListener("pagehide", () => {
  terminateWorker();
  revokeDownload();
  if (workerUrl !== null) {
    URL.revokeObjectURL(workerUrl);
    workerUrl = null;
  }
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    controller.reset();
    writeDraft(controller.draft);
  }
});

writeDraft(controller.draft);
render();
