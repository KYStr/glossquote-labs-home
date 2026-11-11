import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { createController, WORKER_ERROR } from "../public/js/controller.mjs";
import { run } from "../public/js/core/convert.mjs";

const app = readFileSync(new URL("../public/js/app.js", import.meta.url), "utf8");
const start = app.indexOf("function createWorker() {");
const end = app.indexOf("function revokeReportUrl() {", start);
assert.ok(start >= 0 && end > start);
const factorySource = app.slice(start, end) + "\ncreateWorker";

function setup({ failFirst = false, failTerminate = false } = {}) {
  const constructionError = new Error("worker construction failed");
  const terminationError = new Error("worker termination failed");
  const created = [];
  const revoked = [];
  const workers = [];
  const createWorker = runInNewContext(factorySource, {
    WORKER_SOURCE: "// offline Worker fixture",
    Blob,
    URL: {
      createObjectURL(blob) {
        assert.equal(blob.type, "text/javascript");
        const url = `blob:worker-${created.length + 1}`;
        created.push(url);
        return url;
      },
      revokeObjectURL(url) {
        revoked.push(url);
      },
    },
    Worker: class {
      constructor(url, options) {
        assert.equal(url, created.at(-1));
        assert.equal(options.type, "module");
        if (failFirst && created.length === 1) throw constructionError;
        this.terminationCount = 0;
        workers.push(this);
      }

      postMessage(request) {
        this.request = request;
      }

      terminate() {
        this.terminationCount += 1;
        if (failTerminate) throw terminationError;
      }
    },
  }, { timeout: 1_000 });
  return { createWorker, constructionError, terminationError, created, revoked, workers };
}

test("construction failure revokes its URL and propagates the original error", () => {
  const fixture = setup({ failFirst: true });
  assert.throws(() => fixture.createWorker(), (error) => error === fixture.constructionError);
  assert.deepEqual(fixture.created, ["blob:worker-1"]);
  assert.deepEqual(fixture.revoked, fixture.created);
});

test("controller can retry a construction failure and dispose the successful Worker", () => {
  const fixture = setup({ failFirst: true });
  const controller = createController({ createWorker: fixture.createWorker });
  controller.edit({ amount: "3" });

  const failed = controller.run();
  assert.equal(failed.state, "error");
  assert.deepEqual(failed.error, WORKER_ERROR);
  assert.equal(failed.draft.amount, "3");
  assert.equal(failed.reportAvailable, false);
  assert.deepEqual(fixture.revoked, ["blob:worker-1"]);

  assert.equal(controller.run().state, "busy");
  assert.deepEqual(fixture.created, ["blob:worker-1", "blob:worker-2"]);
  assert.deepEqual(fixture.revoked, ["blob:worker-1"]);
  const [worker] = fixture.workers;
  const { generation, snapshot } = worker.request;
  const outcome = run(snapshot);
  worker.onmessage({ data: { generation, ...outcome } });
  const completed = controller.getState();
  assert.equal(completed.state, "success");
  assert.equal(completed.reportAvailable, true);
  assert.deepEqual(completed.result, outcome.result);

  worker.terminate();
  assert.equal(worker.terminationCount, 1);
  assert.deepEqual(fixture.revoked, fixture.created);
});

test("termination still revokes its URL once if the underlying Worker throws", () => {
  const fixture = setup({ failTerminate: true });
  const worker = fixture.createWorker();
  assert.throws(() => worker.terminate(), (error) => error === fixture.terminationError);
  worker.terminate();
  assert.equal(worker.terminationCount, 1);
  assert.deepEqual(fixture.revoked, fixture.created);
});
