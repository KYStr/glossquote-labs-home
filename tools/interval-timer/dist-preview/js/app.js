// Interval Timer page controller (DOM layer).
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// page state (empty / dirty / busy / success / error / cancelled); the
// timer session is a pure core session driven here by active elapsed
// milliseconds: the page clock only supplies timestamps, paused time
// never enters the core. All DOM writes use textContent / value; pasted
// input is never injected as HTML.

import {
  DEFAULTS,
  FIELDS,
  KIND_LABELS,
  REPORT_FILENAME,
  STATUS_TEXT,
  applyEvent,
  formatDuration,
  serializeReport,
  snapshot as sessionSnapshot,
  startSession,
} from "./core/interval-timer.mjs";
import { createController } from "./controller.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const lang = document.documentElement.lang === "en" ? "en" : "zh";
const t = (zhText, enText) => (lang === "en" ? enText : zhText);

const ERROR_MESSAGES = {
  SCHEMA: ["輸入格式不正確。", "The input is malformed."],
  INPUT_LIMIT: ["輸入太長。", "Input is too long."],
  UNICODE: ["輸入含有不完整的字元。", "Input contains an incomplete character."],
  EMPTY: ["必填。", "This field is required."],
  INTEGER_FORMAT: ["輸入格式不正確。", "The input is malformed."],
  ENUM: ["請選擇有效的選項。", "Choose a valid option."],
  RANGE: ["超出允許範圍。", "Out of range."],
  OUTPUT_LIMIT: ["報告太大，無法下載。", "The report is too large to download."],
  WORKER_ERROR: ["計算失敗，請重試。", "Something went wrong. Try again."],
  INTERNAL: ["計算失敗，請重試。", "Something went wrong. Try again."],
};

const PHASE_LABELS = {
  ready: ["就緒", "Ready"],
  running: ["進行中", "Running"],
  paused: ["已暫停", "Paused"],
  finished: ["已完成", "Finished"],
};

const $ = (id) => document.getElementById(id);
const form = $("interval-timer-form");
const statusEl = $("status");
const exampleNoteEl = $("example-note");
const resultsEl = $("results");
const timerPanelEl = $("timer-panel");

function createWorker() {
  const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  return new Worker(url, { type: "module" });
}

function readDraft() {
  const draft = {};
  for (const field of FIELDS) draft[field] = $(`field-${field}`).value;
  return draft;
}

function writeDraft(draft) {
  for (const field of FIELDS) $(`field-${field}`).value = draft[field];
}

function errorMessage(error) {
  if (!error) return "";
  const pair = ERROR_MESSAGES[error.code] ?? ERROR_MESSAGES.INTERNAL;
  return lang === "en" ? pair[1] : pair[0];
}

function segmentName(kind, round) {
  const label = KIND_LABELS[kind][lang];
  if (kind === "prepare" || round === null || round === undefined) return label;
  return lang === "en" ? `${label} · Round ${round}` : `${label} · 第 ${round} 回合`;
}

// ---- Timer session (pure core session + page clock) ----
let session = null;
let timerHandle = null;
let runStamp = 0;
let bankedMs = 0;

function stopLoop() {
  if (timerHandle !== null) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
}

function discardSession() {
  stopLoop();
  session = null;
  bankedMs = 0;
  timerPanelEl.hidden = true;
}

function activeElapsedMs() {
  if (timerHandle === null) return bankedMs;
  return Math.floor(bankedMs + (performance.now() - runStamp));
}

// Short cue tones, created lazily on a user gesture. A blocked audio
// context never breaks the timer: the visual cue still shows.
let audioContext = null;
function beep(kind) {
  try {
    audioContext ??= new (window.AudioContext ?? window.webkitAudioContext)();
    if (audioContext.state === "suspended") void audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = kind === "programEnd" ? 660 : 880;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + (kind === "programEnd" ? 0.4 : 0.12));
  } catch {
    // No audio: the on-screen cue is the announcement.
  }
}

function handleCues(cues) {
  for (const cue of cues) {
    if (cue.type === "segmentStart") {
      $("timer-cue").textContent = segmentName(cue.kind, cue.round);
      beep("segmentStart");
    } else if (cue.type === "programEnd") {
      $("timer-cue").textContent = t("節目結束。", "Program finished.");
      beep("programEnd");
    }
  }
}

