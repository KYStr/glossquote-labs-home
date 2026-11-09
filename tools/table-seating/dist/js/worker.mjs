// Module worker for Party Table Seating. The app posts
//   {type:"run", runId, data}   (data is already validated by the app)
//   {type:"cancel", runId}
// The worker runs the pure search generator in batches of at most
// BATCH_STEPS candidate steps per macrotask so a cancel message can be
// read between batches, then posts
//   {type:"done", runId, reply, nodes, placements}
//   {type:"cancelled", runId}
// A newer "run" abandons any search still in progress (its reply is
// never posted). The worker script is never terminated, so a cancel
// keeps the loaded script, per SPEC.md.

import { search, validate, BATCH_STEPS } from "./core/solve.mjs";

let token = 0; // increments on every run/cancel; a search loop checks it.

self.addEventListener("message", (event) => {
  const message = event.data;
  if (message === null || typeof message !== "object") return;

  if (message.type === "cancel") {
    token += 1;
    self.postMessage({ type: "cancelled", runId: message.runId });
    return;
  }

  if (message.type !== "run") return;
  const runId = message.runId;
  const myToken = token + 1;
  token = myToken;

  const checked = validate(message.data);
  if (!checked.ok) {
    self.postMessage({ type: "done", runId, reply: checked.reply });
    return;
  }

  const stats = { nodes: 0, placements: 0 };
  const gen = search(checked.data, stats);

  const step = () => {
    if (token !== myToken) return; // cancelled or superseded: stay silent.
    let next;
    try {
      next = gen.next();
    } catch (error) {
      self.postMessage({
        type: "done",
        runId,
        reply: {
          status: "error",
          error: { code: "TYPE", path: "" },
        },
      });
      return;
    }
    if (next.done) {
      self.postMessage({
        type: "done",
        runId,
        reply: { status: "ok", result: next.value },
        nodes: stats.nodes,
        placements: stats.placements,
      });
      return;
    }
    // One batch (at most BATCH_STEPS candidate steps) is done; yield
    // the event loop so a cancel can be read before the next batch.
    setTimeout(step, 0);
  };
  step();
});
