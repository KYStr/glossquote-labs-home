// DOM controller for Game Night Scorecard. All user text is rendered with
// textContent / value only; never inserted as HTML. The pure core (solve,
// flow, i18n) is imported, never re-implemented here.
//
// Flow: the form builds a draft from its state model, the app checks raw
// integer syntax (SYNTAX) and then core validate() runs for the rest.
// A valid draft is solved on the next event-loop work item (setTimeout 0)
// under a runId guard, so an edit or cancel before that item revokes the
// scheduled work and a late reply can never revive a result.

import { validate } from "./core/solve.mjs";
import { createFlow } from "./core/flow.mjs";
import { stringsFor } from "./core/i18n.mjs";

// Fixed sample data: identical to the SPEC fixture
// game-night-scorecard.high-tiebreak.
const SAMPLE = {
  players: ["A", "B", "C"],
  mode: "high",
  drop: 1,
  rounds: [
    { name: "R1", scores: [10, 8, 7] },
    { name: "R2", scores: [-2, 8, 2] },
    { name: "R3", scores: [6, 4, 7] },
  ],
};

const INTEGER_SYNTAX = /^(0|[1-9][0-9]*|-[1-9][0-9]*)$/;
const MAX_TEXT_LENGTH = 128;
const MAX_PLAYERS = 12;
const MIN_PLAYERS = 2;
const MAX_ROUNDS = 30;
const MIN_ROUNDS = 1;

const flow = createFlow();
let strings = stringsFor(document.documentElement.lang || "en");
let runCounter = 0;
let activeRunId = null;
let pendingTimer = null;

// State model: raw form values. Scores are strings until submit, when
// the SYNTAX check turns them into integers.
let players = ["", ""];
let mode = "high";
let dropText = "0";
let rounds = [{ name: "", scores: ["", ""] }];

const $ = (id) => document.getElementById(id);

let playersBody;
let addPlayerButton;
let modeHighInput;
let modeLowInput;
let dropInput;
let roundsBody;
let addRoundButton;
let updateButton;
let cancelButton;
let clearButton;
let sampleButton;
let statusEl;
let errorListEl;
let resultsEl;

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function text(tag, value, className) {
  const node = el(tag, className);
  node.textContent = value;
  return node;
}

function labelFor(inputId, value) {
  const label = el("label");
  label.htmlFor = inputId;
  label.textContent = value;
  return label;
}

function initialState() {
  players = ["", ""];
  mode = "high";
  dropText = "0";
  rounds = [{ name: "", scores: ["", ""] }];
}

// ---- rendering ----------------------------------------------------------

function renderPlayers() {
  playersBody.textContent = "";
  players.forEach((name, i) => {
    const row = el("div", "row player-row");
    const nameId = `player-${i}-name`;
    const wrap = el("div", "field");
    const input = document.createElement("input");
    input.type = "text";
    input.id = nameId;
    input.maxLength = MAX_TEXT_LENGTH;
    input.autocomplete = "off";
    input.value = name;
    input.dataset.playerIndex = String(i);
    input.addEventListener("input", () => {
      players[i] = input.value;
      onEdit();
      refreshScoreLabels();
    });
    wrap.append(labelFor(nameId, `${strings.playerLabel} ${i + 1}`), input);
    const removeButton = el("button", "remove-row");
    removeButton.type = "button";
    removeButton.textContent = strings.removeRow;
    removeButton.disabled = players.length <= MIN_PLAYERS;
    removeButton.addEventListener("click", () => {
      if (players.length <= MIN_PLAYERS) return;
      players.splice(i, 1);
      for (const round of rounds) round.scores.splice(i, 1);
      onEdit();
      renderAll();
    });
    row.append(wrap, removeButton);
    playersBody.append(row);
  });
  addPlayerButton.disabled = players.length >= MAX_PLAYERS;
}

