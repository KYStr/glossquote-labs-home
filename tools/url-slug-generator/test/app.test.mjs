// Exercise the actual built app and core. DOM and Worker delivery are
// controlled fixtures so late messages can be injected after termination.
// The clipboard is a controllable fake: writes are recorded, and the next
// write can be made to fail to exercise COPY_FAILED.
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
  dist = await mkdtemp(join(tmpdir(), "slug-app-test-"));
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
    this.clickCalls = 0;
    this.removed = false;
  }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  fire(type) { this.listeners.get(type)({ preventDefault() {} }); }
  click() { this.clickCalls += 1; }
  remove() { this.removed = true; }
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
  const created = [];
  const appended = [];
  const clipboard = {
    writes: [],
    failNext: false,
    writeText(text) {
      if (this.failNext) {
        this.failNext = false;
        return Promise.reject(new Error("test clipboard failure"));
      }
      this.writes.push(text);
      return Promise.resolve();
    },
  };
  const workers = [];
  let attempts = 0;
  installGlobal(t, "document", {
    documentElement: { lang },
    getElementById: get,
    querySelectorAll: () => [],
    createElement: (tag) => {
      const el = new Element(tag);
      created.push(el);
      return el;
    },
    body: {
      appendChild: (el) => {
        appended.push(el);
      },
    },
  });
  installGlobal(t, "window", new Element("window"));
  installGlobal(t, "navigator", { clipboard });
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
    get, workers, clipboard, created, appended,
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
      copyHidden: get("btn-copy").hidden,
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
  busy: "true", runDisabled: true, cancelHidden: false, copyHidden: true,
  resultHidden: true, downloadHidden: true, status: "Working",
};
const settled = (status, success = false) => ({
  busy: "false", runDisabled: false, cancelHidden: true,
  copyHidden: !success, resultHidden: !success, downloadHidden: !success, status,
});

const EXAMPLE_SENTENCE = "Slug ready: hello-world-a-beginner-s-guide.";

test("built app renders the loaded example on the current Worker result", async (t) => {
  const h = await boot(t);
  h.click("btn-example");
  h.submit();
  const [worker] = h.workers;
  assert.deepEqual(h.view(), busy);
  const renders = h.renders();
  await result(worker);
  assert.deepEqual(h.view(), settled(EXAMPLE_SENTENCE, true));
  assert.equal(h.get("result-slug").textContent, "hello-world-a-beginner-s-guide");
  assert.equal(h.get("result-length").textContent, "30");
  assert.equal(h.get("result-maxlength").textContent, "50");
  assert.equal(h.get("result-truncated").textContent, "No");
  assert.equal(h.get("result-sentence").textContent, EXAMPLE_SENTENCE);
  assert.equal(h.renders(), renders + 1);
  assert.equal(worker.terminated, true);
  await result(worker);
  await workerError(worker);
  assert.equal(h.renders(), renders + 1);
});

test("built app renders validation failure, associates the field, and focuses it", async (t) => {
  const h = await boot(t);
  h.edit("input-title", "");
  h.submit();
  const renders = h.renders();
  await result(h.workers[0]);
  assert.deepEqual(h.view(), settled("This field is required."));
  assert.equal(h.get("error-title").hidden, false);
  assert.equal(h.get("error-title").textContent, "This field is required.");
  assert.equal(h.get("input-title").attrs.get("aria-invalid"), "true");
  assert.equal(h.get("input-title").attrs.get("aria-errormessage"), "error-title");
  assert.equal(h.get("input-title").focusCalls, 1);
  assert.equal(h.renders(), renders + 1);
});

