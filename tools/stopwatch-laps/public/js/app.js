// DOM wiring for the stopwatch. All clock reads (performance.now) and
// animation frames live in this layer only; the core is a pure state
// machine over injected timestamps. All dynamic text is written with
// textContent; lap data exists only as numbers produced by the core.

import {
  MAX_LAPS,
  createStopwatch,
  currentLapMs,
  elapsedAt,
  getLaps,
  getStats,
  lap,
  pause,
  reset,
  resume,
  start,
  toCsv,
} from "./core/stopwatch.mjs";
import { formatDuration } from "./core/format.mjs";

const LANG = document.documentElement.lang.startsWith("en") ? "en" : "zh";

const STRINGS = {
  zh: {
    start: "開始",
    pause: "暫停",
    resume: "繼續",
    fastest: "最快",
    slowest: "最慢",
    statLap: (n, dur) => `第 ${n} 圈（${dur}）`,
    announceLap: (n, dur) => `第 ${n} 圈，${dur}`,
    announcePaused: (t) => `已暫停，${t}`,
    announceReset: "已重設",
  },
  en: {
    start: "Start",
    pause: "Pause",
    resume: "Resume",
    fastest: "Fastest",
    slowest: "Slowest",
    statLap: (n, dur) => `Lap ${n} (${dur})`,
    announceLap: (n, dur) => `Lap ${n}, ${dur}`,
    announcePaused: (t) => `Paused at ${t}`,
    announceReset: "Reset",
  },
};
const S = STRINGS[LANG];

const els = {
  display: document.getElementById("display"),
  currentLap: document.getElementById("current-lap"),
  toggle: document.getElementById("btn-toggle"),
  lap: document.getElementById("btn-lap"),
  reset: document.getElementById("btn-reset"),
  export: document.getElementById("btn-export"),
  limitNote: document.getElementById("limit-note"),
  stats: document.getElementById("stats"),
  statFastest: document.getElementById("stat-fastest"),
  statSlowest: document.getElementById("stat-slowest"),
  statAverage: document.getElementById("stat-average"),
  lapsSection: document.getElementById("laps-section"),
  lapsBody: document.getElementById("laps-body"),
  announcer: document.getElementById("announcer"),
};

const sw = createStopwatch();
let rafId = null;

function announce(text) {
  els.announcer.textContent = text;
}

function renderClock() {
  const now = performance.now();
  els.display.textContent = formatDuration(elapsedAt(sw, now));
  els.currentLap.textContent = formatDuration(currentLapMs(sw, now));
}

function renderControls() {
  els.toggle.textContent =
    sw.status === "running" ? S.pause : sw.status === "paused" ? S.resume : S.start;
  els.lap.disabled = sw.status !== "running";
  els.export.disabled = sw.splits.length === 0;
}

function renderLaps() {
  const laps = getLaps(sw);
  const stats = getStats(sw);
  els.lapsSection.hidden = laps.length === 0;
  els.stats.hidden = stats === null;
  const body = document.createElement("tbody");
  for (const entry of laps) {
    const row = document.createElement("tr");
    const num = document.createElement("td");
    num.textContent = String(entry.number);
    const dur = document.createElement("td");
    dur.textContent = formatDuration(entry.durationMs);
    const split = document.createElement("td");
    split.textContent = formatDuration(entry.splitMs);
    const mark = document.createElement("td");
    const marks = [];
    if (stats && entry.number === stats.fastest.number) marks.push(S.fastest);
    if (stats && entry.number === stats.slowest.number) marks.push(S.slowest);
    mark.textContent = marks.join(" · ");
    row.append(num, dur, split, mark);
    body.append(row);
  }
  els.lapsBody.replaceWith(body);
  els.lapsBody = body;
  els.lapsBody.id = "laps-body";
  if (stats) {
    els.statFastest.textContent = S.statLap(
      stats.fastest.number,
      formatDuration(stats.fastest.durationMs),
    );
    els.statSlowest.textContent = S.statLap(
      stats.slowest.number,
      formatDuration(stats.slowest.durationMs),
    );
    els.statAverage.textContent = formatDuration(stats.averageMs);
  }
}

function renderAll() {
  renderClock();
  renderControls();
  renderLaps();
}

function tick() {
  renderClock();
  if (sw.status === "running") {
    rafId = requestAnimationFrame(tick);
  } else {
    rafId = null;
  }
}

function ensureTicking() {
  if (rafId === null && sw.status === "running") {
    rafId = requestAnimationFrame(tick);
  }
}

function doToggle() {
  const now = performance.now();
  if (sw.status === "idle") {
    start(sw, now);
  } else if (sw.status === "running") {
    pause(sw, now);
    announce(S.announcePaused(formatDuration(elapsedAt(sw, now))));
  } else {
    resume(sw, now);
  }
  renderAll();
  ensureTicking();
}

function doLap() {
  const result = lap(sw, performance.now());
  if (result.ok) {
    announce(
      S.announceLap(result.lap.number, formatDuration(result.lap.durationMs)),
    );
    if (sw.splits.length >= MAX_LAPS) els.limitNote.hidden = false;
  } else if (result.reason === "lap-limit") {
    els.limitNote.hidden = false;
  }
  renderAll();
}

function doReset() {
  reset(sw);
  els.limitNote.hidden = true;
  announce(S.announceReset);
  renderAll();
}

function doExport() {
  if (sw.splits.length === 0) return;
  const blob = new Blob([toCsv(sw)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "stopwatch-laps.csv";
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

els.toggle.addEventListener("click", doToggle);
els.lap.addEventListener("click", doLap);
els.reset.addEventListener("click", doReset);
els.export.addEventListener("click", doExport);

document.addEventListener("keydown", (event) => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === "Space") {
    // A focused button activates natively on Space; handling it here
    // too would double-fire. Only toggle when focus is elsewhere.
    if (document.activeElement instanceof HTMLButtonElement) return;
    event.preventDefault();
    doToggle();
  } else if (event.code === "KeyL") {
    if (sw.status === "running") doLap();
  } else if (event.code === "KeyR") {
    doReset();
  }
});

renderAll();
