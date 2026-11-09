import { SCALES, getScale } from "./core/scales.mjs";
import { computeTotals, assessRow, solveTarget } from "./core/calc.mjs";
import { createInitialState, addRow, removeRow, setScale, clearAll, canAddRow, MAX_ROWS } from "./core/state.mjs";

const LANG = document.documentElement.lang.startsWith("zh") ? "zh" : "en";
const T = {
  zh: {
    gradePlaceholder: "選擇等第",
    remove: "刪除",
    exclude: "排除",
    incomplete: "尚未填完，不列入計算。",
    excludedNote: "已排除，不列入計算。",
    gradeNotOnScale: (g) => `${g} 不在目前量尺上，請重新選擇等第。`,
    creditsInvalid: "學分需為 0.5 到 30、且以 0.5 為單位。",
    totalsEmpty: "請先加入至少一門完整且計入的課程。",
    totalsOk: (inc, skip) => skip > 0 ? `已計入 ${inc} 門；${skip} 門未填完或有誤，未列入計算。` : `已計入 ${inc} 門課程。`,
    solverPrompt: "填入四個欄位後，這裡會顯示試算結果。",
    stale: "（輸入已變更，此結果已過時）",
    feasible: (r) => `可行：接下來的學分平均需要拿到 ${r} 的成績點數。`,
    unreachable: (r, m) => `不可達：在這個量尺上，平均需要 ${r} 已超過上限。就算接下來的學分全部拿滿分，最終 GPA 最高也只有 ${m}。`,
    guaranteed: (z) => `已保證達標：就算接下來的學分全部 0 分，最終 GPA 仍有 ${z}，目標已經穩穩達到。`,
    errBlank: "此欄必填。",
    errG0Blank: "已修學分大於 0 時，目前 GPA 必填。",
    errRange: "超出允許範圍。",
    errStep: "需以 0.5 為單位。",
    errFormat: "格式不正確（最多兩位小數）。",
    scaleCol: "量尺",
    gradeCol: "等第",
    pointsCol: "點數"
  },
  en: {
    gradePlaceholder: "Select grade",
    remove: "Remove",
    exclude: "Exclude",
    incomplete: "Not filled in yet — left out of the totals.",
    excludedNote: "Excluded — left out of the totals.",
    gradeNotOnScale: (g) => `${g} is not on the current scale — pick another grade.`,
    creditsInvalid: "Credits must be 0.5 to 30, in 0.5 steps.",
    totalsEmpty: "Add at least one complete, included course first.",
    totalsOk: (inc, skip) => skip > 0 ? `${inc} course(s) counted; ${skip} incomplete or invalid row(s) left out.` : `${inc} course(s) counted.`,
    solverPrompt: "Fill in all four fields and the result will appear here.",
    stale: "(Inputs changed — this result is out of date)",
    feasible: (r) => `Feasible: your planned credits need to average ${r} grade points.`,
    unreachable: (r, m) => `Unreachable: the required average ${r} is above this scale's maximum. Even with perfect grades on every planned credit, the highest final GPA is ${m}.`,
    guaranteed: (z) => `Already guaranteed: even if every planned credit earned 0 points, the final GPA would be ${z} — the target is secured.`,
    errBlank: "This field is required.",
    errG0Blank: "Current GPA is required when completed credits are above 0.",
    errRange: "Out of the allowed range.",
    errStep: "Must be in 0.5 steps.",
    errFormat: "Invalid format (up to two decimals).",
    scaleCol: "Scale",
    gradeCol: "Grade",
    pointsCol: "Points"
  }
}[LANG];

const $ = (id) => document.getElementById(id);
let state = createInitialState();
let lastOutcome = null;

const rowsEl = $("rows");

function gradeOptions(select, scale, current) {
  select.textContent = "";
  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = T.gradePlaceholder;
  select.appendChild(ph);
  let found = false;
  for (const [letter, p10] of scale.entries) {
    const opt = document.createElement("option");
    opt.value = letter;
    opt.textContent = `${letter} (${(p10 / 10).toFixed(1)})`;
    if (letter === current) found = true;
    select.appendChild(opt);
  }
  if (current && !found) {
    // Keep an off-scale grade visible so its error state is honest (SPEC 3).
    const opt = document.createElement("option");
    opt.value = current;
    opt.textContent = current;
    select.appendChild(opt);
  }
  select.value = current ?? "";
}

