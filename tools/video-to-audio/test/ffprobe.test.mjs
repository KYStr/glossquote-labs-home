import test from 'node:test';
import assert from 'node:assert/strict';
import { retainNativeProbeReturn } from '../public/js/core/ffprobe-return.mjs';
import { IsolatedProbe, probeArgs } from '../public/js/core/isolated-probe.mjs';

// This fake reproduces the released JS binding's discarded-return defect.
// Native codec/ffprobe behavior is covered separately in real browsers.
function coreWithNative(native) {
  const core = { ret: -1, _ffprobe: native };
  core.ffprobe = () => {
    try { core._ffprobe(2, 12); }
    catch (error) { if (!error.message.startsWith('Aborted')) throw error; }
    return core.ret;
  };
  return core;
}
test('retain exact native exit; never map a failing -1 to success', () => {
  const exits = [0, 1, -1, 0];
  const core = coreWithNative(() => exits.shift());
  const native = core._ffprobe;
  retainNativeProbeReturn(core);
  for (const expected of [0, 1, -1, 0]) {
    assert.equal(core.ffprobe(), expected);
    assert.equal(core.ret, expected);
    assert.equal(core._ffprobe, native);
  }
});
test('invalid native status and swallowed abort cannot produce success', () => {
  for (const exit of [undefined, null, NaN, Infinity, 0.5, '0', 2147483648]) {
    const core = retainNativeProbeReturn(coreWithNative(() => exit));
    assert.throws(() => core.ffprobe(), /MEDIA_UNSUPPORTED/);
    assert.equal(core.ret, -1);
  }
  let core;
  core = retainNativeProbeReturn(coreWithNative(() => { core.ret = 0; throw new Error('Aborted'); }));
  assert.throws(() => core.ffprobe(), /MEDIA_UNSUPPORTED/);
});
test('native lazy export remains intercepted on later commands', () => {
  const core = coreWithNative(() => { core._ffprobe = () => 1; return 0; });
  retainNativeProbeReturn(core);
  assert.equal(core.ffprobe(), 0);
  assert.equal(core.ffprobe(), 0);
});

function probeWorker(value = {}) {
  const { json = '{"format":{"duration":"10"}}', load = async () => true, probe } = value;
  const exit = Object.hasOwn(value, 'exit') ? value.exit : 0;
  const calls = [];
  const worker = {
    load: async (...args) => { calls.push(['load', ...args]); return load(); },
    writeFile: async (...args) => { calls.push(['write', ...args]); },
    ffprobe: async (...args) => { calls.push(['probe', ...args]); return probe ? probe() : exit; },
    readFile: async (...args) => { calls.push(['read', ...args]); return json; },
    terminate: () => { calls.push(['terminate']); },
  };
  return { worker, calls };
}
const options = (extra = {}) => ({ loadOptions: { wasmURL: 'blob:test-owned' }, bytes: new Uint8Array([1, 2]), name: 'input.mp4', timeout: 15000, ...extra });

test('one-shot probe returns JSON only after exit0, then terminates once', async () => {
  const { worker, calls } = probeWorker();
  let disposed = 0;
  const probe = new IsolatedProbe(worker, () => { disposed++; });
  assert.deepEqual(await probe.run(options()), { format: { duration: '10' } });
  assert.deepEqual(calls.map(([name]) => name), ['load', 'write', 'probe', 'read', 'terminate']);
  assert.deepEqual(calls[2][1], probeArgs('input.mp4'));
  assert.equal(probe.disposed, true);
  probe.dispose();
  assert.equal(disposed, 1);
});
test('all nonzero and noninteger wrapper statuses reject before reading JSON', async () => {
  for (const exit of [1, -1, undefined, null, 0.5, '0']) {
    const { worker, calls } = probeWorker({ exit });
    const operation = new IsolatedProbe(worker);
    await assert.rejects(operation.run(options()), (error) => error.message === 'MEDIA_UNSUPPORTED' && error.probeExit === (Number.isInteger(exit) ? exit : undefined));
    assert.equal(calls.some(([name]) => name === 'read'), false);
    assert.equal(calls.filter(([name]) => name === 'terminate').length, 1);
  }
});
test('missing input probes native and still rejects; each new Worker has no previous file', async () => {
  for (const exit of [0, 1, 0]) {
    const { worker, calls } = probeWorker({ exit });
    const operation = new IsolatedProbe(worker);
    if (exit === 0) await operation.run(options());
    else await assert.rejects(operation.run(options({ bytes: undefined, missingInput: true })), /MEDIA_UNSUPPORTED/);
    assert.equal(calls.some(([name]) => name === 'write'), exit === 0);
    assert.equal(calls.filter(([name]) => name === 'terminate').length, 1);
  }
});
test('cancelled load or probe cannot read or revive a late success', async () => {
  for (const stage of ['load', 'probe']) {
    let release;
    const deferred = new Promise((resolve) => { release = resolve; });
    const { worker, calls } = probeWorker(stage === 'load' ? { load: () => deferred } : { probe: () => deferred });
    const operation = new IsolatedProbe(worker);
    const pending = operation.run(options());
    await new Promise((resolve) => setImmediate(resolve));
    operation.dispose();
    release(0);
    await assert.rejects(pending, /JOB_CANCELLED/);
    assert.equal(calls.some(([name]) => name === 'read'), false);
    assert.equal(calls.filter(([name]) => name === 'terminate').length, 1);
  }
});
test('trap, malformed and oversized JSON are sanitized and always release the Worker', async () => {
  for (const fixture of [{ probe: () => { throw new Error('synthetic-private-marker'); } }, { json: '{' }, { json: 'x'.repeat(65537) }, { json: new Uint8Array([1]) }]) {
    const { worker, calls } = probeWorker(fixture);
    await assert.rejects(new IsolatedProbe(worker).run(options()), (error) => error.message === 'MEDIA_UNSUPPORTED' && !error.message.includes('synthetic-private-marker'));
    assert.equal(calls.filter(([name]) => name === 'terminate').length, 1);
  }
});
