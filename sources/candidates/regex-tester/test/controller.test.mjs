import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../public/js/app.mjs";

// Minimal DOM shim: the controller is exercised through the same events
// a browser would fire. Real-browser rendering evidence stays NOT_RUN
// as recorded in VERIFICATION.md.

class FakeElement {
  constructor(id) {
    this.id = id;
    this.value = "";
    this.checked = false;
    this.hidden = false;
    this.ownText = "";
    this.children = [];
    this.attrs = {};
    this.listeners = new Map();
    this.scrolls = 0;
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
    for (const fn of this.listeners.get(type) ?? []) fn({ type, target: this });
  }
  click() {
    this.dispatch("click");
  }
  appendChild(child) {
    this.children.push(child);
    return child;
  }
  setAttribute(name, value) {
    this.attrs[name] = value;
  }
  getAttribute(name) {
    return this.attrs[name] ?? null;
  }
  scrollIntoView() {
    this.scrolls += 1;
  }
}

const IDS = [
  "pattern", "pattern-error",
  "flag-g", "flag-i", "flag-m", "flag-s", "flag-u", "flag-y",
  "preset-email", "preset-date", "preset-order", "preset-log",
  "sample-text", "highlight-view", "match-list", "result-footer",
  "replace-toggle", "replace-panel", "replacement", "replace-result",
  "replace-count", "copy-result", "clear-button", "status-note", "announce",
];