function renderRows() {
  const scale = getScale(state.scaleId);
  rowsEl.textContent = "";
  state.rows.forEach((row, i) => {
    const a = assessRow(row, scale);
    const div = document.createElement("div");
    div.className = "course-row" + (row.excluded ? " is-excluded" : "") + (a.state === "error" ? " has-error" : "");
    div.dataset.index = String(i);

    const label = document.createElement("input");
    label.type = "text";
    label.value = row.label;
    label.dataset.field = "label";
    label.setAttribute("aria-label", LANG === "zh" ? "課程名稱" : "Course label");

    const grade = document.createElement("select");
    grade.dataset.field = "grade";
    grade.setAttribute("aria-label", LANG === "zh" ? "等第" : "Grade");
    gradeOptions(grade, scale, row.grade);
    if (a.state === "error" && a.code === "grade-not-on-scale") grade.setAttribute("aria-invalid", "true");

    const credits = document.createElement("input");
    credits.type = "number";
    credits.min = "0.5"; credits.max = "30"; credits.step = "0.5";
    credits.inputMode = "decimal";
    credits.value = row.creditsRaw;
    credits.dataset.field = "credits";
    credits.setAttribute("aria-label", LANG === "zh" ? "學分" : "Credits");
    if (a.state === "error" && a.code.startsWith("credits-")) credits.setAttribute("aria-invalid", "true");

    const exclWrap = document.createElement("label");
    const excl = document.createElement("input");
    excl.type = "checkbox";
    excl.checked = row.excluded;
    excl.dataset.field = "excluded";
    exclWrap.appendChild(excl);
    exclWrap.appendChild(document.createTextNode(" " + T.exclude));

    const rm = document.createElement("button");
    rm.type = "button";
    rm.textContent = T.remove;
    rm.dataset.action = "remove";
    rm.disabled = state.rows.length <= 1;

    div.append(label, grade, credits, exclWrap, rm);

    let noteText = null;
    if (a.state === "incomplete") noteText = T.incomplete;
    else if (a.state === "excluded") noteText = T.excludedNote;
    else if (a.state === "error" && a.code === "grade-not-on-scale") noteText = T.gradeNotOnScale(a.grade);
    else if (a.state === "error") noteText = T.creditsInvalid;
    if (noteText) {
      const note = document.createElement("p");
      note.className = "row-note" + (a.state === "incomplete" || a.state === "excluded" ? " neutral" : "");
      note.textContent = noteText;
      div.appendChild(note);
    }
    rowsEl.appendChild(div);
  });
  $("add-row").disabled = !canAddRow(state.rows);
  $("row-limit-note").hidden = canAddRow(state.rows);
  renderTotals();
}

function renderTotals() {
  const t = computeTotals(state.rows, state.scaleId);
  $("total-credits").textContent = t.status === "ok" ? t.totalCreditsText : "—";
  $("total-points").textContent = t.status === "ok" ? t.totalPointsText : "—";
  $("gpa-value").textContent = t.status === "ok" ? t.gpaText : "—";
  $("totals-note").textContent = t.status === "ok"
    ? T.totalsOk(t.included, t.incomplete + t.errors)
    : T.totalsEmpty;
}

rowsEl.addEventListener("input", (ev) => {
  const div = ev.target.closest(".course-row");
  if (!div) return;
  const row = state.rows[Number(div.dataset.index)];
  const field = ev.target.dataset.field;
  if (field === "label") row.label = ev.target.value;
  else if (field === "credits") row.creditsRaw = ev.target.value;
  else if (field === "excluded") row.excluded = ev.target.checked;
  if (field === "excluded" || field === "credits") renderRows();
  else renderTotals();
});
rowsEl.addEventListener("change", (ev) => {
  const div = ev.target.closest(".course-row");
  if (!div) return;
  const row = state.rows[Number(div.dataset.index)];
  if (ev.target.dataset.field === "grade") {
    row.grade = ev.target.value === "" ? null : ev.target.value;
    renderRows();
  }
});
rowsEl.addEventListener("click", (ev) => {
  const btn = ev.target.closest("button[data-action='remove']");
  if (!btn) return;
  const div = btn.closest(".course-row");
  const res = removeRow(state, Number(div.dataset.index));
  if (res.removed) { state = res.state; renderRows(); }
});

