// DOM wiring for the Storage Unit Estimator. All user-visible text
// is set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The fixed report download
// (storage-unit-estimator-report.json) is created only on an explicit
// click, from the current success snapshot, and its Blob URL is
// revoked within 30 seconds or as soon as the result is invalidated.
//
// Rows are persistent DOM: render() syncs values and custom-dimension
// visibility from the draft instead of rebuilding the list, so typing
// never loses focus. Structure changes (add / remove / reset /
// example) rebuild only the row list.

import { createController } from "./controller.mjs";
import {
  CUSTOM_ITEM_ID,
  DIM_FIELDS,
  ITEMS,
  MAX_ROWS,
  buildReport,
} from "./core/storage-unit-estimator.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const GROUP_ORDER = ["furniture", "appliance", "box"];

const STRINGS = {
  "zh-Hant": {
    groupLabel: {
      furniture: "家具",
      appliance: "家電",
      box: "箱子",
    },
    customLabel: "自訂物品",
    itemLabel: (index) => `第 ${index} 列品項`,
    quantityLabel: (index) => `第 ${index} 列數量`,
    dimLabel: (index, axis) => `第 ${index} 列自訂${axis}`,
    dimAxis: { lengthCm: "長（cm）", widthCm: "寬（cm）", heightCm: "高（cm）" },
    removeLabel: (index) => `移除第 ${index} 列`,
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不成對的字元",
      EMPTY: "此欄不可空白",
      INTEGER_FORMAT: "請輸入整數，不含小數、符號或空白",
      ROW_LIMIT: "物品清單最多 30 列",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    rangeError: {
      quantity: "數量須在 1 至 99 之間",
      lengthCm: "長度須在 1 至 300 cm 之間",
      widthCm: "寬度須在 1 至 300 cm 之間",
      heightCm: "高度須在 1 至 300 cm 之間",
    },
    enumError: "請選擇清單中的品項，或選自訂物品並輸入長寬高",
    rowLimitNote: "已達上限 30 列。",
    statusEmpty: "尚未估算。輸入物品清單，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（單人床＋衣櫃＋中箱＋洗衣機），請按「估算倉儲空間」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    rowPrefix: (row) => `第 ${row} 列`,
    labelTotal: "總體積",
    labelAllowance: "預留體積（25%）",
    labelRequired: "需要體積",
    labelUnit: "推薦單位",
    labelFloorArea: "地板面積",
    labelCapacity: "單位容量",
    labelUnitsNeeded: "建議間數",
    labelFill: "佔用率",
    unitValue: (result) => `${result.unitLabelFt}（${result.floorAreaM2} m²，${result.floorAreaPing} 坪）`,
    floorAreaValue: (result) => `${result.floorAreaM2} m²（${result.floorAreaPing} 坪）`,
    capacityValue: (result) => `${result.capacityM3} m³`,
    unitsValue: (result) => `${result.unitsNeeded} 間`,
    fillValue: (result) => `${result.fillPct}%`,
    volumeValue: (value) => `${value} m³`,
    tableCaption: "逐列體積",
    tableHeaders: ["品項", "數量", "單件體積", "列體積"],
    overflowNote: (result) =>
      `⚠ 單一最大單位裝不下，建議 ${result.unitsNeeded} 間最大單位；另請確認業者是否提供更大單位或分租方案。`,
    successSummary: (result) =>
      `需要體積 ${result.requiredM3} m³，推薦 ${result.unitLabelFt}，佔用率 ${result.fillPct}%`,
  },
  en: {
    groupLabel: {
      furniture: "Furniture",
      appliance: "Appliances",
      box: "Boxes",
    },
    customLabel: "Custom item",
    itemLabel: (index) => `Row ${index} item`,
    quantityLabel: (index) => `Row ${index} quantity`,
    dimLabel: (index, axis) => `Row ${index} custom ${axis}`,
    dimAxis: { lengthCm: "Length (cm)", widthCm: "Width (cm)", heightCm: "Height (cm)" },
    removeLabel: (index) => `Remove row ${index}`,
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an unpaired character.",
      EMPTY: "This field is required.",
      INTEGER_FORMAT: "Enter a whole number with no decimal, sign, or space.",
      ROW_LIMIT: "The item list holds at most 30 rows.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    rangeError: {
      quantity: "Quantity must be between 1 and 99.",
      lengthCm: "Length must be between 1 and 300 cm.",
      widthCm: "Width must be between 1 and 300 cm.",
      heightCm: "Height must be between 1 and 300 cm.",
    },
    enumError: "Choose an item from the list, or choose a custom item and enter its dimensions.",
    rowLimitNote: "Reached the limit of 30 rows.",
    statusEmpty: "Nothing estimated yet. Enter the item list, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote:
      "Example loaded (single bed + wardrobe + medium boxes + washing machine). Press “Estimate storage size” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    rowPrefix: (row) => `Row ${row}`,
    labelTotal: "Total volume",
    labelAllowance: "Allowance (25%)",
    labelRequired: "Required volume",
    labelUnit: "Recommended unit",
    labelFloorArea: "Floor area",
    labelCapacity: "Unit capacity",
    labelUnitsNeeded: "Units suggested",
    labelFill: "Fill rate",
    unitValue: (result) => `${result.unitLabelFt} (${result.floorAreaM2} m², ${result.floorAreaPing} ping)`,
    floorAreaValue: (result) => `${result.floorAreaM2} m² (${result.floorAreaPing} ping)`,
    capacityValue: (result) => `${result.capacityM3} m³`,
    unitsValue: (result) => `${result.unitsNeeded}`,
    fillValue: (result) => `${result.fillPct}%`,
    volumeValue: (value) => `${value} m³`,
    tableCaption: "Volume per row",
    tableHeaders: ["Item", "Quantity", "Unit volume", "Row volume"],
    overflowNote: (result) =>
      `⚠ Exceeds the largest unit; ${result.unitsNeeded} largest units suggested — check whether the facility offers larger units or split rentals.`,
    successSummary: (result) =>
      `Required volume ${result.requiredM3} m³, recommended ${result.unitLabelFt}, fill rate ${result.fillPct}%`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("entry-form");
const rowsList = document.getElementById("rows-list");
const addRowBtn = document.getElementById("add-row-btn");
const rowLimitNote = document.getElementById("row-limit-note");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const rowsTableBody = document.getElementById("rows-table-body");
const overflowNoteEl = document.getElementById("overflow-note");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");

let submitted = false;
let renderedSignature = null;

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

function itemDisplayName(itemId) {
  if (itemId === CUSTOM_ITEM_ID) return t.customLabel;
  const pinned = ITEMS[itemId];
  if (!pinned) return itemId;
  return lang === "en" ? pinned.nameEn : pinned.nameZh;
}

function buildItemOptions(select) {
  for (const group of GROUP_ORDER) {
    const groupEl = document.createElement("optgroup");
    groupEl.label = t.groupLabel[group];
    for (const [itemId, pinned] of Object.entries(ITEMS)) {
      if (pinned.group !== group) continue;
      const option = document.createElement("option");
      option.value = itemId;
      option.textContent = itemDisplayName(itemId);
      groupEl.appendChild(option);
    }
    select.appendChild(groupEl);
  }
  const customOption = document.createElement("option");
  customOption.value = CUSTOM_ITEM_ID;
  customOption.textContent = t.customLabel;
  select.appendChild(customOption);
}

function createRowElement(index) {
  const rowEl = document.createElement("div");
  rowEl.className = "item-row";
  rowEl.dataset.rowIndex = String(index);

  const itemField = document.createElement("div");
  itemField.className = "field item-field";
  const itemLabel = document.createElement("label");
  itemLabel.textContent = t.itemLabel(index + 1);
  const itemSelect = document.createElement("select");
  itemSelect.className = "item-select";
  itemSelect.setAttribute("aria-label", t.itemLabel(index + 1));
  buildItemOptions(itemSelect);
  itemLabel.htmlFor = itemSelect.id = `field-item-${index}`;
  itemField.append(itemLabel, itemSelect);

  const qtyField = document.createElement("div");
  qtyField.className = "field qty-field";
  const qtyLabel = document.createElement("label");
  qtyLabel.textContent = t.quantityLabel(index + 1);
  const qtyInput = document.createElement("input");
  qtyInput.className = "qty-input";
  qtyInput.type = "text";
  qtyInput.inputMode = "numeric";
  qtyInput.autocomplete = "off";
  qtyInput.setAttribute("aria-label", t.quantityLabel(index + 1));
  qtyInput.id = `field-qty-${index}`;
  qtyLabel.htmlFor = qtyInput.id;
  qtyField.append(qtyLabel, qtyInput);

  const dimsField = document.createElement("div");
  dimsField.className = "dims-field";
  dimsField.hidden = true;
  for (const dim of DIM_FIELDS) {
    const wrap = document.createElement("div");
    wrap.className = "field dim-field";
    const dimLabel = document.createElement("label");
    dimLabel.textContent = t.dimLabel(index + 1, t.dimAxis[dim]);
    const dimInput = document.createElement("input");
    dimInput.className = "dim-input";
    dimInput.dataset.dim = dim;
    dimInput.type = "text";
    dimInput.inputMode = "numeric";
    dimInput.autocomplete = "off";
    dimInput.setAttribute("aria-label", t.dimLabel(index + 1, t.dimAxis[dim]));
    dimInput.id = `field-${dim}-${index}`;
    dimLabel.htmlFor = dimInput.id;
    wrap.append(dimLabel, dimInput);
    dimsField.appendChild(wrap);
  }

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "button-secondary remove-btn";
  removeBtn.textContent = t.removeLabel(index + 1);
  removeBtn.dataset.action = "remove";

  const errorEl = document.createElement("p");
  errorEl.className = "field-error row-error";
  errorEl.id = `error-row-${index}`;
  errorEl.setAttribute("role", "alert");

  rowEl.append(itemField, qtyField, dimsField, removeBtn, errorEl);
  return rowEl;
}

function rowSignature(draft) {
  return JSON.stringify(
    draft.items.map((row) => [row.itemId, DIM_FIELDS.map((dim) => dim in row).join(",")]),
  );
}

function syncRows(draft) {
  const signature = rowSignature(draft);
  if (signature !== renderedSignature) {
    rowsList.replaceChildren();
    draft.items.forEach((_row, index) => {
      rowsList.appendChild(createRowElement(index));
    });
    renderedSignature = signature;
  }
  const rowEls = rowsList.querySelectorAll(".item-row");
  draft.items.forEach((row, index) => {
    const rowEl = rowEls[index];
    const select = rowEl.querySelector(".item-select");
    if (select.value !== row.itemId) select.value = row.itemId;
    const qtyInput = rowEl.querySelector(".qty-input");
    if (qtyInput.value !== row.quantity) qtyInput.value = row.quantity;
    const dimsField = rowEl.querySelector(".dims-field");
    dimsField.hidden = row.itemId !== CUSTOM_ITEM_ID;
    for (const dim of DIM_FIELDS) {
      const dimInput = rowEl.querySelector(`.dim-input[data-dim="${dim}"]`);
      const value = row[dim] ?? "";
      if (dimInput.value !== value) dimInput.value = value;
    }
    const removeBtn = rowEl.querySelector(".remove-btn");
    removeBtn.disabled = draft.items.length <= 1;
  });
  addRowBtn.disabled = draft.items.length >= MAX_ROWS;
  rowLimitNote.hidden = draft.items.length < MAX_ROWS;
  if (draft.items.length >= MAX_ROWS) rowLimitNote.textContent = t.rowLimitNote;
}

function readDraftFromDom() {
  const items = [];
  for (const rowEl of rowsList.querySelectorAll(".item-row")) {
    const itemId = rowEl.querySelector(".item-select").value;
    const row = {
      itemId,
      quantity: rowEl.querySelector(".qty-input").value,
    };
    if (itemId === CUSTOM_ITEM_ID) {
      for (const dim of DIM_FIELDS) {
        row[dim] = rowEl.querySelector(`.dim-input[data-dim="${dim}"]`).value;
      }
    }
    items.push(row);
  }
  return { items };
}

function clearRowErrors() {
  for (const rowEl of rowsList.querySelectorAll(".item-row")) {
    const errorEl = rowEl.querySelector(".row-error");
    errorEl.textContent = "";
    for (const control of rowEl.querySelectorAll("select, input")) {
      control.removeAttribute("aria-invalid");
      control.removeAttribute("aria-errormessage");
    }
  }
}

function setRowError(rowIndex, field, message) {
  const rowEl = rowsList.querySelectorAll(".item-row")[rowIndex];
  if (!rowEl) return null;
  let control = null;
  if (field === "itemId") control = rowEl.querySelector(".item-select");
  else if (field === "quantity") control = rowEl.querySelector(".qty-input");
  else if (DIM_FIELDS.includes(field)) {
    control = rowEl.querySelector(`.dim-input[data-dim="${field}"]`);
  }
  const errorEl = rowEl.querySelector(".row-error");
  errorEl.textContent = message;
  if (control) {
    control.setAttribute("aria-invalid", "true");
    control.setAttribute("aria-errormessage", errorEl.id);
  }
  return control;
}

function errorMessage(error) {
  if (error.code === "RANGE" && error.field !== null && t.rangeError[error.field]) {
    return t.rangeError[error.field];
  }
  if (error.code === "ENUM") return t.enumError;
  return t.error[error.code] ?? t.error.INTERNAL;
}

function appendSummaryRows(container, rows) {
  container.replaceChildren();
  for (const [label, value] of rows) {
    const div = document.createElement("div");
    div.className = "summary-row";
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    div.append(dt, dd);
    container.appendChild(div);
  }
}

function renderResult(result) {
  appendSummaryRows(summaryRows, [
    [t.labelTotal, t.volumeValue(result.totalM3)],
    [t.labelAllowance, t.volumeValue(result.allowanceM3)],
    [t.labelRequired, t.volumeValue(result.requiredM3)],
    [t.labelUnit, t.unitValue(result)],
    [t.labelFloorArea, t.floorAreaValue(result)],
    [t.labelCapacity, t.capacityValue(result)],
    [t.labelUnitsNeeded, t.unitsValue(result)],
    [t.labelFill, t.fillValue(result)],
  ]);
  rowsTableBody.replaceChildren();
  for (const row of result.rows) {
    const tr = document.createElement("tr");
    const nameCell = document.createElement("td");
    nameCell.textContent = lang === "en" ? row.nameEn : row.nameZh;
    const qtyCell = document.createElement("td");
    qtyCell.textContent = String(row.quantity);
    const unitCell = document.createElement("td");
    unitCell.textContent = t.volumeValue(row.unitVolumeM3);
    const rowCell = document.createElement("td");
    rowCell.textContent = t.volumeValue(row.rowVolumeM3);
    tr.append(nameCell, qtyCell, unitCell, rowCell);
    rowsTableBody.appendChild(tr);
  }
  overflowNoteEl.hidden = result.fits;
  if (!result.fits) overflowNoteEl.textContent = t.overflowNote(result);
}

function render(publicState) {
  const { state, draft, isExample, result, error, reportAvailable } = publicState;
  syncRows(draft);
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
    clearRowErrors();
  } else if (state === "dirty") {
    statusEl.textContent = t.statusDirty;
    resultsEl.hidden = true;
    clearRowErrors();
  } else if (state === "busy") {
    statusEl.textContent = t.statusBusy;
    resultsEl.hidden = true;
  } else if (state === "cancelled") {
    statusEl.textContent = t.statusCancelled;
    resultsEl.hidden = true;
    clearRowErrors();
  } else if (state === "error") {
    clearRowErrors();
    if (error !== null) {
      const message = errorMessage(error);
      let focusTarget = null;
      if (error.row !== null && error.field !== null) {
        focusTarget = setRowError(error.row - 1, error.field, message);
        statusEl.textContent = `${t.rowPrefix(error.row)}${t.fieldErrorJoiner}${message}`;
      } else if (error.row !== null) {
        statusEl.textContent = `${t.rowPrefix(error.row)}${t.fieldErrorJoiner}${message}`;
      } else {
        statusEl.textContent = message;
      }
      if (submitted && focusTarget !== null) {
        submitted = false;
        focusTarget.focus();
      } else {
        submitted = false;
      }
    } else {
      statusEl.textContent = t.error.INTERNAL;
    }
    resultsEl.hidden = true;
  } else if (state === "success" && result !== null) {
    renderResult(result);
    statusEl.textContent = t.successSummary(result);
    resultsEl.hidden = false;
    clearRowErrors();
  }
}

