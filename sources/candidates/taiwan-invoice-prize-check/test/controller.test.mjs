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
    this.disabled = false;
    this.href = "";
    this.download = "";
    this.type = "";
    this.clicked = false;
    this.removed = false;
    this.focused = false;
    this.attrs = {};
    this.dataset = {};
    this.children = [];
    this.listeners = new Map();
    this._text = "";
  }
  set textContent(value) {
    this._text = String(value);
    this.children = [];
  }
  get textContent() {
    return this.children.length > 0
      ? this.children.map((child) => child.textContent).join("")
      : this._text;
  }
  append(...nodes) {
    this.children.push(...nodes);
  }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }
  dispatch(type, extra = {}) {
    for (const fn of this.listeners.get(type) ?? []) fn({ type, target: this, ...extra });
  }
  click() {
    this.clicked = true;
    this.dispatch("click");
  }
  remove() {
    this.removed = true;
  }
  focus() {
    this.focused = true;
  }
  setAttribute(name, value) {
    this.attrs[name] = value;
  }
  getAttribute(name) {
    return this.attrs[name] ?? null;
  }
}

const IDS = [
  "special", "grand",
  "first-1", "first-2", "first-3", "first-4", "first-5",
  "add-1", "add-2", "add-3", "add-4",
  "err-special", "err-grand", "err-first", "err-add",
  "setup-summary", "setup-reset",
  "full-input", "full-check", "full-error", "results-body",
  "results-summary", "copy-summary", "copy-status", "clear-results",
  "quick-input", "quick-check", "quick-error", "quick-result",
  "batch-input", "batch-run", "batch-error", "batch-summary",
  "batch-body", "copy-batch-summary", "batch-copy-status",
];

