// DOM wiring for the Deal Comparator. All user-visible text is set
// through textContent/value only; user input never becomes markup.
// Computation runs in a module Worker built from the fixed worker
// source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The fixed report download
// (deal-comparator-report.json) is created only on an explicit click,
// from the current success snapshot, and its Blob URL is revoked
// within 30 seconds or as soon as the result is invalidated.

import { createController } from "./controller.mjs";
import { buildReport } from "./core/deal-comparator.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const TYPE_NAMES = {
  "zh-Hant": {
    buyNGetM: "買 N 送 M",
    percentOff: "百分比折扣",
    fixedOff: "定額折價",
    bundle: "組合價",
  },
  en: {
    buyNGetM: "Buy N get M",
    percentOff: "Percent off",
    fixedOff: "Fixed amount off",
    bundle: "Bundle price",
  },
};

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      productName: "商品名稱",
      unitBasis: "單位基準",
      packSize: "每包規格",
      packPrice: "每包單價",
      offers: "方案數量",
    },
    offerFieldLabel: {
      label: "標籤",
      type: "優惠型別",
      buyN: "買 N",
      getM: "送 M",
      quantity: "件數",
      percent: "折扣百分比",
      amountOff: "折抵金額",
      bundlePrice: "組合價",
    },
    error: {
      SCHEMA: "欄位缺失、未知、多餘或型別錯誤。",
      INPUT_LIMIT: "輸入超過容量上限。",
      EMPTY: "內容為空。",
      INTEGER_FORMAT: "不是規定的整數字串。",
      MONEY_FORMAT: "不是規定的金額字串。",
      ENUM: "不是允許的選項。",
      OFFER_COUNT: "方案數量必須是 2–4 個。",
      DISCOUNT_EXCEEDS_PRICE: "定額折價大於等於總原價。",
      INTERNAL: "處理失敗，請重試。",
      WORKER_ERROR: "處理失敗，請重試。",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載。",
    },
    rangeError: {
      packSizeG: "每包規格須在 1 至 100000 之間。",
      packSizePiece: "每包規格須在 1 至 1000 之間。",
      packPrice: "每包單價須在 0.01 至 999999.99 元之間。",
      count: "須為 1 至 99 的整數。",
      money: "須在 0.01 至 999999.99 元之間。",
    },
    statusEmpty: "尚未比較。輸入商品與 2–4 個優惠方案，或載入範例。",
    statusDirty: "輸入已變更，請重新執行。",
    statusBusy: "處理中。",
    statusCancelled: "已取消，可重新執行。",
    exampleNote: "已載入範例（合成案例：咖啡豆四種優惠），請按「比較優惠」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    bestLine: (best, typeName) =>
      `最佳方案：「${best.label}」（${typeName}），第 1 名，統一單位價 ${displayMoney(best.unitPrice)}，省下 ${displayMoney(best.savings)}（${best.savingsPercent}%）。`,
    bestMark: "★最佳",
    quantityUnit: { g: "g", ml: "mL", piece: "件" },
  },
  en: {
    fieldLabel: {
      productName: "Product name",
      unitBasis: "Unit basis",
      packSize: "Pack size",
      packPrice: "Pack price",
      offers: "Number of offers",
    },
    offerFieldLabel: {
      label: "Label",
      type: "Offer type",
      buyN: "Buy N",
      getM: "Get M",
      quantity: "Quantity",
      percent: "Percent off",
      amountOff: "Amount off",
      bundlePrice: "Bundle price",
    },
    error: {
      SCHEMA: "Missing, unknown, extra, or mistyped field.",
      INPUT_LIMIT: "Input exceeds the size limit.",
      EMPTY: "Empty value.",
      INTEGER_FORMAT: "Not an integer string in the required form.",
      MONEY_FORMAT: "Not a money string in the required form.",
      ENUM: "Not an allowed option.",
      OFFER_COUNT: "Offer count must be 2–4.",
      DISCOUNT_EXCEEDS_PRICE: "Fixed discount is greater than or equal to the total list price.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    rangeError: {
      packSizeG: "Pack size must be between 1 and 100000.",
      packSizePiece: "Pack size must be between 1 and 1000.",
      packPrice: "Pack price must be between 0.01 and 999999.99.",
      count: "Must be a whole number from 1 to 99.",
      money: "Must be between 0.01 and 999999.99.",
    },
    statusEmpty: "Nothing compared yet. Enter the product and 2–4 offers, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working.",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case: four coffee-bean offers). Press “Compare deals” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    bestLine: (best, typeName) =>
      `Best deal: “${best.label}” (${typeName}), rank 1, unit price ${displayMoney(best.unitPrice)}, saving ${displayMoney(best.savings)} (${best.savingsPercent}%).`,
    bestMark: "★Best",
    quantityUnit: { g: "g", ml: "mL", piece: "pieces" },
  },
};

