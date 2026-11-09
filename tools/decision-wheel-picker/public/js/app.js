// Decision Wheel Picker — DOM layer.
// The draw always happens in the pure core BEFORE any animation is
// computed (SPEC sections 3-4): this file asks the session for the
// result first, then rotates the wheel to the already-drawn slice.
// All user text is rendered with textContent / SVG text nodes only.

import {
  createCryptoSource,
  createSession,
  isCryptoAvailable,
  parseEntries,
  validateCount,
} from "./core/wheel.mjs";
import { stringsFor } from "./i18n.mjs";

const strings = stringsFor(document.documentElement.lang);
const $ = (id) => document.getElementById(id);

const els = {
  options: $("options"),
  count: $("count"),
  errors: $("errors"),
  lockNote: $("lock-note"),
  elimination: $("elimination"),
  spin: $("spin"),
  reset: $("reset"),
  spinReason: $("spin-reason"),
  wheel: $("wheel"),
  result: $("result"),
  activeList: $("active-list"),
  history: $("history"),
  historyEmpty: $("history-empty"),
  cryptoError: $("crypto-error"),
};

const PALETTE = [
  "#f6c453", "#f28f6b", "#e56399", "#a06cd5", "#6d9dc5",
  "#4fb286", "#8ac926", "#ffca3a", "#6a9eeb", "#e07a5f",
];
const SVG_NS = "http://www.w3.org/2000/svg";
const SPIN_MS = 4000;
const FULL_TURNS = 4;

const cryptoOk = isCryptoAvailable();
const cryptoSource = cryptoOk ? createCryptoSource() : null;
const session = createSession({ elimination: false });
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let parseErrors = [];
let parsedCount = 0;
let spinning = false;
let rotation = 0; // current absolute wheel rotation in degrees

