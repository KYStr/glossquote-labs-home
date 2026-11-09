// Baker's Percentage Calculator — DOM controller.
//
// All arithmetic lives in js/core/bakers.mjs. This file only wires
// inputs to the core, renders results with textContent/value (never
// markup built from user input), and implements the SPEC section 3
// lifecycle: on any error the outputs freeze at their last valid state
// and are marked out of date; mode switches preserve the rows.

import {
  MAX_ROWS,
  computeModeA,
  computeModeB,
  computeModeC,
  formatTenths,
  parsePercent,
  parseWeight,
  validatePercentageFormula,
  validateWeightFormula,
} from "./core/bakers.mjs";
import { stringsFor } from "./strings.mjs";

const lang = document.documentElement.lang || "en";
const S = stringsFor(lang);
const $ = (id) => document.getElementById(id);

const els = {
  target: $("target-weight"),
  flourWeight: $("flour-weight"),
  basisA: $("basis-input-a"),
  basisB: $("basis-input-b"),
  modeCNote: $("mode-c-note"),
  indicator: $("basis-indicator"),
  errors: $("errors"),
  tbody: $("rows-body"),
  addRow: $("add-row"),
  rowNote: $("row-note"),
  valueHeader: $("value-header"),
  resultHeader: $("result-header"),
  staleBadge: $("stale-badge"),
  total: $("result-total"),
  hydration: $("result-hydration"),
  totalNote: $("total-note"),
  results: $("results"),
};

// Initial state (SPEC section 3): Mode A, the K1 worked example —
// flour 100 (flour), water 65 (water), salt 2, yeast 1, target 840 g.
const state = {
  mode: "A",
  target: "840",
  flourWeight: "500",
  rows: [
    { name: S.defaultNames[0], percent: "100", weight: "500.0", flour: true, water: false },
    { name: S.defaultNames[1], percent: "65", weight: "325.0", flour: false, water: true },
    { name: S.defaultNames[2], percent: "2", weight: "10.0", flour: false, water: false },
    { name: S.defaultNames[3], percent: "1", weight: "5.0", flour: false, water: false },
  ],
  lastResult: null, // { texts: string[], totalText, hydrationText }
};

let rowEls = [];

function buildRows() {
  els.tbody.textContent = "";
  rowEls = state.rows.map((row, index) => {
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = row.name;
    nameInput.autocomplete = "off";
    nameInput.setAttribute("aria-label", `${S.nameLabel} ${index + 1}`);
    nameInput.addEventListener("input", () => {
      row.name = nameInput.value;
    });
    nameTd.append(nameInput);

    const valueTd = document.createElement("td");
    const valueInput = document.createElement("input");
    valueInput.type = "text";
    valueInput.inputMode = "decimal";
    valueInput.autocomplete = "off";
    valueInput.value = state.mode === "C" ? row.weight : row.percent;
    valueInput.addEventListener("input", () => {
      if (state.mode === "C") row.weight = valueInput.value;
      else row.percent = valueInput.value;
      recompute();
    });
    valueTd.append(valueInput);

    const flourTd = document.createElement("td");
    const flourBox = document.createElement("input");
    flourBox.type = "checkbox";
    flourBox.checked = row.flour;
    flourBox.addEventListener("change", () => {
      row.flour = flourBox.checked;
      recompute();
    });
    flourTd.append(flourBox);

    const waterTd = document.createElement("td");
    const waterBox = document.createElement("input");
    waterBox.type = "checkbox";
    waterBox.checked = row.water;
    waterBox.addEventListener("change", () => {
      row.water = waterBox.checked;
      recompute();
    });
    waterTd.append(waterBox);

    const resultTd = document.createElement("td");
    resultTd.className = "result-cell";

    const actionTd = document.createElement("td");
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "×";
    removeBtn.title = S.removeRow;
    removeBtn.setAttribute("aria-label", S.removeRow);
    removeBtn.disabled = state.rows.length <= 1;
    removeBtn.addEventListener("click", () => {
      if (state.rows.length <= 1) return;
      state.rows.splice(index, 1);
      buildRows();
      recompute();
    });
    actionTd.append(removeBtn);

    tr.append(nameTd, valueTd, flourTd, waterTd, resultTd, actionTd);
    els.tbody.append(tr);
    return { valueInput, resultTd, flourBox, waterBox };
  });
}

function errorMessage(code, parseCode) {
  switch (code) {
    case "flag-conflict":
      return S.errFlagConflict;
    case "percent-format":
      return parseCode === "percent-range" ? S.errPercentRange : S.errPercentFormat;
    case "weight-format":
      return parseCode === "weight-range" ? S.errWeightRange : S.errWeightFormat;
    case "no-flour-row":
      return S.errNoFlour;
    case "flour-weight-zero":
      return S.errFlourZero;
    case "too-many-rows":
      return S.errTooMany;
    default:
      return code;
  }
}

function renderResults(result, stale) {
  if (!result) return;
  result.texts.forEach((text, i) => {
    if (rowEls[i]) rowEls[i].resultTd.textContent = text;
  });
  els.total.textContent = result.totalText;
  els.hydration.textContent = result.hydrationText;
  els.staleBadge.hidden = !stale;
  if (stale) els.staleBadge.textContent = S.staleBadge;
  els.results.classList.toggle("is-stale", stale);
}

