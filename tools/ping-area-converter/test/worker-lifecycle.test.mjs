import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { createController, WORKER_ERROR } from "../public/js/controller.mjs";
import { EXAMPLE, run } from "../public/js/core/ping-area.mjs";

const appSource = readFileSync(new URL("../public/js/app.js", import.meta.url), "utf8");
const factorySource = /^function createWorker\(\) \{[\s\S]*?^\}/m.exec(appSource)?.[0];
assert.ok(factorySource, "the application Worker factory must be available");

function platform() {
  const created = [];
  const revoked = [];
  const workers = [];
  const constructorError = new Error("synthetic Worker construction failure");
  const terminateError = new Error("synthetic termination failure");
  const behavior = { failConstruction: false, failTermination: false };

  class FakeWorker {
    constructor(url, options) {
      assert.equal(options.type, "module");
      assert.equal(url, created.at(-1));
      if (behavior.failConstruction) throw constructorError;
      this.terminations = 0;
      workers.push(this);
    }

    postMessage(request) { this.request = request; }

    terminate() {
      this.terminations += 1;
      if (behavior.failTermination) throw terminateError;
    }

    reply() {
      const { snapshot, generation } = this.request;
      this.onmessage({ data: { generation, ...run(snapshot) } });
    }
  }

  const createWorker = runInNewContext(factorySource + "\ncreateWorker", {
    WORKER_SOURCE: "synthetic worker",
    Blob,
    Worker: FakeWorker,
    URL: {
      createObjectURL(blob) {
        assert.equal(blob.type, "text/javascript");
        const url = "blob:local-test/" + created.length;
        created.push(url);
        return url;
      },
      revokeObjectURL(url) { revoked.push(url); },
    },
  }, { timeout: 1000 });
  return { createWorker, created, revoked, workers, behavior, constructorError, terminateError };
}

test("PWP-03: failed construction revokes its URL and rethrows the original error", () => {
  const fake = platform();
  fake.behavior.failConstruction = true;
  assert.throws(fake.createWorker, (error) => error === fake.constructorError);
  assert.deepEqual(fake.created, ["blob:local-test/0"]);
  assert.deepEqual(fake.revoked, fake.created);
  assert.equal(fake.workers.length, 0);
});

test("PWP-03: terminating twice invokes the platform and releases the URL only once", () => {
  const fake = platform();
  const worker = fake.createWorker();
  assert.deepEqual(fake.revoked, []);
  worker.terminate();
  worker.terminate();
  assert.equal(worker.terminations, 1);
  assert.deepEqual(fake.revoked, fake.created);
});

test("PWP-03: an exceptional termination still releases the URL once", () => {
  const fake = platform();
  const worker = fake.createWorker();
  fake.behavior.failTermination = true;
  assert.throws(() => worker.terminate(), (error) => error === fake.terminateError);
  worker.terminate();
  assert.equal(worker.terminations, 1);
  assert.deepEqual(fake.revoked, fake.created);
});

test("PWP-03: the controller can retry the same draft after construction fails", () => {
  const fake = platform();
  const controller = createController({ createWorker: fake.createWorker });
  controller.edit(EXAMPLE);
  fake.behavior.failConstruction = true;
  controller.run();

  const failed = controller.getState();
  assert.equal(failed.state, "error");
  assert.deepEqual(failed.error, WORKER_ERROR);
  assert.deepEqual(failed.draft, EXAMPLE);
  assert.equal(failed.reportAvailable, false);
  assert.deepEqual(fake.revoked, ["blob:local-test/0"]);

  fake.behavior.failConstruction = false;
  controller.run();
  assert.equal(controller.getState().state, "busy");
  assert.deepEqual(fake.created, ["blob:local-test/0", "blob:local-test/1"]);
  assert.deepEqual(fake.revoked, ["blob:local-test/0"]);
  const [worker] = fake.workers;
  worker.reply();
  const complete = controller.getState();
  assert.equal(complete.state, "success");
  assert.deepEqual(complete.result, run(EXAMPLE).result);
  assert.equal(complete.reportAvailable, true);
  assert.equal(worker.terminations, 1);
  assert.deepEqual(fake.revoked, fake.created);
});
