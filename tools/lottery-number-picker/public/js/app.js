// DOM wiring for the Lottery Number Picker. All rendering uses
// textContent/value; user input is never treated as markup. The draft
// lives only in this page: editing revokes the old result (and its copy
// / download) through the controller, and leaving the page discards
// everything. The core never seeds itself: when the user runs with a
// blank seed field, this layer generates one uint32, writes its decimal
// text back into the field and includes it in the run snapshot, exactly
// as the SPEC pins; without crypto.getRandomValues the blank string is
// passed through and the core reports EMPTY.

import { createController } from "./controller.mjs";
import {
  DEFAULT_DRAFT,
  EXAMPLE_INPUT,
  GAMES,
  STATUS_MESSAGES,
  errorMessage,
  formatPicksText,
} from "./core/lottery.mjs";

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const text = (zh, en) => (lang === "en" ? en : zh);

const main = document.getElementById("app");
const form = document.getElementById("picks-form");
const gameSelect = document.getElementById("game");
const seedInput = document.getElementById("seed");
const setCountInput = document.getElementById("set-count");
const excludeInput = document.getElementById("exclude");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const cancelBtn = document.getElementById("cancel-btn");
const resetBtn = document.getElementById("reset-btn");
const exampleNote = document.getElementById("example-note");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const resultSummary = document.getElementById("result-summary");
const resultSets = document.getElementById("result-sets");
const copyBtn = document.getElementById("copy-btn");
const downloadBtn = document.getElementById("download-btn");
const copyNote = document.getElementById("copy-note");
const errorEls = {
  game: document.getElementById("error-game"),
  seed: document.getElementById("error-seed"),
  setCount: document.getElementById("error-setCount"),
  exclude: document.getElementById("error-exclude"),
};
const fieldInputs = {
  game: gameSelect,
  seed: seedInput,
  setCount: setCountInput,
  exclude: excludeInput,
};

const statusDefault = statusEl.textContent;
let focusFirstError = false;
let currentText = null;
let downloadUrl = null;
let downloadTimer = null;

const controller = createController({
  schedule: (fn) => setTimeout(fn, 0),
  cancelScheduled: (handle) => clearTimeout(handle),
  onChange: render,
});

function readDraft() {
  return {
    game: gameSelect.value,
    seed: seedInput.value,
    setCount: setCountInput.value,
    exclude: excludeInput.value,
  };
}

function applyDraft(draft) {
  gameSelect.value = draft.game;
  seedInput.value = draft.seed;
  setCountInput.value = draft.setCount;
  excludeInput.value = draft.exclude;
}

function handleEdit() {
  exampleNote.hidden = true;
  controller.edit(readDraft());
}

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

function errorText(error) {
  const base = errorMessage(error, lang);
  if (error.field === "exclude" && error.row !== null) {
    return text(`第 ${error.row} 個代幣：${base}`, `Token ${error.row}: ${base}`);
  }
  return base;
}

function clearErrors() {
  for (const el of Object.values(errorEls)) el.textContent = "";
  for (const input of Object.values(fieldInputs)) input.removeAttribute("aria-invalid");
}

function renderResults(result) {
  const game = GAMES.find((entry) => entry.id === result.game);
  const gameName = game ? game.name[lang] : result.game;
  resultSummary.textContent = text(
    `${gameName}・種子 ${result.seed}`,
    `${gameName} · Seed ${result.seed}`,
  );
  resultSets.replaceChildren();
  result.sets.forEach((set, index) => {
    const block = document.createElement("div");
    block.className = "result-set";
    const heading = document.createElement("h3");
    heading.textContent = text(`第 ${index + 1} 組`, `Set ${index + 1}`);
    block.append(heading);
    if (set.zone2 === null) {
      const line = document.createElement("p");
      line.className = "numbers";
      line.textContent = set.zone1.join(" ");
      block.append(line);
    } else {
      const zone1Line = document.createElement("p");
      zone1Line.className = "numbers";
      const zone1Label = document.createElement("span");
      zone1Label.className = "zone-label";
      zone1Label.textContent = text("第一區", "Zone 1");
      zone1Line.append(zone1Label, document.createTextNode(set.zone1.join(" ")));
      const zone2Line = document.createElement("p");
      zone2Line.className = "numbers";
      const zone2Label = document.createElement("span");
      zone2Label.className = "zone-label";
      zone2Label.textContent = text("第二區", "Zone 2");
      zone2Line.append(zone2Label, document.createTextNode(set.zone2.join(" ")));
      block.append(zone1Line, zone2Line);
    }
    resultSets.append(block);
  });
}