function displayMoney(money) {
  if (money.startsWith("-")) return `-NT$${money.slice(1)}`;
  return `NT$${money}`;
}

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];
const typeNames = TYPE_NAMES[lang];

const form = document.getElementById("entry-form");
const productNameEl = document.getElementById("field-product-name");
const unitBasisEl = document.getElementById("field-unit-basis");
const packSizeEl = document.getElementById("field-pack-size");
const packPriceEl = document.getElementById("field-pack-price");
const offerCountEl = document.getElementById("field-offer-count");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const bestLineEl = document.getElementById("best-line");
const resultRowsEl = document.getElementById("result-rows");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");

const fieldErrorEls = {
  productName: document.getElementById("error-product-name"),
  unitBasis: document.getElementById("error-unit-basis"),
  packSize: document.getElementById("error-pack-size"),
  packPrice: document.getElementById("error-pack-price"),
  offers: document.getElementById("error-offer-count"),
};

function el(id) {
  return document.getElementById(id);
}

function offerFieldset(index) {
  return el(`offer-${index}`);
}
function labelEl(index) {
  return el(`field-offer-${index}-label`);
}
function typeEl(index) {
  return el(`field-offer-${index}-type`);
}
function buyNEl(index) {
  return el(`field-offer-${index}-buy-n`);
}
function getMEl(index) {
  return el(`field-offer-${index}-get-m`);
}
function quantityEl(index, type) {
  if (type === "fixedOff") return el(`field-offer-${index}-quantity-fixed`);
  if (type === "bundle") return el(`field-offer-${index}-quantity-bundle`);
  return el(`field-offer-${index}-quantity`);
}
function percentEl(index) {
  return el(`field-offer-${index}-percent`);
}
function amountOffEl(index) {
  return el(`field-offer-${index}-amount-off`);
}
function bundlePriceEl(index) {
  return el(`field-offer-${index}-bundle-price`);
}
function offerErrorEl(index) {
  return el(`error-offer-${index}`);
}
function typeGroupEl(index, type) {
  return el(`offer-${index}-group-${type}`);
}

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

function collectDraft() {
  const count = Number(offerCountEl.value);
  const offers = [];
  for (let index = 0; index < count; index += 1) {
    const type = typeEl(index).value;
    const offer = { type };
    const label = labelEl(index).value;
    if (label !== "") offer.label = label;
    if (type === "buyNGetM") {
      offer.buyN = buyNEl(index).value;
      offer.getM = getMEl(index).value;
    } else if (type === "percentOff") {
      const quantity = quantityEl(index, type).value;
      if (quantity !== "") offer.quantity = quantity;
      offer.percent = percentEl(index).value;
    } else if (type === "fixedOff") {
      const quantity = quantityEl(index, type).value;
      if (quantity !== "") offer.quantity = quantity;
      offer.amountOff = amountOffEl(index).value;
    } else {
      const quantity = quantityEl(index, type).value;
      if (quantity !== "") offer.quantity = quantity;
      offer.bundlePrice = bundlePriceEl(index).value;
    }
    offers.push(offer);
  }
  return {
    productName: productNameEl.value,
    unitBasis: unitBasisEl.value,
    packSize: packSizeEl.value,
    packPrice: packPriceEl.value,
    offers,
  };
}

function setValue(element, value) {
  if (element.value !== value) element.value = value;
}

