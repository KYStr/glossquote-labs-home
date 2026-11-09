// Validation boundaries and fixed error paths (SPEC inputsOutputs +
// implementation §1). Expected codes/paths are hand-derived from the SPEC,
// never from the implementation's output.
import test from 'node:test';
import assert from 'node:assert/strict';
import { solve } from '../public/js/core/solve.mjs';

function baseInput() {
  return {
    charged: 1,
    devices: [
      { name: 'A', runtime: 10, runs: [{ start: 0, end: 10 }] },
    ],
  };
}

function expectError(input, code, path) {
  assert.deepStrictEqual(solve(input), {
    status: 'error',
    error: { code, path },
  });
}

// --- SIZE: JSON UTF-8 65536 bytes, over the cap -> SIZE at the root ---
function sizedInput(targetBytes) {
  const base = {
    charged: 0,
    devices: [{ name: 'A', runtime: 10, runs: [{ start: 0, end: 1 }] }],
    extra: '',
  };
  const pad = targetBytes - Buffer.byteLength(JSON.stringify(base), 'utf8');
  return { ...base, extra: 'x'.repeat(pad) };
}

test('SIZE: 65537 bytes -> SIZE at root', () => {
  expectError(sizedInput(65537), 'SIZE', '');
});

test('SIZE: exactly 65536 bytes is not over the cap -> next check (SHAPE)', () => {
  expectError(sizedInput(65536), 'SHAPE', '/extra');
});

// --- root shape / type ---
test('TYPE: non-object roots', () => {
  for (const bad of [null, [], 'x', 42, true]) {
    expectError(bad, 'TYPE', '');
  }
});

test('SHAPE: unknown root key points at that key', () => {
  const d = baseInput();
  d.extra = 1;
  expectError(d, 'SHAPE', '/extra');
});

test('SHAPE: missing known root keys point at the missing key', () => {
  const a = baseInput();
  delete a.charged;
  expectError(a, 'SHAPE', '/charged');
  const b = baseInput();
  delete b.devices;
  expectError(b, 'SHAPE', '/devices');
});

// --- charged ---
test('TYPE/RANGE: charged', () => {
  const a = baseInput(); a.charged = '3';
  expectError(a, 'TYPE', '/charged');
  const b = baseInput(); b.charged = 1.5;
  expectError(b, 'TYPE', '/charged');
  const c = baseInput(); c.charged = -0;
  expectError(c, 'TYPE', '/charged');
  const d = baseInput(); d.charged = -1;
  expectError(d, 'RANGE', '/charged');
  const e = baseInput(); e.charged = 101;
  expectError(e, 'RANGE', '/charged');
  const f = baseInput(); f.charged = 0;
  assert.equal(solve(f).status, 'ok');
  const g = baseInput(); g.charged = 100;
  assert.equal(solve(g).status, 'ok');
});

// --- devices shape ---
test('TYPE/RANGE: devices must be an array of 1-8', () => {
  const a = baseInput(); a.devices = 'A';
  expectError(a, 'TYPE', '/devices');
  const b = baseInput(); b.devices = [];
  expectError(b, 'RANGE', '/devices');
  const c = baseInput();
  c.devices = Array.from({ length: 9 }, (_, i) => ({
    name: `D${i}`, runtime: 10, runs: [{ start: 0, end: 1 }],
  }));
  expectError(c, 'RANGE', '/devices');
});

test('SHAPE: unknown/missing device keys', () => {
  const a = baseInput();
  a.devices[0].extra = 1;
  expectError(a, 'SHAPE', '/devices/0/extra');
  const b = baseInput();
  delete b.devices[0].runs;
  expectError(b, 'SHAPE', '/devices/0/runs');
  const c = baseInput();
  c.devices[0] = 'A';
  expectError(c, 'TYPE', '/devices/0');
});

// --- name rules ---
test('name: empty or over 24 code points -> RANGE', () => {
  const a = baseInput(); a.devices[0].name = '';
  expectError(a, 'RANGE', '/devices/0/name');
  const b = baseInput(); b.devices[0].name = '   ';
  expectError(b, 'RANGE', '/devices/0/name');
  const c = baseInput(); c.devices[0].name = 'A'.repeat(25);
  expectError(c, 'RANGE', '/devices/0/name');
  const d = baseInput(); d.devices[0].name = 'A'.repeat(24);
  assert.equal(solve(d).status, 'ok');
});

test('name: non-string or bad characters -> TYPE', () => {
  const a = baseInput(); a.devices[0].name = 5;
  expectError(a, 'TYPE', '/devices/0/name');
  const b = baseInput(); b.devices[0].name = 'A!';
  expectError(b, 'TYPE', '/devices/0/name');
  const c = baseInput(); c.devices[0].name = '-A';
  expectError(c, 'TYPE', '/devices/0/name');
  const d = baseInput(); d.devices[0].name = ' A ';
  assert.equal(solve(d).status, 'ok');
  assert.equal(solve(d).result.events[0].device, 'A');
  const e = baseInput(); e.devices[0].name = '1abc';
  assert.equal(solve(e).status, 'ok');
  const f = baseInput(); f.devices[0].name = 'A B-2_x';
  assert.equal(solve(f).status, 'ok');
});