function renderRounds() {
  roundsBody.textContent = "";
  rounds.forEach((round, i) => {
    const group = el("div", "round-group");
    const nameId = `round-${i}-name`;
    const head = el("div", "round-head");
    const nameWrap = el("div", "field");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.id = nameId;
    nameInput.maxLength = MAX_TEXT_LENGTH;
    nameInput.autocomplete = "off";
    nameInput.value = round.name;
    nameInput.dataset.roundIndex = String(i);
    nameInput.addEventListener("input", () => {
      rounds[i].name = nameInput.value;
      onEdit();
    });
    nameWrap.append(labelFor(nameId, `${strings.roundLabel} ${i + 1}`), nameInput);
    const removeButton = el("button", "remove-row");
    removeButton.type = "button";
    removeButton.textContent = strings.removeRow;
    removeButton.disabled = rounds.length <= MIN_ROUNDS;
    removeButton.addEventListener("click", () => {
      if (rounds.length <= MIN_ROUNDS) return;
      rounds.splice(i, 1);
      onEdit();
      renderAll();
    });
    head.append(nameWrap, removeButton);
    group.append(head);

    const grid = el("div", "score-grid");
    round.scores.forEach((score, j) => {
      const cell = el("div", "field field-narrow");
      const scoreId = `round-${i}-score-${j}`;
      const input = document.createElement("input");
      input.type = "text";
      input.id = scoreId;
      input.inputMode = "numeric";
      input.maxLength = 12;
      input.autocomplete = "off";
      input.value = score;
      input.dataset.roundIndex = String(i);
      input.dataset.playerIndex = String(j);
      input.setAttribute("aria-label", scoreLabelFor(i, j));
      input.addEventListener("input", () => {
        rounds[i].scores[j] = input.value;
        onEdit();
      });
      cell.append(labelFor(scoreId, scoreLabelFor(i, j)), input);
      grid.append(cell);
    });
    group.append(grid);
    roundsBody.append(group);
  });
  addRoundButton.disabled = rounds.length >= MAX_ROUNDS;
}

function scoreLabelFor(roundIndex, playerIndex) {
  const playerName = (players[playerIndex] || "").trim();
  const playerPart =
    playerName === ""
      ? `${strings.playerLabel} ${playerIndex + 1}`
      : playerName;
  const roundName = (rounds[roundIndex].name || "").trim();
  const roundPart =
    roundName === "" ? `${strings.roundLabel} ${roundIndex + 1}` : roundName;
  return `${roundPart} · ${playerPart}`;
}

function refreshScoreLabels() {
  // Player renames change the score fields' labels; rebuild the rounds
  // grid so every score input names its current player.
  renderRounds();
}

function renderAll() {
  renderPlayers();
  renderRounds();
  modeHighInput.checked = mode === "high";
  modeLowInput.checked = mode === "low";
  dropInput.value = dropText;
  render();
}

// ---- draft building -----------------------------------------------------

// Builds the core data object from the state model. Returns {data} or
// {fieldError:{code,path}} for the first raw-syntax problem. Name fields
// are passed through raw so core normalizeName reports RANGE/TYPE for
// them, exactly as solve() would.
function buildDraft() {
  if (!INTEGER_SYNTAX.test(dropText)) {
    return { fieldError: { code: "SYNTAX", path: "/drop" } };
  }
  const roundData = [];
  for (let i = 0; i < rounds.length; i += 1) {
    const scores = [];
    for (let j = 0; j < rounds[i].scores.length; j += 1) {
      const raw = rounds[i].scores[j];
      if (!INTEGER_SYNTAX.test(raw)) {
        return {
          fieldError: { code: "SYNTAX", path: `/rounds/${i}/scores/${j}` },
        };
      }
      scores.push(Number(raw));
    }
    roundData.push({ name: rounds[i].name, scores });
  }
  return {
    data: {
      players: [...players],
      mode,
      drop: Number(dropText),
      rounds: roundData,
    },
  };
}

// Map an error path to the form control it belongs to (for focus and
// inline marking). Returns the element or null.
function fieldForPath(path) {
  let match = /^\/players\/(\d+)$/.exec(path);
  if (match) return $(`player-${Number(match[1])}-name`);
  match = /^\/rounds\/(\d+)\/name$/.exec(path);
  if (match) return $(`round-${Number(match[1])}-name`);
  match = /^\/rounds\/(\d+)\/scores\/(\d+)$/.exec(path);
  if (match) {
    return $(`round-${Number(match[1])}-score-${Number(match[2])}`);
  }
  if (path === "/drop") return dropInput;
  if (path === "/mode") return modeHighInput;
  if (path === "/players") return $("player-0-name");
  if (path === "/rounds") return $("round-0-name");
  match = /^\/rounds\/(\d+)\/scores$/.exec(path);
  if (match) return $(`round-${Number(match[1])}-score-0`);
  return null;
}

