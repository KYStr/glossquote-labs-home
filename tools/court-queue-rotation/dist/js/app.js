// DOM controller for Drop-In Court Queue. Wires the bilingual form to the
// pure core (solve + flow). All user text is rendered with textContent/value
// only; nothing is stored outside page memory. The core runs in the next
// event-loop work item (setTimeout 0) behind a runId gate, so a late reply
// can never overwrite newer state.
//
// Sample: the fixed fake data of fixture court-queue-rotation.cap
// (A wins twice and hits the cap, next pair D, B).

import { createFlow } from "./core/flow.mjs";
import { parseAsciiInteger } from "./core/solve.mjs";
import { STRINGS } from "./core/i18n.mjs";

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];
const sep = lang === "en" ? ", " : "、";

const SAMPLE = {
  teams: ["A", "B", "C", "D"],
  initialQueue: ["A", "B", "C", "D"],
  maxConsecutive: 2,
  events: [
    { type: "start" },
    { type: "finish", winner: "A" },
    { type: "start" },
    { type: "finish", winner: "A" },
  ],
};

const MAX_TEXT_UNITS = 128;

const form = document.getElementById("queue-form");
const teamsInput = document.getElementById("teams-input");
const queueInput = document.getElementById("queue-input");
const maxInput = document.getElementById("max-input");
const eventsBody = document.getElementById("events-body");
const addEventButton = document.getElementById("add-event");
const removeLastEventButton = document.getElementById("remove-last-event");
const updateButton = document.getElementById("update");
const cancelButton = document.getElementById("cancel");
const clearButton = document.getElementById("clear-draft");
const loadSampleButton = document.getElementById("load-sample");
const statusEl = document.getElementById("status");
const errorListEl = document.getElementById("error-list");
const resultsEl = document.getElementById("results");

const flow = createFlow();
let runCounter = 0;
let timer = null;

function trimSpaces(text) {
  return text.replace(/^ +| +$/g, "");
}

function splitNames(text) {
  return text
    .split("\n")
    .map((line) => trimSpaces(line))
    .filter((line) => line !== "");
}

// Build the core draft from the form. Raw-text syntax problems are reported
// separately as SYNTAX errors; the draft still carries a best-effort value.
function buildDraft() {
  const syntaxErrors = [];
  const teams = splitNames(teamsInput.value);
  const initialQueue = splitNames(queueInput.value);
  for (const line of teamsInput.value.split("\n")) {
    if (trimSpaces(line).length > MAX_TEXT_UNITS) {
      syntaxErrors.push({ code: "SYNTAX", path: "/teams" });
      break;
    }
  }
  for (const line of queueInput.value.split("\n")) {
    if (trimSpaces(line).length > MAX_TEXT_UNITS) {
      syntaxErrors.push({ code: "SYNTAX", path: "/initialQueue" });
      break;
    }
  }
  const parsedMax = parseAsciiInteger(maxInput.value, false);
  if (!parsedMax.ok) {
    syntaxErrors.push({ code: "SYNTAX", path: "/maxConsecutive" });
  }
  const events = [];
  for (const row of eventsBody.querySelectorAll(".event-row")) {
    const type = row.querySelector("select").value;
    const teamRaw = trimSpaces(row.querySelector(".event-team-input").value);
    if (teamRaw.length > MAX_TEXT_UNITS) {
      syntaxErrors.push({
        code: "SYNTAX",
        path: `/events/${events.length}/team`,
      });
    }
    if (type === "start") {
      events.push({ type: "start" });
    } else if (type === "finish") {
      events.push({ type: "finish", winner: teamRaw === "" ? null : teamRaw });
    } else {
      events.push({ type, team: teamRaw });
    }
  }
  const draft = {
    teams,
    initialQueue,
    maxConsecutive: parsedMax.ok ? parsedMax.value : maxInput.value,
    events,
  };
  return { draft, syntaxErrors };
}

function fieldIdForPath(path) {
  if (!path) return "teams-input";
  const parts = path.split("/").filter((part) => part !== "");
  if (parts[0] === "teams") return "teams-input";
  if (parts[0] === "initialQueue") return "queue-input";
  if (parts[0] === "maxConsecutive") return "max-input";
  if (parts[0] === "events") {
    const index = Number(parts[1]);
    if (Number.isInteger(index)) {
      if (parts[2] === "team" || parts[2] === "winner") {
        return `event-team-${index}`;
      }
      return `event-type-${index}`;
    }
    return "add-event";
  }
  return "teams-input";
}

