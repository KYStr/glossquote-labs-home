import '/vendor/ffmpeg/ffmpeg-0.12.15/worker.js';

// Test-only observer around the unchanged official Worker. Native media work,
// arguments and responses still belong to that exact upstream module.
const post = self.postMessage.bind(self);
const upstream = self.onmessage;
let holdType = null;
const resource = (entry) => ({ url: entry.name, initiator: entry.initiatorType, transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize });
const flush = () => post({ type: 'SPIKE_RESOURCE_TRACE', data: performance.getEntriesByType('resource').map(resource) });
self.postMessage = (message, transfers) => {
  if (!['LOG', 'PROGRESS', 'SPIKE_RESOURCE_TRACE'].includes(message.type)) flush();
  if (message.type === holdType) {
    post({ type: 'SPIKE_NATIVE_COMPLETE', data: { type: message.type, result: message.data } });
    return;
  }
  post(message, transfers);
};
self.onmessage = (event) => {
  if (event.data?.type === 'SPIKE_HOLD_RESPONSE') {
    if (['LOAD', 'FFPROBE', 'EXEC'].includes(event.data.data)) holdType = event.data.data;
    return;
  }
  if (event.data?.type === 'SPIKE_PING') {
    post({ type: 'SPIKE_PONG', data: event.data.data });
    return;
  }
  if (['LOAD', 'FFPROBE', 'EXEC'].includes(event.data?.type)) post({ type: 'SPIKE_NATIVE_START', data: { type: event.data.type } });
  return upstream(event);
};
flush();