// ---- rendering state ----------------------------------------------------

function clearMarks() {
  for (const input of document.querySelectorAll("[aria-invalid='true']")) {
    input.removeAttribute("aria-invalid");
  }
  errorListEl.textContent = "";
  errorListEl.hidden = true;
}

function showError(error) {
  const message = strings.errors[error.code] || strings.errors.TYPE;
  const fix = strings.errorFixes[error.code] || strings.errorFixes.TYPE;
  const item = el("div", "error-item");
  const head = el("p");
  const codeEl = text("code", error.code);
  head.append(
    codeEl,
    document.createTextNode(` · ${error.path || "/"} (${strings.codeLabel} / ${strings.pathLabel})`),
  );
  item.append(head);
  item.append(text("p", message));
  item.append(text("p", `${strings.errorFix}：${fix}`));
  const goButton = el("button", "error-goto");
  goButton.type = "button";
  goButton.textContent = strings.errorGoto;
  const target = fieldForPath(error.path);
  if (target) {
    target.setAttribute("aria-invalid", "true");
    goButton.addEventListener("click", () => target.focus());
  } else {
    goButton.disabled = true;
  }
  item.append(goButton);
  errorListEl.append(item);
  errorListEl.hidden = false;
  if (target) target.focus();
}

function renderResults(result) {
  resultsEl.textContent = "";
  resultsEl.append(text("h2", strings.resultHeading));
  const table = el("table", "standings");
  const thead = el("thead");
  const headerRow = el("tr");
  for (const header of [
    strings.rankHeader,
    strings.playerHeader,
    strings.totalHeader,
    strings.bestHeader,
    strings.droppedHeader,
  ]) {
    headerRow.append(text("th", header));
  }
  thead.append(headerRow);
  table.append(thead);
  const tbody = el("tbody");
  for (const row of result.standings) {
    const tr = el("tr");
    tr.append(text("td", String(row.rank)));
    tr.append(text("td", row.name));
    tr.append(text("td", String(row.total)));
    tr.append(text("td", String(row.best)));
    const droppedCell = el("td");
    if (row.dropped.length === 0) {
      droppedCell.textContent = strings.droppedNone;
    } else {
      const details = el("details");
      const summary = el("summary");
      summary.textContent = strings.droppedSummary.replace(
        "{n}",
        String(row.dropped.length),
      );
      details.append(summary);
      const list = el("ul");
      for (const name of row.dropped) list.append(text("li", name));
      details.append(list);
      droppedCell.append(details);
    }
    tr.append(droppedCell);
    tbody.append(tr);
  }
  table.append(tbody);
  resultsEl.append(table);
  resultsEl.append(text("p", strings.tieNote, "notice-inline"));
}

function render() {
  const { phase, result, error } = flow.snapshot();
  clearMarks();
  resultsEl.textContent = "";

  updateButton.disabled = phase === "busy";
  updateButton.textContent =
    phase === "busy" ? `${strings.working}…` : strings.update;
  cancelButton.hidden = phase !== "busy";

  if (phase === "empty") {
    statusEl.textContent = strings.statusEmpty;
    return;
  }
  if (phase === "dirty") {
    statusEl.textContent = strings.statusDirty;
    return;
  }
  if (phase === "busy") {
    statusEl.textContent = strings.statusBusy;
    return;
  }
  if (phase === "error") {
    statusEl.textContent = strings.statusError;
    if (error) showError(error);
    return;
  }
  // ready
  if (result === null) {
    statusEl.textContent = strings.statusEmpty;
    return;
  }
  statusEl.textContent = strings.statusReady;
  renderResults(result);
}

// ---- actions ------------------------------------------------------------

function revokePending() {
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  activeRunId = null;
}

