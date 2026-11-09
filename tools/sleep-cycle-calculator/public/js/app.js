// Sleep Cycle Calculator — DOM wiring.
// All rendering uses textContent/value only; user input is never
// inserted as markup. Nothing is stored, sent, or put in the URL.
import {
  bedtimeRows,
  formatClock,
  parseLatency,
  parseTime,
  wakeTimeRows,
} from "./core/sleep-cycle.mjs";
import { STRINGS } from "./i18n.mjs";

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const strings = STRINGS[lang];

const directionInputs = document.querySelectorAll('input[name="direction"]');
const wakePanel = document.querySelector("#wake-panel");
const bedPanel = document.querySelector("#bed-panel");
const wakeTimeInput = document.querySelector("#wake-time");
const bedTimeInput = document.querySelector("#bed-time");
const sleepNowButton = document.querySelector("#sleep-now");
const latencyInput = document.querySelector("#latency");
const errorBox = document.querySelector("#error");
const staleNote = document.querySelector("#stale-note");
const rowsBody = document.querySelector("#rows");
const statusLine = document.querySelector("#status");

let direction = "wake";

function currentDirection() {
  for (const input of directionInputs) {
    if (input.checked) return input.value;
  }
  return "wake";
}

function renderRows(rows) {
  const fragment = document.createDocumentFragment();
  for (const row of rows) {
    const tr = document.createElement("tr");
    if (row.recommended) tr.classList.add("recommended");
    if (row.shortNight) tr.classList.add("short-night");

    const cells = [
      row.time,
      strings.labels[row.labelKey],
      String(row.cycles),
      row.sleep,
      row.inBed,
      row.recommended ? strings.recommendedMark : row.shortNight ? strings.shortNightMark : strings.noMark,
    ];
    for (const text of cells) {
      const td = document.createElement("td");
      td.textContent = text;
      tr.append(td);
    }
    fragment.append(tr);
  }
  rowsBody.replaceChildren(fragment);
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
  staleNote.textContent = strings.staleNote;
  staleNote.hidden = false;
}

function clearError() {
  errorBox.textContent = "";
  errorBox.hidden = true;
  staleNote.textContent = "";
  staleNote.hidden = true;
}

// Recompute from the current inputs. While any input is invalid the
// rows freeze at the last valid state and are marked out of date.
function recompute(announcement) {
  direction = currentDirection();
  wakePanel.hidden = direction !== "wake";
  bedPanel.hidden = direction !== "bed";

  const latency = parseLatency(latencyInput.value);
  if (latency === null) {
    showError(strings.errorLatency);
    return;
  }

  if (direction === "wake") {
    const wake = parseTime(wakeTimeInput.value);
    if (wake === null) {
      showError(strings.errorTime);
      return;
    }
    clearError();
    renderRows(bedtimeRows(wake, latency));
    statusLine.textContent = announcement ?? strings.resultForWake.replace("{time}", wakeTimeInput.value);
  } else {
    const bed = parseTime(bedTimeInput.value);
    if (bed === null) {
      showError(strings.errorTime);
      return;
    }
    clearError();
    renderRows(wakeTimeRows(bed, latency));
    statusLine.textContent = announcement ?? strings.resultForBed.replace("{time}", bedTimeInput.value);
  }
}

for (const input of directionInputs) {
  input.addEventListener("change", () => recompute());
}
wakeTimeInput.addEventListener("input", () => recompute());
bedTimeInput.addEventListener("input", () => recompute());
latencyInput.addEventListener("input", () => recompute());

sleepNowButton.addEventListener("click", () => {
  const now = new Date();
  const filled = formatClock(now.getHours() * 60 + now.getMinutes());
  bedTimeInput.value = filled;
  for (const input of directionInputs) {
    input.checked = input.value === "bed";
  }
  recompute(strings.sleepNowSet.replace("{time}", filled));
});

recompute();
