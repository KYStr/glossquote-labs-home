// DOM wiring for the Shared Electricity Split. All user-visible text is
// set through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, generation, and state machine; this file only renders it.

import { createController } from "./controller.mjs";
import { MAX_ROOMS, MIN_ROOMS, REPORT_FILENAME, serializeReport } from "./core/split.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    roomHeading: (index) => `第 ${index + 1} 房`,
    fieldLabel: {
      totalBill: "總電費",
      totalDelta: "總表度數差",
      rooms: "房間",
      name: "房間名稱",
      start: "起始度數",
      end: "結束度數",
    },
    nameLabel: "房間名稱",
    startLabel: "起始度數（度）",
    endLabel: "結束度數（度）",
    remove: "移除",
    error: {
      SCHEMA: "輸入格式不正確，請重新填寫。",
      INPUT_LIMIT: "輸入太長，超過上限。",
      UNICODE: "含有無法處理的字元。",
      EMPTY: "此欄不可為空。",
      INTEGER_FORMAT: "請輸入不含小數、符號或空白的整數。",
      DECIMAL_FORMAT: "請輸入最多一位小數的數字，不含符號或空白。",
      RANGE: "超出允許範圍。",
      ROOM_COUNT: "房間數必須是 2 至 10 間。",
      NAME_CHARS: "房間名稱須以文字或數字開頭，其餘只能是文字、數字、空格、連字號或底線。",
      DUPLICATE: "房間名稱重複，請改用不同名稱。",
      READING_REGRESSION: "結束度數不可小於起始度數。",
      TOTAL_DELTA_UNDER: "各房用電合計大於總表度數差，請核對度數。",
      INTERNAL: "計算時發生內部錯誤，草稿已保留，請再試一次。",
      WORKER_ERROR: "背景工作無法完成，草稿已保留，請再試一次。",
      OUTPUT_LIMIT: "報告超過 2,097,152 位元組，無法下載。",
    },
    statusEmpty: "尚未計算。請輸入數值，或載入範例。",
    statusDirty: "輸入已變更，請重新計算。",
    statusBusy: "處理中…",
    statusCancelled: "已取消，可重新計算。",
    exampleNote: "已載入範例，請按「計算分攤」執行。",
    summary: (total) => `合計等於總電費：${total} 元。`,
    summaryFallback: "各房用電皆為 0，已改為平均分攤。",
    rowLocation: (row) => `第 ${row} 房`,
  },
  en: {
    roomHeading: (index) => `Room ${index + 1}`,
    fieldLabel: {
      totalBill: "Total bill",
      totalDelta: "Total meter delta",
      rooms: "Rooms",
      name: "Room name",
      start: "Start reading",
      end: "End reading",
    },
    nameLabel: "Room name",
    startLabel: "Start reading (kWh)",
    endLabel: "End reading (kWh)",
    remove: "Remove",
    error: {
      SCHEMA: "The input is malformed. Please fill in the fields again.",
      INPUT_LIMIT: "The input is too long.",
      UNICODE: "This field contains an unsupported character.",
      EMPTY: "This field is required.",
      INTEGER_FORMAT: "Enter an integer without decimals, signs, or spaces.",
      DECIMAL_FORMAT: "Enter a number with at most one decimal place, without signs or spaces.",
      RANGE: "Out of the allowed range.",
      ROOM_COUNT: "There must be between 2 and 10 rooms.",
      NAME_CHARS: "A room name must start with a letter or digit and otherwise use only letters, digits, spaces, hyphens, or underscores.",
      DUPLICATE: "Room names must be unique.",
      READING_REGRESSION: "The end reading cannot be lower than the start reading.",
      TOTAL_DELTA_UNDER: "The rooms together exceed the total meter delta. Check the readings.",
      INTERNAL: "An internal error occurred while calculating. Your draft is kept; please try again.",
      WORKER_ERROR: "The background worker could not finish. Your draft is kept; please try again.",
      OUTPUT_LIMIT: "The report exceeds 2,097,152 bytes and cannot be downloaded.",
    },
    statusEmpty: "Nothing calculated yet. Enter values or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working…",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded. Run “Calculate split” to compute it.",
    summary: (total) => `Amounts sum exactly to the total bill: NT$ ${total}.`,
    summaryFallback: "Every room used 0 kWh, so the bill was split equally.",
    rowLocation: (row) => `Room ${row}`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("split-form");
const topInputs = {
  totalBill: document.getElementById("field-totalBill"),
  totalDelta: document.getElementById("field-totalDelta"),
};
const topErrors = {
  totalBill: document.getElementById("error-totalBill"),
  totalDelta: document.getElementById("error-totalDelta"),
};
const roomsErrorEl = document.getElementById("error-rooms");
const roomsEl = document.getElementById("rooms");
const addRoomBtn = document.getElementById("add-room-btn");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const tableBody = document.getElementById("room-rows");
const commonColEl = document.getElementById("col-common");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");

let roomRows = []; // [{name,start,end,removeBtn,errors:{name,start,end}}]
let reportUrl = null;
let reportUrlTimer = null;
let submitted = false;
let pendingFocus = null;

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

function revokeReportUrl() {
  if (reportUrlTimer !== null) {
    clearTimeout(reportUrlTimer);
    reportUrlTimer = null;
  }
  if (reportUrl !== null) {
    URL.revokeObjectURL(reportUrl);
    reportUrl = null;
  }
}

function buildRoomRow(index) {
  const wrapper = document.createElement("div");
  wrapper.className = "room";

  const heading = document.createElement("h3");
  heading.textContent = t.roomHeading(index);
  wrapper.appendChild(heading);

  const refs = { errors: {} };
  const fields = [
    ["name", t.nameLabel, "text"],
    ["start", t.startLabel, "decimal"],
    ["end", t.endLabel, "decimal"],
  ];
  for (const [field, label, mode] of fields) {
    const fieldDiv = document.createElement("div");
    fieldDiv.className = "field";
    const labelEl = document.createElement("label");
    labelEl.htmlFor = `field-room-${index}-${field}`;
    labelEl.textContent = label;
    const input = document.createElement("input");
    input.id = `field-room-${index}-${field}`;
    input.name = `room-${index}-${field}`;
    input.type = "text";
    input.inputMode = mode;
    input.autocomplete = "off";
    const errorEl = document.createElement("p");
    errorEl.className = "field-error";
    errorEl.id = `error-room-${index}-${field}`;
    errorEl.setAttribute("role", "alert");
    input.addEventListener("input", () => {
      controller.editRoom(index, field, input.value);
    });
    fieldDiv.appendChild(labelEl);
    fieldDiv.appendChild(input);
    fieldDiv.appendChild(errorEl);
    wrapper.appendChild(fieldDiv);
    refs[field] = input;
    refs.errors[field] = errorEl;
  }

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "button-secondary";
  removeBtn.textContent = t.remove;
  removeBtn.addEventListener("click", () => {
    pendingFocus = "add";
    controller.removeRoom(index);
  });
  wrapper.appendChild(removeBtn);
  refs.removeBtn = removeBtn;

  return { wrapper, refs };
}

function rebuildRoomRows(count) {
  roomsEl.replaceChildren();
  roomRows = [];
  for (let index = 0; index < count; index += 1) {
    const { wrapper, refs } = buildRoomRow(index);
    roomsEl.appendChild(wrapper);
    roomRows.push(refs);
  }
}

function setInputError(input, errorEl, message) {
  if (message === null) {
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-errormessage");
    errorEl.textContent = "";
    return;
  }
  input.setAttribute("aria-invalid", "true");
  input.setAttribute("aria-errormessage", errorEl.id);
  errorEl.textContent = message;
}

function clearAllErrors() {
  for (const field of ["totalBill", "totalDelta"]) {
    setInputError(topInputs[field], topErrors[field], null);
  }
  roomsErrorEl.textContent = "";
  for (const refs of roomRows) {
    for (const field of ["name", "start", "end"]) {
      setInputError(refs[field], refs.errors[field], null);
    }
  }
}

function formatTenths(tenths) {
  return `${Math.floor(tenths / 10)}.${tenths % 10}`;
}

function renderResults(result) {
  const parts = [t.summary(result.totalAmountTwd)];
  if (result.equalSplitFallback) parts.push(t.summaryFallback);
  summaryEl.textContent = parts.join(" ");
  const showCommon = result.commonTenths !== null;
  commonColEl.hidden = !showCommon;
  tableBody.replaceChildren();
  for (const room of result.rooms) {
    const tr = document.createElement("tr");
    const cells = [room.name, formatTenths(room.usageTenths)];
    if (showCommon) cells.push(formatTenths(room.commonShareTenths));
    cells.push(formatTenths(room.billableTenths));
    cells.push(`${formatTenths(room.sharePercentTenths)}%`);
    cells.push(String(room.amountTwd));
    for (const value of cells) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    tableBody.appendChild(tr);
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error } = publicState;
  if (roomRows.length !== draft.rooms.length) rebuildRoomRows(draft.rooms.length);
  for (const field of ["totalBill", "totalDelta"]) {
    if (topInputs[field].value !== draft[field]) topInputs[field].value = draft[field];
  }
  draft.rooms.forEach((room, index) => {
    const refs = roomRows[index];
    for (const field of ["name", "start", "end"]) {
      if (refs[field].value !== room[field]) refs[field].value = room[field];
    }
    refs.removeBtn.disabled = draft.rooms.length <= MIN_ROOMS;
  });
  addRoomBtn.disabled = draft.rooms.length >= MAX_ROOMS;

  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  cancelBtn.hidden = state !== "busy";
  downloadBtn.hidden = state !== "success";
  runBtn.disabled = state === "busy";

  if (state !== "success") revokeReportUrl();

  if (state === "empty") {
    statusEl.textContent = t.statusEmpty;
    resultsEl.hidden = true;
    clearAllErrors();
  } else if (state === "dirty") {
    statusEl.textContent = t.statusDirty;
    resultsEl.hidden = true;
    clearAllErrors();
  } else if (state === "busy") {
    statusEl.textContent = t.statusBusy;
    resultsEl.hidden = true;
  } else if (state === "cancelled") {
    statusEl.textContent = t.statusCancelled;
    resultsEl.hidden = true;
    clearAllErrors();
  } else if (state === "error") {
    clearAllErrors();
    resultsEl.hidden = true;
    const current = error ?? { code: "INTERNAL", field: null, row: null };
    const message = t.error[current.code] ?? t.error.INTERNAL;
    let focusTarget = null;
    if (current.field === "totalBill" || current.field === "totalDelta") {
      setInputError(topInputs[current.field], topErrors[current.field], message);
      statusEl.textContent = `${t.fieldLabel[current.field]}：${message}`;
      focusTarget = topInputs[current.field];
    } else if (
      (current.field === "name" || current.field === "start" || current.field === "end") &&
      current.row !== null &&
      roomRows[current.row - 1]
    ) {
      const refs = roomRows[current.row - 1];
      setInputError(refs[current.field], refs.errors[current.field], message);
      statusEl.textContent = `${t.rowLocation(current.row)} ${t.fieldLabel[current.field]}：${message}`;
      focusTarget = refs[current.field];
    } else {
      roomsErrorEl.textContent = message;
      statusEl.textContent = message;
    }
    if (submitted && focusTarget !== null) focusTarget.focus();
    submitted = false;
  } else if (state === "success" && result !== null) {
    clearAllErrors();
    renderResults(result);
    statusEl.textContent = summaryEl.textContent;
    resultsEl.hidden = false;
  }

  if (pendingFocus === "add") {
    pendingFocus = null;
    addRoomBtn.focus();
  } else if (pendingFocus === "newName" && roomRows.length > 0) {
    pendingFocus = null;
    roomRows[roomRows.length - 1].name.focus();
  }
}

const controller = createController({ createWorker, onChange: render });

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitted = true;
  controller.run();
});

for (const field of ["totalBill", "totalDelta"]) {
  topInputs[field].addEventListener("input", () => {
    controller.editTop(field, topInputs[field].value);
  });
}

addRoomBtn.addEventListener("click", () => {
  pendingFocus = "newName";
  controller.addRoom();
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  topInputs.totalBill.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  runBtn.focus();
});

downloadBtn.addEventListener("click", () => {
  const current = controller.getState();
  if (current.state !== "success" || current.result === null) return;
  const serialized = serializeReport(current.result);
  if (!serialized.ok) {
    statusEl.textContent = t.error.OUTPUT_LIMIT;
    return;
  }
  revokeReportUrl();
  const blob = new Blob([serialized.text], { type: "application/json" });
  reportUrl = URL.createObjectURL(blob);
  reportUrlTimer = setTimeout(revokeReportUrl, REPORT_URL_TTL_MS);
  const anchor = document.createElement("a");
  anchor.href = reportUrl;
  anchor.download = REPORT_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
});

window.addEventListener("pagehide", () => {
  revokeReportUrl();
  controller.destroy();
});

render(controller.getState());
