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
  dist = await mkdtemp(join(tmpdir(), "uv-app-test-"));
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
    this.className = "";
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
    change(id, value) {
      get(id).value = value;
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

const EXAMPLE_SENTENCE = "UV index 2 is Low (green, PMS 375). Use SPF 15+ sunscreen.";
const DISCLAIMER_EN =
  "This tool is for general reference only and is not medical advice. Time-to-redness is an estimate; individual variation is large. Follow official sun-protection guidance.";

test("built app renders the loaded example on the current Worker result", async (t) => {
  const h = await boot(t);
  h.click("btn-example");
  h.submit();
  const [worker] = h.workers;
  assert.deepEqual(h.view(), busy);
  const renders = h.renders();
  await result(worker);
  assert.deepEqual(h.view(), settled(EXAMPLE_SENTENCE, true));
  assert.equal(h.get("result-category").textContent, "Low");
  assert.equal(h.get("result-swatch").textContent, "green");
  assert.equal(h.get("result-swatch").className, "swatch swatch-green");
  assert.equal(h.get("result-spf").textContent, "SPF 15+; no reapplication schedule");
  assert.equal(
    h.get("result-burn").textContent,
    "About 100 minutes (estimate, not a safe exposure time)"
  );
  assert.equal(h.get("result-cwa").textContent, "—");
  assert.equal(
    h.get("result-advice").textContent,
    "You can safely stay outside; wear sunglasses on bright days. If you burn easily, use broad-spectrum SPF 15+ sunscreen."
  );
  assert.equal(h.get("result-skin").textContent, "Sometimes burns, tans gradually.");
  assert.equal(h.get("result-disclaimer").textContent, DISCLAIMER_EN);
  assert.equal(h.get("result-sentence").textContent, EXAMPLE_SENTENCE);
  assert.equal(h.renders(), renders + 1);
  assert.equal(worker.terminated, true);
  await result(worker);
  await workerError(worker);
  assert.equal(h.renders(), renders + 1);
});

test("built app renders the skin-type change through a new run", async (t) => {
  const h = await boot(t);
  h.click("btn-example");
  h.change("select-skin", "II");
  h.submit();
  await result(h.workers[0]);
  assert.deepEqual(
    h.view(),
    settled("UV index 2 is Low (green, PMS 375). Use SPF 15+ sunscreen.", true)
  );
  assert.equal(
    h.get("result-burn").textContent,
    "About 83 minutes (estimate, not a safe exposure time)"
  );
  assert.equal(h.get("result-skin").textContent, "Burns easily, tans minimally.");
});

test("built app renders validation failure, associates the field, and focuses it", async (t) => {
  const h = await boot(t);
  h.edit("input-uv", "");
  h.submit();
  const renders = h.renders();
  await result(h.workers[0]);
  assert.deepEqual(h.view(), settled("This field is required."));
  assert.equal(h.get("error-uv").hidden, false);
  assert.equal(h.get("error-uv").textContent, "This field is required.");
  assert.equal(h.get("input-uv").attrs.get("aria-invalid"), "true");
  assert.equal(h.get("input-uv").attrs.get("aria-errormessage"), "error-uv");
  assert.equal(h.get("input-uv").focusCalls, 1);
  assert.equal(h.renders(), renders + 1);
});

test("built app renders a range failure on the uv field", async (t) => {
  const h = await boot(t);
  h.edit("input-uv", "20.5");
  h.submit();
  await result(h.workers[0]);
  assert.deepEqual(h.view(), settled("The UV index must be between 0 and 20."));
  assert.equal(h.get("error-uv").textContent, "The UV index must be between 0 and 20.");
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
    assert.equal(h.get("error-uv").hidden, true);
    assert.equal(h.renders(), renders + 1);
    if (failedWorker) assert.equal(failedWorker.terminated, true);
    h.click("btn-example");
    h.submit();
    await result(h.workers.at(-1));
    assert.deepEqual(h.view(), settled(EXAMPLE_SENTENCE, true));
  });
}

for (const [action, status, invalidate, focusAfter] of [
  ["Reset", "Enter the UV index and your skin type, or load the example.", (h) => h.click("btn-reset"), 1],
  ["Cancel", "Cancelled. You can run again.", (h) => h.click("btn-cancel"), 0],
  ["edit", "Input changed. Run again.", (h) => h.edit("input-uv", "10"), 0],
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
    assert.equal(h.get("input-uv").focusCalls, focusAfter);
  });
}

test("built app keeps the new Worker active when an old Worker sends results or errors", async (t) => {
  const h = await boot(t);
  h.click("btn-example");
  h.submit();
  h.edit("input-uv", "10");
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
    settled("UV index 10 is Very high (red, PMS 032). Use SPF 50+ sunscreen.", true)
  );
  assert.equal(h.get("result-category").textContent, "Very high");
  assert.equal(h.get("result-swatch").className, "swatch swatch-red");
  assert.equal(h.get("result-spf").textContent, "SPF 50+; reapply every 120 minutes");
  assert.equal(h.get("result-cwa").textContent, "Burn possible within 20 minutes");
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
    settled("紫外線指數 2，屬於低量級（綠色，PMS 375），建議使用 SPF 15+ 防曬乳。", true)
  );
  assert.equal(h.get("result-category").textContent, "低量級");
  assert.equal(h.get("result-swatch").textContent, "綠色");
  assert.equal(h.get("result-spf").textContent, "SPF 15+；無補擦排程");
  assert.equal(h.get("result-burn").textContent, "約 100 分鐘（估計值，不是安全曝曬時間）");
  assert.equal(
    h.get("result-disclaimer").textContent,
    "本工具僅供一般參考，不構成醫療建議。曬紅時間為估計值，個人差異很大；防曬請以官方建議為準。"
  );
});
