// Module worker for Card Sleeve Stock Fit (SPEC implementation).
// One worker per page, loaded at initialization. The max-flow search runs
// in batches of at most 4096 candidate steps; between batches the next
// batch is scheduled through a MessageChannel, so a posted cancel is read
// before the next batch starts. The UI also guards by runId, so a late
// reply from a superseded run can never settle the page.
//
// Protocol, main -> worker:
//   {type:'run', runId, input}     start (or restart) a run; supersedes any
//                                  in-flight run, which is marked cancelled
//   {type:'cancel', runId}         cancel the run with this runId
// Protocol, worker -> main:
//   {type:'progress', runId, steps, augmentations}
//   {type:'result', runId, reply}  reply is the core solve reply; posted
//                                  only if the run was not cancelled
//   {type:'cancelled', runId}      the run stopped early because of cancel
import { solveSteps } from './core/solve.mjs';

const scope = globalThis;
let current = null; // { runId, cancelled }

function schedule(fn) {
  if (typeof scope.MessageChannel === 'function') {
    const channel = new scope.MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      channel.port2.close();
      fn();
    };
    channel.port2.postMessage(null);
  } else {
    setTimeout(fn, 0);
  }
}

scope.onmessage = (event) => {
  const msg = event && event.data;
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'cancel') {
    if (current && current.runId === msg.runId) current.cancelled = true;
    return;
  }
  if (msg.type !== 'run') return;
  const runId = msg.runId;
  // A new run supersedes any in-flight run: mark the old one cancelled so
  // its batches stop and it never posts a result.
  if (current) current.cancelled = true;
  const job = { runId, cancelled: false };
  current = job;
  const iterator = solveSteps(msg.input);
  const step = () => {
    if (job.cancelled || current !== job) {
      // Cancelled (or superseded): never settle. Tell the page so it can
      // stop showing progress; the page ignores it if it already moved on.
      if (current === job) current = null;
      if (job.cancelled) scope.postMessage({ type: 'cancelled', runId });
      return;
    }
    let out;
    try {
      out = iterator.next();
    } catch {
      if (current === job) current = null;
      scope.postMessage({
        type: 'result',
        runId,
        reply: { status: 'error', error: { code: 'TYPE', path: '' } },
      });
      return;
    }
    if (out.done) {
      if (current === job) current = null;
      scope.postMessage({ type: 'result', runId, reply: out.value });
      return;
    }
    scope.postMessage({
      type: 'progress',
      runId,
      steps: out.value.steps,
      augmentations: out.value.augmentations,
    });
    schedule(step);
  };
  step();
};
