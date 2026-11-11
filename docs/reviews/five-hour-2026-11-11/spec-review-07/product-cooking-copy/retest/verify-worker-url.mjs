import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { Script, createContext } from "node:vm";

const [sourceDirectory] = process.argv.slice(2);
assert(sourceDirectory, "Usage: node verify-worker-url.mjs <fixed source directory>");
const importFromSource = (path) => import(pathToFileURL(resolve(sourceDirectory, path)).href);
const { createController, WORKER_ERROR } = await importFromSource("public/js/controller.mjs");
const { run } = await importFromSource("public/js/core/convert.mjs");
const { WORKER_SOURCE } = await importFromSource("dist-preview/js/worker-source.js");
const appSource = await readFile(resolve(sourceDirectory, "public/js/app.js"), "utf8");
const factoryDeclarations = [...appSource.matchAll(/^function createWorker\(\) \{[\s\S]*?^\}/gm)];
assert.equal(factoryDeclarations.length, 1);
const factoryScript = new Script(factoryDeclarations[0][0] + "\ncreateWorker;");

function platform({ failConstruction = false, failTermination = false } = {}) {
  const events = [];
  const workers = [];
  const constructionError = new Error("Injected construction failure");
  const terminationError = new Error("Injected termination failure");
  let attempts = 0;
  const made = [];
  const revoked = [];
  class Blob {
    constructor(parts, options) {
      assert.equal(parts.length, 1);
      assert.equal(parts[0], WORKER_SOURCE);
      assert.equal(options.type, "text/javascript");
    }
  }
  const URL = {
    createObjectURL(blob) {
      assert(blob instanceof Blob);
      const url = "blob:offline-review/" + (made.length + 1);
      made.push(url);
      events.push(["create", url]);
      return url;
    },
    revokeObjectURL(url) {
      assert(made.includes(url));
      revoked.push(url);
      events.push(["revoke", url]);
    },
  };
  class Worker {
    constructor(url, options) {
      assert.equal(url, made.at(-1));
      assert.equal(options.type, "module");
      attempts += 1;
      events.push(["construct", url]);
      if (failConstruction && attempts === 1) throw constructionError;
      this.url = url;
      this.posted = [];
      this.terminateCalls = 0;
      workers.push(this);
    }
    postMessage(message) {
      this.posted.push(structuredClone(message));
      events.push(["post", this.url]);
    }
    terminate() {
      this.terminateCalls += 1;
      events.push(["terminate", this.url]);
      if (failTermination) throw terminationError;
    }
  }
  const context = createContext({ Blob, URL, Worker, WORKER_SOURCE });
  const createWorker = factoryScript.runInContext(context, { timeout: 1000 });
  const snapshot = () => ({
    made: [...made],
    revoked: [...revoked],
    constructed: workers.length,
    terminateCalls: workers.map((worker) => worker.terminateCalls),
    events: structuredClone(events),
  });
  return { createWorker, workers, snapshot, constructionError, terminationError };
}

function thrownBy(operation) {
  try {
    operation();
    return null;
  } catch (error) {
    return error;
  }
}

function normalTermination() {
  const probe = platform();
  const worker = probe.createWorker();
  const before = probe.snapshot();
  worker.terminate();
  const after = probe.snapshot();
  const pass = before.made.length === 1 && before.revoked.length === 0 && before.constructed === 1
    && after.terminateCalls[0] === 1 && isDeepStrictEqual(after.made, after.revoked);
  return { name: "normal-termination", before, after, pass };
}

function repeatedTermination() {
  const probe = platform();
  const worker = probe.createWorker();
  worker.terminate();
  worker.terminate();
  const after = probe.snapshot();
  return { name: "idempotent-revoke", after, pass: after.made.length === 1 && isDeepStrictEqual(after.made, after.revoked) };
}

function constructionFailure() {
  const probe = platform({ failConstruction: true });
  const originalError = thrownBy(probe.createWorker) === probe.constructionError;
  const after = probe.snapshot();
  return { name: "constructor-failure", originalError, after, pass: originalError && after.constructed === 0
    && after.made.length === 1 && isDeepStrictEqual(after.made, after.revoked) };
}

function terminationFailure() {
  const probe = platform({ failTermination: true });
  const worker = probe.createWorker();
  const originalError = thrownBy(() => worker.terminate()) === probe.terminationError;
  const after = probe.snapshot();
  return { name: "terminate-failure", originalError, after, pass: originalError && after.terminateCalls[0] === 1
    && after.made.length === 1 && isDeepStrictEqual(after.made, after.revoked) };
}

function retryAfterConstructionFailure() {
  const probe = platform({ failConstruction: true });
  const controller = createController({ createWorker: probe.createWorker });
  controller.edit({ amount: "2" });
  const expectedDraft = controller.getState().draft;
  const failed = controller.run();
  const afterFailure = probe.snapshot();
  const failureRecorded = failed.state === "error" && isDeepStrictEqual(failed.error, WORKER_ERROR)
    && isDeepStrictEqual(failed.draft, expectedDraft) && failed.result === null && failed.reportAvailable === false;
  const busy = controller.run();
  const current = probe.workers[0];
  assert(current, "The second construction should succeed");
  const [request] = current.posted;
  assert(request, "The second worker should receive a request");
  const retryUsesDraft = busy.state === "busy" && isDeepStrictEqual(request.snapshot, expectedDraft)
    && busy.result === null && busy.error === null && busy.reportAvailable === false;
  const beforeReply = probe.snapshot();
  const payload = run(request.snapshot);
  assert.equal(payload.ok, true);
  current.onmessage({ data: { generation: request.generation, ...payload } });
  const finished = controller.getState();
  const finishedWithResult = finished.state === "success" && finished.reportAvailable === true
    && finished.error === null && isDeepStrictEqual(finished.result, payload.result);
  const afterReply = probe.snapshot();
  const urlsReleased = afterFailure.made.length === 1 && afterFailure.constructed === 0
    && isDeepStrictEqual(afterFailure.made, afterFailure.revoked)
    && beforeReply.made.length === 2 && beforeReply.revoked.length === 1
    && afterReply.made.length === 2 && isDeepStrictEqual(afterReply.made, afterReply.revoked)
    && afterReply.terminateCalls[0] === 1;
  controller.destroy();
  return { name: "controller-retry", failureRecorded, retryUsesDraft, finishedWithResult, urlsReleased,
    afterFailure, beforeReply, afterReply, pass: failureRecorded && retryUsesDraft && finishedWithResult && urlsReleased };
}

const cases = [normalTermination(), repeatedTermination(), constructionFailure(), terminationFailure(), retryAfterConstructionFailure()];
const passed = cases.filter((test) => test.pass).length;
process.stdout.write(JSON.stringify({
  node: process.version,
  scope: "Exact createWorker function evaluated with offline Node VM platform doubles and the fixed controller",
  passed,
  total: cases.length,
  cases,
}, null, 2) + "\n");
process.exitCode = passed === cases.length ? 0 : 1;
