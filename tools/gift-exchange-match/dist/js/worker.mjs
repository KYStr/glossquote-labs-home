// Module worker for Gift Exchange Match. One worker per page, loaded at
// init. It drives solveSteps() one yielded batch per MessageChannel
// turn, so a cancel posted between batches is read before the next batch
// starts. Each yielded batch holds at most one feasibility check (at
// most MAX_EDGE_ATTEMPTS_PER_CHECK edge attempts, below BATCH_STEPS), so
// a batch never exceeds the pinned budget. A superseded or cancelled run
// never posts a result; the app additionally ignores stale runIds.

import { solveSteps, BATCH_STEPS } from "./core/solve.mjs";

void BATCH_STEPS;

let current = null; // { runId, iterator }

function scheduleBatch(run) {
  const channel = new MessageChannel();
  channel.port1.onmessage = () => {
    channel.port1.close();
    channel.port2.close();
    if (current !== run) return; // cancelled or superseded while waiting
    const step = run.iterator.next();
    if (step.done) {
      current = null;
      globalThis.postMessage({ type: "done", runId: run.runId, reply: step.value });
    } else {
      scheduleBatch(run);
    }
  };
  channel.port2.postMessage(null);
}

globalThis.addEventListener("message", (event) => {
  const message = event.data;
  if (message === null || typeof message !== "object") return;
  if (message.type === "run") {
    current = { runId: message.runId, iterator: solveSteps(message.data) };
    scheduleBatch(current);
  } else if (message.type === "cancel") {
    if (current && current.runId === message.runId) current = null;
  }
});
