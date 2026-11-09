// DOM wiring for the Electricity Cost Calculator. All computation and
// validation live in ./core/; this file only moves strings between the
// form, the core and the result tables. User input reaches the page
// exclusively through textContent and input values — never as markup.

import { calculate } from "./core/calculator.mjs";

const LANG = document.documentElement.lang.startsWith("zh") ? "zh" : "en";

const STRINGS = {
  zh: {
    results: "計算結果",
    resultsSuffix: " — 計算結果",
    costPerDay: "每日電費",
    averageCostPerDay: "平均每日電費",
    bandTitle: (n) => `級距 ${n}`,
    finalBandTitle: (n) => `級距 ${n}（上限以上）`,
    thresholdLabel: (n) => `級距 ${n} 上限（kWh，整數）`,
    rateLabel: (n) => `級距 ${n} 單價（每 kWh）`,
    removeBand: "移除此級距",
    bandRangeAbove: (from) => `超過 ${from} kWh`,
    bandRange: (from, to) => `${from}–${to} kWh`,
    errors: {
      required: "此欄必填。",
      "not-a-number": "請輸入數字。",
      "too-many-decimals": "小數位數過多，最多 {max} 位。",
      "must-be-positive": "必須大於 0。",
      "above-max": "超過允許的最大值。",
      "not-whole": "必須是整數。",
      "out-of-range": "超出允許範圍。",
      "not-ascending": "第 {band} 段上限必須大於前一段上限。",
      "band-count": "級距必須是兩段或三段。",
      "final-band-must-be-open": "最後一段級距必須是開放式（無上限）。",
      "unknown-currency": "未知的幣別。",
      "unknown-mode": "未知的費率模式。",
    },
  },
  en: {
    results: "Results",
    resultsSuffix: " — Results",
    costPerDay: "Cost per day",
    averageCostPerDay: "Average cost per day",
    bandTitle: (n) => `Band ${n}`,
    finalBandTitle: (n) => `Band ${n} (open-ended)`,
    thresholdLabel: (n) => `Band ${n} upper threshold (whole kWh)`,
    rateLabel: (n) => `Band ${n} rate (per kWh)`,
    removeBand: "Remove this band",
    bandRangeAbove: (from) => `above ${from} kWh`,
    bandRange: (from, to) => `${from}–${to} kWh`,
    errors: {
      required: "This field is required.",
      "not-a-number": "Enter a number.",
      "too-many-decimals": "Too many decimal places; at most {max} allowed.",
      "must-be-positive": "Must be more than 0.",
      "above-max": "Above the allowed maximum.",
      "not-whole": "Must be a whole number.",
      "out-of-range": "Outside the allowed range.",
      "not-ascending": "Band {band}'s threshold must be greater than the previous band's.",
      "band-count": "A tiered tariff has two or three bands.",
      "final-band-must-be-open": "The final band must be open-ended.",
      "unknown-currency": "Unknown currency.",
      "unknown-mode": "Unknown tariff mode.",
    },
  },
};

const T = STRINGS[LANG];

const $ = (id) => document.getElementById(id);

const state = {
  mode: "flat",
  bands: null, // created on first switch to tiered mode
  hasValidResult: false,
};

const elements = {
  form: $("tool-form"),
  label: $("label"),
  watts: $("watts"),
  hours: $("hours"),
  days: $("days"),
  quantity: $("quantity"),
  currency: $("currency"),
  rate: $("rate"),
  flatFields: $("flat-fields"),
  tieredFields: $("tiered-fields"),
  bands: $("bands"),
  addBand: $("add-band"),
  heading: $("result-heading"),
  staleNote: $("stale-note"),
  kwhDay: $("out-kwh-day"),
  kwhPeriod: $("out-kwh-period"),
  costDayLabel: $("cost-day-label"),
  costDay: $("out-cost-day"),
  costPeriod: $("out-cost-period"),
  breakdownWrap: $("breakdown-wrap"),
  breakdownBody: $("breakdown-body"),
  breakdownTotal: $("breakdown-total"),
  limitationNote: $("limitation-note"),
};

function errorMessage(error) {
  const template = T.errors[error.code] ?? error.code;
  return template
    .replace("{max}", error.maxDecimals ?? "")
    .replace("{band}", error.band ?? "");
}

function inputForField(field) {
  const bandMatch = /^(threshold|rate)(\d)$/.exec(field);
  if (bandMatch && state.mode === "tiered") {
    return document.getElementById(
      bandInputId(bandMatch[1], Number(bandMatch[2]) - 1),
    );
  }
  return document.getElementById(field);
}

function setError(field, message) {
  const target = document.getElementById(`err-${field}`);
  if (target) {
    target.textContent = message ?? "";
    target.hidden = !message;
  }
  const input = inputForField(field);
  if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
}

function bandInputId(kind, index) {
  return `band-${kind}-${index}`;
}

