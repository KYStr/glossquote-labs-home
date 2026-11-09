// End-to-end smoke test for the generated worker source: load the exact
// string the page turns into a Blob-URL module Worker, feed it a
// message, and check the reply. This exercises the real worker code
// path (core embedded verbatim + fixed handler) without a browser.

import assert from "node:assert/strict";
import { test } from "node:test";
import { WORKER_SOURCE, WORKER_SOURCE_SHA256 } from "../public/js/worker-source.mjs";
import { FIXTURES } from "./fixtures.mjs";

const byId = new Map(FIXTURES.cases.map((c) => [c.id, c]));

test("generated worker source answers a lookup message", async () => {
  const replies = [];
  const selfShim = {
    postMessage(message) {
      replies.push(message);
    },
  };
  globalThis.self = selfShim;
  // Note: do not delete globalThis.self in a finally here. Node defers
  // data: URL module evaluation past the import() continuation, so the
  // shim must stay installed until this test's assertions are done.
  const url = `data:text/javascript,${encodeURIComponent(WORKER_SOURCE)}`;
  await import(url);
  assert.equal(typeof selfShim.onmessage, "function", "worker sets onmessage");

  const fixture = byId.get("capricorn-dec-wrap");
  selfShim.onmessage({
    data: { generation: 7, input: fixture.input },
  });
  assert.deepEqual(replies, [{ generation: 7, outcome: fixture.expected }]);

  // Malformed messages are ignored; a bad input yields a core error,
  // not a throw.
  selfShim.onmessage({ data: null });
  selfShim.onmessage({ data: { generation: 8 } });
  assert.equal(replies.length, 1);
  selfShim.onmessage({
    data: { generation: 9, input: { month: "2", day: "29", year: "2023" } },
  });
  assert.deepEqual(replies[1], {
    generation: 9,
    outcome: {
      ok: false,
      error: { code: "DATE_INVALID", field: "day", row: null },
    },
  });
  delete globalThis.self;
});

test("worker source carries its SHA-256 and embeds the core", async () => {
  const { createHash } = await import("node:crypto");
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const toolRoot = fileURLToPath(new URL("..", import.meta.url));
  const core = await readFile(`${toolRoot}/public/js/core/zodiac.mjs`, "utf8");
  assert.equal(
    createHash("sha256").update(WORKER_SOURCE, "utf8").digest("hex"),
    WORKER_SOURCE_SHA256,
  );
  assert.ok(WORKER_SOURCE.startsWith(core), "core embedded verbatim at the head");
  assert.ok(WORKER_SOURCE.includes("self.onmessage"), "handler appended");
});
