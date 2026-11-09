// DOM controller for Studio Visit Fee Breakpoints. All user text is
// rendered with textContent / value only; never inserted as HTML. The
// pure core (solve, flow) is imported, never re-implemented here.
//
// Flow: the form builds a draft, the app checks raw number syntax
// (SYNTAX) and lets the core validate names, types and ranges; a valid
// draft is solved on the next event-loop work item (setTimeout(0)) under
// a runId guard, so an edit or cancel before it fires revokes the work
// and a late reply can never overwrite a newer state.

import { solve, normalizeName } from "./core/solve.mjs";
import { createFlow } from "./core/flow.mjs";
import { stringsFor } from "./core/i18n.mjs";

// Fixed sample data: identical to the SPEC fixture
// service-block-breakpoints.multiple-crossings.
const SAMPLE = {
  maxVisits: 4,
  plans: [
    {
      name: "A",
      type: "blocks",
      baseMinor: 0,
      included: 0,
      blockSize: 2,
      blockMinor: 600,
    },
    {
      name: "B",
      type: "progressive",
      baseMinor: 0,
      included: 0,
      bands: [{ upTo: null, rateMinor: 350 }],
    },
  ],
};

const INTEGER_SYNTAX = /^(0|[1-9][0-9]*)$/;
const PLAN_KEYS = ["a", "b"];

const flow = createFlow();
let strings = stringsFor(document.documentElement.lang || "en");
let runCounter = 0;
let activeRunId = null;
let scheduled = null;
let lastDraft = null; // last built draft (may be stale after edits)
let lastValidData = null; // validated snapshot behind the shown result
let bands = { a: [{ upTo: "", rate: "" }], b: [{ upTo: "", rate: "" }] };

const $ = (id) => document.getElementById(id);

let maxVisitsEl;
let statusEl;
let resultsEl;
let errorListEl;
let compareButton;
let cancelButton;
let clearButton;
let sampleButton;
let planEls = {};

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

function fmt(n) {
  return new Intl.NumberFormat(
    document.documentElement.lang === "zh-Hant" ? "zh-Hant" : "en",
  ).format(n);
}

function planName(index) {
  if (!lastValidData) return index === 0 ? "A" : "B";
  const raw = lastValidData.plans[index].name;
  const checked = normalizeName(raw);
  return checked.ok ? checked.name : raw;
}

// ---- band rows ----------------------------------------------------------

function renderBands(key) {
  const container = planEls[key].bandsBody;
  container.textContent = "";
  bands[key].forEach((band, j) => {
    const row = el("div", "row band-row");
    const upToWrap = el("div", "field");
    const upToId = `${key}-band-${j}-upTo`;
    const upToLabel = el("label");
    upToLabel.htmlFor = upToId;
    upToLabel.textContent = `${strings.upToLabel} ${j + 1}`;
    const upToInput = document.createElement("input");
    upToInput.type = "text";
    upToInput.id = upToId;
    upToInput.inputMode = "numeric";
    upToInput.maxLength = 12;
    upToInput.autocomplete = "off";
    upToInput.value = band.upTo;
    upToInput.placeholder = j === bands[key].length - 1 ? "—" : "";
    upToInput.addEventListener("input", () => {
      bands[key][j].upTo = upToInput.value;
      onEdit();
    });
    upToWrap.append(upToLabel, upToInput);
    const rateWrap = el("div", "field");
    const rateId = `${key}-band-${j}-rate`;
    const rateLabel = el("label");
    rateLabel.htmlFor = rateId;
    rateLabel.textContent = `${strings.rateLabel} ${j + 1}`;
    const rateInput = document.createElement("input");
    rateInput.type = "text";
    rateInput.id = rateId;
    rateInput.inputMode = "numeric";
    rateInput.maxLength = 12;
    rateInput.autocomplete = "off";
    rateInput.value = band.rate;
    rateInput.addEventListener("input", () => {
      bands[key][j].rate = rateInput.value;
      onEdit();
    });
    rateWrap.append(rateLabel, rateInput);
    const removeButton = el("button", "remove-row secondary");
    removeButton.type = "button";
    removeButton.textContent = strings.removeRow;
    removeButton.disabled = bands[key].length <= 1;
    removeButton.addEventListener("click", () => {
      if (bands[key].length <= 1) return;
      bands[key].splice(j, 1);
      renderBands(key);
      onEdit();
    });
    row.append(upToWrap, rateWrap, removeButton);
    container.append(row);
  });
}