const controller = createController({ createWorker, onChange: render });

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitted = true;
  controller.run();
});

rowsList.addEventListener("input", (event) => {
  if (event.target.matches("select, input")) {
    controller.edit(readDraftFromDom());
  }
});
rowsList.addEventListener("change", (event) => {
  if (event.target.matches("select")) {
    controller.edit(readDraftFromDom());
  }
});
rowsList.addEventListener("click", (event) => {
  const button = event.target.closest('[data-action="remove"]');
  if (!button) return;
  const draft = readDraftFromDom();
  const rowEl = button.closest(".item-row");
  const index = [...rowsList.querySelectorAll(".item-row")].indexOf(rowEl);
  if (index < 0 || draft.items.length <= 1) return;
  draft.items.splice(index, 1);
  controller.edit(draft);
  const firstField = rowsList.querySelector(".item-select");
  if (firstField) firstField.focus();
});

addRowBtn.addEventListener("click", () => {
  const draft = readDraftFromDom();
  if (draft.items.length >= MAX_ROWS) return;
  draft.items.push({ itemId: "box-small", quantity: "1" });
  controller.edit(draft);
  const selects = rowsList.querySelectorAll(".item-select");
  const last = selects[selects.length - 1];
  if (last) last.focus();
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  const firstField = rowsList.querySelector(".item-select");
  if (firstField) firstField.focus();
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
  if (event.persisted) {
    controller.reset();
  }
});

render(controller.getState());
