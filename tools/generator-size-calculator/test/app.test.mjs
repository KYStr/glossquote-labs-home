// Exercise the actual built app and core. DOM and Worker delivery are
// controlled fixtures so late messages can be injected after termination.
// Rows are built dynamically by the app, so the stub DOM registers
// elements by id as the app assigns them.
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
  dist = await mkdtemp(join(tmpdir(), "gen-size-app-test-"));
  const build = fileURLToPath(new URL("../scripts/build.mjs", import.meta.url));
  execFileSync(process.execPath, [build, "--mode", "preview", "--out", dist]);
  ({ run } = await import(pathToFileURL(join(dist, "js/core/core.mjs")).href));
});

after(async () => {
  if (dist) await rm(dist, { recursive: true, force: true });
});

class Element {
  constructor(tag, registry) {
    this.tagName = tag;
    this._registry = registry;
    this._id = "";
    this.value = "";
    this.hidden = false;
    this.disabled = false;
    this.checked = false;
    this.textContent = "";
    this.children = [];
    this.parent = null;
    this.attrs = new Map();
    this.listeners = new Map();
    this.statusWrites = 0;
    this.focusCalls = 0;
    this.clickCalls = 0;
  }
  get id() {
    return this._id;
  }
  set id(value) {
    if (this._id) this._registry.delete(this._id);
    this._id = value;
    if (value) this._registry.set(value, this);
  }
  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }
  fire(type, event) {
    this.listeners.get(type)?.(event || { preventDefault() {} });
  }
  appendChild(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }
  remove() {
    if (this.parent) {
      const i = this.parent.children.indexOf(this);
      if (i !== -1) this.parent.children.splice(i, 1);
      this.parent = null;
    }
  }
  click() {
    this.clickCalls += 1;
    this.fire("click");
  }
  setAttribute(name, value) {
    this.attrs.set(name, value);
    if (name === "aria-busy") this.statusWrites += 1;
  }
  getAttribute(name) {
    return this.attrs.get(name);
  }
  removeAttribute(name) {
    this.attrs.delete(name);
  }
  focus() {
    this.focusCalls += 1;
  }
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
    if (!nodes.has(id)) {
      const el = new Element("div", nodes);
      el.id = id;
    }
    return nodes.get(id);
  };
  const body = new Element("body", nodes);
  const workers = [];
  let attempts = 0;
  installGlobal(t, "document", {
    documentElement: { lang },
    getElementById: get,
    createElement: (tag) => new Element(tag, nodes),
    body,
  });
  installGlobal(t, "window", new Element("window", nodes));
  installGlobal(t, "Blob", class {
    constructor(parts) {
      this.parts = parts;
    }
  });
  installGlobal(t, "URL", {
    createObjectURL: () => "blob:test",
    revokeObjectURL: () => {},
  });
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
    terminate() {
      this.terminated = true;
    }
  });
  const app = pathToFileURL(join(dist, "js/app.js"));
  app.searchParams.set("case", ++bootCount);
  await import(app.href);
  return {
    get,
    workers,
    rows: () => get("rows").children.length,
    submit: () => get("calc-form").fire("submit"),
    editRow(row, field, value) {
      const input = get(`input-${field}-${row}`);
      input.value = value;
      input.fire("input");
    },
    selectPreset(row, presetId) {
      const select = get(`select-preset-${row}`);
      select.value = presetId;
      select.fire("change");
    },
    click: (id) => get(id).fire("click"),
    clickRowRemove: (row) => get("rows").children[row].children[5].click(),
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
  await Promise.resolve().then(() =>
    worker.onmessage({
      data: { generation, outcome: run(worker.sent.input) },
    })
  );
}

async function workerError(worker) {
  await Promise.resolve().then(() => worker.onerror({ message: "test Worker error" }));
}

const busy = {
  busy: "true",
  runDisabled: true,
  cancelHidden: false,
  resultHidden: true,
  downloadHidden: true,
  status: "Working",
};
const settled = (status, success = false) => ({
  busy: "false",
  runDisabled: false,
  cancelHidden: true,
  resultHidden: !success,
  downloadHidden: !success,
  status,
});

const EXAMPLE_SENTENCE =
  "Total running watts 482 W, starting surge 1490 W. Recommended generator 1.9 kVA (retail size 2.0 kVA).";