function renderTimer() {
  if (session === null) return;
  const snap = sessionSnapshot(session);
  const phasePair = PHASE_LABELS[snap.phase];
  $("timer-phase").textContent = lang === "en" ? phasePair[1] : phasePair[0];
  if (snap.phase === "ready") {
    $("timer-segment").textContent = t("尚未開始", "Not started");
    $("timer-remaining").textContent = String(session.result.totalSeconds);
    $("timer-total-remaining").textContent = t(
      `總剩餘 ${formatDuration(session.result.totalSeconds)}`,
      `Total remaining ${formatDuration(session.result.totalSeconds)}`,
    );
  } else if (snap.phase === "finished") {
    $("timer-segment").textContent = t("已完成", "Finished");
    $("timer-remaining").textContent = "0";
    $("timer-total-remaining").textContent = t("總剩餘 0:00", "Total remaining 0:00");
  } else {
    $("timer-segment").textContent = segmentName(snap.kind, snap.round);
    $("timer-remaining").textContent = String(snap.segmentRemainingSeconds);
    $("timer-total-remaining").textContent = t(
      `總剩餘 ${formatDuration(snap.totalRemainingSeconds)}`,
      `Total remaining ${formatDuration(snap.totalRemainingSeconds)}`,
    );
  }
  $("timer-start-btn").disabled = snap.phase !== "ready";
  $("timer-pause-btn").disabled = snap.phase !== "running";
  $("timer-resume-btn").disabled = snap.phase !== "paused";
  $("timer-skip-btn").disabled = snap.phase !== "running" && snap.phase !== "paused";
  const items = $("segment-list").children;
  for (let i = 0; i < items.length; i += 1) {
    if (snap.segmentIndex === i) items[i].setAttribute("aria-current", "true");
    else items[i].removeAttribute("aria-current");
  }
}

function tickTimer() {
  if (session === null) return;
  const outcome = applyEvent(session, { type: "tick", elapsedMs: activeElapsedMs() });
  session = outcome.session;
  handleCues(outcome.cues);
  if (sessionSnapshot(session).phase === "finished") stopLoop();
  renderTimer();
}

function startTimer() {
  if (session === null) return;
  const outcome = applyEvent(session, { type: "start" });
  session = outcome.session;
  handleCues(outcome.cues);
  bankedMs = 0;
  runStamp = performance.now();
  stopLoop();
  timerHandle = setInterval(tickTimer, 100);
  renderTimer();
}

function pauseTimer() {
  if (session === null) return;
  const outcome = applyEvent(session, { type: "pause", elapsedMs: activeElapsedMs() });
  session = outcome.session;
  bankedMs = session.activeElapsedMs;
  handleCues(outcome.cues);
  stopLoop();
  renderTimer();
}

function resumeTimer() {
  if (session === null) return;
  const outcome = applyEvent(session, { type: "resume" });
  session = outcome.session;
  handleCues(outcome.cues);
  runStamp = performance.now();
  stopLoop();
  timerHandle = setInterval(tickTimer, 100);
  renderTimer();
}

function skipTimer() {
  if (session === null) return;
  const wasRunning = sessionSnapshot(session).phase === "running";
  const outcome = applyEvent(session, { type: "skip" });
  session = outcome.session;
  bankedMs = session.activeElapsedMs;
  handleCues(outcome.cues);
  if (sessionSnapshot(session).phase === "finished") stopLoop();
  else if (wasRunning) runStamp = performance.now();
  renderTimer();
}

function resetTimer() {
  if (session === null) return;
  const outcome = applyEvent(session, { type: "reset" });
  session = outcome.session;
  bankedMs = 0;
  stopLoop();
  $("timer-cue").textContent = "";
  renderTimer();
}

