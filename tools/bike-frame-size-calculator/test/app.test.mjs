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
  dist = await mkdtemp(join(tmpdir(), "bike-app-test-"));
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
    changeType(id) {
      // The fake DOM has no native radio exclusivity; uncheck the others.
      for (const key of ["input-type-road", "input-type-mountain", "input-type-hybrid"]) {
        get(key).checked = key === id;
      }
      get(id).fire("change");
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

const EXAMPLE_SENTENCE = "Height 175 cm, inseam 80 cm: road bike frame 53.6 cm (range 52.6–54.6 cm), size M, starting saddle height 70.6 cm.";

test("built app renders the loaded example on the current Worker result", async (t) => {
  const h = await boot(t);
  h.click("btn-example");
  h.submit();
  const [worker] = h.workers;
  assert.deepEqual(h.view(), busy);
  const renders = h.renders();
  await result(worker);
  assert.deepEqual(h.view(), settled(EXAMPLE_SENTENCE, true));
  assert.equal(h.get("result-centre").textContent, "53.6 cm (21.1 in · conversion)");
  assert.equal(h.get("result-range-cm").textContent, "52.6 – 54.6 cm");
  assert.equal(h.get("result-range-in").textContent, "20.7 – 21.5 in · conversion");
  assert.equal(h.get("result-letter").textContent, "M");
  assert.equal(h.get("result-saddle").textContent, "70.6 cm");
  assert.equal(h.get("result-warning").hidden, true);
  assert.equal(h.get("result-sentence").textContent, EXAMPLE_SENTENCE);
  assert.equal(h.renders(), renders + 1);
  assert.equal(worker.terminated, true);
  await result(worker);
  await workerError(worker);
  assert.equal(h.renders(), renders + 1);
});

test("built app renders validation failure, associates the field, and focuses it", async (t) => {
  const h = await boot(t);
  h.edit("input-height", "");
  h.submit();
  const renders = h.renders();
  await result(h.workers[0]);
  assert.deepEqual(h.view(), settled("This field is required."));
  assert.equal(h.get("error-height").hidden, false);
  assert.equal(h.get("error-height").textContent, "This field is required.");
  assert.equal(h.get("input-height").attrs.get("aria-invalid"), "true");
  assert.equal(h.get("input-height").attrs.get("aria-errormessage"), "error-height");
  assert.equal(h.get("input-height").focusCalls, 1);
  assert.equal(h.renders(), renders + 1);
});

test("built app shows the ratio warning without blocking the result", async (t) => {
  const h = await boot(t);
  h.click("btn-example");
  h.edit("input-inseam", "60");
  h.submit();
  await result(h.workers[0]);
  assert.deepEqual(
    h.view(),
    settled("Height 175 cm, inseam 60 cm: road bike frame 40.2 cm (range 39.2–41.2 cm), size M, starting saddle height 53.0 cm. Unusual inseam-to-height ratio. Re-measure your inseam with the book method.", true)
  );
  assert.equal(h.get("result-warning").hidden, false);
  assert.ok(h.get("result-warning").textContent.includes("Unusual inseam-to-height ratio"));
  assert.equal(h.get("result-centre").textContent, "40.2 cm (15.8 in · conversion)");
});

test("built app switches bike type and recomputes from the same measurements", async (t) => {
  const h = await boot(t);
  h.click("btn-example");
  h.changeType("input-type-mountain");
  h.submit();
  await result(h.workers[0]);
  assert.deepEqual(
    h.view(),
    settled("Height 175 cm, inseam 80 cm: mountain bike frame 42.6 cm (range 41.6–43.6 cm), size M, starting saddle height 70.6 cm.", true)
  );
  assert.equal(h.get("result-centre").textContent, "42.6 cm (16.8 in · conversion)");
});

for (const failure of ["onerror", "construct", "post"]) {
  test(`built app settles ${failure} failure and can run again`, async (t) => {
    const h = await boot(t, { failFirst: failure });
    h.click("btn-example");
    h.submit();
    assert.deepEqual(h.view(), busy);
    const renders = h.renders();
    const failedWorker = h.workers[0];
    if (failure === "onerror") await workerError(failedWorker);
    else await Promise.resolve();
    assert.deepEqual(h.view(), settled("Something went wrong. Try again."));
    assert.equal(h.get("error-height").hidden, true);
    assert.equal(h.renders(), renders + 1);
    if (failedWorker) assert.equal(failedWorker.terminated, true);
    h.click("btn-example");
    h.submit();
    await result(h.workers.at(-1));
    assert.deepEqual(h.view(), settled(EXAMPLE_SENTENCE, true));
  });
}

for (const [action, status, invalidate, focusAfter] of [
  ["Reset", "Enter your height and inseam, pick a bike type, or load the example.", (h) => h.click("btn-reset"), 1],
  ["Cancel", "Cancelled. You can run again.", (h) => h.click("btn-cancel"), 0],
  ["edit", "Input changed. Run again.", (h) => h.edit("input-height", "10"), 0],
]) {
  test(`built app ignores late Worker results and errors after ${action}`, async (t) => {
    const h = await boot(t);
    h.click("btn-example");
    h.submit();
    const [worker] = h.workers;
    invalidate(h);
    const renders = h.renders();
    assert.equal(worker.terminated, true);
    await result(worker);
    await workerError(worker);
    assert.deepEqual(h.view(), settled(status));
    assert.equal(h.renders(), renders);
    assert.equal(h.get("input-height").focusCalls, focusAfter);
  });
}

test("built app keeps the new Worker active when an old Worker sends results or errors", async (t) => {
  const h = await boot(t);
  h.click("btn-example");
  h.submit();
  h.edit("input-inseam", "60");
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
  assert.deepEqual(
    h.view(),
    settled("Height 175 cm, inseam 60 cm: road bike frame 40.2 cm (range 39.2–41.2 cm), size M, starting saddle height 53.0 cm. Unusual inseam-to-height ratio. Re-measure your inseam with the book method.", true)
  );
  assert.equal(h.get("result-centre").textContent, "40.2 cm (15.8 in · conversion)");
});

for (const failFirst of ["construct", "post"]) {
  test(`built app ignores queued ${failFirst} failure after Reset and a new job`, async (t) => {
    const h = await boot(t, { failFirst });
    h.click("btn-example");
    h.submit();
    h.click("btn-reset");
    h.click("btn-example");
    h.submit();
    const current = h.workers.at(-1);
    const renders = h.renders();
    await Promise.resolve();
    assert.deepEqual(h.view(), busy);
    assert.equal(h.renders(), renders);
    assert.notEqual(current.terminated, true);
    await result(current);
    assert.deepEqual(h.view(), settled(EXAMPLE_SENTENCE, true));
  });
}

test("built Traditional Chinese app renders the same completed result", async (t) => {
  const h = await boot(t, { lang: "zh-Hant" });
  h.click("btn-example");
  h.submit();
  await result(h.workers[0]);
  assert.deepEqual(
    h.view(),
    settled("身高 175 公分，跨高 80 公分，公路車建議車架 53.6 公分（範圍 52.6–54.6 公分），尺碼 M，起始座墊高度 70.6 公分。", true)
  );
  assert.equal(h.get("result-centre").textContent, "53.6 公分 (21.1 英吋 · 換算對照)");
  assert.equal(h.get("result-letter").textContent, "M");
});
