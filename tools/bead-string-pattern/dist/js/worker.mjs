// Module worker for Bead String Pattern. The pure core runs in the next
// event-loop turn (setTimeout 0), so a cancel or edit that arrives before
// that turn revokes the scheduled work item. Replies carry the runId;
// the app's flow controller only settles a reply whose runId still
// matches the active run while busy, so late replies are discarded.

import { solve } from "./core/solve.mjs";

let pending = null;

self.addEventListener("message", (event) => {
  const message = event.data;
  if (message === null || typeof message !== "object") return;
  if (message.type === "run") {
    if (pending !== null) {
      clearTimeout(pending.timer);
      pending = null;
    }
    const runId = message.runId;
    const data = message.data;
    pending = {
      runId,
      timer: setTimeout(() => {
        pending = null;
        self.postMessage({ type: "done", runId, reply: solve(data) });
      }, 0),
    };
  } else if (message.type === "cancel") {
    if (pending !== null && pending.runId === message.runId) {
      clearTimeout(pending.timer);
      pending = null;
      self.postMessage({ type: "cancelled", runId: message.runId });
    }
  }
});