function setType(key, type) {
  const els = planEls[key];
  const progressive = type === "progressive";
  els.bandsWrap.hidden = !progressive;
  els.blocksWrap.hidden = progressive;
  for (const radio of els.typeRadios) {
    radio.checked = radio.value === type;
  }
}

function readType(key) {
  for (const radio of planEls[key].typeRadios) {
    if (radio.checked) return radio.value;
  }
  return "progressive";
}

// ---- draft building -----------------------------------------------------

function parseIntField(raw) {
  if (!INTEGER_SYNTAX.test(raw)) return { ok: false };
  return { ok: true, value: Number(raw) };
}

function buildDraft() {
  const max = parseIntField(maxVisitsEl.value);
  if (!max.ok) return { fieldError: { code: "SYNTAX", path: "/maxVisits" } };
  const plans = [];
  for (let i = 0; i < PLAN_KEYS.length; i += 1) {
    const key = PLAN_KEYS[i];
    const els = planEls[key];
    const base = `/plans/${i}`;
    const type = readType(key);
    const baseMinor = parseIntField(els.baseInput.value);
    if (!baseMinor.ok) {
      return { fieldError: { code: "SYNTAX", path: `${base}/baseMinor` } };
    }
    const included = parseIntField(els.includedInput.value);
    if (!included.ok) {
      return { fieldError: { code: "SYNTAX", path: `${base}/included` } };
    }
    const plan = {
      name: els.nameInput.value,
      type,
      baseMinor: baseMinor.value,
      included: included.value,
    };
    if (type === "progressive") {
      const out = [];
      for (const band of bands[key]) {
        const upToBlank = band.upTo === "";
        const rateBlank = band.rate === "";
        if (upToBlank && rateBlank) continue;
        const j = out.length;
        let upTo = null;
        if (!upToBlank) {
          const parsed = parseIntField(band.upTo);
          if (!parsed.ok) {
            return {
              fieldError: { code: "SYNTAX", path: `${base}/bands/${j}/upTo` },
            };
          }
          upTo = parsed.value;
        }
        const rate = parseIntField(band.rate);
        if (!rate.ok) {
          return {
            fieldError: { code: "SYNTAX", path: `${base}/bands/${j}/rateMinor` },
          };
        }
        out.push({ upTo, rateMinor: rate.value });
      }
      plan.bands = out;
    } else {
      const blockSize = parseIntField(els.blockSizeInput.value);
      if (!blockSize.ok) {
        return { fieldError: { code: "SYNTAX", path: `${base}/blockSize` } };
      }
      const blockMinor = parseIntField(els.blockMinorInput.value);
      if (!blockMinor.ok) {
        return { fieldError: { code: "SYNTAX", path: `${base}/blockMinor` } };
      }
      plan.blockSize = blockSize.value;
      plan.blockMinor = blockMinor.value;
    }
    plans.push(plan);
  }
  return { data: { maxVisits: max.value, plans } };
}

