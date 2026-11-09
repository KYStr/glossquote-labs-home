// DOM controller for Loan Kit Turnover Check. All user text is rendered
// with textContent / value only; never inserted as HTML. The pure core
// (solve, flow, i18n) is imported, never re-implemented here.
//
// Flow: the form builds a draft from its state model, the app checks raw
// integer and HH:MM syntax (SYNTAX) and then core validate() runs for the
// rest. A valid draft is solved on the next event-loop work item
// (setTimeout 0) under a runId guard, so an edit or cancel before that
// item revokes the scheduled work and a late reply can never revive a
// result.

import { validate } from "./core/solve.mjs";
import { createFlow } from "./core/flow.mjs";
import { stringsFor, formatMinute } from "./core/i18n.mjs";

// Fixed sample data: identical to the SPEC fixture
// loan-kit-turnover.turnover-overlap.
const SAMPLE = {
  kits: [{ name: "K", count: 4, turnMin: 10 }],
  loans: [
    { name: "A", kit: "K", start: 10, end: 30, qty: 2 },
    { name: "B", kit: "K", start: 30, end: 50, qty: 3 },
  ],
};

const INTEGER_SYNTAX = /^(0|[1-9][0-9]*)$/;
const TIME_SYNTAX = /^([0-9]{2}):([0-9]{2})$/;
const MAX_TEXT_LENGTH = 128;
const MAX_KITS = 12;
const MIN_KITS = 1;
const MAX_LOANS = 60;

const flow = createFlow();
let strings = stringsFor(document.documentElement.lang || "en");
let lang = document.documentElement.lang || "en";
let runCounter = 0;
let activeRunId = null;
let pendingTimer = null;
let lastValidData = null;

// State model: raw form values. Numbers and times stay strings until
// submit, when the SYNTAX check turns them into integers / minutes.
let kits = [{ name: "", countText: "", turnMinText: "0" }];
let loans = [];

const $ = (id) => document.getElementById(id);

let kitsBody;
let addKitButton;
let loansBody;
let addLoanButton;
let submitButton;
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
  kits = [{ name: "", countText: "", turnMinText: "0" }];
  loans = [];
}

function formatTime(minutes) {
  return formatMinute(minutes, lang);
}

function fill(template, values) {
  let out = template;
  for (const [key, value] of Object.entries(values)) {
    out = out.replaceAll(`{${key}}`, String(value));
  }
  return out;
}

// ---- row rendering --------------------------------------------------------

function renderKits() {
  kitsBody.textContent = "";
  kits.forEach((kit, i) => {
    const row = el("div", "row kit-row");
    const nameId = `kit-${i}-name`;
    const countId = `kit-${i}-count`;
    const turnId = `kit-${i}-turn`;

    const nameWrap = el("div", "field");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.id = nameId;
    nameInput.maxLength = MAX_TEXT_LENGTH;
    nameInput.autocomplete = "off";
    nameInput.value = kit.name;
    nameInput.addEventListener("input", () => {
      kit.name = nameInput.value;
      onEdit();
      refreshKitOptions();
    });
    nameWrap.append(labelFor(nameId, `${strings.kitNameLabel} ${i + 1}`), nameInput);

    const countWrap = el("div", "field field-narrow");
    const countInput = document.createElement("input");
    countInput.type = "text";
    countInput.id = countId;
    countInput.inputMode = "numeric";
    countInput.maxLength = 12;
    countInput.autocomplete = "off";
    countInput.value = kit.countText;
    countInput.addEventListener("input", () => {
      kit.countText = countInput.value;
      onEdit();
    });
    countWrap.append(labelFor(countId, strings.countLabel), countInput);

    const turnWrap = el("div", "field field-narrow");
    const turnInput = document.createElement("input");
    turnInput.type = "text";
    turnInput.id = turnId;
    turnInput.inputMode = "numeric";
    turnInput.maxLength = 12;
    turnInput.autocomplete = "off";
    turnInput.value = kit.turnMinText;
    turnInput.addEventListener("input", () => {
      kit.turnMinText = turnInput.value;
      onEdit();
    });
    turnWrap.append(labelFor(turnId, strings.turnMinLabel), turnInput);

    const removeButton = el("button", "remove-row");
    removeButton.type = "button";
    removeButton.textContent = strings.removeRow;
    removeButton.disabled = kits.length <= MIN_KITS;
    removeButton.addEventListener("click", () => {
      if (kits.length <= MIN_KITS) return;
      kits.splice(i, 1);
      onEdit();
      renderKits();
      refreshKitOptions();
    });

    row.append(nameWrap, countWrap, turnWrap, removeButton);
    row._controls = { nameInput, countInput, turnInput, removeButton };
    kitsBody.append(row);
  });
  addKitButton.disabled = kits.length >= MAX_KITS;
}

