import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../public/js/app.mjs";

// Minimal DOM shim: the controller is exercised through the same events
// a browser would fire. Real-browser rendering evidence stays NOT_RUN
// as recorded in VERIFICATION.md.

class FakeElement {
  constructor(id, tagName = "div") {
    this.id = id;
    this.tagName = tagName;
    this.value = "";
    this.hidden = false;
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
    for (const fn of this.listeners.get(type) ?? []) fn({ type, target: this });
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
  "token-input", "clear-button", "input-error", "results", "status-line",
  "checked-at", "header-summary", "header-json", "copy-header",
  "payload-json", "copy-payload", "claims-body", "signature-text",
  "signature-meta", "copy-note",
];

function makeScheduler() {
  let pending = null;
  return {
    setTimeout(fn) {
      pending = fn;
      return 1;
    },
    clearTimeout() {
      pending = null;
    },
    flush() {
      const fn = pending;
      pending = null;
      if (fn) fn();
    },
  };
}

function makeApp(nowSeconds = 1762002000) {
  const elements = new Map(IDS.map((id) => [id, new FakeElement(id)]));
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
  const scheduler = makeScheduler();
  const clipboard = {
    written: [],
    async writeText(text) {
      this.written.push(text);
    },
  };
  createApp(doc, {
    clipboard,
    setTimeout: scheduler.setTimeout,
    clearTimeout: scheduler.clearTimeout,
    debounceMs: 10,
    nowSeconds: () => nowSeconds,
    formatLocal: (seconds) => `LOCAL(${seconds})`,
  });
  return { elements, scheduler, clipboard };
}

const FIXTURE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMzQiLCJpc3MiOiJodHRwczovL2lzc3Vlci5leGFtcGxlIiwiYXVkIjoiZ2xvc3NxdW90ZS1sYWJzIiwiaWF0IjoxNzYyMDAwMDAwLCJuYmYiOjE3NjIwMDAwMDAsImV4cCI6MTc2MjAwMzYwMCwianRpIjoiZml4dHVyZS0wMDAxIiwic2NvcGUiOiJyZWFkOmRlbW8ifQ.ZHVtbXktc2lnbmF0dXJlLWZvci1maXh0dXJlLW9ubHk";

test("initial state: results hidden, no error", () => {
  const { elements } = makeApp();
  assert.equal(elements.get("results").hidden, true);
  assert.equal(elements.get("input-error").textContent, "");
});

test("fixture decodes through the real controller at a pinned clock", () => {
  const { elements, scheduler } = makeApp();
  const input = elements.get("token-input");
  input.value = FIXTURE;
  input.dispatch("input");
  scheduler.flush();
  assert.equal(elements.get("results").hidden, false);
  assert.match(elements.get("status-line").textContent, /WITHIN STATED WINDOW/);
  assert.equal(
    elements.get("header-json").textContent,
    '{\n  "alg": "HS256",\n  "typ": "JWT"\n}',
  );
  assert.equal(elements.get("claims-body").children.length, 8);
  assert.match(elements.get("signature-meta").textContent, /32 bytes/);
  assert.match(elements.get("checked-at").textContent, /LOCAL\(1762002000\)/);
  const expRow = elements.get("claims-body").children
    .find((row) => row.children[0].textContent === "exp");
  assert.match(expRow.children[2].textContent, /expires in 26 minute\(s\)/);
});

test("status at the exact exp boundary reads EXPIRED", () => {
  const { elements, scheduler } = makeApp(1762003600);
  const input = elements.get("token-input");
  input.value = FIXTURE;
  input.dispatch("input");
  scheduler.flush();
  assert.match(elements.get("status-line").textContent, /^EXPIRED/);
});

test("structural error shows in the alert and hides results", () => {
  const { elements, scheduler } = makeApp();
  const input = elements.get("token-input");
  input.value = "abc";
  input.dispatch("input");
  scheduler.flush();
  assert.equal(elements.get("results").hidden, true);
  assert.match(elements.get("input-error").textContent, /3 parts; found 1/);
});

test("pane copy writes exactly the displayed pretty JSON", async () => {
  const { elements, scheduler, clipboard } = makeApp();
  const input = elements.get("token-input");
  input.value = FIXTURE;
  input.dispatch("input");
  scheduler.flush();
  elements.get("copy-header").click();
  await Promise.resolve();
  assert.deepEqual(clipboard.written, ['{\n  "alg": "HS256",\n  "typ": "JWT"\n}']);
  assert.match(elements.get("copy-note").textContent, /Copied/);
});

test("clear empties the field, the results and reports the clear", () => {
  const { elements, scheduler } = makeApp();
  const input = elements.get("token-input");
  input.value = FIXTURE;
  input.dispatch("input");
  scheduler.flush();
  elements.get("clear-button").click();
  assert.equal(input.value, "");
  assert.equal(elements.get("results").hidden, true);
  assert.match(elements.get("copy-note").textContent, /Cleared/);
});

test("empty signature segment is displayed as such", () => {
  const { elements, scheduler } = makeApp();
  const input = elements.get("token-input");
  input.value = FIXTURE.slice(0, FIXTURE.lastIndexOf(".") + 1);
  input.dispatch("input");
  scheduler.flush();
  assert.match(elements.get("signature-meta").textContent, /empty signature segment/);
});

test("markup-bearing claim values stay inert text in the table", () => {
  const { elements, scheduler } = makeApp();
  const payload = Buffer.from('{"x":"<img src=x onerror=alert(1)>"}', "utf8").toString("base64url");
  const header = Buffer.from('{"alg":"none"}', "utf8").toString("base64url");
  const input = elements.get("token-input");
  input.value = `${header}.${payload}.`;
  input.dispatch("input");
  scheduler.flush();
  assert.equal(elements.get("results").hidden, false);
  const row = elements.get("claims-body").children[0];
  assert.equal(row.children[1].textContent, '"<img src=x onerror=alert(1)>"');
});