// Map an error path to the form control it belongs to (for focus and
// inline marking). Returns the element or null.
function fieldForPath(path) {
  if (path === "" || path === "/maxVisits") return maxVisitsEl;
  const match = /^\/plans\/([01])(?:\/(.*))?$/.exec(path);
  if (!match) return maxVisitsEl;
  const key = PLAN_KEYS[Number(match[1])];
  const rest = match[2] || "";
  const els = planEls[key];
  if (rest === "" || rest === "name") return els.nameInput;
  if (rest === "type") return els.typeRadios[0];
  if (rest === "baseMinor") return els.baseInput;
  if (rest === "included") return els.includedInput;
  if (rest === "blockSize") return els.blockSizeInput;
  if (rest === "blockMinor") return els.blockMinorInput;
  const bandMatch = /^bands(?:\/(\d+)(?:\/(upTo|rateMinor))?)?$/.exec(rest);
  if (bandMatch) {
    const j = bandMatch[1] === undefined ? 0 : Number(bandMatch[1]);
    const field = bandMatch[2] || "upTo";
    return $(`${key}-band-${j}-${field === "upTo" ? "upTo" : "rate"}`);
  }
  return els.nameInput;
}

// ---- rendering ----------------------------------------------------------

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
  const fixLine = text("p", `${strings.errorFix}：${fix}`);
  const goButton = el("button", "error-goto secondary");
  goButton.type = "button";
  goButton.textContent = strings.errorGoto;
  const target = fieldForPath(error.path);
  if (target) {
    target.setAttribute("aria-invalid", "true");
    goButton.addEventListener("click", () => target.focus());
  } else {
    goButton.disabled = true;
  }
  item.append(head, text("p", message), fixLine, goButton);
  errorListEl.append(item);
  errorListEl.hidden = false;
  if (target) target.focus();
}

function relationText(relation) {
  if (relation === "A") {
    return strings.relationA.replace("{a}", planName(0));
  }
  if (relation === "B") {
    return strings.relationB.replace("{b}", planName(1));
  }
  return strings.relationEqual;
}

function renderResults(result) {
  const section = el("section");
  section.append(text("h2", strings.spansHeading));
  const list = el("ul", "span-list");
  for (const span of result.spans) {
    const label =
      span.from === span.to
        ? strings.spanSingle.replace("{from}", String(span.from))
        : strings.spanRange
            .replace("{from}", String(span.from))
            .replace("{to}", String(span.to));
    const item = el("li");
    item.append(text("strong", label), document.createTextNode(`：${relationText(span.relation)}`));
    list.append(item);
  }
  section.append(list);
  section.append(text("p", strings.nextStep, "notice-inline"));

  const details = el("details");
  const summary = el("summary");
  summary.textContent = strings.visitsToggle.replace(
    "{max}",
    String(lastValidData.maxVisits),
  );
  details.append(summary);
  details.append(text("h2", strings.visitsHeading));
  const table = el("table", "standings");
  const head = el("tr");
  for (const header of [
    strings.countHeader,
    `${planName(0)} ${strings.amountHeader}`,
    `${planName(1)} ${strings.amountHeader}`,
    strings.relationHeader,
  ]) {
    head.append(text("th", header));
  }
  table.append(head);
  for (const visit of result.visits) {
    const row = el("tr");
    row.append(text("td", String(visit.count)));
    row.append(text("td", fmt(visit.aMinor)));
    row.append(text("td", fmt(visit.bMinor)));
    row.append(text("td", relationText(visit.relation)));
    table.append(row);
  }
  details.append(table);
  section.append(details);
  resultsEl.append(section);
}

