// Classical Cipher Lab — DOM wiring.
// All transformed text is written with value/textContent only; user input
// is never parsed as HTML. Nothing is stored, sent, or put in the URL.
import {
  MAX_INPUT_LENGTH,
  bruteForceTable,
  transform,
  validateKey,
} from "./core/cipher.mjs";

const $ = (id) => document.getElementById(id);

const stringsEl = $("strings");
const cipherSelect = $("cipher-select");
const directionField = $("direction-field");
const shiftField = $("shift-field");
const shiftInput = $("shift-input");
const shiftZeroNote = $("shift-zero-note");
const rot13Button = $("rot13-button");
const keyField = $("key-field");
const keyInput = $("key-input");
const keyError = $("key-error");
const inputText = $("input-text");
const inputCount = $("input-count");
const truncateNote = $("truncate-note");
const outputText = $("output-text");
const staleNote = $("stale-note");
const copyButton = $("copy-button");
const swapButton = $("swap-button");
const actionStatus = $("action-status");
const bruteSection = $("brute-section");
const bruteToggle = $("brute-toggle");
const bruteWrap = $("brute-wrap");
const bruteBody = $("brute-body");
const bruteStatus = $("brute-status");

const KEY_MESSAGES = {
  key_empty: stringsEl.dataset.keyEmpty,
  key_non_letter: stringsEl.dataset.keyNonLetter,
  key_too_long: stringsEl.dataset.keyTooLong,
};

let bruteOpen = false;

function currentDirection() {
  const checked = document.querySelector('input[name="direction"]:checked');
  return checked ? checked.value : "encrypt";
}

function codePointLength(text) {
  return [...text].length;
}

function clampShift() {
  const parsed = Number.parseInt(shiftInput.value, 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.min(25, Math.max(0, parsed));
}

function setStale(isStale) {
  $("output-wrap").classList.toggle("is-stale", isStale);
  staleNote.hidden = !isStale;
  if (isStale) staleNote.textContent = stringsEl.dataset.stale;
  copyButton.disabled = isStale;
  swapButton.disabled = isStale;
}

function showKeyError(code) {
  keyError.textContent = KEY_MESSAGES[code] ?? code;
  keyError.hidden = false;
  keyInput.setAttribute("aria-invalid", "true");
  setStale(true);
}

function clearKeyError() {
  keyError.textContent = "";
  keyError.hidden = true;
  keyInput.removeAttribute("aria-invalid");
  setStale(false);
}

function renderBrute() {
  if (!bruteOpen) return;
  const rows = bruteForceTable(inputText.value);
  const fragment = document.createDocumentFragment();
  for (const row of rows) {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = stringsEl.dataset.shiftLabel.replace("{n}", String(row.shift));
    const td = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "candidate";
    button.textContent = row.text === "" ? " " : row.text;
    button.addEventListener("click", () => {
      outputText.value = row.text;
      bruteStatus.textContent = stringsEl.dataset.rowChosen.replace(
        "{n}",
        String(row.shift),
      );
    });
    td.append(button);
    tr.append(th, td);
    fragment.append(tr);
  }
  bruteBody.replaceChildren(fragment);
}

function recompute() {
  const cipher = cipherSelect.value;
  shiftField.hidden = cipher !== "caesar";
  keyField.hidden = cipher !== "vigenere";
  bruteSection.hidden = cipher !== "caesar";
  const directionDisabled = cipher === "atbash";
  for (const radio of document.querySelectorAll('input[name="direction"]')) {
    radio.disabled = directionDisabled;
  }
  directionField.classList.toggle("is-disabled", directionDisabled);
  shiftZeroNote.hidden = !(cipher === "caesar" && clampShift() === 0);

  if (cipher === "vigenere") {
    try {
      validateKey(keyInput.value);
      clearKeyError();
    } catch (error) {
      showKeyError(error.code);
      return; // outputs freeze, marked out of date (SPEC section 3)
    }
  } else {
    clearKeyError();
  }

  outputText.value = transform(
    {
      cipher,
      direction: currentDirection(),
      shift: clampShift(),
      key: keyInput.value,
    },
    inputText.value,
  );
  renderBrute();
}

function enforceLimit() {
  const chars = [...inputText.value];
  inputCount.textContent = String(Math.min(chars.length, MAX_INPUT_LENGTH));
  if (chars.length > MAX_INPUT_LENGTH) {
    inputText.value = chars.slice(0, MAX_INPUT_LENGTH).join("");
    truncateNote.textContent = stringsEl.dataset.truncated;
    truncateNote.hidden = false;
    inputCount.textContent = String(MAX_INPUT_LENGTH);
  } else {
    truncateNote.hidden = true;
  }
}

cipherSelect.addEventListener("change", recompute);
for (const radio of document.querySelectorAll('input[name="direction"]')) {
  radio.addEventListener("change", recompute);
}
shiftInput.addEventListener("input", recompute);
rot13Button.addEventListener("click", () => {
  shiftInput.value = "13";
  recompute();
});
keyInput.addEventListener("input", recompute);
inputText.addEventListener("input", () => {
  enforceLimit();
  recompute();
});

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(outputText.value);
    actionStatus.textContent = stringsEl.dataset.copied;
  } catch {
    actionStatus.textContent = stringsEl.dataset.copyFailed;
    outputText.focus();
    outputText.select();
  }
});

swapButton.addEventListener("click", () => {
  inputText.value = outputText.value;
  enforceLimit();
  recompute();
});

bruteToggle.addEventListener("click", () => {
  bruteOpen = !bruteOpen;
  bruteWrap.hidden = !bruteOpen;
  bruteToggle.setAttribute("aria-expanded", String(bruteOpen));
  bruteToggle.textContent = bruteOpen
    ? bruteToggle.dataset.hideLabel
    : bruteToggle.dataset.showLabel;
  if (bruteOpen) renderBrute();
});

enforceLimit();
recompute();