function syncOfferInputs(index, offer) {
  setValue(labelEl(index), offer.label ?? "");
  setValue(typeEl(index), offer.type);
  if (offer.type === "buyNGetM") {
    setValue(buyNEl(index), offer.buyN ?? "");
    setValue(getMEl(index), offer.getM ?? "");
  } else if (offer.type === "percentOff") {
    setValue(quantityEl(index, offer.type), offer.quantity ?? "");
    setValue(percentEl(index), offer.percent ?? "");
  } else if (offer.type === "fixedOff") {
    setValue(quantityEl(index, offer.type), offer.quantity ?? "");
    setValue(amountOffEl(index), offer.amountOff ?? "");
  } else {
    setValue(quantityEl(index, offer.type), offer.quantity ?? "");
    setValue(bundlePriceEl(index), offer.bundlePrice ?? "");
  }
  for (const type of ["buyNGetM", "percentOff", "fixedOff", "bundle"]) {
    typeGroupEl(index, type).hidden = type !== offer.type;
  }
}

function setFieldError(element, errorEl, message) {
  if (message === null) {
    element.removeAttribute("aria-invalid");
    element.removeAttribute("aria-errormessage");
    errorEl.textContent = "";
    return;
  }
  element.setAttribute("aria-invalid", "true");
  element.setAttribute("aria-errormessage", errorEl.id);
  errorEl.textContent = message;
}

function clearFieldErrors() {
  setFieldError(productNameEl, fieldErrorEls.productName, null);
  setFieldError(unitBasisEl, fieldErrorEls.unitBasis, null);
  setFieldError(packSizeEl, fieldErrorEls.packSize, null);
  setFieldError(packPriceEl, fieldErrorEls.packPrice, null);
  setFieldError(offerCountEl, fieldErrorEls.offers, null);
  for (let index = 0; index < 4; index += 1) {
    offerErrorEl(index).textContent = "";
    typeEl(index).removeAttribute("aria-invalid");
    typeEl(index).removeAttribute("aria-errormessage");
  }
}

function rangeMessage(error, draft) {
  if (error.field === "packSize") {
    return draft.unitBasis === "piece" ? t.rangeError.packSizePiece : t.rangeError.packSizeG;
  }
  if (error.field === "packPrice") return t.rangeError.packPrice;
  if (error.field !== null && /^(amountOff|bundlePrice)$/.test(error.field.split(".").pop())) {
    return t.rangeError.money;
  }
  return t.rangeError.count;
}

function errorMessage(error, draft) {
  if (error.code === "RANGE") return rangeMessage(error, draft);
  return t.error[error.code] ?? t.error.INTERNAL;
}

// Maps a core error to the field slot, the element to focus on
// submit, and the short label used in the status line. Returns null
// parts when the error has no single field.
function errorTarget(error, draft) {
  const field = error.field;
  if (field === null) return { slot: null, focus: null, label: null };
  if (field === "offers") {
    return { slot: fieldErrorEls.offers, focus: offerCountEl, label: t.fieldLabel.offers };
  }
  if (field === "productName" || field === "unitBasis" || field === "packSize" || field === "packPrice") {
    const element =
      field === "productName"
        ? productNameEl
        : field === "unitBasis"
          ? unitBasisEl
          : field === "packSize"
            ? packSizeEl
            : packPriceEl;
    return { slot: fieldErrorEls[field], focus: element, label: t.fieldLabel[field] };
  }
  const match = /^offers\[([0-3])\](?:\.(.+))?$/.exec(field);
  if (match === null) return { slot: null, focus: null, label: null };
  const index = Number(match[1]);
  const subfield = match[2] ?? null;
  const offer = draft.offers[index];
  const offerLabel = offer && offer.label ? offer.label : `方案 ${"ABCD"[index]}`;
  const offerLabelEn = offer && offer.label ? offer.label : `Offer ${"ABCD"[index]}`;
  const displayOffer = lang === "en" ? offerLabelEn : offerLabel;
  const focus =
    subfield === "label"
      ? labelEl(index)
      : subfield === "type" || subfield === null
        ? typeEl(index)
        : subfield === "buyN"
          ? buyNEl(index)
          : subfield === "getM"
            ? getMEl(index)
            : subfield === "quantity"
              ? quantityEl(index, offer ? offer.type : "percentOff")
              : subfield === "percent"
                ? percentEl(index)
                : subfield === "amountOff"
                  ? amountOffEl(index)
                  : subfield === "bundlePrice"
                    ? bundlePriceEl(index)
                    : typeEl(index);
  const subLabel = subfield === null ? null : t.offerFieldLabel[subfield] ?? subfield;
  return {
    slot: offerErrorEl(index),
    focus,
    label: subLabel === null ? displayOffer : `${displayOffer} ${subLabel}`,
  };
}

