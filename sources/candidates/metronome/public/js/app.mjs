// Controller for the WebAudio Metronome with Tap Tempo.
//
// All timing decisions live in the pure core scheduler, driven by
// the audio clock through the adapter; this layer wires native
// controls to it. A 25 ms interval only triggers scheduling ticks,
// and a requestAnimationFrame loop only reads the schedule to draw
// the beat indicator — neither keeps time (SPEC section 4). Settings
// live in memory only; reload restores the defaults.

import { Scheduler, TapTempoTracker, clampBpm } from "./core/metronome.mjs";
import { createAudioEngine } from "./audio.mjs";
import { translate } from "./i18n.mjs";

export function createApp(doc, env = {}) {
  const lang = doc.documentElement?.lang === "en" ? "en" : "zh-Hant";
  const t = (code, params) => translate(lang, code, params);
  const $ = (id) => doc.querySelector(`#${id}`);
  const engine = env.engine ?? createAudioEngine();
  const setIntervalFn = env.setInterval ?? globalThis.setInterval.bind(globalThis);
  const clearIntervalFn = env.clearInterval ?? globalThis.clearInterval.bind(globalThis);
  const rafFn = env.requestAnimationFrame ?? globalThis.requestAnimationFrame?.bind(globalThis);
  const nowMs = env.nowMs ?? (() => performance.now());

  const els = {
    bpmRange: $("bpm-range"),
    bpmNumber: $("bpm-number"),
    bpmMinus: $("bpm-minus"),
    bpmPlus: $("bpm-plus"),
    tap: $("tap-button"),
    signature: $("signature"),
    subdivision: $("subdivision"),
    accent: $("accent"),
    volume: $("volume"),
    volumeValue: $("volume-value"),
    startStop: $("start-stop"),
    position: $("position-line"),
    dot: $("beat-dot"),
    hiddenNote: $("hidden-note"),
    announce: $("announce"),
  };

  const scheduler = new Scheduler({
    now: () => engine.now(),
    emit: (event) => engine.schedule(event),
    silence: () => engine.silence(),
  });
  const taps = new TapTempoTracker();
  let timerId = null;
  let rafId = null;
  let wasHidden = false;
  let lastPositionKey = "";

  function showBpm() {
    els.bpmRange.value = String(scheduler.bpm);
    els.bpmNumber.value = String(scheduler.bpm);
  }

  function applyBpm(value) {
    scheduler.setBpm(clampBpm(value));
    showBpm();
  }

  function drawPosition() {
    const pos = scheduler.positionAt(engine.now());
    if (!pos) return;
    const key = `${pos.bar}:${pos.beat}:${pos.subdivision}`;
    if (key === lastPositionKey) return;
    lastPositionKey = key;
    els.position.textContent = t("POSITION", { bar: pos.bar, beat: pos.beat + 1 });
    els.dot.className = `dot ${pos.kind}`;
    els.dot.textContent = String(pos.beat + 1);
  }

  function rafLoop() {
    drawPosition();
    if (scheduler.playing && rafFn) rafId = rafFn(rafLoop);
  }

  async function toggleStartStop() {
    if (scheduler.playing) {
      scheduler.stop();
      if (timerId !== null) clearIntervalFn(timerId);
      timerId = null;
      els.startStop.textContent = t("START_LABEL");
      els.position.textContent = t("POSITION_STOPPED");
      els.announce.textContent = t("ANNOUNCE_STOPPED");
      return;
    }
    await engine.resume();
    scheduler.start();
    scheduler.tick();
    timerId = setIntervalFn(() => scheduler.tick(), 25);
    els.startStop.textContent = t("STOP_LABEL");
    els.announce.textContent = t("ANNOUNCE_STARTED");
    lastPositionKey = "";
    if (rafFn) rafId = rafFn(rafLoop);
  }

  els.startStop.addEventListener("click", () => {
    void toggleStartStop();
  });
  els.bpmRange.addEventListener("input", () => applyBpm(els.bpmRange.value));
  els.bpmNumber.addEventListener("change", () => applyBpm(els.bpmNumber.value));
  els.bpmMinus.addEventListener("click", () => applyBpm(scheduler.bpm - 1));
  els.bpmPlus.addEventListener("click", () => applyBpm(scheduler.bpm + 1));
  els.tap.addEventListener("click", () => {
    const bpm = taps.tap(nowMs());
    if (bpm !== null) applyBpm(bpm);
  });
  els.signature.addEventListener("change", () => {
    const [beats, unit] = String(els.signature.value).split("/").map(Number);
    scheduler.setSignature(beats, unit);
  });
  els.subdivision.addEventListener("change", () => {
    scheduler.setSubdivisions(Number(els.subdivision.value));
  });
  els.accent.addEventListener("change", () => {
    scheduler.accentOn = !!els.accent.checked;
  });
  els.volume.addEventListener("input", () => {
    const value = Number(els.volume.value);
    scheduler.volume = value / 100;
    els.volumeValue.textContent = `${value}%`;
  });
  doc.addEventListener?.("visibilitychange", () => {
    if (doc.hidden) {
      wasHidden = true;
    } else if (wasHidden) {
      wasHidden = false;
      els.hiddenNote.hidden = false;
    }
  });

  // Defaults (SPEC section 3): 100 BPM, 4/4, subdivision 1, accent
  // on, volume 80%.
  applyBpm(100);
  scheduler.setSignature(4, 4);
  scheduler.setSubdivisions(1);
  scheduler.accentOn = true;
  scheduler.volume = 0.8;
  els.volume.value = "80";
  els.volumeValue.textContent = "80%";
  els.position.textContent = t("POSITION_STOPPED");
  els.startStop.textContent = t("START_LABEL");

  return { scheduler, els, toggleStartStop };
}

const isBrowser = typeof document !== "undefined" && typeof window !== "undefined";
if (isBrowser) {
  createApp(document);
}