function clearFieldErrors() {
  for (const el of form.querySelectorAll(".field-error")) {
    el.classList.remove("field-error");
  }
}

function formatEntry(entry) {
  return `${entry.team}（${t.streak(entry.streak)}）`;
}

function renderResults(result) {
  resultsEl.replaceChildren();
  const title = document.createElement("h2");
  title.textContent = t.resultsTitle;
  resultsEl.appendChild(title);
  const list = document.createElement("dl");

  const playedTerm = document.createElement("dt");
  playedTerm.textContent = t.played;
  const playedValue = document.createElement("dd");
  playedValue.textContent = String(result.played);
  list.append(playedTerm, playedValue);

  const activeTerm = document.createElement("dt");
  activeTerm.textContent = t.activeLabel;
  const activeValue = document.createElement("dd");
  activeValue.textContent =
    result.active === null
      ? t.none
      : result.active.map(formatEntry).join(sep);
  list.append(activeTerm, activeValue);

  const holderTerm = document.createElement("dt");
  holderTerm.textContent = t.holderLabel;
  const holderValue = document.createElement("dd");
  holderValue.textContent =
    result.holder === null ? t.none : formatEntry(result.holder);
  list.append(holderTerm, holderValue);

  const queueTerm = document.createElement("dt");
  queueTerm.textContent = t.queueResultLabel;
  const queueValue = document.createElement("dd");
  queueValue.textContent =
    result.queue.length === 0 ? t.none : result.queue.join(sep);
  list.append(queueTerm, queueValue);

  const nextTerm = document.createElement("dt");
  nextTerm.textContent = t.nextLabel;
  const nextValue = document.createElement("dd");
  nextValue.textContent =
    result.next === null ? t.none : result.next.join(sep);
  list.append(nextTerm, nextValue);

  if (result.next === null) {
    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent =
      result.active !== null ? t.nextInProgress : t.nextIdleShort;
    list.appendChild(hint);
  }
  resultsEl.appendChild(list);
}

function renderEmptyResults(message) {
  resultsEl.replaceChildren();
  const title = document.createElement("h2");
  title.textContent = t.resultsTitle;
  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent = message;
  resultsEl.append(title, hint);
}

function render() {
  const { phase, result } = flow.snapshot();
  const error = flow.getError();
  statusEl.dataset.phase = phase;
  statusEl.textContent =
    phase === "ready"
      ? t.statusReady
      : phase === "error"
        ? t.statusError
        : phase === "busy"
          ? t.statusBusy
          : phase === "dirty"
            ? t.statusDirty
            : t.statusEmpty;

  updateButton.disabled = phase === "busy";
  updateButton.textContent = phase === "busy" ? t.working : t.update;
  cancelButton.hidden = phase !== "busy";

  clearFieldErrors();
  errorListEl.replaceChildren();
  if (phase === "error" && error) {
    errorListEl.hidden = false;
    const heading = document.createElement("h2");
    heading.textContent = t.errorTitle;
    const list = document.createElement("ul");
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = "#";
    link.textContent = t.errorCode(error.code, error.path);
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const target = document.getElementById(fieldIdForPath(error.path));
      if (target) target.focus();
    });
    const fix = document.createElement("span");
    fix.className = "fix";
    fix.textContent = `${t.fix}：${t.errors[error.code] ?? ""}`;
    item.append(link, fix);
    list.appendChild(item);
    errorListEl.append(heading, list);
    const target = document.getElementById(fieldIdForPath(error.path));
    if (target) target.classList.add("field-error");
  } else {
    errorListEl.hidden = true;
  }

  if (phase === "ready" && result) {
    renderResults(result);
  } else {
    renderEmptyResults(
      phase === "dirty"
        ? t.statusDirty
        : phase === "error"
          ? t.statusError
          : t.statusEmpty,
    );
  }
}

function onEdit() {
  const { draft } = buildDraft();
  flow.edit(draft);
  render();
}

function onSubmit(event) {
  event.preventDefault();
  if (flow.isBusy()) return;
  const { draft, syntaxErrors } = buildDraft();
  flow.edit(draft);
  if (syntaxErrors.length > 0) {
    flow.reportFormError(syntaxErrors[0]);
    render();
    const target = document.getElementById(
      fieldIdForPath(syntaxErrors[0].path),
    );
    if (target) target.focus();
    return;
  }
  runCounter += 1;
  const id = runCounter;
  flow.run(id);
  render();
  timer = setTimeout(() => {
    flow.settle(id);
    render();
  }, 0);
}

function onCancel() {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  flow.cancel();
  render();
  updateButton.focus();
}