function recompute() {
  const messages = [];
  let result = null;

  if (state.mode === "A" || state.mode === "B") {
    const parseCodes = [];
    const coreRows = state.rows.map((row) => {
      const parsed = parsePercent(row.percent);
      parseCodes.push(parsed.ok ? null : parsed.code);
      return {
        name: row.name,
        percentTenths: parsed.ok ? parsed.tenths : null,
        flour: row.flour,
        water: row.water,
      };
    });
    const validation = validatePercentageFormula(coreRows);
    const sumText = formatTenths(validation.flourSumTenths);
    els.indicator.textContent =
      validation.flourSumTenths === 1000n ? S.basisOk(sumText) : S.basisBad(sumText);
    els.indicator.classList.toggle("is-bad", validation.flourSumTenths !== 1000n);

    for (const err of validation.errors) {
      if (err.code === "basis") continue; // the indicator already states it
      messages.push(errorMessage(err.code, err.row >= 0 ? parseCodes[err.row] : null));
    }
    if (validation.errors.some((e) => e.code === "basis") && !coreRows.some((r) => r.flour)) {
      messages.push(S.errNoFlour);
    }

    const basisInput = state.mode === "A" ? els.target : els.flourWeight;
    const parsedBasis = parseWeight(basisInput.value);
    if (!parsedBasis.ok) messages.push(S.errTargetRange);
    basisInput.setAttribute("aria-invalid", parsedBasis.ok ? "false" : "true");

    if (validation.ok && parsedBasis.ok) {
      const computed =
        state.mode === "A"
          ? computeModeA(coreRows, parsedBasis.tenths)
          : computeModeB(coreRows, parsedBasis.tenths);
      result = {
        texts: computed.weightTexts,
        totalText: computed.totalText,
        hydrationText: computed.hydrationText,
      };
    }
  } else {
    const parseCodes = [];
    const coreRows = state.rows.map((row) => {
      const parsed = parseWeight(row.weight, { allowZero: true });
      parseCodes.push(parsed.ok ? null : parsed.code);
      return {
        name: row.name,
        weightTenths: parsed.ok ? parsed.tenths : null,
        flour: row.flour,
        water: row.water,
      };
    });
    const validation = validateWeightFormula(coreRows);
    els.indicator.textContent = S.basisModeC(formatTenths(validation.flourWeightTenths));
    els.indicator.classList.toggle("is-bad", !validation.ok);
    for (const err of validation.errors) {
      messages.push(errorMessage(err.code, err.row >= 0 ? parseCodes[err.row] : null));
    }
    if (validation.ok) {
      const computed = computeModeC(coreRows);
      result = {
        texts: computed.percentTexts,
        totalText: computed.totalText,
        hydrationText: computed.hydrationText,
      };
    }
  }

  els.errors.textContent = "";
  for (const message of [...new Set(messages)]) {
    const p = document.createElement("p");
    p.textContent = message;
    els.errors.append(p);
  }

  if (result) {
    state.lastResult = result;
    // Keep mode C's stored weights aligned with what A/B just computed
    // is unnecessary; weights refresh on the switch itself.
    renderResults(result, false);
  } else if (state.lastResult) {
    renderResults(state.lastResult, true);
  }
}

function setMode(next) {
  const prev = state.mode;
  if (prev === next) return;
  if (next === "C") {
    // Percentage column becomes a weight column, starting from the
    // currently displayed weights (SPEC section 3).
    if (state.lastResult) {
      state.rows.forEach((row, i) => {
        row.weight = state.lastResult.texts[i].replaceAll(",", "");
      });
    }
  } else if (prev === "C") {
    // Switching back recomputes percentages from the current weights.
    const coreRows = state.rows.map((row) => {
      const parsed = parseWeight(row.weight, { allowZero: true });
      return {
        name: row.name,
        weightTenths: parsed.ok ? parsed.tenths : null,
        flour: row.flour,
        water: row.water,
      };
    });
    if (validateWeightFormula(coreRows).ok) {
      const computed = computeModeC(coreRows);
      state.rows.forEach((row, i) => {
        row.percent = computed.percentTexts[i].replaceAll(",", "");
      });
    }
  }
  state.mode = next;
  els.basisA.hidden = next !== "A";
  els.basisB.hidden = next !== "B";
  els.modeCNote.hidden = next !== "C";
  if (next === "C") els.modeCNote.textContent = S.modeCNote;
  els.totalNote.hidden = next !== "A";
  els.valueHeader.textContent = next === "C" ? S.resultWeightHeader : S.resultPercentHeader;
  els.resultHeader.textContent = next === "C" ? S.resultPercentHeader : S.resultWeightHeader;
  buildRows();
  recompute();
}

document.querySelectorAll('input[name="mode"]').forEach((radio) => {
  radio.addEventListener("change", () => setMode(radio.value));
});
els.target.addEventListener("input", () => {
  state.target = els.target.value;
  recompute();
});
els.flourWeight.addEventListener("input", () => {
  state.flourWeight = els.flourWeight.value;
  recompute();
});
els.addRow.addEventListener("click", () => {
  if (state.rows.length >= MAX_ROWS) {
    els.rowNote.textContent = S.rowLimitNote;
    return;
  }
  els.rowNote.textContent = "";
  state.rows.push({ name: "", percent: "0", weight: "0", flour: false, water: false });
  buildRows();
  recompute();
});

buildRows();
recompute();