function makeDoc(lang = "zh-Hant") {
  const elements = new Map(IDS.map((id) => [id, new FakeElement(id)]));
  const doc = {
    documentElement: { lang },
    body: { appended: [], append(node) { this.appended.push(node); } },
    anchors: [],
    querySelector(selector) {
      return elements.get(selector.slice(1)) ?? null;
    },
    createElement(tag) {
      return new FakeElement(tag);
    },
  };
  const el = (id) => elements.get(id);
  el("setup-reset").textContent = lang === "en" ? "Reset winning numbers" : "重設開獎號碼";
  return { doc, el };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fillSetup(el) {
  el("special").value = "12345678";
  el("grand").value = "87654321";
  el("first-1").value = "11112222";
  el("first-2").value = "33334444";
  el("add-1").value = "007";
  el("special").dispatch("change");
}

test("boot: checking stays disabled until the setup is minimally valid", () => {
  const { doc, el } = makeDoc();
  createApp(doc, {});
  assert.equal(el("full-check").disabled, true);
  assert.equal(el("quick-check").disabled, true);
  assert.equal(el("batch-run").disabled, true);
  assert.ok(el("setup-summary").textContent.includes("尚未完成開獎號碼設定"));
});

test("a valid setup enables checking and restates the entered counts", () => {
  const { doc, el } = makeDoc();
  const app = createApp(doc, {});
  fillSetup(el);
  assert.equal(el("full-check").disabled, false);
  assert.ok(el("setup-summary").textContent.includes("頭獎 2 組"));
  assert.ok(el("setup-summary").textContent.includes("增開六獎 1 組"));
  assert.equal(app.getSetup().first.length, 2);
});

test("a duplicate setup value is a field error and keeps checking disabled", () => {
  const { doc, el } = makeDoc();
  createApp(doc, {});
  fillSetup(el);
  el("first-2").value = "12345678"; // duplicates the special prize
  el("first-2").dispatch("change");
  assert.equal(el("full-check").disabled, true);
  assert.equal(el("err-first").hidden, false);
  assert.ok(el("err-first").textContent.includes("重複"));
});

test("full check appends verdict rows, clears and refocuses the input, counts duplicates", async () => {
  const { doc, el } = makeDoc();
  createApp(doc, {});
  fillSetup(el);
  el("full-input").value = "12345678";
  el("full-check").click();
  assert.equal(el("results-body").children.length, 1);
  assert.deepEqual(
    el("results-body").children[0].children.map((td) => td.textContent),
    ["12345678", "特別獎", "10,000,000", "與特別獎完全相同"],
  );
  assert.equal(el("full-input").value, "");
  assert.equal(el("full-input").focused, true);
  // Full-width paste of the same number is a second, duplicate row.
  el("full-input").value = "１２３４５６７８";
  el("full-input").dispatch("keydown", { key: "Enter" });
  assert.equal(el("results-body").children.length, 2);
  assert.ok(el("results-summary").textContent.includes("特別獎 2"));
  assert.ok(el("results-summary").textContent.includes("總獎金 20,000,000 元"));
  // A suffix verdict names the rule.
  el("full-input").value = "01112222";
  el("full-check").click();
  assert.deepEqual(
    el("results-body").children[2].children.map((td) => td.textContent),
    ["01112222", "二獎", "40,000", "末7碼與頭獎第1組相同"],
  );
});

test("quick screen is honest: possible with channels, cannot-win, never an amount", () => {
  const { doc, el } = makeDoc();
  createApp(doc, {});
  fillSetup(el);
  el("quick-input").value = "678";
  el("quick-check").click();
  const text = el("quick-result").textContent;
  assert.ok(text.includes("可能中獎，請輸入完整號碼確認"));
  assert.ok(text.includes("特別獎通道"));
  assert.ok(!text.includes("10,000,000"), "quick mode must not print amounts");
  el("quick-input").value = "999";
  el("quick-check").click();
  assert.ok(el("quick-result").textContent.includes("末3碼未中，可直接排除"));
});

test("batch renders per-line rows including invalid reasons and the summary", () => {
  const { doc, el } = makeDoc();
  createApp(doc, {});
  fillSetup(el);
  el("batch-input").value = "12345678\nabc\n00112222";
  el("batch-run").click();
  assert.equal(el("batch-body").children.length, 3);
  assert.deepEqual(
    el("batch-body").children[1].children.map((td) => td.textContent),
    ["2", "abc", "格式錯誤", "—", "含非數字字元"],
  );
  assert.ok(el("batch-summary").textContent.includes("格式錯誤 1"));
  assert.ok(el("batch-summary").textContent.includes("總獎金 10,010,000 元"));
});

test("batch over 500 lines is a stated limit error, not a truncation", () => {
  const { doc, el } = makeDoc();
  createApp(doc, {});
  fillSetup(el);
  el("batch-input").value = Array.from({ length: 501 }, () => "12345679").join("\n");
  el("batch-run").click();
  assert.equal(el("batch-error").hidden, false);
  assert.ok(el("batch-error").textContent.includes("最多 500 行"));
  assert.equal(el("batch-body").children.length, 0);
});

test("copy summary uses the clipboard only on the button gesture", async () => {
  const { doc, el } = makeDoc();
  const clipboard = { written: [], async writeText(text) { this.written.push(text); } };
  createApp(doc, { clipboard });
  fillSetup(el);
  el("full-input").value = "55555007";
  el("full-check").click();
  el("copy-summary").click();
  await sleep(10);
  assert.equal(clipboard.written.length, 1);
  assert.ok(clipboard.written[0].includes("六獎 1"));
  assert.equal(el("copy-status").textContent, "已複製摘要。");
});

test("clear results empties rows only; setup reset needs two clicks and disables checking", async () => {
  const { doc, el } = makeDoc();
  createApp(doc, {});
  fillSetup(el);
  el("full-input").value = "12345678";
  el("full-check").click();
  el("clear-results").click();
  assert.equal(el("results-body").children.length, 0);
  assert.equal(el("full-check").disabled, false); // setup untouched
  el("setup-reset").click();
  assert.equal(el("special").value, "12345678"); // first click only arms
  assert.ok(el("setup-reset").textContent.includes("確定要重設"));
  el("setup-reset").click();
  await sleep(10);
  assert.equal(el("special").value, "");
  assert.equal(el("full-check").disabled, true);
});

test("english boot shows the english setup guidance", () => {
  const { doc, el } = makeDoc("en");
  createApp(doc, {});
  assert.ok(el("setup-summary").textContent.includes("Setup incomplete"));
});