function render() {
  const { phase, result, error } = flow.snapshot();
  clearMarks();
  resultsEl.textContent = "";

  compareButton.disabled = phase === "busy";
  compareButton.textContent =
    phase === "busy" ? `${strings.working}…` : strings.compare;
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

function revokeScheduled() {
  if (scheduled !== null) {
    clearTimeout(scheduled);
    scheduled = null;
  }
  activeRunId = null;
}

function onEdit() {
  if (flow.snapshot().phase === "busy") {
    revokeScheduled();
    flow.cancel();
  }
  const built = buildDraft();
  if (built.data) {
    lastDraft = built.data;
    flow.edit(built.data);
  } else if (lastDraft !== null) {
    flow.edit(lastDraft);
  } else {
    flow.edit(null);
  }
  render();
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
  const checked = solve(built.data);
  if (checked.status !== "ok") {
    lastDraft = built.data;
    flow.edit(built.data);
    flow.fail(checked.error);
    render();
    return;
  }
  lastDraft = built.data;
  lastValidData = built.data;
  flow.edit(built.data);
  runCounter += 1;
  activeRunId = runCounter;
  flow.run(activeRunId);
  render();
  // Solve on the next event-loop work item (per SPEC); an edit or
  // cancel before it fires revokes the scheduled work.
  scheduled = setTimeout(() => {
    scheduled = null;
    const runId = activeRunId;
    activeRunId = null;
    flow.settle(runId);
    render();
  }, 0);
}

function onCancel() {
  if (flow.snapshot().phase !== "busy") return;
  revokeScheduled();
  flow.cancel();
  render();
}

function resetForm() {
  maxVisitsEl.value = "12";
  for (const key of PLAN_KEYS) {
    const els = planEls[key];
    els.nameInput.value = "";
    els.baseInput.value = "";
    els.includedInput.value = "0";
    els.blockSizeInput.value = "";
    els.blockMinorInput.value = "";
    setType(key, "progressive");
  }
  bands = { a: [{ upTo: "", rate: "" }], b: [{ upTo: "", rate: "" }] };
  renderBands("a");
  renderBands("b");
}

function onClear() {
  revokeScheduled();
  lastDraft = null;
  lastValidData = null;
  resetForm();
  flow.reset();
  render();
  maxVisitsEl.focus();
}

function fillForm(data) {
  maxVisitsEl.value = String(data.maxVisits);
  data.plans.forEach((plan, i) => {
    const key = PLAN_KEYS[i];
    const els = planEls[key];
    els.nameInput.value = plan.name;
    els.baseInput.value = String(plan.baseMinor);
    els.includedInput.value = String(plan.included);
    setType(key, plan.type);
    if (plan.type === "progressive") {
      bands[key] = plan.bands.map((band) => ({
        upTo: band.upTo === null ? "" : String(band.upTo),
        rate: String(band.rateMinor),
      }));
      renderBands(key);
    } else {
      els.blockSizeInput.value = String(plan.blockSize);
      els.blockMinorInput.value = String(plan.blockMinor);
    }
  });
}

function onLoadSample() {
  if (flow.snapshot().phase === "busy") {
    revokeScheduled();
    flow.cancel();
  }
  fillForm(SAMPLE);
  lastDraft = SAMPLE;
  flow.edit(SAMPLE);
  render();
}

// ---- init ---------------------------------------------------------------

function init() {
  maxVisitsEl = $("max-visits");
  statusEl = $("status");
  resultsEl = $("results");
  errorListEl = $("error-list");
  compareButton = $("compare");
  cancelButton = $("cancel");
  clearButton = $("clear-draft");
  sampleButton = $("load-sample");

  for (const key of PLAN_KEYS) {
    planEls[key] = {
      nameInput: $(`${key}-name`),
      baseInput: $(`${key}-base`),
      includedInput: $(`${key}-included`),
      blockSizeInput: $(`${key}-block-size`),
      blockMinorInput: $(`${key}-block-minor`),
      bandsBody: $(`${key}-bands-body`),
      bandsWrap: $(`${key}-bands-wrap`),
      blocksWrap: $(`${key}-blocks-wrap`),
      addBandButton: $(`${key}-add-band`),
      typeRadios: [...document.querySelectorAll(`input[name="${key}-type"]`)],
    };
    const els = planEls[key];
    for (const radio of els.typeRadios) {
      radio.addEventListener("change", () => {
        setType(key, radio.value);
        onEdit();
      });
    }
    els.addBandButton.addEventListener("click", () => {
      if (bands[key].length >= 5) return;
      bands[key].push({ upTo: "", rate: "" });
      renderBands(key);
      onEdit();
    });
  }

  renderBands("a");
  renderBands("b");

  const form = $("compare-form");
  form.addEventListener("submit", onSubmit);
  form.addEventListener("input", (event) => {
    if (event.target.matches("input[type='text']")) onEdit();
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