function renderResults(result) {
  const best = result.offers.find((offer) => offer.best);
  bestLineEl.textContent = best ? t.bestLine(best, typeNames[best.type]) : "";
  resultRowsEl.replaceChildren();
  for (const offer of result.offers) {
    const row = document.createElement("tr");
    const rankCell = document.createElement("td");
    rankCell.textContent = offer.best ? `${offer.rank} ${t.bestMark}` : String(offer.rank);
    const labelCell = document.createElement("td");
    labelCell.textContent = offer.label;
    const typeCell = document.createElement("td");
    typeCell.textContent = typeNames[offer.type];
    const paidCell = document.createElement("td");
    paidCell.textContent = displayMoney(offer.totalPaid);
    const quantityCell = document.createElement("td");
    quantityCell.textContent = `${offer.totalQuantity} ${t.quantityUnit[result.unitBasis]}`;
    const unitCell = document.createElement("td");
    unitCell.textContent = `${displayMoney(offer.unitPrice)} ${result.unitLabel}`;
    const savingsCell = document.createElement("td");
    savingsCell.textContent = `${displayMoney(offer.savings)} (${offer.savingsPercent}%)`;
    row.append(rankCell, labelCell, typeCell, paidCell, quantityCell, unitCell, savingsCell);
    resultRowsEl.appendChild(row);
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error, reportAvailable } = publicState;
  setValue(productNameEl, draft.productName);
  setValue(unitBasisEl, draft.unitBasis);
  setValue(packSizeEl, draft.packSize);
  setValue(packPriceEl, draft.packPrice);
  setValue(offerCountEl, String(draft.offers.length));
  for (let index = 0; index < 4; index += 1) {
    const fieldset = offerFieldset(index);
    fieldset.hidden = index >= draft.offers.length;
    if (index < draft.offers.length) syncOfferInputs(index, draft.offers[index]);
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
      const message = errorMessage(error, draft);
      const target = errorTarget(error, draft);
      if (target.slot !== null) {
        const focusEl = target.focus;
        if (focusEl !== null) {
          setFieldError(focusEl, target.slot, message);
        } else {
          target.slot.textContent = message;
        }
        statusEl.textContent =
          target.label === null ? message : `${target.label}${t.fieldErrorJoiner}${message}`;
        if (submitted && focusEl !== null) {
          submitted = false;
          focusEl.focus();
        }
      } else {
        statusEl.textContent = message;
      }
    } else {
      statusEl.textContent = t.error.INTERNAL;
    }
    resultsEl.hidden = true;
  } else if (state === "success" && result !== null) {
    renderResults(result);
    const best = result.offers.find((offer) => offer.best);
    statusEl.textContent = best ? t.bestLine(best, typeNames[best.type]) : t.statusEmpty;
    resultsEl.hidden = false;
    clearFieldErrors();
  }
}

const controller = createController({ createWorker, onChange: render });

function onEdit() {
  controller.edit(collectDraft());
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitted = true;
  controller.run();
});

for (const element of [
  productNameEl,
  unitBasisEl,
  packSizeEl,
  packPriceEl,
  offerCountEl,
]) {
  element.addEventListener("input", onEdit);
  element.addEventListener("change", onEdit);
}

for (let index = 0; index < 4; index += 1) {
  for (const element of [
    labelEl(index),
    typeEl(index),
    buyNEl(index),
    getMEl(index),
    quantityEl(index, "percentOff"),
    quantityEl(index, "fixedOff"),
    quantityEl(index, "bundle"),
    percentEl(index),
    amountOffEl(index),
    bundlePriceEl(index),
  ]) {
    element.addEventListener("input", onEdit);
    element.addEventListener("change", onEdit);
  }
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  productNameEl.focus();
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
    statusEl.textContent = errorMessage(report.error, snapshot.draft);
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
