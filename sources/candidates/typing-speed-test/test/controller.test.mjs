import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../public/js/app.mjs";
import { PASSAGES } from "../public/js/passages.mjs";

// Minimal DOM shim: the controller is exercised through the same
// events a browser would fire. Real-browser and real-IME evidence
// stays NOT_RUN as recorded in VERIFICATION.md.

class FakeElement {
  constructor(id, tagName = "div") {
    this.id = id;
    this.tagName = tagName;
    this.value = "";
    this.checked = false;
    this.disabled = false;
    this.hidden = false;
    this.style = {};
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
    const event = { type, target: this, prevented: false, preventDefault() { this.prevented = true; } };
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
  "duration-30", "duration-60", "plang-en", "plang-zh", "passage-view",
  "passage-name", "typing-input", "time-left", "progress-bar",
  "new-passage", "paste-note", "results", "no-result",
  "metric-gross-label", "metric-gross", "metric-net-label", "metric-net",
  "metric-accuracy", "metric-elapsed", "review-view", "mistakes-heading",
  "mistake-list", "retry-same", "retry-new", "announce",
];

function makeApp() {
  const elements = new Map(IDS.map((id) => [id, new FakeElement(id)]));
  elements.get("duration-30").checked = true;
  elements.get("plang-en").checked = true;
  elements.get("results").hidden = true;
  const doc = {
    documentElement: { lang: "en" },
    querySelector(selector) {
      return elements.get(selector.slice(1)) ?? null;
    },
    createElement(tag) {
      return new FakeElement("", tag);
    },
  };
  let now = 0;
  let intervalFn = null;
  const app = createApp(doc, {
    nowMs: () => now,
    setInterval(fn) {
      intervalFn = fn;
      return 1;
    },
    clearInterval() {
      intervalFn = null;
    },
    confirm: () => true,
    random: () => 0,
  });
  return {
    elements,
    app,
    setNow(value) {
      now = value;
    },
    tick() {
      if (intervalFn) intervalFn();
    },
    type(text) {
      const input = elements.get("typing-input");
      input.value = text;
      input.dispatch("input");
    },
  };
}

test("initial render shows the first passage with results hidden", () => {
  const { elements } = makeApp();
  assert.equal(elements.get("passage-view").children.length, [...PASSAGES.en[0].text].length);
  assert.equal(elements.get("results").hidden, true);
});

test("completion through real input events scores the full passage", () => {
  const { elements, setNow, type } = makeApp();
  setNow(1000);
  type("E");
  setNow(21000);
  type(PASSAGES.en[0].text);
  assert.equal(elements.get("results").hidden, false);
  assert.equal(elements.get("metric-elapsed").textContent, "20.0");
  assert.equal(elements.get("metric-accuracy").textContent, "100.0%");
  // 645 chars, all correct, 20.0 s: (645/5) / (20/60) = 387.
  assert.equal(elements.get("metric-net").textContent, "387");
  assert.equal(elements.get("metric-net-label").textContent, "Net WPM");
});

test("expiry locks the input and scores with the full duration", () => {
  const { elements, setNow, tick, type } = makeApp();
  setNow(0);
  type("Ear");
  assert.equal(elements.get("duration-30").disabled, true);
  setNow(30000);
  tick();
  assert.equal(elements.get("results").hidden, false);
  assert.equal(elements.get("typing-input").disabled, true);
  // T=3, C=3, E=30: (3/5) / 0.5 = 1.2 -> 1.
  assert.equal(elements.get("metric-net").textContent, "1");
  assert.equal(elements.get("metric-elapsed").textContent, "30.0");
});

test("paste is refused and explained once", () => {
  const { elements } = makeApp();
  const input = elements.get("typing-input");
  const event = input.dispatch("paste");
  assert.equal(event.prevented, true);
  assert.match(elements.get("paste-note").textContent, /Paste refused/);
});

test("IME composition is not scored until it commits", () => {
  const { elements, app, type } = makeApp();
  const input = elements.get("typing-input");
  input.dispatch("compositionstart");
  input.value = "ㄉㄚˇ";
  input.dispatch("input");
  assert.equal(app.getSession().typed, "");
  assert.equal(app.getSession().state, "setup");
  input.dispatch("compositionend");
  assert.equal(app.getSession().typed, "ㄉㄚˇ");
  assert.equal(app.getSession().state, "running");
  assert.ok(type);
  assert.ok(elements);
});

test("Chinese passage results use CPM labels and never the English unit", () => {
  const { elements, setNow, tick, type } = makeApp();
  elements.get("plang-en").checked = false;
  elements.get("plang-zh").checked = true;
  elements.get("plang-zh").dispatch("change");
  const zhText = PASSAGES.zh[0].text;
  setNow(0);
  type(zhText.slice(0, 10));
  setNow(30000);
  tick();
  assert.equal(elements.get("results").hidden, false);
  assert.match(elements.get("metric-net-label").textContent, /CPM/);
  assert.ok(!elements.get("results").textContent.includes("WPM"));
  // T=10, C=10, E=30 -> net CPM = 10 / 0.5 = 20.
  assert.equal(elements.get("metric-net").textContent, "20");
});

test("retry with the same passage resets to a fresh setup", () => {
  const { elements, app, type } = makeApp();
  type(PASSAGES.en[0].text);
  assert.equal(elements.get("results").hidden, false);
  elements.get("retry-same").click();
  assert.equal(elements.get("results").hidden, true);
  assert.equal(app.getSession().state, "setup");
  assert.equal(elements.get("typing-input").value, "");
});