test('DUPLICATE: NFC-equal names collide at the second field; case differs', () => {
  const a = baseInput();
  a.devices.push({ name: 'A', runtime: 10, runs: [{ start: 0, end: 1 }] });
  expectError(a, 'DUPLICATE', '/devices/1/name');
  const b = baseInput();
  b.devices.push({ name: '\u00e9', runtime: 10, runs: [{ start: 0, end: 1 }] });
  b.devices[0].name = '\u00e9';
  b.devices[1].name = 'e\u0301';
  expectError(b, 'DUPLICATE', '/devices/1/name');
  const c = baseInput();
  c.devices.push({ name: 'a', runtime: 10, runs: [{ start: 0, end: 1 }] });
  assert.equal(solve(c).status, 'ok');
});

// --- runtime ---
test('TYPE/RANGE: runtime 10-1440 inclusive', () => {
  const a = baseInput(); a.devices[0].runtime = '30';
  expectError(a, 'TYPE', '/devices/0/runtime');
  const b = baseInput(); b.devices[0].runtime = 9;
  expectError(b, 'RANGE', '/devices/0/runtime');
  const c = baseInput(); c.devices[0].runtime = 1441;
  expectError(c, 'RANGE', '/devices/0/runtime');
  const d = baseInput(); d.devices[0].runtime = 1440;
  assert.equal(solve(d).status, 'ok');
});

// --- runs shape / bounds ---
test('TYPE/RANGE: runs must be an array of 1-16', () => {
  const a = baseInput(); a.devices[0].runs = 'x';
  expectError(a, 'TYPE', '/devices/0/runs');
  const b = baseInput(); b.devices[0].runs = [];
  expectError(b, 'RANGE', '/devices/0/runs');
  const c = baseInput();
  c.devices[0].runs = Array.from({ length: 17 }, (_, i) => ({ start: i * 2, end: i * 2 + 1 }));
  expectError(c, 'RANGE', '/devices/0/runs');
});

test('SHAPE/TYPE/RANGE: run fields', () => {
  const a = baseInput();
  a.devices[0].runs[0].extra = 1;
  expectError(a, 'SHAPE', '/devices/0/runs/0/extra');
  const b = baseInput();
  delete b.devices[0].runs[0].end;
  expectError(b, 'SHAPE', '/devices/0/runs/0/end');
  const c = baseInput(); c.devices[0].runs[0].start = '0';
  expectError(c, 'TYPE', '/devices/0/runs/0/start');
  const d = baseInput(); d.devices[0].runs[0].start = 1440;
  expectError(d, 'RANGE', '/devices/0/runs/0/start');
  const e = baseInput(); e.devices[0].runs[0].start = -1;
  expectError(e, 'RANGE', '/devices/0/runs/0/start');
  const f = baseInput(); f.devices[0].runs[0].end = 0;
  expectError(f, 'RANGE', '/devices/0/runs/0/end');
  const g = baseInput(); g.devices[0].runs[0].end = 1441;
  expectError(g, 'RANGE', '/devices/0/runs/0/end');
  const h = baseInput();
  h.devices[0].runs[0] = { start: 0, end: 1440 };
  assert.equal(solve(h).status, 'ok');
});

// --- ORDER / OVERLAP ---
test('ORDER: zero-length or reversed run points at its end', () => {
  const a = baseInput();
  a.devices[0].runs[0] = { start: 10, end: 10 };
  expectError(a, 'ORDER', '/devices/0/runs/0/end');
  const b = baseInput();
  b.devices[0].runs[0] = { start: 20, end: 10 };
  expectError(b, 'ORDER', '/devices/0/runs/0/end');
});

test('OVERLAP: touching segments are fine; overlap points at the later run', () => {
  const a = baseInput();
  a.devices[0].runs = [{ start: 0, end: 10 }, { start: 10, end: 20 }];
  assert.equal(solve(a).status, 'ok');
  const b = baseInput();
  b.devices[0].runs = [{ start: 0, end: 20 }, { start: 10, end: 30 }];
  expectError(b, 'OVERLAP', '/devices/0/runs/1/start');
  const c = baseInput();
  // Unsorted input: the later run in sorted order has original index 0.
  c.devices[0].runs = [{ start: 20, end: 30 }, { start: 0, end: 25 }];
  expectError(c, 'OVERLAP', '/devices/0/runs/0/start');
  const d = baseInput();
  d.devices[0].runs = [{ start: 0, end: 30 }, { start: 10, end: 20 }];
  expectError(d, 'OVERLAP', '/devices/0/runs/1/start');
});

// --- check ordering ---
test('ordering: SIZE beats SHAPE; SHAPE beats field TYPE; DUPLICATE beats ORDER; ORDER beats OVERLAP', () => {
  const size = sizedInput(65537);
  size.charged = 'bad';
  expectError(size, 'SIZE', '');

  const shape = baseInput();
  shape.extra = 1;
  shape.charged = 'bad';
  expectError(shape, 'SHAPE', '/extra');

  const dup = baseInput();
  dup.devices.push({ name: 'A', runtime: 10, runs: [{ start: 10, end: 10 }] });
  expectError(dup, 'DUPLICATE', '/devices/1/name');

  const order = baseInput();
  order.devices[0].runs = [{ start: 10, end: 10 }, { start: 5, end: 15 }];
  expectError(order, 'ORDER', '/devices/0/runs/0/end');
});