test("built app renders the loaded example on the current Worker result", async (t) => {
  const h = await boot(t);
  assert.equal(h.rows(), 2);
  h.click("btn-example");
  assert.equal(h.rows(), 3);
  h.submit();
  const [worker] = h.workers;
  assert.deepEqual(h.view(), busy);
  const renders = h.renders();
  await result(worker);
  assert.deepEqual(h.view(), settled(EXAMPLE_SENTENCE, true));
  assert.equal(h.get("result-total").textContent, "482 W");
  assert.equal(h.get("result-max-surge").textContent, "1008 W");
  assert.equal(h.get("result-surge-row").textContent, "Largest starting jump from Refrigerator");
  assert.equal(h.get("result-peak").textContent, "1490 W");
  assert.equal(h.get("result-required").textContent, "603 W");
  assert.equal(h.get("result-required-kva").textContent, "0.8 kVA");
  assert.equal(h.get("result-peak-kva").textContent, "1.9 kVA");
  assert.equal(h.get("result-recommended").textContent, "1.9 kVA");
  assert.equal(h.get("result-size").textContent, "2.0 kVA");
  assert.equal(h.get("result-sentence").textContent, EXAMPLE_SENTENCE);
  assert.equal(h.get("result-rows-body").children.length, 3);
  assert.equal(h.renders(), renders + 1);
  assert.equal(worker.terminated, true);
  await result(worker);
  await workerError(worker);
  assert.equal(h.renders(), renders + 1);
});

test("built app renders validation failure, associates the field, and focuses it", async (t) => {
  const h = await boot(t);
  h.editRow(0, "running", "");
  h.submit();
  const renders = h.renders();
  await result(h.workers[0]);
  assert.deepEqual(h.view(), settled("Row 1：This field is required."));
  assert.equal(h.get("error-row-0").hidden, false);
  assert.equal(h.get("error-row-0").textContent, "This field is required.");
  assert.equal(h.get("input-running-0").attrs.get("aria-invalid"), "true");
  assert.equal(h.get("input-running-0").attrs.get("aria-errormessage"), "error-row-0");
  assert.equal(h.get("input-running-0").focusCalls, 1);
  assert.equal(h.renders(), renders + 1);
});

test("built app reports a starting-below-running error on the right row", async (t) => {
  const h = await boot(t);
  h.click("btn-example");
  h.editRow(1, "starting", "50");
  h.submit();
  await result(h.workers[0]);
  assert.deepEqual(
    h.view(),
    settled("Row 2：Starting watts must be between 1 and 30000 W and not below running watts.")
  );
  assert.equal(h.get("error-row-1").hidden, false);
  assert.equal(h.get("input-starting-1").attrs.get("aria-invalid"), "true");
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
    assert.equal(h.get("error-row-0").hidden, true);
    assert.equal(h.renders(), renders + 1);
    if (failedWorker) assert.equal(failedWorker.terminated, true);
    h.click("btn-example");
    h.submit();
    await result(h.workers.at(-1));
    assert.deepEqual(h.view(), settled(EXAMPLE_SENTENCE, true));
  });
}

for (const [action, status, invalidate, focusAfter] of [
  ["Reset", "Enter your appliance list, or load the example.", (h) => h.click("btn-reset"), 1],
  ["Cancel", "Cancelled. You can run again.", (h) => h.click("btn-cancel"), 0],
  ["edit", "Input changed. Run again.", (h) => h.editRow(0, "running", "10"), 0],
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
    assert.equal(h.get("input-name-0").focusCalls, focusAfter);
  });
}

test("built app keeps the new Worker active when an old Worker sends results or errors", async (t) => {
  const h = await boot(t);
  h.click("btn-example");
  h.submit();
  h.editRow(0, "running", "200");
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
    settled(
      "Total running watts 490 W, starting surge 1490 W. Recommended generator 1.9 kVA (retail size 2.0 kVA).",
      true
    )
  );
  assert.equal(h.get("result-total").textContent, "490 W");
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

test("built app adds and removes rows and fills a preset", async (t) => {
  const h = await boot(t);
  assert.equal(h.rows(), 2);
  h.click("btn-add-row");
  assert.equal(h.rows(), 3);
  assert.equal(h.get("input-name-2").value, "");
  h.selectPreset(2, "window-ac");
  assert.equal(h.get("input-name-2").value, "Window Air Conditioner (10,000 BTU)");
  assert.equal(h.get("input-running-2").value, "1500");
  assert.equal(h.get("input-starting-2").value, "2200");
  h.clickRowRemove(2);
  assert.equal(h.rows(), 2);
  h.submit();
  await result(h.workers[0]);
  assert.deepEqual(
    h.view(),
    settled(
      "Total running watts 292 W, starting surge 1300 W. Recommended generator 1.7 kVA (retail size 2.0 kVA).",
      true
    )
  );
});

test("built Traditional Chinese app renders the same completed result", async (t) => {
  const h = await boot(t, { lang: "zh-Hant" });
  h.click("btn-example");
  h.submit();
  await result(h.workers[0]);
  assert.deepEqual(
    h.view(),
    settled("總運轉瓦數 482 W，啟動突波 1490 W，建議發電機 1.9 kVA，市售規格 2.0 kVA。", true)
  );
  assert.equal(h.get("result-total").textContent, "482 W");
  assert.equal(h.get("result-recommended").textContent, "1.9 kVA");
  h.selectPreset(0, "dryer");
  assert.equal(h.get("input-name-0").value, "電熱乾衣機");
});
