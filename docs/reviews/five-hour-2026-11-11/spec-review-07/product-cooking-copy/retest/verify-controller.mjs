import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

const [sourceDirectory] = process.argv.slice(2);
assert(sourceDirectory, "Usage: node verify-controller.mjs <fixed source directory>");

const importFromSource = (path) => import(pathToFileURL(resolve(sourceDirectory, path)).href);
const { createController } = await importFromSource("public/js/controller.mjs");
const { run } = await importFromSource("public/js/core/convert.mjs");

function setup() {
  const workers = [];
  const notifications = [];
  const controller = createController({
    createWorker() {
      const worker = {
        posted: [],
        terminateCalls: 0,
        postMessage(message) {
          this.posted.push(structuredClone(message));
        },
        terminate() {
          this.terminateCalls += 1;
        },
      };
      workers.push(worker);
      return worker;
    },
    onChange(state) {
      notifications.push(structuredClone(state));
    },
  });
  return { controller, workers, notifications };
}

function reply(worker) {
  assert.equal(worker.posted.length, 1);
  const { generation, snapshot } = worker.posted[0];
  assert(Number.isSafeInteger(generation));
  return { generation, ...run(snapshot) };
}

function observe(harness, worker) {
  const state = structuredClone(harness.controller.getState());
  return { state, notifications: harness.notifications.length, terminateCalls: worker.terminateCalls };
}

function summarize(observation) {
  const { state, notifications, terminateCalls } = observation;
  return {
    state: state.state,
    reportAvailable: state.reportAvailable,
    hasResult: state.result !== null,
    errorCode: state.error?.code ?? null,
    notifications,
    terminateCalls,
  };
}

function assertBusy(observation) {
  assert.equal(observation.state.state, "busy");
  assert.equal(observation.state.result, null);
  assert.equal(observation.state.error, null);
  assert.equal(observation.state.reportAvailable, false);
  assert.equal(observation.terminateCalls, 0);
}

function settleCurrent(harness, worker) {
  const expected = reply(worker);
  const before = observe(harness, worker);
  worker.onmessage({ data: expected });
  const after = observe(harness, worker);
  const pass = after.state.state === (expected.ok ? "success" : "error")
    && after.state.reportAvailable === expected.ok
    && isDeepStrictEqual(after.state.result, expected.result ?? null)
    && isDeepStrictEqual(after.state.error, expected.error ?? null)
    && isDeepStrictEqual(after.state.draft, before.state.draft)
    && after.notifications === before.notifications + 1
    && after.terminateCalls === 1;
  return { pass, generation: expected.generation, outcome: expected.ok ? "success" : expected.error.code, observed: summarize(after) };
}

const routes = [
  { name: "run-again", enter: () => {}, beforeRun: "busy" },
  { name: "cancel-run", enter: (controller) => controller.cancel(), beforeRun: "cancelled" },
  { name: "edit-run", enter: (controller) => controller.edit({ amount: "4" }), beforeRun: "dirty" },
  { name: "reset-run", enter: (controller) => controller.reset(), beforeRun: "empty" },
];

function checkRace(route, outcome) {
  const harness = setup();
  const { controller, workers } = harness;
  controller.edit({ amount: outcome === "success" ? "2" : "0" });
  controller.run();
  const old = workers[0];
  const lateMessage = old.onmessage;
  const oldReply = reply(old);
  assert.equal(oldReply.ok, outcome === "success");
  if (!oldReply.ok) assert.equal(typeof oldReply.error.code, "string");

  route.enter(controller);
  assert.equal(controller.getState().state, route.beforeRun);
  controller.run();
  assert.equal(workers.length, 2);
  const current = workers[1];
  const currentGeneration = current.posted[0].generation;
  assert(currentGeneration > oldReply.generation);
  assert.deepEqual(current.posted[0].snapshot, controller.getState().draft);
  assert.equal(old.terminateCalls, 1);

  const before = observe(harness, current);
  assertBusy(before);
  lateMessage({ data: oldReply });
  const after = observe(harness, current);
  const staleIgnored = isDeepStrictEqual(after, before);
  const currentReply = settleCurrent(harness, current);
  const oldTerminateCalls = old.terminateCalls;
  controller.destroy();

  return {
    route: route.name,
    outcome,
    oldGeneration: oldReply.generation,
    currentGeneration,
    oldErrorCode: oldReply.error?.code ?? null,
    oldTerminateCalls,
    before: summarize(before),
    after: summarize(after),
    staleIgnored,
    currentReply,
    pass: staleIgnored && currentReply.pass && oldTerminateCalls === 1,
  };
}

function checkControl(name) {
  const harness = setup();
  const { controller, workers } = harness;
  controller.edit({ amount: "5" });
  controller.run();
  const old = workers[0];
  const lateError = old.onerror;
  if (name === "old-onerror") controller.run();
  const current = workers.at(-1);
  const before = observe(harness, current);
  assertBusy(before);

  if (name === "wrong-generation") {
    const data = reply(current);
    current.onmessage({ data: { ...data, generation: data.generation + 1 } });
  }
  if (name === "old-onerror") {
    assert.equal(old.terminateCalls, 1);
    lateError({ message: "Controlled old Worker error" });
  }

  const after = observe(harness, current);
  const unchanged = isDeepStrictEqual(after, before);
  const currentReply = settleCurrent(harness, current);
  controller.destroy();
  return { name, unchanged, before: summarize(before), after: summarize(after), currentReply, pass: unchanged && currentReply.pass };
}

const races = routes.flatMap((route) => ["success", "validation-error"].map((outcome) => checkRace(route, outcome)));
const controls = ["current-success", "wrong-generation", "old-onerror"].map(checkControl);
const racePass = races.filter((test) => test.pass).length;
const controlPass = controls.filter((test) => test.pass).length;
process.stdout.write(JSON.stringify({
  node: process.version,
  scope: "Injected retained callbacks with the posted snapshots and fixed core response shape",
  racePass,
  controlPass,
  races,
  controls,
}, null, 2) + "\n");
process.exitCode = racePass === races.length && controlPass === controls.length ? 0 : 1;