function makeDoc(lang = "zh-Hant") {
  const elements = new Map(IDS.map((id) => [id, new FakeElement(id)]));
  const doc = {
    documentElement: { lang },
    querySelector(selector) {
      return elements.get(selector.slice(1)) ?? null;
    },
    createElement() {
      return new FakeElement("");
    },
    createTextNode(text) {
      return { textContent: String(text) };
    },
  };
  elements.get("flag-g").checked = true;
  elements.get("replace-panel").hidden = true;
  return { doc, el: (id) => elements.get(id) };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function caretsOf(container) {
  return container.children.filter(
    (child) => typeof child.getAttribute === "function" && child.getAttribute("data-position") !== null,
  );
}

async function makeApp(lang) {
  const { doc, el } = makeDoc(lang);
  const clipboard = {
    writes: [],
    async writeText(text) {
      this.writes.push(text);
    },
  };
  createApp(doc, { debounceMs: 0, clipboard });
  return { el, clipboard };
}

function setAndFire(el, id, value) {
  el(id).value = value;
  el(id).dispatch("input");
}

test("initial state: empty pattern over empty text is one zero-width match", async () => {
  const { el } = await makeApp();
  const carets = caretsOf(el("highlight-view"));
  assert.equal(carets.length, 1);
  assert.equal(carets[0].getAttribute("data-position"), "0");
  assert.equal(el("match-list").children.length, 1);
  assert.match(el("result-footer").textContent, /1/);
});

test("date fixture through the UI: list shows matches and group values", async () => {
  const { el } = await makeApp();
  setAndFire(el, "pattern", String.raw`(\d{4})-(\d{2})-(\d{2})`);
  setAndFire(el, "sample-text", "due 2026-11-02, was 2025-01-30");
  await sleep(10);
  assert.equal(el("match-list").children.length, 2);
  const firstText = el("match-list").children[0].textContent;
  assert.match(firstText, /2026/);
  assert.match(firstText, /11/);
  assert.match(firstText, /02/);
  assert.match(el("result-footer").textContent, /共 2 筆/);
  // Selecting a match in the list scrolls its mark into view.
  const head = el("match-list").children[0].children[0];
  head.click();
  const marks = el("highlight-view").children.filter((c) => c.getAttribute?.("class") === "selected");
  assert.equal(marks.length, 1);
  assert.equal(marks[0].scrolls, 1);
});

test("error state is distinct from no-matches and shows the engine message", async () => {
  const { el } = await makeApp();
  setAndFire(el, "pattern", "a{2,1}");
  setAndFire(el, "sample-text", "aaa");
  await sleep(10);
  assert.match(el("pattern-error").textContent, /樣式錯誤/);
  assert.match(el("pattern-error").textContent, /Invalid regular expression/);
  assert.equal(el("result-footer").textContent, "");
  assert.equal(el("match-list").children.length, 0);
  assert.equal(el("highlight-view").textContent, "aaa");
  // Now a valid pattern with no matches: explicit no-matches wording.
  setAndFire(el, "pattern", "z");
  await sleep(10);
  assert.equal(el("pattern-error").textContent, "");
  assert.equal(el("result-footer").textContent, "沒有符合的結果。");
});

test("zero-width matches render as caret markers with positions", async () => {
  const { el } = await makeApp();
  setAndFire(el, "pattern", "(?=b)");
  setAndFire(el, "sample-text", "ab b");
  await sleep(10);
  const carets = caretsOf(el("highlight-view"));
  assert.deepEqual(carets.map((c) => c.getAttribute("data-position")), ["1", "3"]);
});

test("markup in the text renders inert: highlight children are text and marks only", async () => {
  const { el } = await makeApp();
  setAndFire(el, "pattern", "script");
  setAndFire(el, "sample-text", "<script>alert(1)</script>");
  await sleep(10);
  assert.equal(el("highlight-view").textContent, "<script>alert(1)</script>");
  const marks = el("highlight-view").children.filter((c) => c instanceof FakeElement);
  assert.equal(marks.length, 2);
  assert.equal(marks[0].textContent, "script");
  assert.equal(marks[1].textContent, "script");
});

test("preset click fills pattern and text but not flags", async () => {
  const { el } = await makeApp();
  el("flag-i").checked = true;
  el("preset-date").click();
  assert.equal(el("pattern").value, String.raw`(\d{4})-(\d{2})-(\d{2})`);
  assert.equal(el("sample-text").value, "due 2026-11-02, was 2025-01-30");
  assert.equal(el("flag-i").checked, true);
  assert.equal(el("match-list").children.length, 2);
});

test("replace mode: preview, count, unknown group error, copy", async () => {
  const { el, clipboard } = await makeApp();
  el("replace-toggle").click();
  assert.equal(el("replace-panel").hidden, false);
  assert.equal(el("replace-toggle").getAttribute("aria-expanded"), "true");
  setAndFire(el, "pattern", String.raw`(\w+)@example\.com`);
  setAndFire(el, "sample-text", "write to sam@example.com");
  setAndFire(el, "replacement", "$1 [at] example.com");
  await sleep(10);
  assert.equal(el("replace-result").textContent, "write to sam [at] example.com");
  assert.match(el("replace-count").textContent, /已取代 1 處/);
  el("copy-result").click();
  await sleep(5);
  assert.deepEqual(clipboard.writes, ["write to sam [at] example.com"]);
  setAndFire(el, "replacement", "$<nope>");
  await sleep(10);
  assert.equal(el("replace-result").textContent, "");
  assert.match(el("replace-count").textContent, /nope/);
});

test("clear resets inputs and flags to the initial state", async () => {
  const { el } = await makeApp();
  setAndFire(el, "pattern", "abc");
  el("flag-i").checked = true;
  el("flag-i").dispatch("change");
  await sleep(10);
  el("clear-button").click();
  assert.equal(el("pattern").value, "");
  assert.equal(el("sample-text").value, "");
  assert.equal(el("flag-g").checked, true);
  assert.equal(el("flag-i").checked, false);
  assert.equal(el("status-note").textContent, "已清除全部輸入。");
});

test("cap notice appears as text in the footer for a capped run", async () => {
  const { el } = await makeApp();
  setAndFire(el, "pattern", String.raw`\d`);
  setAndFire(el, "sample-text", "1".repeat(1200));
  await sleep(20);
  assert.match(el("result-footer").textContent, /已在 1,000 筆符合停止/);
  assert.equal(el("match-list").children.length, 1000);
});