function buildEventRow(index, event) {
  const row = document.createElement("div");
  row.className = "event-row";

  const label = document.createElement("p");
  label.className = "row-label";
  label.textContent = `${lang === "en" ? "Event" : "事件"} ${index + 1}`;
  row.appendChild(label);

  const typeField = document.createElement("div");
  typeField.className = "field";
  const typeLabel = document.createElement("label");
  typeLabel.setAttribute("for", `event-type-${index}`);
  typeLabel.textContent = t.eventTypeLabel;
  const typeSelect = document.createElement("select");
  typeSelect.id = `event-type-${index}`;
  for (const [value, text] of [
    ["join", t.typeJoin],
    ["leave", t.typeLeave],
    ["start", t.typeStart],
    ["finish", t.typeFinish],
  ]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    typeSelect.appendChild(option);
  }
  typeSelect.value = event ? event.type : "start";
  typeField.append(typeLabel, typeSelect);
  row.appendChild(typeField);

  const teamField = document.createElement("div");
  teamField.className = "field";
  const teamLabel = document.createElement("label");
  teamLabel.setAttribute("for", `event-team-${index}`);
  teamLabel.textContent = t.eventTeamLabel;
  const teamInput = document.createElement("input");
  teamInput.type = "text";
  teamInput.id = `event-team-${index}`;
  teamInput.className = "event-team-input";
  teamInput.autocomplete = "off";
  teamInput.maxLength = MAX_TEXT_UNITS;
  if (event) {
    if (event.type === "finish") teamInput.value = event.winner ?? "";
    else if (event.team) teamInput.value = event.team;
  }
  teamField.append(teamLabel, teamInput);
  row.appendChild(teamField);

  function syncTeamField() {
    const type = typeSelect.value;
    if (type === "start") {
      teamField.hidden = true;
    } else {
      teamField.hidden = false;
      teamLabel.textContent =
        type === "finish" ? t.eventWinnerLabel : t.eventTeamLabel;
    }
  }
  typeSelect.addEventListener("change", () => {
    syncTeamField();
    onEdit();
  });
  teamInput.addEventListener("input", onEdit);
  syncTeamField();
  return row;
}

function reindexRows() {
  const rows = [...eventsBody.querySelectorAll(".event-row")];
  rows.forEach((row, index) => {
    row.querySelector(".row-label").textContent =
      `${lang === "en" ? "Event" : "事件"} ${index + 1}`;
    const select = row.querySelector("select");
    const input = row.querySelector(".event-team-input");
    select.id = `event-type-${index}`;
    input.id = `event-team-${index}`;
    row.querySelector("label[for^='event-type-']").setAttribute("for", select.id);
    row.querySelector("label[for^='event-team-']").setAttribute("for", input.id);
  });
}

function setEvents(events) {
  eventsBody.replaceChildren();
  events.forEach((event, index) => {
    eventsBody.appendChild(buildEventRow(index, event));
  });
}

function clearAll() {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  teamsInput.value = "";
  queueInput.value = "";
  maxInput.value = "2";
  setEvents([]);
  flow.reset();
  render();
}

function loadSample() {
  teamsInput.value = SAMPLE.teams.join("\n");
  queueInput.value = SAMPLE.initialQueue.join("\n");
  maxInput.value = String(SAMPLE.maxConsecutive);
  setEvents(SAMPLE.events);
  flow.loadSample(structuredClone(SAMPLE));
  render();
  updateButton.focus();
}

teamsInput.addEventListener("input", onEdit);
queueInput.addEventListener("input", onEdit);
maxInput.addEventListener("input", onEdit);
form.addEventListener("submit", onSubmit);
cancelButton.addEventListener("click", onCancel);
clearButton.addEventListener("click", () => {
  clearAll();
  teamsInput.focus();
});
loadSampleButton.addEventListener("click", loadSample);
addEventButton.addEventListener("click", () => {
  const index = eventsBody.querySelectorAll(".event-row").length;
  eventsBody.appendChild(buildEventRow(index, null));
  eventsBody.querySelector(`#event-type-${index}`).focus();
  onEdit();
});
removeLastEventButton.addEventListener("click", () => {
  const rows = eventsBody.querySelectorAll(".event-row");
  if (rows.length === 0) return;
  rows[rows.length - 1].remove();
  reindexRows();
  onEdit();
});

// A bfcache restore (back/forward) clears the in-memory work, as the SPEC
// requires; a plain reload starts empty anyway.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) clearAll();
});

// Init succeeded: hide the reload fallback and show the empty state.
document.getElementById("init-failure").hidden = true;
render();