test("built app renders EMPTY_SLUG and RANGE on the right fields", async (t) => {
  const h = await boot(t);
  h.edit("input-title", "你好世界");
  h.submit();
  await result(h.workers[0]);
  assert.deepEqual(h.view(), settled("The title produced no usable slug. Add Latin letters or digits."));
  assert.equal(h.get("error-title").hidden, false);
  assert.equal(h.get("input-maxlength").attrs.get("aria-invalid"), undefined);

  h.click("btn-example");
  h.edit("input-maxlength", "0");
  h.submit();
  await result(h.workers.at(-1));
  assert.deepEqual(h.view(), settled("Max length must be between 1 and 100."));
  assert.equal(h.get("error-maxlength").hidden, false);
  assert.equal(h.get("error-maxlength").textContent, "Max length must be between 1 and 100.");
});

test("built app copies the slug on click and reports a copy failure without losing the result", async (t) => {
  const h = await boot(t);
  h.click("btn-example");
  h.submit();
  await result(h.workers[0]);
  assert.deepEqual(h.view(), settled(EXAMPLE_SENTENCE, true));

  h.click("btn-copy");
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(h.clipboard.writes, ["hello-world-a-beginner-s-guide"]);
  assert.deepEqual(h.view(), settled(EXAMPLE_SENTENCE, true));

  h.clipboard.failNext = true;
  h.click("btn-copy");
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(h.clipboard.writes, ["hello-world-a-beginner-s-guide"]);
  assert.deepEqual(
    h.view(),
    settled("Copy failed. Select the slug and copy it manually.", true)
  );
  // The result and the report download survive the copy failure.
  assert.equal(h.get("result-slug").textContent, "hello-world-a-beginner-s-guide");

  // A successful retry clears the copy message.
  h.click("btn-copy");
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(h.clipboard.writes, [
    "hello-world-a-beginner-s-guide",
    "hello-world-a-beginner-s-guide",
  ]);
  assert.deepEqual(h.view(), settled(EXAMPLE_SENTENCE, true));
});

test("built app downloads the report with the fixed filename", async (t) => {
  const h = await boot(t);
  h.click("btn-example");
  h.submit();
  await result(h.workers[0]);
  assert.deepEqual(h.view(), settled(EXAMPLE_SENTENCE, true));
  h.click("btn-download");
  assert.equal(h.created.length, 1);
  assert.equal(h.created[0].download, "url-slug-generator-report.json");
  assert.match(h.created[0].href, /^blob:/);
  assert.equal(h.created[0].clickCalls, 1);
  assert.equal(h.created[0].removed, true);
  assert.equal(h.appended.length, 1);
  // Reset revokes the download URL (clears the 30 s timer).
  h.click("btn-reset");
  assert.deepEqual(h.view(), settled("Enter a title, or load the example."));
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
    assert.equal(h.get("error-title").hidden, true);
    assert.equal(h.renders(), renders + 1);
    if (failedWorker) assert.equal(failedWorker.terminated, true);
    h.click("btn-example");
    h.submit();
    await result(h.workers.at(-1));
    assert.deepEqual(h.view(), settled(EXAMPLE_SENTENCE, true));
  });
}

for (const [action, status, invalidate, focusAfter] of [
  ["Reset", "Enter a title, or load the example.", (h) => h.click("btn-reset"), 1],
  ["Cancel", "Cancelled. You can run again.", (h) => h.click("btn-cancel"), 0],
  ["edit", "Input changed. Run again.", (h) => h.edit("input-title", "Hello"), 0],
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
    assert.equal(h.get("input-title").focusCalls, focusAfter);
  });
}

test("built app keeps the new Worker active when an old Worker sends results or errors", async (t) => {
  const h = await boot(t);
  h.click("btn-example");
  h.submit();
  h.edit("input-title", "Hello");
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
  assert.deepEqual(h.view(), settled("Slug ready: hello.", true));
  assert.equal(h.get("result-slug").textContent, "hello");
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
  assert.deepEqual(h.view(), settled("已產生 slug：hello-world-a-beginner-s-guide。", true));
  assert.equal(h.get("result-slug").textContent, "hello-world-a-beginner-s-guide");
  assert.equal(h.get("result-length").textContent, "30");
  assert.equal(h.get("result-truncated").textContent, "否");
});
