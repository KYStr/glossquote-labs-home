import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../public/js/app.mjs";

// Minimal DOM shim plus a fake audio engine (manual audio clock,
// recorded clicks). Real WebAudio rendering and onset measurement
// stay NOT_RUN as recorded in VERIFICATION.md.

class FakeElement {
  constructor(id, tagName = "div") {
    this.id = id;
    this.tagName = tagName;
    this.value = "";
    this.checked = false;
    this.disabled = false;
    this.hidden = false;
    this.className = "";
    this.ownText = "";
    this.children = [];
    this.listeners = new Map();
  }
  get textContent() {
    return this.ownText + this.children.map((child) => child.textContent).join("");
  }
  set textContent(value) {
    this.ownText = String(value);
    if (value === "") this.children = [];
  }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }
  dispatch(type) {
    const event = { type, target: this, preventDefault() {} };
    for (const fn of this.listeners.get(type) ?? []) fn(event);
    return event;
  }
  click() {
    this.dispatch("click");
  }
  appendChild(child) {
    this.children.push(child);
    return child;
  }
}

const IDS = [
  "bpm-range", "bpm-number", "bpm-minus", "bpm-plus", "tap-button",
  "signature", "subdivision", "accent", "volume", "volume-value",
  "start-stop", "position-line", "beat-dot", "hidden-note", "announce",
];

function makeApp() {
  const elements = new Map(IDS.map((id) => [id, new FakeElement(id)]));
  elements.get("accent").checked = true;
  elements.get("signature").value = "4/4";
  elements.get("subdivision").value = "1";
  elements.get("volume").value = "80";
  elements.get("hidden-note").hidden = true;
  const doc = {
    documentElement: { lang: "en" },
    hidden: false,
    querySelector(selector) {
      return elements.get(selector.slice(1)) ?? null;
    },
    createElement(tag) {
      return new FakeElement("", tag);
    },
    addEventListener() {},
  };
  const engine = {
    t: 0,
    clicks: [],
    silences: 0,
    now() {
      return this.t;
    },
    async resume() {},
    schedule(event) {
      this.clicks.push(event);
    },
    silence() {
      this.silences += 1;
    },
  };
  let intervalFn = null;
  let nowMsValue = 0;
  const app = createApp(doc, {
    engine,
    setInterval(fn) {
      intervalFn = fn;
      return 1;
    },
    clearInterval() {
      intervalFn = null;
    },
    nowMs: () => nowMsValue,
  });
  return {
    elements,
    app,
    engine,
    tick() {
      if (intervalFn) intervalFn();
    },
    setNowMs(value) {
      nowMsValue = value;
    },
    async pressStartStop() {
      elements.get("start-stop").click();
      await new Promise((resolve) => setImmediate(resolve));
    },
  };
}

test("defaults: 100 BPM, 4/4, accent on, volume 80 percent", () => {
  const { app, elements } = makeApp();
  assert.equal(app.scheduler.bpm, 100);
  assert.equal(app.scheduler.beatsPerBar, 4);
  assert.equal(app.scheduler.accentOn, true);
  assert.equal(app.scheduler.volume, 0.8);
  assert.equal(elements.get("bpm-number").value, "100");
});

test("start schedules clicks on the audio grid; stop silences at once", async () => {
  const { app, engine, elements, tick, pressStartStop } = makeApp();
  await pressStartStop();
  assert.equal(app.scheduler.playing, true);
  assert.equal(elements.get("start-stop").textContent, "Stop");
  engine.t = 0.6;
  tick();
  assert.ok(engine.clicks.length >= 2);
  assert.equal(engine.clicks[0].time, 0.06);
  assert.equal(engine.clicks[0].kind, "accent");
  // Default 100 BPM: beat spacing 0.6 s.
  assert.ok(Math.abs(engine.clicks[1].time - 0.66) < 1e-9);
  await pressStartStop();
  assert.equal(app.scheduler.playing, false);
  assert.equal(engine.silences, 1);
  const count = engine.clicks.length;
  engine.t = 5;
  tick();
  assert.equal(engine.clicks.length, count);
});

test("BPM controls clamp and stay in sync", () => {
  const { app, elements } = makeApp();
  elements.get("bpm-plus").click();
  assert.equal(app.scheduler.bpm, 101);
  assert.equal(elements.get("bpm-range").value, "101");
  const number = elements.get("bpm-number");
  number.value = "999";
  number.dispatch("change");
  assert.equal(app.scheduler.bpm, 240);
  assert.equal(number.value, "240");
  number.value = "5";
  number.dispatch("change");
  assert.equal(app.scheduler.bpm, 30);
});

test("tap tempo applies the computed BPM", () => {
  const { app, elements, setNowMs } = makeApp();
  const tap = elements.get("tap-button");
  setNowMs(0);
  tap.click();
  setNowMs(500);
  tap.click();
  setNowMs(1000);
  tap.click();
  setNowMs(1500);
  tap.click();
  assert.equal(app.scheduler.bpm, 120);
  assert.equal(elements.get("bpm-number").value, "120");
});

test("signature and subdivision changes reach the scheduler", () => {
  const { app, elements } = makeApp();
  const signature = elements.get("signature");
  signature.value = "6/8";
  signature.dispatch("change");
  assert.equal(app.scheduler.beatsPerBar, 6);
  assert.equal(app.scheduler.beatUnit, 8);
  const subdivision = elements.get("subdivision");
  subdivision.value = "3";
  subdivision.dispatch("change");
  assert.equal(app.scheduler.subdivisions, 3);
});
