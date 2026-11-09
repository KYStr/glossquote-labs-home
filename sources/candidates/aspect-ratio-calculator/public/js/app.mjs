// Controller for the aspect ratio calculator. The core modules do all
// arithmetic exactly; this file only reads fields, renders text and keeps
// each mode's last valid output on screen (marked out of date) while one
// of its fields is invalid, as SPEC section 3 requires.

import {
  computeModeA,
  computeModeB,
  parseDimension,
  parseGivenDimension,
  parseRatioPart,
} from "./core/ratio.mjs";
import { formatNote, getErrorMessage, getMessages } from "./i18n.mjs";

const language = document.documentElement.lang;
const messages = getMessages(language);

const controls = document.querySelector("#tool-controls");
const unsupportedNote = document.querySelector("#unsupported-note");
const statusMessage = document.querySelector("#tool-status");

const modeRadios = [...document.querySelectorAll('input[name="mode"]')];
const panelA = document.querySelector("#panel-a");
const panelB = document.querySelector("#panel-b");

const aWidth = document.querySelector("#a-width");
const aHeight = document.querySelector("#a-height");
const aWidthError = document.querySelector("#a-width-error");
const aHeightError = document.querySelector("#a-height-error");
const aRatio = document.querySelector("#a-ratio");
const aDecimal = document.querySelector("#a-decimal");
const aPercent = document.querySelector("#a-percent");
const aNote = document.querySelector("#a-note");
const aStale = document.querySelector("#a-stale");

const bRatioW = document.querySelector("#b-ratio-w");
const bRatioH = document.querySelector("#b-ratio-h");
const bRatioWError = document.querySelector("#b-ratio-w-error");
const bRatioHError = document.querySelector("#b-ratio-h-error");
const solveRadios = [...document.querySelectorAll('input[name="solve"]')];
const bGivenLabel = document.querySelector("#b-given-label");
const bGiven = document.querySelector("#b-given");
const bGivenError = document.querySelector("#b-given-error");
const bRatioOut = document.querySelector("#b-ratio-out");
const bSolvedLabel = document.querySelector("#b-solved-label");
const bSolved = document.querySelector("#b-solved");
const bStale = document.querySelector("#b-stale");
const bUse = document.querySelector("#b-use");
const bUseReason = document.querySelector("#b-use-reason");
const presetButtons = [...document.querySelectorAll("[data-preset-w]")];

let lastModeB = null;

function announce(text) {
  statusMessage.textContent = text;
}

function setFieldError(input, errorElement, result) {
  if (result.ok) {
    input.setAttribute("aria-invalid", "false");
    errorElement.textContent = "";
    errorElement.hidden = true;
    return true;
  }
  input.setAttribute("aria-invalid", "true");
  errorElement.textContent = getErrorMessage(language, result);
  errorElement.hidden = false;
  return false;
}

function currentSolveFor() {
  return solveRadios.find((radio) => radio.checked)?.value ?? "height";
}

function renderA(announceResult = true) {
  const width = parseDimension(aWidth.value);
  const height = parseDimension(aHeight.value);
  const widthOk = setFieldError(aWidth, aWidthError, width);
  const heightOk = setFieldError(aHeight, aHeightError, height);
  if (!widthOk || !heightOk) {
    aStale.hidden = false;
    return;
  }
  const result = computeModeA(width.value, height.value);
  aRatio.textContent = result.ratioText;
  aDecimal.textContent = result.decimalText;
  aPercent.textContent = `${result.percentText}%`;
  aNote.textContent = formatNote(language, result.note);
  aNote.hidden = result.note.kind === "none";
  aStale.hidden = true;
  if (announceResult) {
    announce(messages.statusModeA({
      ratio: result.ratioText,
      decimal: result.decimalText,
      percent: result.percentText,
      note: formatNote(language, result.note),
    }));
  }
}

function renderB(announceResult = true) {
  const solveFor = currentSolveFor();
  bGivenLabel.textContent = solveFor === "height" ? messages.givenWidth : messages.givenHeight;
  bSolvedLabel.textContent = solveFor === "height" ? messages.solvedHeight : messages.solvedWidth;
  const partW = parseRatioPart(bRatioW.value);
  const partH = parseRatioPart(bRatioH.value);
  const given = parseGivenDimension(bGiven.value);
  const partWOk = setFieldError(bRatioW, bRatioWError, partW);
  const partHOk = setFieldError(bRatioH, bRatioHError, partH);
  const givenOk = setFieldError(bGiven, bGivenError, given);
  if (!partWOk || !partHOk || !givenOk) {
    bStale.hidden = false;
    return;
  }
  const result = computeModeB({ partW: partW.value, partH: partH.value, solveFor, given: given.value });
  lastModeB = {
    result,
    solveFor,
    givenIntegerText: given.value.den === 1n ? given.value.num.toString() : null,
  };
  const typedText = `${partW.text}:${partH.text}`;
  bRatioOut.textContent = typedText === result.ratioText
    ? result.ratioText
    : `${typedText} = ${result.ratioText}`;
  bSolved.textContent = result.solvedFractionText === null
    ? result.solvedDisplay
    : `${result.solvedDisplay} (${result.solvedFractionText})`;
  bStale.hidden = true;
  bUse.disabled = !result.canUseAsDimensions;
  bUseReason.textContent = result.canUseAsDimensions ? "" : messages.useAsDimensionsReason;
  bUseReason.hidden = result.canUseAsDimensions;
  if (announceResult) {
    announce(messages.statusModeB({
      ratio: result.ratioText,
      solved: result.solvedDisplay,
      fraction: result.solvedFractionText,
    }));
  }
}

function setMode(mode) {
  panelA.hidden = mode !== "a";
  panelB.hidden = mode !== "b";
}

for (const radio of modeRadios) {
  radio.addEventListener("change", () => {
    setMode(radio.value);
    if (radio.value === "a") renderA(); else renderB();
  });
}
for (const input of [aWidth, aHeight]) input.addEventListener("input", () => renderA());
for (const input of [bRatioW, bRatioH, bGiven]) input.addEventListener("input", () => renderB());
for (const radio of solveRadios) radio.addEventListener("change", () => renderB());

for (const button of presetButtons) {
  button.addEventListener("click", () => {
    bRatioW.value = button.dataset.presetW;
    bRatioH.value = button.dataset.presetH;
    renderB();
  });
}

bUse.addEventListener("click", () => {
  if (lastModeB === null || !lastModeB.result.canUseAsDimensions) return;
  const { result, solveFor, givenIntegerText } = lastModeB;
  if (solveFor === "height") {
    aWidth.value = givenIntegerText;
    aHeight.value = result.solvedDisplay;
  } else {
    aWidth.value = result.solvedDisplay;
    aHeight.value = givenIntegerText;
  }
  for (const radio of modeRadios) radio.checked = radio.value === "a";
  setMode("a");
  renderA();
});

// Activation: the fieldset starts disabled so the controls cannot be used
// before the module loads; the static defaults below match SPEC section 3.
controls.disabled = false;
unsupportedNote.hidden = true;
setMode("a");
renderA(false);
renderB(false);