function render(state) {
  main.setAttribute("aria-busy", state.state === "busy" ? "true" : "false");
  cancelBtn.hidden = state.state !== "busy";
  runBtn.disabled = state.state === "busy";

  if (state.state === "empty") statusEl.textContent = statusDefault;
  else if (state.state === "dirty") statusEl.textContent = STATUS_MESSAGES.dirty[lang];
  else if (state.state === "busy") statusEl.textContent = STATUS_MESSAGES.busy[lang];
  else if (state.state === "cancelled") statusEl.textContent = STATUS_MESSAGES.cancelled[lang];
  else if (state.state === "success") statusEl.textContent = text("產生完成。", "Done.");
  else if (state.state === "error" && state.error) statusEl.textContent = errorText(state.error);

  clearErrors();
  if (state.state === "error" && state.error) {
    const el = errorEls[state.error.field];
    if (el) {
      el.textContent = errorText(state.error);
      const input = fieldInputs[state.error.field];
      if (input) {
        input.setAttribute("aria-invalid", "true");
        if (focusFirstError) input.focus();
      }
    }
    focusFirstError = false;
  } else if (state.state === "success") {
    focusFirstError = false;
  }

  if (state.resultAvailable && state.result !== null) {
    currentText = formatPicksText(state.result);
    renderResults(state.result);
    resultsEl.hidden = false;
    copyBtn.disabled = !state.copyAvailable;
    downloadBtn.disabled = !state.downloadAvailable;
  } else {
    currentText = null;
    revokeDownload();
    copyNote.textContent = "";
    resultsEl.hidden = true;
    copyBtn.disabled = true;
    downloadBtn.disabled = true;
  }
}

for (const input of [gameSelect, seedInput, setCountInput, excludeInput]) {
  input.addEventListener("input", handleEdit);
  input.addEventListener("change", handleEdit);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  exampleNote.hidden = true;
  focusFirstError = true;
  // Blank-seed behaviour pinned by the SPEC: fill the seed field from
  // crypto for this run (the write-back is part of the run and does not
  // by itself dirty the draft); without crypto, run the blank string.
  if (seedInput.value === "" && globalThis.crypto?.getRandomValues) {
    const generated = globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
    seedInput.value = String(generated);
    controller.edit(readDraft());
  }
  controller.run();
});

exampleBtn.addEventListener("click", () => {
  applyDraft(EXAMPLE_INPUT);
  controller.edit(JSON.parse(JSON.stringify(EXAMPLE_INPUT)));
  exampleNote.hidden = false;
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  applyDraft(DEFAULT_DRAFT);
  exampleNote.hidden = true;
  gameSelect.focus();
});

copyBtn.addEventListener("click", async () => {
  if (currentText === null) return;
  try {
    await navigator.clipboard.writeText(currentText);
    copyNote.textContent = text("已複製號碼。", "Numbers copied.");
  } catch {
    copyNote.textContent = text(
      "複製失敗，請手動選取號碼複製。",
      "Copy failed; select the numbers and copy them manually.",
    );
  }
});

downloadBtn.addEventListener("click", () => {
  if (currentText === null) return;
  revokeDownload();
  const blob = new Blob([currentText], { type: "text/plain;charset=utf-8" });
  downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = "lottery-picks.txt";
  document.body.append(link);
  link.click();
  link.remove();
  downloadTimer = setTimeout(revokeDownload, 30000);
});

window.addEventListener("pagehide", () => {
  controller.destroy();
  revokeDownload();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    controller.reset();
    applyDraft(DEFAULT_DRAFT);
    exampleNote.hidden = true;
  }
});

applyDraft(DEFAULT_DRAFT);
render(controller.getState());