// ---- Results rendering (textContent only) ----
function renderResults(result) {
  $("summary-total").textContent = formatDuration(result.totalSeconds);
  $("summary-count").textContent = String(result.segmentCount);
  $("summary-rounds").textContent = String(result.program.rounds);
  const list = $("segment-list");
  while (list.firstChild) list.removeChild(list.firstChild);
  for (const seg of result.segments) {
    const item = document.createElement("li");
    const name = document.createElement("span");
    name.textContent =
      lang === "en"
        ? `Segment ${seg.index + 1} · ${segmentName(seg.kind, seg.round)}`
        : `第 ${seg.index + 1} 段 · ${segmentName(seg.kind, seg.round)}`;
    const range = document.createElement("span");
    range.textContent = `${formatDuration(seg.startSeconds)}–${formatDuration(seg.endSeconds)} (${seg.durationSeconds}${lang === "en" ? " s" : " 秒"})`;
    item.append(name, range);
    list.append(item);
  }
  resultsEl.hidden = false;
}

// ---- Controller wiring ----
const controller = createController({ createWorker, onChange: render });

function render(state) {
  statusEl.textContent = STATUS_TEXT[state.state][lang];
  statusEl.setAttribute("aria-busy", state.state === "busy" ? "true" : "false");
  for (const field of FIELDS) {
    const errorEl = $(`error-${field}`);
    const inputEl = $(`field-${field}`);
    if (state.state === "error" && state.error && state.error.field === field) {
      errorEl.textContent = errorMessage(state.error);
      inputEl.setAttribute("aria-invalid", "true");
      inputEl.setAttribute("aria-errormessage", `error-${field}`);
    } else {
      errorEl.textContent = "";
      inputEl.removeAttribute("aria-invalid");
      inputEl.removeAttribute("aria-errormessage");
    }
  }
  $("cancel-btn").hidden = state.state !== "busy";
  $("run-btn").disabled = state.state === "busy";
  $("download-btn").hidden = !state.reportAvailable;
  if (state.state === "success" && state.result) {
    renderResults(state.result);
    try {
      session = startSession(state.result);
    } catch {
      session = null;
    }
    if (session !== null) {
      $("timer-cue").textContent = "";
      timerPanelEl.hidden = false;
      renderTimer();
    } else {
      timerPanelEl.hidden = true;
    }
  } else {
    resultsEl.hidden = true;
    discardSession();
  }
  if (state.state === "error" && state.error && state.error.code === "WORKER_ERROR") {
    statusEl.textContent = errorMessage(state.error);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  exampleNoteEl.hidden = true;
  const state = controller.run();
  if (state.state === "error" && state.error && state.error.field) {
    $(`field-${state.error.field}`).focus();
  }
});

for (const field of FIELDS) {
  const inputEl = $(`field-${field}`);
  const onEdit = () => {
    exampleNoteEl.hidden = true;
    controller.edit(readDraft());
  };
  inputEl.addEventListener("input", onEdit);
  inputEl.addEventListener("change", onEdit);
}

$("example-btn").addEventListener("click", () => {
  controller.loadExample();
  const state = controller.getPublicState();
  writeDraft(state.draft);
  exampleNoteEl.textContent = t(
    "已載入範例（Tabata：準備 10 秒、運動 20 秒、休息 10 秒、8 回合），請按「建立節目表」執行。",
    "Example loaded (Tabata: prepare 10 s, work 20 s, rest 10 s, 8 rounds). Run “Build program” to build it.",
  );
  exampleNoteEl.hidden = false;
  $("field-prepareSeconds").focus();
});

$("reset-btn").addEventListener("click", () => {
  exampleNoteEl.hidden = true;
  controller.reset();
  writeDraft({ ...DEFAULTS });
  $("field-prepareSeconds").focus();
});

$("cancel-btn").addEventListener("click", () => {
  controller.cancel();
});

$("download-btn").addEventListener("click", () => {
  const state = controller.getPublicState();
  if (!state.result) return;
  const serialized = serializeReport(state.result);
  if (!serialized.ok) {
    statusEl.textContent = errorMessage(serialized.error);
    return;
  }
  const blob = new Blob([serialized.text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = REPORT_FILENAME;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
});

$("timer-start-btn").addEventListener("click", startTimer);
$("timer-pause-btn").addEventListener("click", pauseTimer);
$("timer-resume-btn").addEventListener("click", resumeTimer);
$("timer-skip-btn").addEventListener("click", skipTimer);
$("timer-reset-btn").addEventListener("click", resetTimer);

render(controller.getPublicState());
