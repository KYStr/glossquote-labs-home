import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createApp } from "../public/js/app.mjs";

// Minimal DOM shim: the controller is exercised through the same events a
// browser would fire. Canvas painting is stubbed (fills are counted, not
// rasterised); real-browser rendering evidence stays NOT_RUN as recorded
// in VERIFICATION.md.

class FakeElement {
  constructor(id) {
    this.id = id;
    this.value = "";
    this.checked = false;
    this.hidden = false;
    this.disabled = false;
    this.textContent = "";
    this.width = 0;
    this.height = 0;
    this.href = "";
    this.download = "";
    this.clicked = false;
    this.removed = false;
    this.attrs = {};
    this.listeners = new Map();
  }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }
  dispatch(type) {
    for (const fn of this.listeners.get(type) ?? []) fn({ type, target: this });
  }
  click() {
    this.clicked = true;
    this.dispatch("click");
  }
  remove() {
    this.removed = true;
  }
  setAttribute(name, value) {
    this.attrs[name] = value;
  }
  getAttribute(name) {
    return this.attrs[name] ?? null;
  }
  getContext() {
    if (!this.ctx) {
      this.ctx = {
        fillStyle: "",
        fillRectCalls: 0,
        fillRect() {
          this.fillRectCalls += 1;
        },
      };
    }
    return this.ctx;
  }
}

const IDS = [
  "mode-text-tab", "mode-wifi-tab", "panel-text", "panel-wifi", "input-text",
  "wifi-ssid", "wifi-security", "wifi-password", "wifi-hidden",
  "ec-l", "ec-m", "ec-q", "ec-h", "margin", "margin-value", "png-size",
  "fg-color", "bg-color", "contrast-warning", "contrast-warning-2",
  "readout-bytes", "readout-version", "readout-remaining", "preview-canvas",
  "preview-alt", "state-message", "download-png", "download-svg",
  "copy-payload", "copy-status", "clear-button",
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
    createElement() {
      const anchor = new FakeElement("a");
      doc.anchors.push(anchor);
      return anchor;
    },
  };
  const el = (id) => elements.get(id);
  el("ec-l").value = "L";
  el("ec-m").value = "M";
  el("ec-m").checked = true;
  el("ec-q").value = "Q";
  el("ec-h").value = "H";
  el("margin").value = "4";
  el("png-size").value = "1024";
  el("fg-color").value = "#000000";
  el("bg-color").value = "#ffffff";
  el("wifi-security").value = "WPA";
  el("panel-wifi").hidden = true;
  el("preview-canvas").hidden = true;
  return { doc, el };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const capacities = JSON.parse(readFileSync(new URL("./fixtures/capacities.json", import.meta.url), "utf8"));
const expectedVersion = (bytes, level) => capacities[level].findIndex((cap) => bytes <= cap) + 1;

test("boot state is the placeholder with downloads disabled (zh and en)", () => {
  const zh = makeDoc("zh-Hant");
  createApp(zh.doc, {});
  assert.equal(zh.el("state-message").textContent, "輸入內容後，這裡會即時出現 QR 碼。");
  assert.equal(zh.el("download-png").disabled, true);
  assert.equal(zh.el("preview-canvas").hidden, true);
  const en = makeDoc("en");
  createApp(en.doc, {});
  assert.equal(en.el("state-message").textContent, "Enter content and the QR code will appear here.");
});

test("typing text renders a symbol, readout and text alternative", async () => {
  const { doc, el } = makeDoc();
  const app = createApp(doc, {});
  el("input-text").value = "HELLO";
  el("input-text").dispatch("input");
  await sleep(200);
  assert.equal(app.getCurrent().payload, "HELLO");
  assert.equal(el("preview-canvas").hidden, false);
  assert.ok(el("preview-canvas").getContext().fillRectCalls > 100);
  assert.equal(el("readout-bytes").textContent, "5");
  assert.equal(el("readout-version").textContent, "1");
  assert.equal(el("readout-remaining").textContent, "9");
  assert.equal(el("preview-alt").textContent, "QR 碼內容：HELLO");
  assert.equal(el("download-png").disabled, false);
  assert.equal(el("state-message").textContent, "");
});

test("over-capacity input replaces the symbol with the error state (no stale symbol)", async () => {
  const { doc, el } = makeDoc();
  const app = createApp(doc, {});
  el("input-text").value = "HELLO";
  el("input-text").dispatch("input");
  await sleep(200);
  assert.ok(app.getCurrent());
  el("input-text").value = "A".repeat(2332); // M capacity at v40 is 2,331
  el("input-text").dispatch("input");
  await sleep(200);
  assert.equal(app.getCurrent(), null);
  assert.equal(el("preview-canvas").hidden, true);
  assert.ok(el("state-message").textContent.includes("2331"));
  assert.equal(el("download-png").disabled, true);
  assert.equal(el("download-svg").disabled, true);
});