function refreshKitOptions() {
  const names = [];
  for (const kit of kits) {
    const value = kit.name.trim();
    if (value !== "") names.push(value);
  }
  for (const row of loansBody.children) {
    const select = row._controls.kitSelect;
    const current = select.value;
    select.textContent = "";
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "";
    select.append(blank);
    const seen = new Set([""]);
    for (const name of names) {
      if (seen.has(name)) continue;
      seen.add(name);
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.append(option);
    }
    if (current !== "" && !seen.has(current)) {
      // Keep a stale value so the core can report REF for it.
      const stale = document.createElement("option");
      stale.value = current;
      stale.textContent = current;
      select.append(stale);
    }
    select.value = current;
  }
}

function renderLoans() {
  loansBody.textContent = "";
  loans.forEach((loan, i) => {
    const row = el("div", "row loan-row");
    const nameId = `loan-${i}-name`;
    const kitId = `loan-${i}-kit`;
    const startId = `loan-${i}-start`;
    const endId = `loan-${i}-end`;
    const qtyId = `loan-${i}-qty`;

    const nameWrap = el("div", "field");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.id = nameId;
    nameInput.maxLength = MAX_TEXT_LENGTH;
    nameInput.autocomplete = "off";
    nameInput.value = loan.name;
    nameInput.addEventListener("input", () => {
      loan.name = nameInput.value;
      onEdit();
    });
    nameWrap.append(labelFor(nameId, `${strings.loanNameLabel} ${i + 1}`), nameInput);

    const kitWrap = el("div", "field");
    const kitSelect = document.createElement("select");
    kitSelect.id = kitId;
    kitSelect.addEventListener("change", () => {
      loan.kit = kitSelect.value;
      onEdit();
    });
    kitWrap.append(labelFor(kitId, strings.kitLabel), kitSelect);

    const startWrap = el("div", "field field-time");
    const startInput = document.createElement("input");
    startInput.type = "text";
    startInput.id = startId;
    startInput.inputMode = "numeric";
    startInput.maxLength = 5;
    startInput.autocomplete = "off";
    startInput.placeholder = "HH:MM";
    startInput.value = loan.startText;
    startInput.addEventListener("input", () => {
      loan.startText = startInput.value;
      onEdit();
    });
    startWrap.append(labelFor(startId, strings.startLabel), startInput);

    const endWrap = el("div", "field field-time");
    const endInput = document.createElement("input");
    endInput.type = "text";
    endInput.id = endId;
    endInput.inputMode = "numeric";
    endInput.maxLength = 5;
    endInput.autocomplete = "off";
    endInput.placeholder = "HH:MM";
    endInput.value = loan.endText;
    endInput.addEventListener("input", () => {
      loan.endText = endInput.value;
      onEdit();
    });
    endWrap.append(labelFor(endId, strings.endLabel), endInput);

    const qtyWrap = el("div", "field field-narrow");
    const qtyInput = document.createElement("input");
    qtyInput.type = "text";
    qtyInput.id = qtyId;
    qtyInput.inputMode = "numeric";
    qtyInput.maxLength = 12;
    qtyInput.autocomplete = "off";
    qtyInput.value = loan.qtyText;
    qtyInput.addEventListener("input", () => {
      loan.qtyText = qtyInput.value;
      onEdit();
    });
    qtyWrap.append(labelFor(qtyId, strings.qtyLabel), qtyInput);

    const removeButton = el("button", "remove-row");
    removeButton.type = "button";
    removeButton.textContent = strings.removeRow;
    removeButton.addEventListener("click", () => {
      loans.splice(i, 1);
      onEdit();
      renderLoans();
      refreshKitOptions();
    });

    row.append(nameWrap, kitWrap, startWrap, endWrap, qtyWrap, removeButton);
    row._controls = {
      nameInput,
      kitSelect,
      startInput,
      endInput,
      qtyInput,
      removeButton,
    };
    loansBody.append(row);
  });
  refreshKitOptions();
  for (let i = 0; i < loans.length; i += 1) {
    const select = loansBody.children[i]._controls.kitSelect;
    select.value = loans[i].kit;
  }
  addLoanButton.disabled = loans.length >= MAX_LOANS;
}

