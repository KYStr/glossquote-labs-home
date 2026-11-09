// Build tests: two builds are byte-identical, the generated preview holds
// both language pages, and the embedded Worker source actually executes
// the pure core (driven in a vm with a fake `self`) and reproduces the
// literal fixture expectation for same-day-basic.

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import vm from "node:vm";
import test from "node:test";

import { buildPreview, treeDigest } from "../scripts/build.mjs";

test("preview build is reproducible and the worker bundle runs the core", async () => {
  const tmp = await mkdtemp(path.join(tmpdir(), "parking-build-"));
  try {
    const a = path.join(tmp, "a");
    const b = path.join(tmp, "b");
    await buildPreview(a);
    await buildPreview(b);
    assert.equal(await treeDigest(a), await treeDigest(b));

    const zh = await readFile(path.join(a, "index.html"), "utf8");
    const en = await readFile(path.join(a, "en/index.html"), "utf8");
    assert.ok(zh.includes("<title>停車費計算機｜Gloss Tools</title>"));
    assert.ok(en.includes("<title>Parking Fee Calculator | Gloss Tools</title>"));

    const mod = await import(pathToFileURL(path.join(a, "js/worker-source.mjs")).href);
    assert.equal(typeof mod.WORKER_SOURCE, "string");
    assert.ok(mod.WORKER_SOURCE.includes("daysFromCivil"));
    assert.ok(!mod.WORKER_SOURCE.includes("new Date("));

    const posted = [];
    const fakeSelf = {
      onmessage: null,
      postMessage(message) {
        posted.push(message);
      }
    };
    const context = vm.createContext({ self: fakeSelf, TextEncoder, console });
    vm.runInContext(mod.WORKER_SOURCE, context);
    assert.equal(typeof fakeSelf.onmessage, "function");
    // Parse the payload inside the vm realm: a real Worker receives a
    // structured clone in its own realm, and the core's plain-object
    // schema check is realm-correct for that flow.
    context.__payload = JSON.stringify({
      generation: 7,
      input: {
        entry: "2026-11-09T09:00",
        exit: "2026-11-09T11:10",
        graceMinutes: "15",
        firstPeriodMinutes: "60",
        firstPrice: "40",
        nextPeriodMinutes: "30",
        nextPrice: "20",
        dailyCap: "200",
        lostTicketFee: "1000",
        lostTicket: false
      }
    });
    vm.runInContext("self.onmessage({ data: JSON.parse(__payload) })", context);
    assert.equal(posted.length, 1);
    assert.equal(posted[0].generation, 7);
    assert.deepEqual(JSON.parse(JSON.stringify(posted[0].outcome)), {
      ok: true,
      result: {
        lostTicketApplied: false,
        graceApplied: false,
        totalMinutes: 130,
        days: [
          { date: "2026-11-09", minutes: 130, firstPeriods: 1, nextPeriods: 3, rawFee: 100, capped: false, fee: 100 }
        ],
        totalFee: 100
      }
    });
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