function polar(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function sliceLabel(text, step) {
  const chars = [...text];
  const shown = chars.length > 20 ? `${chars.slice(0, 20).join("")}…` : text;
  const size = Math.max(8, Math.min(15, step * 0.32, 260 / Math.max(6, chars.length)));
  return { shown, size };
}

function renderWheel(entries, highlightIndex = -1) {
  while (els.wheel.firstChild) els.wheel.removeChild(els.wheel.firstChild);
  const n = entries.length;
  if (n === 0) return;
  const cx = 160;
  const cy = 160;
  const r = 150;
  if (n === 1) {
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", cx);
    circle.setAttribute("cy", cy);
    circle.setAttribute("r", r);
    circle.setAttribute("fill", PALETTE[0]);
    els.wheel.appendChild(circle);
  } else {
    const step = 360 / n;
    for (let i = 0; i < n; i += 1) {
      const a0 = i * step;
      const a1 = a0 + step;
      const [x0, y0] = polar(cx, cy, r, a0);
      const [x1, y1] = polar(cx, cy, r, a1);
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute(
        "d",
        `M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} ` +
          `A ${r} ${r} 0 ${step > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`,
      );
      path.setAttribute("fill", PALETTE[i % PALETTE.length]);
      path.setAttribute("stroke", "#ffffff");
      path.setAttribute("stroke-width", "1.5");
      if (i === highlightIndex) path.classList.add("slice-highlight");
      els.wheel.appendChild(path);
      const mid = a0 + step / 2;
      const [tx, ty] = polar(cx, cy, r * 0.62, mid);
      const { shown, size } = sliceLabel(entries[i], step);
      const label = document.createElementNS(SVG_NS, "text");
      label.setAttribute("x", tx.toFixed(2));
      label.setAttribute("y", ty.toFixed(2));
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("dominant-baseline", "middle");
      label.setAttribute("font-size", size.toFixed(1));
      label.setAttribute("fill", "#17202a");
      label.setAttribute("transform", `rotate(${(mid).toFixed(2)} ${tx.toFixed(2)} ${ty.toFixed(2)})`);
      label.textContent = shown;
      els.wheel.appendChild(label);
    }
  }
}

function renderActiveList(entries) {
  while (els.activeList.firstChild) els.activeList.removeChild(els.activeList.firstChild);
  for (const entry of entries) {
    const li = document.createElement("li");
    li.textContent = entry;
    els.activeList.appendChild(li);
  }
}

function renderHistory(state) {
  while (els.history.firstChild) els.history.removeChild(els.history.firstChild);
  for (const item of state.history) {
    const li = document.createElement("li");
    li.textContent = strings.historyPick(item.pick, item.text);
    els.history.appendChild(li);
  }
  if (state.finalRemaining !== null) {
    const li = document.createElement("li");
    li.classList.add("final-remaining");
    li.textContent = strings.historyFinal(state.finalRemaining);
    els.history.appendChild(li);
  }
  els.historyEmpty.hidden = state.history.length > 0 || state.finalRemaining !== null;
}

function refresh({ keepResult = true } = {}) {
  const { entries, errors } = parseEntries(els.options.value);
  parseErrors = errors;
  parsedCount = entries.length + errors.length;
  if (!session.getState().locked) session.setEntries(entries);
  const state = session.getState();
  const countError = validateCount(entries.length);

  els.count.textContent = strings.countText(entries.length);
  while (els.errors.firstChild) els.errors.removeChild(els.errors.firstChild);
  for (const error of parseErrors) {
    const li = document.createElement("li");
    li.textContent = strings.entryTooLong(error.line);
    els.errors.appendChild(li);
  }

  renderWheel(state.active);
  renderActiveList(state.active);
  renderHistory(state);

  els.lockNote.hidden = !state.locked;
  if (state.locked) els.lockNote.textContent = strings.editorLocked;
  els.options.disabled = state.locked;
  els.elimination.disabled = state.locked || spinning;

  let reason = "";
  if (!cryptoOk) reason = "";
  else if (parseErrors.length > 0) reason = strings.entryTooLong(parseErrors[0].line);
  else if (countError?.code === "too_few") reason = strings.tooFew(countError.count);
  else if (countError?.code === "too_many") reason = strings.tooMany(countError.count);
  els.spinReason.textContent = reason;

  els.spin.disabled =
    spinning || !cryptoOk || parseErrors.length > 0 || countError !== null || !state.canSpin;
  els.reset.disabled = spinning;
  if (!keepResult) els.result.textContent = strings.idle;
}

function setWheelRotation(deg, animate) {
  els.wheel.style.transition = animate
    ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.8, 0.08, 1)`
    : "none";
  els.wheel.style.transform = `rotate(${deg}deg)`;
}

function finishSpin(outcome, drawnEntries) {
  // Normalize rotation to avoid unbounded growth across spins.
  rotation = ((rotation % 360) + 360) % 360;
  setWheelRotation(rotation, false);
  spinning = false;

  let message = strings.announcePick(outcome.text);
  if (outcome.finalRemaining !== null) {
    message = `${message} ${strings.announceFinal(outcome.finalRemaining)}`;
  }
  els.result.textContent = message;

  const state = session.getState();
  if (state.elimination) {
    // The picked occurrence leaves the wheel; redraw with the rest.
    rotation = 0;
    setWheelRotation(0, false);
    refresh();
  } else {
    refresh();
    renderWheel(drawnEntries, outcome.index);
  }
}

function doSpin() {
  if (spinning || !cryptoOk) return;
  const state = session.getState();
  if (!state.canSpin) return;
  const drawnEntries = state.active;
  spinning = true;
  els.spin.disabled = true;
  els.reset.disabled = true;
  els.result.textContent = strings.spinning;

  // 1. The draw happens first, in the core. Nothing below can change it.
  const outcome = session.spin(cryptoSource);

  // 2. Presentation only: rotate so the pointer ends inside the drawn
  // slice (pointer is fixed at the top; slice i's centre must land at
  // angle 0 after rotation).
  const n = drawnEntries.length;
  const step = 360 / n;
  const centre = outcome.index * step + step / 2;
  const delta = (((-centre - rotation) % 360) + 360) % 360;
  rotation = rotation + FULL_TURNS * 360 + delta;

  if (reducedMotion.matches) {
    setWheelRotation(rotation, false);
    renderWheel(drawnEntries, outcome.index);
    finishSpin(outcome, drawnEntries);
    return;
  }
  setWheelRotation(rotation, true);
  let done = false;
  const complete = () => {
    if (done) return;
    done = true;
    els.wheel.removeEventListener("transitionend", onEnd);
    finishSpin(outcome, drawnEntries);
  };
  const onEnd = (event) => {
    if (event.propertyName === "transform") complete();
  };
  els.wheel.addEventListener("transitionend", onEnd);
  window.setTimeout(complete, SPIN_MS + 400);
}

els.options.addEventListener("input", () => refresh({ keepResult: false }));
els.elimination.addEventListener("change", () => {
  session.setElimination(els.elimination.checked);
  rotation = 0;
  setWheelRotation(0, false);
  refresh({ keepResult: false });
});
els.spin.addEventListener("click", doSpin);
els.reset.addEventListener("click", () => {
  session.reset();
  rotation = 0;
  setWheelRotation(0, false);
  refresh({ keepResult: false });
});

if (!cryptoOk) els.cryptoError.hidden = false;
els.result.textContent = strings.idle;
refresh();