// ---- draft building -------------------------------------------------------

function isBlankKit(kit) {
  return kit.name === "" && kit.countText === "" && kit.turnMinText === "";
}

function isBlankLoan(loan) {
  return (
    loan.name === "" &&
    loan.kit === "" &&
    loan.startText === "" &&
    loan.endText === "" &&
    loan.qtyText === ""
  );
}

function parseTime(textValue) {
  const match = TIME_SYNTAX.exec(textValue);
  if (match === null) return { ok: false };
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (hh > 24 || mm > 59) return { ok: false };
  if (hh === 24 && mm !== 0) return { ok: false };
  return { ok: true, minutes: hh * 60 + mm };
}

// Builds the core data object from the state model, in row order.
// Returns {data} or {fieldError:{code,path}} for the first raw-syntax
// problem, mirroring the core's field order so the first reported error
// is the same one solve() would report.
function buildDraft() {
  const keptKits = [];
  for (let i = 0; i < kits.length; i += 1) {
    const kit = kits[i];
    if (isBlankKit(kit)) continue;
    const base = `/kits/${keptKits.length}`;
    if (!INTEGER_SYNTAX.test(kit.countText)) {
      return { fieldError: { code: "SYNTAX", path: `${base}/count` } };
    }
    if (!INTEGER_SYNTAX.test(kit.turnMinText)) {
      return { fieldError: { code: "SYNTAX", path: `${base}/turnMin` } };
    }
    keptKits.push({
      name: kit.name,
      count: Number(kit.countText),
      turnMin: Number(kit.turnMinText),
    });
  }
  const keptLoans = [];
  for (let i = 0; i < loans.length; i += 1) {
    const loan = loans[i];
    if (isBlankLoan(loan)) continue;
    const base = `/loans/${keptLoans.length}`;
    const start = parseTime(loan.startText);
    if (!start.ok) {
      return { fieldError: { code: "SYNTAX", path: `${base}/start` } };
    }
    const end = parseTime(loan.endText);
    if (!end.ok) {
      return { fieldError: { code: "SYNTAX", path: `${base}/end` } };
    }
    if (!INTEGER_SYNTAX.test(loan.qtyText)) {
      return { fieldError: { code: "SYNTAX", path: `${base}/qty` } };
    }
    keptLoans.push({
      name: loan.name,
      kit: loan.kit,
      start: start.minutes,
      end: end.minutes,
      qty: Number(loan.qtyText),
    });
  }
  return { data: { kits: keptKits, loans: keptLoans } };
}

// Map an error path to the form control it belongs to (for focus and
// inline marking). Returns the element or null.
function fieldForPath(path) {
  const match = /^\/(kits|loans)\/(\d+)\/(name|count|turnMin|kit|start|end|qty)$/.exec(path);
  if (!match) {
    if (path === "/kits" || path === "") {
      const first = kitsBody.querySelector("input");
      return first;
    }
    if (path === "/loans") {
      const first = loansBody.querySelector("input");
      return first;
    }
    return null;
  }
  const [, section, indexText, field] = match;
  const index = Number(indexText);
  const rows = section === "kits" ? [...kitsBody.children] : [...loansBody.children];
  const row = rows[index];
  if (!row) return null;
  const c = row._controls;
  if (field === "name") return c.nameInput;
  if (field === "count") return c.countInput;
  if (field === "turnMin") return c.turnInput;
  if (field === "kit") return c.kitSelect;
  if (field === "start") return c.startInput;
  if (field === "end") return c.endInput;
  if (field === "qty") return c.qtyInput;
  return null;
}

