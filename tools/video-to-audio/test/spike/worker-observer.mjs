export function observeWorkers(onChange) {
  const OriginalWorker = window.Worker;
  const records = [], live = new Map();
  let sequence = 0;
  let nextHold = null;
  const startWaiters = new Set();
  window.Worker = class ObservedWorker extends OriginalWorker {
    constructor(url, options) {
      const original = new URL(url, location.href);
      const ffmpeg = original.pathname === '/vendor/ffmpeg/ffmpeg-0.12.15/worker.js';
      super(ffmpeg ? new URL('./observed-worker.mjs', import.meta.url) : url, options);
      const record = { id: ++sequence, role: ffmpeg ? 'ffmpeg' : 'metrics', originalURL: original.href, createdMs: performance.now(), dispatched: [], network: [], terminatedMs: null, pong: [], nativeCompleted: [], nativeStarted: [] };
      records.push(record); live.set(record.id, this); this.record = record;
      this.addEventListener('message', ({ data }) => {
        if (data?.type === 'SPIKE_RESOURCE_TRACE') record.network = data.data;
        if (data?.type === 'SPIKE_PONG') record.pong.push(data.data);
        if (data?.type === 'SPIKE_NATIVE_COMPLETE') record.nativeCompleted.push(data.data);
        if (data?.type === 'SPIKE_NATIVE_START') {
          const event = { type: data.data.type, atMs: performance.now() }; record.nativeStarted.push(event);
          for (const waiter of startWaiters) if (event.type === waiter.type && event.atMs >= waiter.since) { startWaiters.delete(waiter); clearTimeout(waiter.timer); waiter.resolve(record); }
        }
        onChange(records);
      });
      if (ffmpeg && nextHold) {
        super.postMessage({ type: 'SPIKE_HOLD_RESPONSE', data: nextHold }); nextHold = null;
      }
      onChange(records);
    }
    postMessage(message, transfers) {
      if (this.record.terminatedMs === null && ['LOAD', 'FFPROBE', 'EXEC'].includes(message?.type)) {
        this.record.dispatched.push({ type: message.type, atMs: performance.now() });
        onChange(records);
      }
      return super.postMessage(message, transfers);
    }
    terminate() {
      super.terminate();
      if (this.record.terminatedMs === null) {
        this.record.terminatedMs = performance.now(); live.delete(this.record.id); onChange(records);
      }
    }
  };
  return {
    records,
    latestDispatch(type, since) { return records.findLast((record) => record.dispatched.some((event) => event.type === type && event.atMs >= since)); },
    ping(record, value) { live.get(record.id)?.postMessage({ type: 'SPIKE_PING', data: value }); },
    holdNext(type) { if (!['LOAD', 'FFPROBE', 'EXEC'].includes(type)) throw new Error('SPIKE_FAILED'); nextHold = type; },
    hold(record, type) { if (!['LOAD', 'FFPROBE', 'EXEC'].includes(type)) throw new Error('SPIKE_FAILED'); live.get(record.id)?.postMessage({ type: 'SPIKE_HOLD_RESPONSE', data: type }); },
    waitStart(type, since) { return new Promise((resolve, reject) => { const waiter = { type, since, resolve, timer: setTimeout(() => { startWaiters.delete(waiter); reject(new Error('SPIKE_FAILED')); }, 15000) }; startWaiters.add(waiter); }); },
  };
}