function onEdit() {
  // Every edit clears the old result and invalidates the active runId.
  if (flow.snapshot().phase === "busy") {
    revokePending();
    flow.cancel();
  }
  flow.edit({
    players: [...players],
    mode,
    drop: dropText,
    rounds: rounds.map((r) => ({ name: r.name, scores: [...r.scores] })),
  });
  render();
}

function onSubmit(event) {
  event.preventDefault();
  if (flow.snapshot().phase === "busy") return; // resubmit while busy is ignored
  const built = buildDraft();
  if (built.fieldError) {
    flow.fail(built.fieldError);
    render();
    return;
  }
  const checked = validate(built.data);
  if (!checked.ok) {
    flow.edit(built.data);
    flow.fail(checked.reply.error);
    render();
    return;
  }
  flow.edit(checked.data);
  runCounter += 1;
  const runId = runCounter;
  activeRunId = runId;
  flow.run(runId);
  render();
  // Pure core runs on the next event-loop work item; an edit or cancel
  // before that item revokes it, and the runId guard drops late replies.
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    activeRunId = null;
    flow.settle(runId);
    render();
  }, 0);
}

function onCancel() {
  if (flow.snapshot().phase !== "busy") return;
  revokePending();
  flow.cancel();
  render();
}

function onClear() {
  revokePending();
  initialState();
  flow.reset();
  renderAll();
  const first = $("player-0-name");
  if (first) first.focus();
}

function onLoadSample() {
  revokePending();
  if (flow.snapshot().phase === "busy") flow.cancel();
  players = [...SAMPLE.players];
  mode = SAMPLE.mode;
  dropText = String(SAMPLE.drop);
  rounds = SAMPLE.rounds.map((r) => ({
    name: r.name,
    scores: r.scores.map((s) => String(s)),
  }));
  flow.edit({
    players: [...players],
    mode,
    drop: SAMPLE.drop,
    rounds: SAMPLE.rounds.map((r) => ({ name: r.name, scores: [...r.scores] })),
  });
  renderAll();
}

// ---- init ---------------------------------------------------------------

function init() {
  playersBody = $("players-body");
  addPlayerButton = $("add-player");
  modeHighInput = $("mode-high");
  modeLowInput = $("mode-low");
  dropInput = $("drop");
  roundsBody = $("rounds-body");
  addRoundButton = $("add-round");
  updateButton = $("update");
  cancelButton = $("cancel");
  clearButton = $("clear-draft");
  sampleButton = $("load-sample");
  statusEl = $("status");
  errorListEl = $("error-list");
  resultsEl = $("results");

  addPlayerButton.addEventListener("click", () => {
    if (players.length >= MAX_PLAYERS) return;
    players.push("");
    for (const round of rounds) round.scores.push("");
    onEdit();
    renderAll();
    const added = $(`player-${players.length - 1}-name`);
    if (added) added.focus();
  });
  modeHighInput.addEventListener("change", () => {
    mode = "high";
    onEdit();
  });
  modeLowInput.addEventListener("change", () => {
    mode = "low";
    onEdit();
  });
  dropInput.addEventListener("input", () => {
    dropText = dropInput.value;
    onEdit();
  });
  addRoundButton.addEventListener("click", () => {
    if (rounds.length >= MAX_ROUNDS) return;
    rounds.push({ name: "", scores: players.map(() => "") });
    onEdit();
    renderAll();
    const added = $(`round-${rounds.length - 1}-name`);
    if (added) added.focus();
  });
  cancelButton.addEventListener("click", onCancel);
  clearButton.addEventListener("click", onClear);
  sampleButton.addEventListener("click", onLoadSample);

  const form = $("score-form");
  form.addEventListener("submit", onSubmit);

  // Leaving the page (including a bfcache restore) clears working memory.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) onClear();
  });

  renderAll();
}

try {
  init();
} catch {
  const status = $("status");
  if (status) status.textContent = strings.initFailed;
  const reloadButton = document.createElement("button");
  reloadButton.type = "button";
  reloadButton.textContent = strings.reload;
  reloadButton.addEventListener("click", () => window.location.reload());
  if (status && status.parentNode) status.parentNode.append(reloadButton);
}