// ---- rendering ------------------------------------------------------------

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
  head.append(codeEl, document.createTextNode(` · ${error.path || "/"} (${strings.codeLabel} / ${strings.pathLabel})`));
  const fixText = text("p", `${strings.errorFix}：${message} ${fix}`);
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
  item.append(head, fixText, goButton);
  errorListEl.append(item);
  errorListEl.hidden = false;
  if (target) target.focus();
}

function renderResults(result) {
  resultsEl.textContent = "";
  const heading = text("h2", strings.resultHeading);
  resultsEl.append(heading);

  let firstShortage = null;
  for (const kit of result.kits) {
    if (kit.shortages.length > 0 && firstShortage === null) {
      firstShortage = { kitName: kit.name, segment: kit.shortages[0] };
    }
  }
  const firstBox = el("div", "first-shortage");
  firstBox.append(text("h3", strings.firstShortageHeading));
  if (firstShortage === null) {
    firstBox.append(text("p", strings.firstShortageNone));
  } else {
    const seg = firstShortage.segment;
    firstBox.append(
      text(
        "p",
        `${firstShortage.kitName} · ${fill(strings.shortageDetail, {
          from: formatTime(seg.from),
          to: formatTime(seg.to),
          demand: seg.demand,
          extra: seg.extra,
        })}`,
      ),
    );
    const loanList = el("ul");
    for (const name of seg.loans) {
      loanList.append(text("li", name, "mono"));
    }
    firstBox.append(text("p", strings.loansHeader, "muted"));
    firstBox.append(loanList);
  }
  resultsEl.append(firstBox);

  const table = el("table", "results-table");
  const headRow = el("tr");
  for (const header of [
    strings.kitHeader,
    strings.peakHeader,
    strings.countHeader,
    strings.minExtraHeader,
    strings.shortageHeader,
  ]) {
    headRow.append(text("th", header));
  }
  table.append(headRow);
  const countByName = new Map();
  if (lastValidData) {
    for (const kit of lastValidData.kits) countByName.set(kit.name, kit.count);
  }
  for (const kit of result.kits) {
    const row = el("tr");
    row.append(text("td", kit.name, "mono"));
    row.append(text("td", String(kit.peak)));
    row.append(text("td", String(countByName.get(kit.name) ?? "")));
    row.append(text("td", String(kit.minExtra)));
    const cell = el("td");
    if (kit.shortages.length === 0) {
      cell.append(text("span", strings.noShortage, "muted"));
    } else {
      for (const seg of kit.shortages) {
        const details = el("details");
        const summary = el("summary");
        summary.textContent = fill(strings.shortageDetail, {
          from: formatTime(seg.from),
          to: formatTime(seg.to),
          demand: seg.demand,
          extra: seg.extra,
        });
        details.append(summary);
        const loanList = el("ul");
        for (const name of seg.loans) {
          loanList.append(text("li", name, "mono"));
        }
        details.append(text("p", strings.loansHeader, "muted"));
        details.append(loanList);
        cell.append(details);
      }
    }
    row.append(cell);
    table.append(row);
  }
  const wrapper = el("div", "table-scroll");
  wrapper.append(table);
  resultsEl.append(wrapper);
  resultsEl.append(
    text("p", firstShortage === null ? strings.nextStepOk : strings.nextStepShortage, "notice-inline"),
  );
}

function render() {
  const { phase, result, error } = flow.snapshot();
  clearMarks();
  resultsEl.textContent = "";

  submitButton.disabled = phase === "busy";
  submitButton.textContent =
    phase === "busy" ? `${strings.working}…` : strings.submit;
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

// ---- actions ---------------------------------------------------------------

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
  const built = buildDraftForFlow();
  flow.edit(built);
  render();
}

