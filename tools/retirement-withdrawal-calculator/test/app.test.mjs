// Exercise the actual built app and core. DOM and Worker delivery are
// controlled fixtures so late messages can be injected after termination.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, before } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

let dist;
let run;
let bootCount = 0;

before(async () => {
  dist = await mkdtemp(join(tmpdir(), "rwc-app-test-"));
  const build = fileURLToPath(new URL("../scripts/build.mjs", import.meta.url));
  execFileSync(process.execPath, [build, "--mode", "preview", "--out", dist]);
  ({ run } = await import(pathToFileURL(join(dist, "js/core/core.mjs")).href));
});

after(async () => {
  if (dist) await rm(dist, { recursive: true, force: true });
});

class Element {
  constructor(id, value = "") {
    this.id = id;
    this.value = value;
    this.hidden = false;
    this.disabled = false;
    this.checked = false;
    this._text = "";
    this.children = [];
    this.attrs = new Map();
    this.listeners = new Map();
    this.statusWrites = 0;
    this.focusCalls = 0;
  }
  get textContent() {
    return this._text;
  }
  set textContent(v) {
    this._text = v;
    if (v === "") this.children = [];
  }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  fire(type) { this.listeners.get(type)({ preventDefault() {} }); }
  appendChild(child) { this.children.push(child); return child; }
  remove() {}
  click() {}
  setAttribute(name, value) {
    this.attrs.set(name, value);
    if (name === "aria-busy") this.statusWrites += 1;
  }
  removeAttribute(name) { this.attrs.delete(name); }
  focus() { this.focusCalls += 1; }
}

function installGlobal(t, name, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { value, configurable: true });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, name, previous);
    else delete globalThis[name];
  });
}

async function boot(t, { failFirst = "", lang = "en" } = {}) {
  const nodes = new Map();
  const get = (id) => {
    if (!nodes.has(id)) nodes.set(id, new Element(id));
    return nodes.get(id);
  };
  const workers = [];
  let attempts = 0;
  const modeRadios = ["depletion", "four-percent"].map((value) => new Element(`mode-${value}`, value));
  modeRadios[0].checked = true;
  const currencyRadios = ["NT$", "$", "¥"].map((value) => new Element(`currency-${value}`, value));
  currencyRadios[0].checked = true;
  const body = new Element("body");
  installGlobal(t, "document", {
    documentElement: { lang },
    getElementById: get,
    querySelectorAll: (selector) => (selector.includes("currency") ? currencyRadios : modeRadios),
    createElement: (tag) => new Element(tag),
    body,
  });
  installGlobal(t, "window", new Element("window"));
  installGlobal(t, "Worker", class {
    constructor() {
      this.first = ++attempts === 1;
      if (this.first && failFirst === "construct") throw new Error("test constructor error");
      workers.push(this);
    }
    postMessage(message) {
      if (this.first && failFirst === "post") throw new Error("test post error");
      this.sent = structuredClone(message);
    }
    terminate() { this.terminated = true; }
  });
  const app = pathToFileURL(join(dist, "js/app.js"));
  app.searchParams.set("case", ++bootCount);
  await import(app.href);
  return {
    get, workers, modeRadios, currencyRadios,
    submit: () => get("calc-form").fire("submit"),
    edit(id, value) {
      get(id).value = value;
      get(id).fire("input");
    },
    click: (id) => get(id).fire("click"),
    chooseMode(value) {
      const radio = modeRadios.find((r) => r.value === value);
      for (const r of modeRadios) r.checked = r === radio;
      radio.fire("change");
    },
    view: () => ({
      busy: get("calc-form").attrs.get("aria-busy"),
      runDisabled: get("btn-run").disabled,
      cancelHidden: get("btn-cancel").hidden,
      resultHidden: get("result").hidden,
      downloadHidden: get("btn-download").hidden,
      status: get("status").textContent,
    }),
    renders: () => get("calc-form").statusWrites,
  };
}

async function result(worker, generation = worker.sent.generation) {
  await Promise.resolve().then(() => worker.onmessage({
    data: { generation, outcome: run(worker.sent.input) },
  }));
}