$("add-row").addEventListener("click", () => {
  const res = addRow(state);
  if (res.added) { state = res.state; renderRows(); }
  else { $("row-limit-note").hidden = false; }
});
$("clear-all").addEventListener("click", () => {
  state = clearAll();
  $("scale-select").value = state.scaleId;
  lastOutcome = null;
  renderRows();
});
$("scale-select").addEventListener("change", (ev) => {
  state = setScale(state, ev.target.value);
  renderRows();
  renderSolver();
});

function renderScaleTable() {
  const table = $("scale-table");
  table.textContent = "";
  const head = document.createElement("tr");
  for (const txt of [T.gradeCol, "4.0", "4.3"]) {
    const th = document.createElement("th");
    th.textContent = txt;
    head.appendChild(th);
  }
  table.appendChild(head);
  const by43 = new Map(SCALES["4.3"].entries);
  for (const [letter, p10] of [...SCALES["4.3"].entries]) {
    const tr = document.createElement("tr");
    const g = document.createElement("td"); g.textContent = letter;
    const v40 = document.createElement("td");
    const on40 = SCALES["4.0"].entries.find(([l]) => l === letter);
    v40.textContent = on40 ? (on40[1] / 10).toFixed(1) : "—";
    const v43 = document.createElement("td");
    v43.textContent = (by43.get(letter) / 10).toFixed(1);
    tr.append(g, v40, v43);
    table.appendChild(tr);
  }
}

const solverFields = { completedCredits: "sv-c0", currentGpa: "sv-g0", plannedCredits: "sv-c1", targetGpa: "sv-t" };
const solverErrEls = { completedCredits: "err-c0", currentGpa: "err-g0", plannedCredits: "err-c1", targetGpa: "err-t" };

function errText(field, code) {
  if (code === "blank") return field === "currentGpa" ? T.errG0Blank : T.errBlank;
  if (code === "out-of-range") return T.errRange;
  if (code === "off-step") return T.errStep;
  return T.errFormat;
}

function renderSolver() {
  const input = {};
  for (const [k, id] of Object.entries(solverFields)) input[k] = $(id).value;
  const allBlank = Object.values(input).every((v) => v.trim() === "");
  const out = $("solver-outcome");
  if (allBlank) {
    for (const id of Object.values(solverErrEls)) { $(id).hidden = true; }
    out.textContent = lastOutcome ? outcomeText(lastOutcome) + " " + T.stale : T.solverPrompt;
    return;
  }
  const res = solveTarget(input, state.scaleId);
  let anyError = false;
  for (const [k, id] of Object.entries(solverErrEls)) {
    const el = $(id);
    const code = res.status === "invalid" ? res.errors[k] : undefined;
    if (code) {
      anyError = true;
      el.textContent = errText(k, code);
      el.hidden = false;
      $(solverFields[k]).setAttribute("aria-invalid", "true");
    } else {
      el.hidden = true;
      $(solverFields[k]).removeAttribute("aria-invalid");
    }
  }
  if (res.status === "invalid") {
    // Freeze the last valid outcome, labelled out of date (SPEC section 3).
    out.textContent = lastOutcome ? outcomeText(lastOutcome) + " " + T.stale : T.solverPrompt;
    return;
  }
  lastOutcome = res;
  out.textContent = outcomeText(res);
}

function outcomeText(res) {
  if (res.status === "feasible") return T.feasible(res.requiredText);
  if (res.status === "unreachable") return T.unreachable(res.requiredText, res.maxAttainableText);
  return T.guaranteed(res.zeroFinalGpaText);
}

for (const id of Object.values(solverFields)) $(id).addEventListener("input", renderSolver);

renderScaleTable();
renderRows();