function buildBandRows() {
  elements.bands.replaceChildren();
  state.bands.forEach((band, index) => {
    const n = index + 1;
    const isFinal = index === state.bands.length - 1;
    const row = document.createElement("div");
    row.className = "band";

    const title = document.createElement("p");
    title.className = "band-title";
    title.textContent = isFinal ? T.finalBandTitle(n) : T.bandTitle(n);
    row.append(title);

    if (!isFinal) {
      row.append(bandField("threshold", index, T.thresholdLabel(n), band.threshold, "numeric"));
    }
    row.append(bandField("rate", index, T.rateLabel(n), band.rate, "decimal"));

    if (!isFinal && state.bands.length > 2) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-band";
      remove.textContent = T.removeBand;
      remove.addEventListener("click", () => {
        state.bands.splice(index, 1);
        // Removing a bounded band keeps the final band open-ended.
        buildBandRows();
        recompute();
      });
      row.append(remove);
    }
    elements.bands.append(row);
  });
  elements.addBand.hidden = state.bands.length >= 3;
}

function bandField(kind, index, labelText, value, inputMode) {
  const n = index + 1;
  const wrap = document.createElement("div");
  wrap.className = "field";
  const id = bandInputId(kind, index);
  const fieldName = `${kind}${n}`;

  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = labelText;

  const input = document.createElement("input");
  input.id = id;
  input.type = "text";
  input.inputMode = inputMode;
  input.value = value ?? "";
  input.setAttribute("aria-describedby", `err-${fieldName}`);
  input.addEventListener("input", () => {
    if (kind === "threshold") state.bands[index].threshold = input.value;
    else state.bands[index].rate = input.value;
    recompute();
  });

  const error = document.createElement("p");
  error.className = "error";
  error.id = `err-${fieldName}`;
  error.hidden = true;

  wrap.append(label, input, error);
  return wrap;
}

function currentInput() {
  const base = {
    watts: elements.watts.value,
    hoursPerDay: elements.hours.value,
    days: elements.days.value,
    quantity: elements.quantity.value,
    currency: elements.currency.value,
  };
  if (state.mode === "flat") {
    return { ...base, tariff: { mode: "flat", rate: elements.rate.value } };
  }
  return {
    ...base,
    tariff: {
      mode: "tiered",
      bands: state.bands.map((band, index) => ({
        threshold: index === state.bands.length - 1 ? null : band.threshold,
        rate: band.rate,
      })),
    },
  };
}

const ALL_FIELDS = [
  "watts", "hours", "days", "quantity", "rate", "bands",
  "threshold1", "threshold2", "rate1", "rate2", "rate3", "currency", "tariff",
];

function recompute() {
  const outcome = calculate(currentInput());
  for (const field of ALL_FIELDS) setError(field, null);
  if (!outcome.ok) {
    for (const error of outcome.errors) setError(error.field, errorMessage(error));
    if (state.hasValidResult) elements.staleNote.hidden = false;
    return;
  }
  elements.staleNote.hidden = true;
  state.hasValidResult = true;
  const result = outcome.result;

  const label = elements.label.value.trim();
  elements.heading.textContent = label ? `${label}${T.resultsSuffix}` : T.results;
  elements.kwhDay.textContent = result.kwhPerDay;
  elements.kwhPeriod.textContent = result.kwhPeriod;
  elements.costDayLabel.textContent = result.perDayIsAverage
    ? T.averageCostPerDay
    : T.costPerDay;
  elements.costDay.textContent = result.costPerDay;
  elements.costPeriod.textContent = result.costPeriod;

  const tiered = state.mode === "tiered";
  elements.limitationNote.hidden = !tiered;
  elements.breakdownWrap.hidden = !tiered;
  if (tiered) {
    elements.breakdownBody.replaceChildren();
    for (const band of result.bands) {
      const tr = document.createElement("tr");
      const cells = [
        band.to === null ? T.bandRangeAbove(band.from) : T.bandRange(band.from, band.to),
        band.kwh,
        band.rate,
        band.subtotal,
      ];
      cells.forEach((text, i) => {
        const td = document.createElement(i === 0 ? "th" : "td");
        if (i === 0) td.scope = "row";
        td.textContent = text;
        tr.append(td);
      });
      elements.breakdownBody.append(tr);
    }
    elements.breakdownTotal.textContent = result.costPeriod;
  }
}

function setMode(mode) {
  state.mode = mode;
  elements.flatFields.hidden = mode !== "flat";
  elements.tieredFields.hidden = mode !== "tiered";
  if (mode === "tiered" && state.bands === null) {
    // SPEC section 3: the band editor appears prefilled with two bands —
    // up to 120 kWh at the previous flat rate, then an open-ended band.
    state.bands = [
      { threshold: "120", rate: elements.rate.value },
      { threshold: null, rate: elements.rate.value },
    ];
    buildBandRows();
  }
  recompute();
}

elements.form.addEventListener("input", (event) => {
  if (event.target.name === "tariff-mode") return;
  recompute();
});
elements.form.addEventListener("change", (event) => {
  if (event.target.name === "tariff-mode") setMode(event.target.value);
  else recompute();
});
elements.form.addEventListener("submit", (event) => event.preventDefault());
elements.addBand.addEventListener("click", () => {
  const lastBounded = state.bands[state.bands.length - 2];
  state.bands.splice(state.bands.length - 1, 0, {
    threshold: "",
    rate: lastBounded.rate,
  });
  buildBandRows();
  recompute();
});

recompute();
