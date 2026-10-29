import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createEditorController, displayFilename, downloadName } from '../public/js/controller.mjs';
import { ERROR_CODES } from '../public/js/core/session.mjs';
import zh from '../public/js/locales/zh-Hant.mjs';
import en from '../public/js/locales/en.mjs';
import { png, chunk } from './fixtures.mjs';

function fakeCanvas() {
  const calls = [], resizes = []; let width = 1, height = 1;
  const context = { setTransform: (...args) => calls.push(['transform', ...args]), fillRect: (...args) => calls.push(['fill', context.fillStyle, context.globalAlpha, context.globalCompositeOperation, ...args]), drawImage: (...args) => calls.push(['image', ...args.slice(1)]) };
  return { get width() { return width; }, set width(value) { resizes.push(['width', value]); width = value; }, get height() { return height; }, set height(value) { resizes.push(['height', value]); height = value; }, calls, resizes, getContext: () => context };
}
const bitmap = (width = 24, height = 16) => ({ width, height, closed: 0, close() { this.closed++; } });
test('two complete static language pages have equivalent controls, labelled fields, disabled export and nonmodal confirmations', async () => {
  const pages = await Promise.all(['index.html', 'en/index.html'].map(file => readFile(new URL(`../public/${file}`, import.meta.url), 'utf8')));
  const ids = page => [...page.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]).sort();
  assert.deepEqual(ids(pages[0]), ids(pages[1]));
  assert.equal(new Set(ids(pages[0])).size, ids(pages[0]).length);
  for (const page of pages) {
    assert.match(page, /id="generate"[^>]+disabled/); assert.match(page, /id="download"[^>]+disabled/);
    assert.match(page, /id="replace-confirm"[^>]+hidden/); assert.match(page, /id="masks-confirm"[^>]+hidden/);
    assert.doesNotMatch(page, /<dialog\b|autofocus|\son\w+=|\bmultiple\b|draggable=/);
    assert.equal((page.match(/<summary>/g) ?? []).length, 5);
    for (const key of ['x', 'y', 'width', 'height']) assert.match(page, new RegExp(`for="mask-${key}"`));
  }
  assert.match(pages[0], /lang="zh-Hant"/); assert.match(pages[1], /lang="en"/);
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort());
  for (const code of ERROR_CODES) { assert.equal(typeof zh.errors[code], 'string'); assert.equal(typeof en.errors[code], 'string'); }
});
test('H01/H03 real controller size gate has zero arrayBuffer and decode calls (Node fake resource only)', async () => {
  let reads = 0, decodes = 0;
  class SizeOnlyFile extends Blob { get size() { return 8_388_609; } arrayBuffer() { reads++; return super.arrayBuffer(); } }
  const controller = createEditorController({ canvas: fakeCanvas(), decode: () => { decodes++; } });
  await controller.requestSource(new SizeOnlyFile([])); assert.equal(controller.getState().error.code, 'FILE_TOO_LARGE');
  await controller.requestSource(new File([], 'empty.png')); assert.equal(controller.getState().error.code, 'FILE_EMPTY');
  assert.equal(reads, 0); assert.equal(decodes, 0);
});
test('predecode parser refuses animation and dimension limits independently of name/type', async () => {
  let decodes = 0;
  const controller = createEditorController({ canvas: fakeCanvas(), decode: () => { decodes++; return bitmap(); } });
  await controller.requestSource(new File([png({ before: [chunk('acTL', new Uint8Array(8))] })], 'safe.jpg', { type: 'image/jpeg' }));
  assert.equal(controller.getState().error.code, 'ANIMATED_PNG');
  await controller.requestSource(new File([png({ width: 8193, height: 1 })], 'small.png'));
  assert.equal(controller.getState().error.code, 'DIMENSION_LIMIT'); assert.equal(decodes, 0);
  await controller.requestSource(new File([png()], 'wrong.svg', { type: 'text/plain' }));
  assert.equal(controller.getState().phase, 'ready-no-mask'); assert.equal(decodes, 1);
});
test('decode explicitly requests from-image, rejects mismatching Bitmap, closes it and permits recovery', async () => {
  const wrong = bitmap(16, 24), right = bitmap(); let calls = 0;
  const controller = createEditorController({ canvas: fakeCanvas(), decode: (file, settings) => {
    assert.deepEqual(settings, { imageOrientation: 'from-image' }); return calls++ === 0 ? wrong : right;
  } });
  await controller.requestSource(new File([png()], 'fake.png'));
  assert.equal(controller.getState().error.code, 'DECODE_DIMENSION_MISMATCH'); assert.equal(wrong.closed, 1);
  await controller.requestSource(new File([png()], 'fake.png')); assert.equal(controller.getState().phase, 'ready-no-mask');
  controller.clearSource(); assert.equal(right.closed, 1);
});
test('N01 filename controls are visible text; static app uses textContent and fixed download name', async () => {
  assert.equal(displayFilename('fake\r\n\u202e.png'), 'fakeU+000DU+000AU+202E.png');
  const hostile = '"><img src=x onerror=1>.png'; assert.equal(displayFilename(hostile), hostile);
  const app = await readFile(new URL('../public/js/app.mjs', import.meta.url), 'utf8');
  assert.match(app, /\['source-name'\]\.textContent = sourceName/); assert.doesNotMatch(app, /\.focus\s*\(/);
  assert.doesNotMatch(app, /\['mask-list'\]\.replaceChildren/);
  assert.equal(downloadName, 'glossquote-image-redacted.png');
});
test('source replacement and clear masks are pending inline decisions; clear source is immediate', async () => {
  let decodes = 0; const first = bitmap(); let view;
  const canvas = fakeCanvas();
  const controller = createEditorController({ canvas, decode: () => { decodes++; return decodes === 1 ? first : bitmap(); }, onChange: next => { view = next; } });
  await controller.requestSource(new File([png()], 'one.png'));
  controller.addMask({ x: 0, y: 0, width: 1, height: 1 });
  await controller.requestSource(new File([png()], 'two.png')); assert.equal(view.replacePending, true); assert.equal(decodes, 1);
  controller.cancelSource(); assert.equal(view.replacePending, false); assert.equal(controller.getState().masks.length, 1); assert.equal(first.closed, 0);
  controller.requestClearMasks(); controller.cancelClearMasks(); assert.equal(controller.getState().masks.length, 1);
  controller.requestClearMasks(); controller.confirmClearMasks(); assert.equal(controller.getState().masks.length, 0);
  controller.clearSource(); assert.equal(first.closed, 1); assert.equal(canvas.width, 1); assert.equal(canvas.height, 1); assert.equal(controller.getState().phase, 'idle');
});

const turn = () => new Promise(resolve => setImmediate(resolve));
const encoded = (width = 24, height = 16) => new Blob([png({ width, height })], { type: 'image/png' });
async function outputHarness(extra = {}) {
  const callbacks = [], canvases = [], created = [], revoked = [], previews = [], downloads = [];
  const sourceBitmap = bitmap(), surface = fakeCanvas(); let clears = 0, resets = 0;
  const controller = createEditorController({
    canvas: surface, decode: () => sourceBitmap, defer: async () => {},
    createCanvas: () => {
      const canvas = fakeCanvas(); canvas.toBlob = (callback, mime) => { assert.equal(mime, 'image/png'); callbacks.push(callback); };
      canvases.push(canvas); return canvas;
    },
    createUrl: blob => { created.push(blob); return `blob:synthetic-${created.length}`; }, revokeUrl: url => revoked.push(url),
    presentPreview: preview => previews.push(preview), clearPreview: () => { clears++; }, resetInput: () => { resets++; },
    requestDownload: (...args) => downloads.push(args), ...extra,
  });
  await controller.requestSource(new File([png()], 'synthetic.png'));
  controller.addMask({ x: 1, y: 1, width: 2, height: 1 });
  return { controller, callbacks, canvases, created, revoked, previews, downloads, sourceBitmap, surface, get clears() { return clears; }, get resets() { return resets; } };
}
test('compositing command order is white, source, integer black/alpha1/source-over (stub, not pixel proof)', async () => {
  const harness = await outputHarness();
  const generation = harness.controller.generate(); await turn();
  assert.deepEqual(harness.canvases[0].calls, [
    ['transform', 1, 0, 0, 1, 0, 0], ['fill', '#ffffff', 1, 'source-over', 0, 0, 24, 16],
    ['image', 0, 0, 24, 16], ['fill', '#000000', 1, 'source-over', 1, 1, 2, 1],
  ]);
  harness.callbacks[0](encoded()); await generation;
  assert.equal(harness.canvases[0].width, 1); assert.equal(harness.canvases[0].height, 1);
});
test('same Blob is URL-backed for preview and explicit download, gated by real preview dimensions contract', async () => {
  const h = await outputHarness();
  const generation = h.controller.generate(); await turn();
  const blob = encoded(); h.callbacks[0](blob); await generation;
  assert.strictEqual(h.created[0], blob); assert.equal(h.controller.getState().output.mime, 'image/png');
  assert.equal(h.controller.download(), false); assert.equal(h.downloads.length, 0);
  h.previews[0].onLoad({ width: 24, height: 16 });
  assert.equal(h.controller.download(), true);
  assert.deepEqual(h.downloads, [[h.previews[0].url, 'glossquote-image-redacted.png']]);
  h.controller.updateMask({ x: 3, y: 1, width: 2, height: 1 });
  assert.equal(h.controller.getState().output, null); assert.deepEqual(h.revoked, [h.previews[0].url]); assert.equal(h.controller.download(), false);
  h.previews[0].onLoad({ width: 24, height: 16 }); assert.equal(h.controller.getState().output, null);
});
test('uncommitted numeric input invalidation synchronously revokes output', async () => {
  const h = await outputHarness(); const generation = h.controller.generate(); await turn(); h.callbacks[0](encoded()); await generation;
  h.previews[0].onLoad({ width: 24, height: 16 }); h.controller.invalidateOutput();
  assert.equal(h.controller.getState().output, null); assert.equal(h.controller.download(), false); assert.equal(h.revoked.length, 1);
});
test('S01 controller old encoder A never creates URL or cleans current B canvas', async () => {
  const h = await outputHarness();
  const a = h.controller.generate(); await turn();
  h.controller.updateMask({ x: 2, y: 2, width: 1, height: 1 });
  const b = h.controller.generate(); await turn();
  assert.equal(h.canvases[0].width, 1); assert.equal(h.canvases[1].width, 24);
  h.callbacks[0](encoded()); await a;
  assert.equal(h.created.length, 0); assert.equal(h.canvases[1].width, 24);
  const latest = encoded(); h.callbacks[1](latest); await b;
  assert.equal(h.created.length, 1); assert.strictEqual(h.created[0], latest);
});
test('S02 cancel is synchronous; late Blob cannot become an output', async () => {
  const h = await outputHarness();
  const generation = h.controller.generate(); await turn();
  h.controller.cancelGeneration();
  assert.equal(h.controller.getState().phase, 'ready'); assert.equal(h.canvases[0].width, 1); assert.equal(h.controller.download(), false);
  h.callbacks[0](encoded()); await generation;
  assert.equal(h.created.length, 0); assert.equal(h.controller.getState().output, null);
});
test('S03 late Bitmap closes after newer selection and never changes its canvas', async () => {
  const resolves = []; let decodeCalls = 0;
  const controller = createEditorController({ canvas: fakeCanvas(), decode: () => { decodeCalls++; return new Promise(resolve => resolves.push(resolve)); } });
  const a = controller.requestSource(new File([png()], 'one.png')); await turn();
  const b = controller.requestSource(new File([png()], 'two.png')); await turn();
  assert.equal(decodeCalls, 2);
  const latest = bitmap(); resolves[1](latest); await b;
  const old = bitmap(); resolves[0](old); await a;
  assert.equal(old.closed, 1); assert.equal(latest.closed, 0); assert.equal(controller.getState().phase, 'ready-no-mask');
});
test('S04 pagehide immediately releases all owned resources; BFCache restore stays empty', async () => {
  const h = await outputHarness();
  const first = h.controller.generate(); await turn(); h.callbacks[0](encoded()); await first;
  h.previews[0].onLoad({ width: 24, height: 16 });
  const resetsBefore = h.resets;
  h.controller.pagehide();
  assert.equal(h.controller.getState().phase, 'disposed'); assert.equal(h.controller.getState().source, null); assert.deepEqual(h.controller.getState().masks, []);
  assert.equal(h.sourceBitmap.closed, 1); assert.equal(h.surface.width, 1); assert.equal(h.surface.height, 1); assert.ok(h.resets > resetsBefore);
  assert.deepEqual(h.revoked, ['blob:synthetic-1']); assert.equal(h.controller.download(), false);
  h.controller.pageshow(true); assert.equal(h.controller.getState().phase, 'idle'); assert.equal(h.controller.getState().output, null);
  h.previews[0].onLoad({ width: 24, height: 16 }); assert.equal(h.controller.getState().output, null);
});
test('pagehide while decoding closes a later bitmap and while encoding rejects a later Blob', async () => {
  let resolveBitmap;
  const surface = fakeCanvas();
  const controller = createEditorController({ canvas: surface, decode: () => new Promise(resolve => { resolveBitmap = resolve; }) });
  const pending = controller.requestSource(new File([png()], 'one.png')); await turn();
  controller.pagehide(); const late = bitmap(); resolveBitmap(late); await pending;
  assert.equal(late.closed, 1); assert.equal(surface.width, 1); assert.equal(controller.getState().phase, 'disposed');
  const h = await outputHarness(); const generation = h.controller.generate(); await turn();
  h.controller.pagehide(); h.callbacks[0](encoded()); await generation;
  assert.equal(h.created.length, 0); assert.equal(h.canvases[0].width, 1);
});
test('null, wrong MIME, wrong dimensions and invalid PNG signature cannot create URL; source/masks remain editable', async () => {
  for (const [blob, code] of [[null, 'ENCODE_FAILED'], [new Blob([png()], { type: 'image/jpeg' }), 'OUTPUT_INVALID'], [encoded(16, 24), 'OUTPUT_INVALID'], [new Blob([new Uint8Array(100)], { type: 'image/png' }), 'OUTPUT_INVALID']]) {
    const h = await outputHarness(); const generation = h.controller.generate(); await turn(); h.callbacks[0](blob); await generation;
    assert.equal(h.controller.getState().error.code, code); assert.equal(h.controller.getState().masks.length, 1); assert.equal(h.created.length, 0); assert.equal(h.sourceBitmap.closed, 0);
  }
});
test('preview error/dimension mismatch revoke URL and stale preview events cannot re-enable download', async () => {
  const h = await outputHarness(); const generation = h.controller.generate(); await turn(); h.callbacks[0](encoded()); await generation;
  h.previews[0].onLoad({ width: 16, height: 24 });
  assert.equal(h.controller.getState().error.code, 'OUTPUT_INVALID'); assert.equal(h.controller.download(), false); assert.deepEqual(h.revoked, ['blob:synthetic-1']);
});
test('S05 controller refuses zero masks before allocating encoder, 50 masks generate; invalid coordinate update revokes output', async () => {
  const h = await outputHarness(); h.controller.undoMask(); await h.controller.generate();
  assert.equal(h.controller.getState().error.code, 'MASK_REQUIRED'); assert.equal(h.canvases.length, 0);
  for (let index = 0; index < 50; index++) h.controller.addMask({ x: 1, y: 1, width: 1, height: 1 });
  const generation = h.controller.generate(); await turn(); h.callbacks[0](encoded()); await generation;
  assert.equal(h.controller.getState().masks.length, 50); assert.equal(h.created.length, 1);
  h.controller.updateMask({ x: 24, y: 0, width: 1, height: 1 });
  assert.equal(h.controller.getState().error.code, 'MASK_OUT_OF_BOUNDS'); assert.equal(h.controller.getState().masks.length, 50); assert.equal(h.controller.getState().output, null); assert.equal(h.revoked.length, 1);
});

test('r2: 25 draft updates at 16M pixel dimensions perform zero original-canvas resizes or draws; pointer commit redraws once', async () => {
  const surface = fakeCanvas(), drafts = [];
  const controller = createEditorController({ canvas: surface, decode: () => bitmap(4000, 4000), presentDraft: preview => drafts.push(preview) });
  await controller.requestSource(new File([png({ width: 4000, height: 4000 })], 'synthetic-16m.png'));
  const baselineResizes = surface.resizes.length, baselineCalls = surface.calls.length;
  const client = { left: 100, top: 50, width: 1000, height: 1000 }, start = { x: 100, y: 50 };
  for (let index = 1; index <= 25; index++) controller.showDraft(start, { x: 100 + index, y: 50 + index }, client);
  assert.equal(surface.resizes.length - baselineResizes, 0); assert.equal(surface.calls.length - baselineCalls, 0);
  assert.equal(controller.getState().masks.length, 0);
  assert.deepEqual(drafts.at(-1), { rect: { x: 0, y: 0, width: 100, height: 100 }, visualWidth: 4000, visualHeight: 4000 });
  assert.equal(drafts.filter(Boolean).length, 25);
  controller.clearDraft(); assert.equal(drafts.at(-1), null);
  assert.equal(surface.resizes.length - baselineResizes, 0); assert.equal(surface.calls.length - baselineCalls, 0);
  controller.addPointer(start, { x: 125, y: 75 }, client);
  assert.deepEqual(controller.getState().masks, [{ id: 'mask-1', x: 0, y: 0, width: 100, height: 100 }]);
  assert.equal(surface.resizes.length - baselineResizes, 2);
  assert.equal(surface.calls.slice(baselineCalls).filter(call => call[0] === 'image').length, 1);
  assert.equal(drafts.at(-1), null);
});
test('r2: draft uses the existing floor/ceil/reverse/clamp mapping; zero span hides it without committing', async () => {
  const drafts = [], canvas = fakeCanvas();
  const controller = createEditorController({ canvas, decode: () => bitmap(), presentDraft: preview => drafts.push(preview) });
  await controller.requestSource(new File([png()], 'synthetic.png'));
  const client = { left: 10, top: 20, width: 24, height: 16 };
  controller.showDraft({ x: 8, y: 19 }, { x: 13.2, y: 24.1 }, client);
  assert.deepEqual(drafts.at(-1).rect, { x: 0, y: 0, width: 4, height: 5 });
  controller.showDraft({ x: 13.2, y: 24.1 }, { x: 8, y: 19 }, client);
  assert.deepEqual(drafts.at(-1).rect, { x: 0, y: 0, width: 4, height: 5 });
  controller.showDraft({ x: 11.2, y: 21.2 }, { x: 11.2, y: 24 }, client); assert.equal(drafts.at(-1), null);
  assert.equal(controller.getState().masks.length, 0);
  controller.addMask({ x: 2, y: 1, width: 2, height: 1 }); assert.equal(drafts.at(-1), null);
  controller.showDraft({ x: 11, y: 21 }, { x: 12, y: 22 }, client);
  controller.pagehide(); assert.equal(drafts.at(-1), null);
  controller.pageshow(true); assert.equal(drafts.at(-1), null);
});
test('r2: encoder draws only committed masks while a draft is visible; clears remove the draft', async () => {
  const drafts = [], h = await outputHarness({ presentDraft: preview => drafts.push(preview) });
  h.controller.showDraft({ x: 0, y: 0 }, { x: 5, y: 5 }, { left: 0, top: 0, width: 24, height: 16 });
  assert.deepEqual(drafts.at(-1).rect, { x: 0, y: 0, width: 5, height: 5 });
  const generation = h.controller.generate(); await turn();
  assert.equal(drafts.at(-1), null);
  assert.deepEqual(h.canvases[0].calls.filter(call => call[0] === 'fill' && call[1] === '#000000'), [['fill', '#000000', 1, 'source-over', 1, 1, 2, 1]]);
  h.callbacks[0](encoded()); await generation;
  h.controller.showDraft({ x: 0, y: 0 }, { x: 5, y: 5 }, { left: 0, top: 0, width: 24, height: 16 });
  h.controller.clearSource(); assert.equal(drafts.at(-1), null); assert.equal(h.controller.getState().masks.length, 0);
});
test('r2: display-only draft has opaque black non-interactive CSS and cancel/resize wiring never redraws the bitmap', async () => {
  const app = await readFile(new URL('../public/js/app.mjs', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles/app.css', import.meta.url), 'utf8');
  assert.match(css, /\.draft-mask\s*\{[^}]*pointer-events: none;[^}]*background: #000000;[^}]*opacity: 1;/);
  assert.match(app, /globalThis\.addEventListener\('resize', cancelDraft\)/);
  assert.match(app, /canvas\.addEventListener\('pointercancel', cancelDraft\)/);
  assert.doesNotMatch(app, /controller\.redraw\(/);
  for (const file of ['index.html', 'en/index.html']) {
    const page = await readFile(new URL(`../public/${file}`, import.meta.url), 'utf8');
    assert.match(page, /id="image-stage"[^>]*>[\s\S]*?<canvas id="editor-canvas"[\s\S]*?id="draft-mask"[^>]*aria-hidden="true"[^>]*hidden/);
  }
});