test("EC level switch re-encodes at the new level", async () => {
  const { doc, el } = makeDoc();
  createApp(doc, {});
  el("input-text").value = "A".repeat(20);
  el("input-text").dispatch("input");
  await sleep(200);
  assert.equal(el("readout-version").textContent, String(expectedVersion(20, "M")));
  el("ec-h").checked = true;
  el("ec-h").dispatch("change");
  assert.equal(el("readout-version").textContent, String(expectedVersion(20, "H")));
});

test("Wi-Fi flow builds the exact normative payload and modes keep their values", async () => {
  const { doc, el } = makeDoc();
  const app = createApp(doc, {});
  el("input-text").value = "HELLO";
  el("input-text").dispatch("input");
  await sleep(200);
  el("mode-wifi-tab").click();
  assert.equal(el("panel-wifi").hidden, false);
  assert.equal(el("state-message").textContent, "請輸入網路名稱 (SSID)。");
  el("wifi-ssid").value = "A;B";
  el("wifi-ssid").dispatch("input");
  el("wifi-password").value = "p:ss";
  el("wifi-password").dispatch("input");
  await sleep(200);
  assert.equal(app.getCurrent().payload, "WIFI:T:WPA;S:A\\;B;P:p\\:ss;;");
  el("mode-text-tab").click();
  assert.equal(app.getCurrent().payload, "HELLO");
});

test("copy button writes the exact payload via the clipboard", async () => {
  const { doc, el } = makeDoc();
  const clipboard = { written: [], async writeText(text) { this.written.push(text); } };
  createApp(doc, { clipboard });
  el("input-text").value = "HELLO";
  el("input-text").dispatch("input");
  await sleep(200);
  el("copy-payload").click();
  await sleep(10);
  assert.deepEqual(clipboard.written, ["HELLO"]);
  assert.equal(el("copy-status").textContent, "已複製內容。");
});

test("downloads act on the displayed symbol with deterministic filenames", async () => {
  const { doc, el } = makeDoc();
  const urls = [];
  createApp(doc, {
    now: () => new Date(2026, 10, 2, 3, 4, 5),
    createObjectURL: (blob) => {
      const url = `blob:stub-${urls.length}`;
      urls.push({ url, blob });
      return url;
    },
    revokeObjectURL: () => {},
  });
  el("input-text").value = "HELLO";
  el("input-text").dispatch("input");
  await sleep(200);
  el("download-png").click();
  assert.equal(doc.anchors.at(-1).download, "qr-20261102-030405.png");
  const pngBlob = urls.at(-1).blob;
  assert.equal(pngBlob.type, "image/png");
  const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
  assert.deepEqual(Array.from(pngBytes.subarray(0, 4)), [0x89, 0x50, 0x4e, 0x47]);
  el("download-svg").click();
  assert.equal(doc.anchors.at(-1).download, "qr-code.svg");
  const svgText = await urls.at(-1).blob.text();
  assert.ok(svgText.startsWith("<svg"));
  assert.ok(svgText.includes('viewBox="0 0 29 29"'));
});

test("contrast warning appears for inverted colours on both notice spots", async () => {
  const { doc, el } = makeDoc();
  createApp(doc, {});
  el("fg-color").value = "#ffffff";
  el("fg-color").dispatch("input");
  assert.equal(el("contrast-warning").hidden, false);
  assert.equal(el("contrast-warning-2").hidden, false);
  el("fg-color").value = "#000000";
  el("fg-color").dispatch("input");
  assert.equal(el("contrast-warning").hidden, true);
});

test("margin change resizes the preview canvas; PNG size clamps to 256..4096", async () => {
  const { doc, el } = makeDoc();
  createApp(doc, {});
  el("input-text").value = "HELLO";
  el("input-text").dispatch("input");
  await sleep(200);
  assert.equal(el("preview-canvas").width, (21 + 8) * 8);
  el("margin").value = "0";
  el("margin").dispatch("input");
  assert.equal(el("preview-canvas").width, 21 * 8);
  el("png-size").value = "100";
  el("png-size").dispatch("change");
  assert.equal(el("png-size").value, "256");
  el("png-size").value = "9999";
  el("png-size").dispatch("change");
  assert.equal(el("png-size").value, "4096");
});

test("clear returns the current mode to the placeholder state", async () => {
  const { doc, el } = makeDoc();
  const app = createApp(doc, {});
  el("input-text").value = "HELLO";
  el("input-text").dispatch("input");
  await sleep(200);
  assert.ok(app.getCurrent());
  el("clear-button").click();
  assert.equal(el("input-text").value, "");
  assert.equal(app.getCurrent(), null);
  assert.equal(el("state-message").textContent, "輸入內容後，這裡會即時出現 QR 碼。");
});
