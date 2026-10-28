import test from 'node:test';
import assert from 'node:assert/strict';
import { generateContactSheet } from '../public/js/core/generate.mjs';
import { FakeCanvas, bitmap, lifecycleItems, deferred, tick } from './fixtures/browser-fakes.mjs';

test('A13/A16: serial draw/close order, exact sheet calls and no fourth-cell draw (FAKE Canvas)', async () => {
  const canvas = new FakeCanvas(), events = [], states = [];
  let active = 0, peak = 0;
  const output = await generateContactSheet(lifecycleItems(), { columns: 2 }, { canvas,
    decode: async (file) => {
      events.push('decode:' + file.name); active++; peak = Math.max(peak, active);
      return bitmap(file.name, 300, 200, () => { active--; events.push('close:' + file.name); });
    },
    onProgress: (p) => states.push([p.phase, p.index, p.total]), yieldControl: async () => {},
  });
  assert.equal(peak, 1); assert.equal(active, 0);
  assert.deepEqual(events, ['decode:A.png', 'close:A.png', 'decode:B.png', 'close:B.png', 'decode:C.png', 'close:C.png']);
  assert.equal(canvas.width, 544); assert.equal(canvas.height, 512);
  assert.deepEqual(canvas.fills, [{ color: '#ffffff', args: [0, 0, 544, 512] }]);
  assert.deepEqual(canvas.draws.map(([b, ...args]) => [b.id, ...args]), [
    ['A.png', 24, 34, 240, 160], ['B.png', 280, 34, 240, 160], ['C.png', 24, 274, 240, 160],
  ]);
  assert.deepEqual(canvas.labels.map((a) => a[0]), ['1', '2', '3']);
  assert.deepEqual(states, [['rendering', 1, 3], ['rendering', 2, 3], ['rendering', 3, 3], ['encoding', 3, 3]]);
  assert.equal(canvas.encodes, 1);
  assert.equal(new TextDecoder().decode(output.indexText), 'Photo contact sheet index v1\n1\t"A.png"\t300x200\n2\t"B.png"\t300x200\n3\t"C.png"\t300x200\n');
});
test('A17: cancel a pending decode; late bitmap closes once, no draw/encode/result', async () => {
  const canvas = new FakeCanvas(), gate = deferred(), abort = new AbortController();
  let calls = 0;
  const task = generateContactSheet(lifecycleItems(), {}, { canvas, signal: abort.signal,
    decode: () => { calls++; return gate.promise; } });
  abort.abort(); const late = bitmap(); gate.resolve(late);
  await assert.rejects(task, { code: 'CANCELLED' });
  assert.equal(calls, 1); assert.equal(late.closes, 1); assert.equal(canvas.draws.length, 0);
  assert.equal(canvas.encodes, 0); assert.equal(canvas.width, 0); assert.equal(canvas.height, 0);
});
test('A18: stale encoding discards callback; no late output', async () => {
  const canvas = new FakeCanvas({ deferEncode: true }); let current = 4;
  const task = generateContactSheet(lifecycleItems(1), {}, { canvas, decode: async () => bitmap(),
    generation: 4, isCurrent: (g) => g === current, yieldControl: async () => {} });
  await tick(); assert.equal(canvas.encodes, 1);
  current = 5; canvas.callback(new Blob(['fake'], { type: 'image/png' }));
  await assert.rejects(task, { code: 'CANCELLED' }); assert.equal(canvas.width, 0);
});
test('all eight oriented metadata dimensions are checked (mirrored pixel appearance is NOT tested)', async () => {
  for (let orientation = 1; orientation <= 8; orientation++) {
    const items = lifecycleItems(1); Object.assign(items[0].metadata, { orientation,
      visualWidth: orientation >= 5 ? 200 : 300, visualHeight: orientation >= 5 ? 300 : 200 });
    const b = bitmap('oriented', orientation >= 5 ? 200 : 300, orientation >= 5 ? 300 : 200);
    const canvas = new FakeCanvas();
    await generateContactSheet(items, {}, { canvas, decode: async () => b, yieldControl: async () => {} });
    assert.equal(b.closes, 1); assert.equal(canvas.draws.length, 1);
  }
  const items = lifecycleItems(1); Object.assign(items[0].metadata, { orientation: 6, visualWidth: 200, visualHeight: 300 });
  const b = bitmap();
  await assert.rejects(generateContactSheet(items, {}, { canvas: new FakeCanvas(), decode: async () => b }), { code: 'ORIENTATION_MISMATCH' });
  assert.equal(b.closes, 1);
});
test('default product decoder explicitly requests from-image; this test stubs the global API', async () => {
  const previous = globalThis.createImageBitmap; const calls = [];
  globalThis.createImageBitmap = async (...args) => { calls.push(args); return bitmap(); };
  try {
    const items = lifecycleItems(1);
    await generateContactSheet(items, {}, { canvas: new FakeCanvas(), yieldControl: async () => {} });
    assert.equal(calls[0][0], items[0].file); assert.deepEqual(calls[0][1], { imageOrientation: 'from-image' });
  } finally { if (previous === undefined) delete globalThis.createImageBitmap; else globalThis.createImageBitmap = previous; }
});
test('decode/draw/context/encode failures clear the entire canvas and close any bitmap', async () => {
  const cases = [
    { config: {}, decode: async () => { throw new Error('fake'); }, code: 'DECODE_FAILED' },
    { config: { nullContext: true }, code: 'CANVAS_UNAVAILABLE' },
    { config: { throwDraw: true }, code: 'CANVAS_UNAVAILABLE' },
    { config: { blob: null }, code: 'PNG_EXPORT_FAILED' },
    { config: { blob: { type: 'image/jpeg', size: 4 } }, code: 'PNG_EXPORT_FAILED' },
    { config: { throwEncode: true }, code: 'PNG_EXPORT_FAILED' },
    { config: { blob: { type: 'image/png', size: 67_108_865 } }, code: 'OUTPUT_TOO_LARGE' },
  ];
  for (const c of cases) {
    const canvas = new FakeCanvas(c.config), b = bitmap(); let calls = 0;
    await assert.rejects(generateContactSheet(lifecycleItems(1), {}, { canvas, decode: c.decode ?? (async () => { calls++; return b; }), yieldControl: async () => {} }), { code: c.code });
    assert.equal(canvas.width, 0); assert.equal(canvas.height, 0); assert.equal(b.closes, calls);
  }
});
test('pre-render count/options/TXT cap reject before context allocation and decoding', async () => {
  const canvas = new FakeCanvas(); let calls = 0;
  const decode = async () => { calls++; return bitmap(); };
  await assert.rejects(generateContactSheet(lifecycleItems(), { columns: 7 }, { canvas, decode }), { code: 'SHEET_PIXEL_LIMIT' });
  const items = lifecycleItems(1); items[0].file.name = 'x'.repeat(131_072);
  await assert.rejects(generateContactSheet(items, {}, { canvas, decode }), { code: 'OUTPUT_TOO_LARGE' });
  assert.equal(calls, 0); assert.equal(canvas.calls.length, 0);
});
test('name labels preserve numbering and fit at most two text calls per filename', async () => {
  const canvas = new FakeCanvas(), items = lifecycleItems(1); items[0].file.name = '😀'.repeat(40);
  await generateContactSheet(items, { showNames: true }, { canvas, decode: async () => bitmap(), yieldControl: async () => {} });
  assert.equal(canvas.labels[0][0], '1'); assert.equal(canvas.labels.length, 3);
  assert.equal(canvas.labels.slice(1).map((a) => a[0]).join(''), '😀'.repeat(31) + '…');
  assert.equal(new TextDecoder().decode((await generateContactSheet(items, {}, { canvas, decode: async () => bitmap(), yieldControl: async () => {} })).indexText).includes('😀'.repeat(40)), true);
});
