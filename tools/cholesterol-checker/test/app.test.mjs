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
  dist = await mkdtemp(join(tmpdir(), "chol-app-test-"));
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
    this.textContent = "";
    this.attrs = new Map();
    this.listeners = new Map();
    this.statusWrites = 0;
    this.focusCalls = 0;
  }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  fire(type) { this.listeners.get(type)({ preventDefault() {} }); }
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
  installGlobal(t, "document", {
    documentElement: { lang },
    getElementById: get,
    querySelectorAll: () => [],
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
    get, workers,
    submit: () => get("calc-form").fire("submit"),
    edit(id, value) {
      get(id).value = value;
      get(id).fire("input");
    },
    click: (id) => get(id).fire("click"),
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

test("built app renders the default draft result and the HDL protective note", async (t) => {
  const h = await boot(t);
  h.submit();
  const [worker] = h.workers;
  assert.deepEqual(h.view(), busy);
  const renders = h.renders();
  await result(worker);
  assert.deepEqual(h.view(), settled("All four values are in the desirable range", true));
  assert.equal(h.get("result-overall").textContent, "All four values are in the desirable range");
  assert.equal(h.get("result-total").textContent, "Total cholesterol: 180 mg/dL — Desirable");
  assert.equal(h.get("result-ldl").textContent, "LDL: 90 mg/dL — Optimal");
  assert.equal(h.get("result-hdl").textContent, "HDL: 65 mg/dL — High");
  assert.equal(h.get("result-triglycerides").textContent, "Triglycerides: 120 mg/dL — Normal");
  assert.equal(h.get("result-nonhdl").textContent, "Non-HDL cholesterol: 115 mg/dL (reference only, not classified)");
  assert.equal(h.get("result-hdl-note").hidden, false);
  assert.ok(h.get("result-hdl-note-text").textContent.includes("protective"));
  assert.equal(h.renders(), renders + 1);
  assert.equal(worker.terminated, true);
  await result(worker);
  await workerError(worker);
  assert.equal(h.renders(), renders + 1);
});

test("built app hides the HDL note when HDL is not high", async (t) => {
  const h = await boot(t);
  h.edit("input-hdl", "45");
  h.submit();
  await result(h.workers[0]);
  assert.deepEqual(h.view(), settled("All four values are in the desirable range", true));
  assert.equal(h.get("result-hdl").textContent, "HDL: 45 mg/dL — Normal");
  assert.equal(h.get("result-hdl-note").hidden, true);
  assert.equal(h.get("result-hdl-note-text").textContent, "");
});

test("built app renders validation failure, associates the field, and focuses it", async (t) => {
  const h = await boot(t);
  h.edit("input-total", "");
  h.submit();
  const renders = h.renders();
  await result(h.workers[0]);
  assert.deepEqual(h.view(), settled("This field is required."));
  assert.equal(h.get("error-total").hidden, false);
  assert.equal(h.get("error-total").textContent, "This field is required.");
  assert.equal(h.get("input-total").attrs.get("aria-invalid"), "true");
  assert.equal(h.get("input-total").attrs.get("aria-errormessage"), "error-total");
  assert.equal(h.get("input-total").focusCalls, 1);
  assert.equal(h.renders(), renders + 1);
});

for (const failure of ["onerror", "construct", "post"]) {
  test(`built app settles ${failure} failure and can run again`, async (t) => {
    const h = await boot(t, { failFirst: failure });
    h.submit();
    assert.deepEqual(h.view(), busy);
    const renders = h.renders();
    const failedWorker = h.workers[0];
    if (failure === "onerror") await workerError(failedWorker);
    else await Promise.resolve();
    assert.deepEqual(h.view(), settled("Something went wrong. Try again."));
    assert.equal(h.get("error-total").hidden, true);
    assert.equal(h.renders(), renders + 1);
    if (failedWorker) assert.equal(failedWorker.terminated, true);
    h.submit();
    await result(h.workers.at(-1));
    assert.deepEqual(h.view(), settled("All four values are in the desirable range", true));
  });
}

for (const [action, status, invalidate, focusCalls] of [
  ["Reset", "Enter values, or load the example.", (h) => h.click("btn-reset"), 1],
  ["Cancel", "Cancelled. You can run again.", (h) => h.click("btn-cancel"), 0],
  ["edit", "Input changed. Run again.", (h) => h.edit("input-total", "200"), 0],
]) {
  test(`built app ignores late Worker results and errors after ${action}`, async (t) => {
    const h = await boot(t);
    h.submit();
    const [worker] = h.workers;
    invalidate(h);
    const renders = h.renders();
    assert.equal(worker.terminated, true);
    await result(worker);
    await workerError(worker);
    assert.deepEqual(h.view(), settled(status));
    assert.equal(h.renders(), renders);
    // Reset focuses the first field (SPEC userFlow); Cancel/edit must not
    // move focus at all.
    assert.equal(h.get("input-total").focusCalls, focusCalls);
  });
}

test("built app keeps the new Worker active when an old Worker sends results or errors", async (t) => {
  const h = await boot(t);
  h.submit();
  h.edit("input-total", "200");
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
  assert.deepEqual(h.view(), settled("Some values are borderline — consider follow-up testing", true));
  assert.equal(h.get("result-total").textContent, "Total cholesterol: 200 mg/dL — Borderline high");
});

for (const failFirst of ["construct", "post"]) {
  test(`built app ignores queued ${failFirst} failure after Reset and a new job`, async (t) => {
    const h = await boot(t, { failFirst });
    h.submit();
    h.click("btn-reset");
    h.submit();
    const current = h.workers.at(-1);
    const renders = h.renders();
    await Promise.resolve();
    assert.deepEqual(h.view(), busy);
    assert.equal(h.renders(), renders);
    assert.notEqual(current.terminated, true);
    await result(current);
    assert.deepEqual(h.view(), settled("All four values are in the desirable range", true));
  });
}

test("built Traditional Chinese app renders the same completed result", async (t) => {
  const h = await boot(t, { lang: "zh-Hant" });
  h.submit();
  await result(h.workers[0]);
  assert.deepEqual(h.view(), settled("四項數值皆在理想範圍", true));
  assert.equal(h.get("result-total").textContent, "總膽固醇：180 mg/dL — 理想");
  assert.equal(h.get("result-hdl-note").hidden, false);
});