async function workerError(worker) {
  await Promise.resolve().then(() => worker.onerror({ message: "test Worker error" }));
}

const busy = {
  busy: "true", runDisabled: true, cancelHidden: false,
  resultHidden: true, downloadHidden: true, status: "Working",
};
const settled = (status, success = false) => ({
  busy: "false", runDisabled: false, cancelHidden: true,
  resultHidden: !success, downloadHidden: !success, status,
});

async function loadValidExample(h) {
  h.click("btn-example");
}

test("built app renders the linear-no-growth example with its yearly table", async (t) => {
  const h = await boot(t);
  await loadValidExample(h);
  h.submit();
  const [worker] = h.workers;
  assert.deepEqual(h.view(), busy);
  const renders = h.renders();
  await result(worker);
  assert.deepEqual(h.view(), settled("The portfolio lasts 20.00 years.", true));
  assert.equal(h.get("result-years").textContent, "20.00");
  assert.equal(h.get("result-status").textContent, "Depleted");
  assert.equal(h.get("result-full-years").textContent, "20");
  assert.equal(h.get("yearly-body").children.length, 20);
  assert.equal(h.get("page-info").textContent, "Rows 1–20 of 20");
  assert.equal(h.get("result-summary").textContent, "The portfolio lasts 20.00 years.");
  assert.equal(h.renders(), renders + 1);
  assert.equal(worker.terminated, true);
  await result(worker);
  await workerError(worker);
  assert.equal(h.renders(), renders + 1);
});

test("built app renders validation failure, associates the field, and focuses it", async (t) => {
  const h = await boot(t);
  h.edit("input-portfolio", "");
  h.submit();
  const renders = h.renders();
  await result(h.workers[0]);
  assert.deepEqual(h.view(), settled("This field is required."));
  assert.equal(h.get("error-portfolio").hidden, false);
  assert.equal(h.get("error-portfolio").textContent, "This field is required.");
  assert.equal(h.get("input-portfolio").attrs.get("aria-invalid"), "true");
  assert.equal(h.get("input-portfolio").attrs.get("aria-errormessage"), "error-portfolio");
  assert.equal(h.get("input-portfolio").focusCalls, 1);
  assert.equal(h.renders(), renders + 1);
});

for (const failure of ["onerror", "construct", "post"]) {
  test(`built app settles ${failure} failure and can run again`, async (t) => {
    const h = await boot(t, { failFirst: failure });
    await loadValidExample(h);
    h.submit();
    assert.deepEqual(h.view(), busy);
    const renders = h.renders();
    const failedWorker = h.workers[0];
    if (failure === "onerror") await workerError(failedWorker);
    else await Promise.resolve();
    assert.deepEqual(h.view(), settled("Something went wrong. Try again."));
    assert.equal(h.get("error-portfolio").hidden, true);
    assert.equal(h.renders(), renders + 1);
    if (failedWorker) assert.equal(failedWorker.terminated, true);
    h.submit();
    await result(h.workers.at(-1));
    assert.deepEqual(h.view(), settled("The portfolio lasts 20.00 years.", true));
  });
}

for (const [action, status, invalidate] of [
  ["Reset", "Enter values, or load the example.", (h) => h.click("btn-reset")],
  ["Cancel", "Cancelled. You can run again.", (h) => h.click("btn-cancel")],
  ["edit", "Input changed. Run again.", (h) => h.edit("input-portfolio", "10")],
]) {
  test(`built app ignores late Worker results and errors after ${action}`, async (t) => {
    const h = await boot(t);
    await loadValidExample(h);
    h.submit();
    const [worker] = h.workers;
    invalidate(h);
    const renders = h.renders();
    assert.equal(worker.terminated, true);
    await result(worker);
    await workerError(worker);
    assert.deepEqual(h.view(), settled(status));
    assert.equal(h.renders(), renders);
    assert.equal(h.get("input-portfolio").focusCalls, 0);
  });
}