// The flow draft is the current built data when it is structurally
// complete; otherwise a best-effort snapshot (the core re-validates on
// run, and submit-time validation is what gates a run).
function buildDraftForFlow() {
  const built = buildDraft();
  if (built.data) return built.data;
  // Keep a structural snapshot so edit still registers as a draft even
  // when raw syntax is temporarily invalid.
  return {
    kits: kits
      .filter((kit) => !isBlankKit(kit))
      .map((kit) => ({
        name: kit.name,
        count: Number(kit.countText) || 0,
        turnMin: Number(kit.turnMinText) || 0,
      })),
    loans: loans
      .filter((loan) => !isBlankLoan(loan))
      .map((loan) => ({
        name: loan.name,
        kit: loan.kit,
        start: parseTime(loan.startText).minutes ?? 0,
        end: parseTime(loan.endText).minutes ?? 0,
        qty: Number(loan.qtyText) || 0,
      })),
  };
}

function onSubmit(event) {
  event.preventDefault();
  if (flow.snapshot().phase === "busy") return; // resubmit while busy is ignored
  const built = buildDraft();
  if (built.fieldError) {
    // Form-level error: enter the error phase, keep the draft, focus
    // the first invalid field (render/showError does the focusing).
    flow.fail(built.fieldError);
    render();
    return;
  }
  const checked = validate(built.data);
  if (!checked.ok) {
    lastValidData = built.data;
    flow.edit(built.data);
    flow.fail(checked.reply.error);
    render();
    return;
  }
  lastValidData = checked.data;
  flow.edit(checked.data);
  runCounter += 1;
  activeRunId = runCounter;
  flow.run(activeRunId);
  render();
  const runId = activeRunId;
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    // settle computes solve() for the run's captured draft; the runId
    // guard drops this reply if the run was cancelled or superseded.
    flow.settle(runId);
    activeRunId = null;
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
  lastValidData = null;
  initialState();
  flow.reset();
  renderKits();
  renderLoans();
  render();
  const first = kitsBody.querySelector("input");
  if (first) first.focus();
}

function minutesToTime(minutes) {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function onLoadSample() {
  revokePending();
  kits = SAMPLE.kits.map((kit) => ({
    name: kit.name,
    countText: String(kit.count),
    turnMinText: String(kit.turnMin),
  }));
  loans = SAMPLE.loans.map((loan) => ({
    name: loan.name,
    kit: loan.kit,
    startText: minutesToTime(loan.start),
    endText: minutesToTime(loan.end),
    qtyText: String(loan.qty),
  }));
  flow.edit(SAMPLE);
  renderKits();
  renderLoans();
  render();
}

// ---- init ------------------------------------------------------------------

function init() {
  kitsBody = $("kits-body");
  addKitButton = $("add-kit");
  loansBody = $("loans-body");
  addLoanButton = $("add-loan");
  submitButton = $("check");
  cancelButton = $("cancel");
  clearButton = $("clear-draft");
  sampleButton = $("load-sample");
  statusEl = $("status");
  errorListEl = $("error-list");
  resultsEl = $("results");

  renderKits();
  renderLoans();

  const form = $("turnover-form");
  form.addEventListener("submit", onSubmit);
  addKitButton.addEventListener("click", () => {
    if (kits.length >= MAX_KITS) return;
    kits.push({ name: "", countText: "", turnMinText: "0" });
    onEdit();
    renderKits();
  });
  addLoanButton.addEventListener("click", () => {
    if (loans.length >= MAX_LOANS) return;
    loans.push({ name: "", kit: "", startText: "", endText: "", qtyText: "" });
    onEdit();
    renderLoans();
  });
  cancelButton.addEventListener("click", onCancel);
  clearButton.addEventListener("click", onClear);
  sampleButton.addEventListener("click", onLoadSample);

  // Leaving the page (including a bfcache restore) clears working memory.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) onClear();
  });

  render();
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
