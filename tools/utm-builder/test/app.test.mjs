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
  dist = await mkdtemp(join(tmpdir(), "utm-app-test-"));
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

const EXAMPLE_URL = "https://example.com/blog/summer-sale?utm_source=facebook&utm_medium=social&utm_campaign=summer_sale";
const EXAMPLE_SENTENCE = "Tagged link ready.";

test("built app renders the loaded example on the current Worker result", async (t) => {
  const h = await boot(t);
  h.click("btn-example");
  h.submit();
  const [worker] = h.workers;
  assert.deepEqual(h.view(), busy);
  const renders = h.renders();
  await result(worker);
  assert.deepEqual(h.view(), settled(EXAMPLE_SENTENCE, true));
  assert.equal(h.get("result-url").textContent, EXAMPLE_URL);
  assert.equal(h.get("param-value-source").textContent, "facebook");
  assert.equal(h.get("param-value-medium").textContent, "social");
  assert.equal(h.get("param-value-campaign").textContent, "summer_sale");
  assert.equal(h.get("param-row-term").hidden, true);
  assert.equal(h.get("param-row-content").hidden, true);
  assert.equal(h.renders(), renders + 1);
  assert.equal(worker.terminated, true);
  await result(worker);
  await workerError(worker);
  assert.equal(h.renders(), renders + 1);
});

test("built app renders validation failure, associates the field, and focuses it", async (t) => {
  const h = await boot(t);
  h.click("btn-example");
  h.edit("input-campaign", "");
  h.submit();
  const renders = h.renders();
  await result(h.workers[0]);
  assert.deepEqual(h.view(), settled("This field is required."));
  assert.equal(h.get("error-campaign").hidden, false);
  assert.equal(h.get("error-campaign").textContent, "This field is required.");
  assert.equal(h.get("input-campaign").attrs.get("aria-invalid"), "true");
  assert.equal(h.get("input-campaign").attrs.get("aria-errormessage"), "error-campaign");
  assert.equal(h.get("input-campaign").focusCalls, 1);
  assert.equal(h.renders(), renders + 1);
});

test("built app renders DUPLICATE_UTM and INVALID_URL on the baseUrl field", async (t) => {
  const h = await boot(t);
  h.click("btn-example");
  h.edit("input-baseurl", "https://example.com/?utm_source=old");
  h.submit();
  await result(h.workers[0]);
  assert.deepEqual(
    h.view(),
    settled("The target URL already contains a utm_* parameter and will not be overwritten; remove it first, then build.")
  );
  assert.equal(h.get("error-baseurl").hidden, false);
  assert.equal(h.get("input-medium").attrs.get("aria-invalid"), undefined);

  h.edit("input-baseurl", "ftp://example.com/file");
  h.submit();
  await result(h.workers.at(-1));
  assert.deepEqual(
    h.view(),
    settled("The target URL is invalid: enter a complete http or https URL with a host and no username or password.")
  );
  assert.equal(h.get("error-baseurl").hidden, false);
});

test("built app preset fills source/medium, clears term/content, keeps campaign", async (t) => {
  const h = await boot(t);
  h.click("btn-example");
  h.edit("input-term", "shoes");
  h.edit("input-content", "banner");
  h.click("btn-preset-ads");
  assert.equal(h.get("input-source").value, "google");
  assert.equal(h.get("input-medium").value, "cpc");
  assert.equal(h.get("input-term").value, "");
  assert.equal(h.get("input-content").value, "");
  assert.equal(h.get("input-campaign").value, "summer_sale");
  assert.equal(h.get("input-baseurl").value, "https://example.com/blog/summer-sale");
  assert.deepEqual(h.view(), settled("Input changed. Run again."));
  h.submit();
  await result(h.workers.at(-1));
  assert.deepEqual(h.view(), settled(EXAMPLE_SENTENCE, true));
  assert.equal(
    h.get("result-url").textContent,
    "https://example.com/blog/summer-sale?utm_source=google&utm_medium=cpc&utm_campaign=summer_sale"
  );
  assert.equal(h.get("param-value-source").textContent, "google");
  assert.equal(h.get("param-row-term").hidden, true);
});

test("built app copies the tagged URL on click and reports a copy failure without losing the result", async (t) => {
  const h = await boot(t);
  h.click("btn-example");
  h.submit();
  await result(h.workers[0]);
  assert.deepEqual(h.view(), settled(EXAMPLE_SENTENCE, true));

  h.click("btn-copy");
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(h.clipboard.writes, [EXAMPLE_URL]);
  assert.deepEqual(h.view(), settled(EXAMPLE_SENTENCE, true));

  h.clipboard.failNext = true;
  h.click("btn-copy");
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(h.clipboard.writes, [EXAMPLE_URL]);
  assert.deepEqual(
    h.view(),
    settled("Copy failed. Select the link and copy it manually.", true)
  );
  // The result and the report download survive the copy failure.
  assert.equal(h.get("result-url").textContent, EXAMPLE_URL);

  // A successful retry clears the copy message.
  h.click("btn-copy");
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(h.clipboard.writes, [EXAMPLE_URL, EXAMPLE_URL]);
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
  assert.equal(h.created[0].download, "utm-builder-report.json");
  assert.match(h.created[0].href, /^blob:/);
  assert.equal(h.created[0].clickCalls, 1);
  assert.equal(h.created[0].removed, true);
  assert.equal(h.appended.length, 1);
  // Reset revokes the download URL (clears the 30 s timer).
  h.click("btn-reset");
  assert.deepEqual(h.view(), settled("Enter a target URL and UTM parameters, or load the example."));
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
    assert.equal(h.get("error-campaign").hidden, true);
    assert.equal(h.renders(), renders + 1);
    if (failedWorker) assert.equal(failedWorker.terminated, true);
    h.click("btn-example");
    h.submit();
    await result(h.workers.at(-1));
    assert.deepEqual(h.view(), settled(EXAMPLE_SENTENCE, true));
  });
}

for (const [action, status, invalidate, focusAfter] of [
  ["Reset", "Enter a target URL and UTM parameters, or load the example.", (h) => h.click("btn-reset"), 1],
  ["Cancel", "Cancelled. You can run again.", (h) => h.click("btn-cancel"), 0],
  ["edit", "Input changed. Run again.", (h) => h.edit("input-campaign", "Hello"), 0],
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
    assert.equal(h.get("input-baseurl").focusCalls, focusAfter);
  });
}

test("built app keeps the new Worker active when an old Worker sends results or errors", async (t) => {
  const h = await boot(t);
  h.click("btn-example");
  h.submit();
  h.edit("input-campaign", "hello");
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
  assert.deepEqual(h.view(), settled(EXAMPLE_SENTENCE, true));
  assert.equal(
    h.get("result-url").textContent,
    "https://example.com/blog/summer-sale?utm_source=facebook&utm_medium=social&utm_campaign=hello"
  );
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
  assert.deepEqual(h.view(), settled("已建立追蹤連結。", true));
  assert.equal(h.get("result-url").textContent, EXAMPLE_URL);
  assert.equal(h.get("param-value-source").textContent, "facebook");
});
