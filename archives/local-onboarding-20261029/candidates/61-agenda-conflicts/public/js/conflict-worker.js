import { analysePair, createPairJobs } from './core/analyse.mjs';

// The injected scheduler lets Node verify batching; it is not a browser Worker test.
export function createWorkerRunner({ postMessage, schedule = callback => setTimeout(callback, 0) }) {
  let active = null;
  const clear = () => { active = null; };
  function start({ agenda, generation }) {
    const job = { agenda, generation, jobs: createPairJobs(agenda), pairResults: [], checkedPairs: 0,
      totalPairs: agenda.sessions.length * (agenda.sessions.length - 1) / 2 };
    active = job;
    const batch = () => {
      if (active !== job) return;
      try {
        let count = 0;
        while (count < 512 && job.checkedPairs < job.totalPairs) {
          const { value: [i, j] } = job.jobs.next();
          const pair = analysePair(agenda.sessions[i], agenda.sessions[j], agenda.transitionMinutes);
          if (pair) job.pairResults.push(pair);
          job.checkedPairs++;
          count++;
        }
        postMessage({ type: 'progress', generation, checkedPairs: job.checkedPairs, totalPairs: job.totalPairs });
        if (job.checkedPairs === job.totalPairs) {
          postMessage({ type: 'complete', generation, checkedPairs: job.checkedPairs, totalPairs: job.totalPairs, pairResults: job.pairResults });
          clear();
        } else schedule(batch);
      } catch {
        clear();
        postMessage({ type: 'failed', generation, code: 'CHECK_FAILED' });
      }
    };
    schedule(batch);
  }
  return { start, clear };
}

if (typeof self !== 'undefined' && typeof document === 'undefined') {
  const runner = createWorkerRunner({ postMessage: message => self.postMessage(message) });
  self.onmessage = event => runner.start(event.data);
}