test("built app keeps the new Worker active when an old Worker sends results or errors", async (t) => {
  const h = await boot(t);
  await loadValidExample(h);
  h.submit();
  h.edit("input-portfolio", "1000000");
  h.edit("input-withdrawal", "10000");
  h.edit("input-return", "0");
  h.edit("input-inflation", "0");
  h.submit();
  const [old, current] = h.workers;
  const renders = h.renders();
  await result(old);
  await workerError(old);
  assert.notEqual(current.terminated, true, "old Worker error must not terminate the current Worker");
  await result(old, current.sent.generation);
  await result(current, old.sent.generation);
  assert.deepEqual(h.view(), busy);
  assert.equal(h.renders(), renders);
  assert.notEqual(current.terminated, true);
  await result(current);
  assert.deepEqual(h.view(), settled("The portfolio lasts 100.00 years.", true));
  assert.equal(h.get("result-years").textContent, "100.00");
});

for (const failFirst of ["construct", "post"]) {
  test(`built app ignores queued ${failFirst} failure after Reset and a new job`, async (t) => {
    const h = await boot(t, { failFirst });
    await loadValidExample(h);
    h.submit();
    h.click("btn-reset");
    await loadValidExample(h);
    h.submit();
    const current = h.workers.at(-1);
    const renders = h.renders();
    await Promise.resolve();
    assert.deepEqual(h.view(), busy);
    assert.equal(h.renders(), renders);
    assert.notEqual(current.terminated, true);
    await result(current);
    assert.deepEqual(h.view(), settled("The portfolio lasts 20.00 years.", true));
  });
}

test("built Traditional Chinese app renders the same completed result", async (t) => {
  const h = await boot(t, { lang: "zh-Hant" });
  await loadValidExample(h);
  h.submit();
  await result(h.workers[0]);
  assert.deepEqual(h.view(), settled("資金將在 20.00 年後耗盡。", true));
  assert.equal(h.get("result-years").textContent, "20.00");
});

test("built app switches modes, keeps each mode's inputs, and shows the 4% rule result", async (t) => {
  const h = await boot(t);
  await loadValidExample(h);
  h.chooseMode("four-percent");
  assert.equal(h.get("input-portfolio").value, "1000000");
  h.edit("input-spending", "600000");
  h.edit("input-current", "15000000");
  h.submit();
  await result(h.workers[0]);
  assert.deepEqual(h.view(), settled("Target portfolio NT$ 15,000,000.00; the current portfolio meets the rule.", true));
  assert.equal(h.get("result-target").textContent, "NT$ 15,000,000.00");
  assert.equal(h.get("result-implied").textContent, "4.00%");
  assert.equal(h.get("result-meets").textContent, "Meets the 4% rule");
  assert.equal(h.get("table-wrap").hidden, true);
  h.chooseMode("depletion");
  assert.equal(h.get("input-portfolio").value, "1000000");
  assert.equal(h.get("input-withdrawal").value, "50000");
});

test("built app paginates a 100-row table 25 rows at a time", async (t) => {
  const h = await boot(t);
  h.edit("input-portfolio", "1000000");
  h.edit("input-withdrawal", "10000");
  h.edit("input-return", "5");
  h.edit("input-inflation", "0");
  h.submit();
  await result(h.workers[0]);
  assert.deepEqual(h.view(), settled("Not depleted within 100 years.", true));
  assert.equal(h.get("result-status").textContent, "Not depleted within 100 years");
  assert.equal(h.get("yearly-body").children.length, 25);
  assert.equal(h.get("page-info").textContent, "Rows 1–25 of 100");
  assert.equal(h.get("btn-page-prev").disabled, true);
  h.click("btn-page-next");
  assert.equal(h.get("page-info").textContent, "Rows 26–50 of 100");
  assert.equal(h.get("yearly-body").children.length, 25);
  h.click("btn-page-next");
  h.click("btn-page-next");
  assert.equal(h.get("page-info").textContent, "Rows 76–100 of 100");
  assert.equal(h.get("btn-page-next").disabled, true);
  h.click("btn-page-prev");
  assert.equal(h.get("page-info").textContent, "Rows 51–75 of 100");
});
