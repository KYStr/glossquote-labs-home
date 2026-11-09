// Controller for the Roman numeral converter. The core modules own the
// conversion and validity rules; this file synchronises the two fields,
// renders the breakdown from the generator's trace, and freezes the
// opposite field (marked out of date, copy disabled) while an error
// stands, as SPEC section 3 requires. The field being edited is never
// rewritten.

import { generateTrace, parseIntegerField, parseRomanField, toRoman } from "./core/roman.mjs";
import { getErrorMessage, getMessages } from "./i18n.mjs";

const language = document.documentElement.lang;
const messages = getMessages(language);

const controls = document.querySelector("#tool-controls");
const unsupportedNote = document.querySelector("#unsupported-note");
const statusMessage = document.querySelector("#tool-status");
const intField = document.querySelector("#int-field");
const intError = document.querySelector("#int-error");
const intNote = document.querySelector("#int-note");
const intCopy = document.querySelector("#int-copy");
const romanField = document.querySelector("#roman-field");
const romanError = document.querySelector("#roman-error");
const romanCopy = document.querySelector("#roman-copy");
const staleNote = document.querySelector("#stale-note");
const breakdownBody = document.querySelector("#breakdown-body");
const breakdownTotal = document.querySelector("#breakdown-total");

let hasValid = false;

function announce(text) {
  statusMessage.textContent = text;
}

function renderBreakdown(value) {
  const rows = [];
  for (const group of generateTrace(value)) {
    const row = document.createElement("tr");
    const symbols = document.createElement("td");
    symbols.textContent = group.symbols;
    const amount = document.createElement("td");
    amount.textContent = String(group.value);
    row.append(symbols, amount);
    rows.push(row);
  }
  breakdownBody.replaceChildren(...rows);
  breakdownTotal.textContent = String(value);
}

function clearBreakdown() {
  breakdownBody.replaceChildren();
  breakdownTotal.textContent = "—";
}

function setCopyEnabled(enabled) {
  intCopy.disabled = !enabled;
  romanCopy.disabled = !enabled;
}

function setFieldError(input, errorElement, result) {
  if (result === null) {
    input.setAttribute("aria-invalid", "false");
    errorElement.textContent = "";
    errorElement.hidden = true;
    return;
  }
  input.setAttribute("aria-invalid", "true");
  errorElement.textContent = getErrorMessage(language, result);
  errorElement.hidden = false;
}

function showValid(value, announceResult) {
  hasValid = true;
  staleNote.hidden = true;
  setCopyEnabled(true);
  renderBreakdown(value);
  if (announceResult) {
    announce(messages.statusConverted({
      int: String(value),
      roman: romanField.value,
    }));
  }
}

function showError() {
  staleNote.hidden = !hasValid;
  setCopyEnabled(false);
}

function showCleared() {
  hasValid = false;
  staleNote.hidden = true;
  setCopyEnabled(false);
  clearBreakdown();
}

function renderFromInteger(announceResult = true) {
  const result = parseIntegerField(intField.value);
  intNote.hidden = true;
  if (result.kind === "empty") {
    setFieldError(intField, intError, null);
    romanField.value = "";
    showCleared();
    return;
  }
  if (result.kind === "error") {
    setFieldError(intField, intError, result);
    showError();
    return;
  }
  setFieldError(intField, intError, null);
  setFieldError(romanField, romanError, null);
  // The Roman field always shows the generator's canonical output.
  romanField.value = toRoman(result.value);
  if (result.leadingZeros) {
    intNote.textContent = messages.leadingZeroNote(result);
    intNote.hidden = false;
  }
  showValid(result.value, announceResult);
}

function renderFromRoman(announceResult = true) {
  const result = parseRomanField(romanField.value);
  if (result.kind === "empty") {
    setFieldError(romanField, romanError, null);
    intField.value = "";
    intNote.hidden = true;
    showCleared();
    return;
  }
  if (result.kind === "error") {
    setFieldError(romanField, romanError, result);
    showError();
    return;
  }
  setFieldError(romanField, romanError, null);
  setFieldError(intField, intError, null);
  intNote.hidden = true;
  intField.value = String(result.value);
  showValid(result.value, announceResult);
}

async function copyValue(value) {
  let copied = false;
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      copied = true;
    }
  } catch {
    copied = false;
  }
  announce(copied ? messages.copied(value) : messages.copyFailed);
}

intField.addEventListener("input", () => renderFromInteger());
romanField.addEventListener("input", () => renderFromRoman());
intCopy.addEventListener("click", () => { void copyValue(intField.value); });
romanCopy.addEventListener("click", () => { void copyValue(romanField.value); });

// Activation: the fieldset starts disabled so the controls cannot be used
// before the module loads; the static defaults match SPEC section 3.
controls.disabled = false;
unsupportedNote.hidden = true;
renderFromInteger(false);
