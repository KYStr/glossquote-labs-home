import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../public/js/app.mjs";
import { createSampler } from "../public/js/core/password.mjs";

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
    this.type = "";
    this.ownText = "";
    this.children = [];
    this.attrs = {};
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
  setAttribute(name, value) {
    this.attrs[name] = value;
  }
  getAttribute(name) {
    return this.attrs[name] ?? null;
  }
}

const IDS = [
  "announce", "status-note", "crypto-warning", "wipe-button",
  "tab-password", "tab-passphrase", "tab-check",
  "panel-password", "panel-passphrase", "panel-check",
  "pw-length", "pw-lower", "pw-upper", "pw-digits", "pw-symbols",
  "pw-no-ambiguous", "pw-count", "pw-expected", "pw-replace-note",
  "pw-generate", "pw-error", "pw-list",
  "pp-words", "pp-separator", "pp-capitalize", "pp-digit", "pp-count",
  "pp-expected", "pp-replace-note", "pp-generate", "pp-error", "pp-list",
  "check-input", "check-toggle", "check-error", "check-breakdown", "check-final",
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
  };
  const el = (id) => elements.get(id);
  el("pw-length").value = "20";
  el("pw-lower").checked = true;
  el("pw-upper").checked = true;
  el("pw-digits").checked = true;
  el("pw-symbols").checked = true;
  el("pw-count").value = "1";
  el("pp-words").value = "5";
  el("pp-separator").value = "hyphen";
  el("pp-count").value = "1";
  el("check-input").type = "password";
  el("panel-passphrase").hidden = true;
  el("panel-check").hidden = true;
  el("crypto-warning").hidden = true;
  return { doc, el };
}

function makeEnv() {
  const timers = [];
  const clipboard = {
    written: [],
    async writeText(text) {
      this.written.push(text);
    },
  };
  const pattern = [0, 26, 52, 62];
  let offset = 0;
  const env = {
    clipboard,
    setTimeout(fn) {
      timers.push(fn);
      return timers.length;
    },
    clearTimeout() {},
    makeSampler() {
      return createSampler(() => {
        const byte = pattern[offset % pattern.length];
        offset += 1;
        return byte;
      });
    },
  };
  return { env, timers, clipboard };
}

test("initial state shows expected entropies for the defaults", () => {
  const { doc, el } = makeDoc();
  const { env } = makeEnv();
  createApp(doc, env);
  assert.equal(el("pw-expected").textContent, "129.2");
  assert.equal(el("pp-expected").textContent, "64.6");
  assert.equal(el("crypto-warning").hidden, true);
  assert.equal(el("panel-password").hidden, false);
});

test("generate renders the exact item, announces bits only, copy writes the item", async () => {
  const { doc, el } = makeDoc();
  const { env, clipboard } = makeEnv();
  createApp(doc, env);
  el("pw-generate").click();
  const rows = el("pw-list").children;
  assert.equal(rows.length, 1);
  const [secret, bits, copy] = rows[0].children;
  assert.equal(secret.textContent, "aA0!aA0!aA0!aA0!aA0!");
  assert.equal(bits.textContent, "129.2");
  assert.ok(el("announce").textContent.includes("129.2"));
  assert.ok(!el("announce").textContent.includes(secret.textContent));
  assert.ok(el("pw-replace-note").textContent.includes("1"));
  copy.click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(clipboard.written, ["aA0!aA0!aA0!aA0!aA0!"]);
  assert.equal(el("status-note").textContent, "已複製。");
});

test("passphrase generation and tab switching", () => {
  const { doc, el } = makeDoc();
  const { env } = makeEnv();
  const app = makeApp(doc, env);
  el("tab-passphrase").click();
  assert.equal(el("panel-passphrase").hidden, false);
  assert.equal(el("panel-password").hidden, true);
  el("pp-generate").click();
  const rows = el("pp-list").children;
  assert.equal(rows.length, 1);
  assert.match(rows[0].children[0].textContent, /^[a-z]+(-[a-z]+){4}$/);
  assert.ok(el("announce").textContent.includes("64.6"));
  assert.ok(app);
});

function makeApp(doc, env) {
  return createApp(doc, env);
}

test("strength check renders the breakdown without ever quoting the input", () => {
  const { doc, el } = makeDoc();
  const { env, timers } = makeEnv();
  createApp(doc, env);
  el("tab-check").click();
  el("check-input").value = "password";
  el("check-input").dispatch("input");
  assert.equal(timers.length, 1);
  timers[0]();
  assert.ok(el("check-final").textContent.includes("17.6"));
  const rendered = el("check-breakdown").textContent + el("check-final").textContent;
  assert.ok(rendered.includes("含有字典單字"));
  assert.ok(!rendered.includes("password"), "breakdown must not quote the checked password");
  el("check-toggle").click();
  assert.equal(el("check-input").type, "text");
  el("check-toggle").click();
  assert.equal(el("check-input").type, "password");
});

test("wipe clears generated lists and the check field", () => {
  const { doc, el } = makeDoc();
  const { env, timers } = makeEnv();
  createApp(doc, env);
  el("pw-generate").click();
  el("check-input").value = "password";
  el("check-input").dispatch("input");
  timers[0]();
  el("wipe-button").click();
  assert.equal(el("pw-list").children.length, 0);
  assert.equal(el("check-input").value, "");
  assert.equal(el("check-final").textContent, "");
  assert.equal(el("pw-replace-note").textContent, "");
});

test("without crypto.getRandomValues the tool refuses to generate and says why", () => {
  const { doc, el } = makeDoc();
  const { env } = makeEnv();
  env.crypto = {};
  createApp(doc, env);
  assert.equal(el("crypto-warning").hidden, false);
  el("pw-generate").click();
  assert.ok(el("pw-error").textContent.includes("crypto.getRandomValues"));
  assert.equal(el("pw-list").children.length, 0);
});
