import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setTimeout as pause } from 'node:timers/promises';
import { fakeDocument } from './fixtures/dom-fake.mjs';
import { makePng } from './fixtures/images.mjs';
import { inspectImageHeader } from '../public/js/core/image-preflight.mjs';
import { bitmap } from './fixtures/browser-fakes.mjs';

async function until(condition) {
  // The product intentionally yields through a timer between decodes. setImmediate-only polling
  // can exhaust its iteration budget before Windows' timer phase becomes due.
  for (let i = 0; i < 100; i++) { if (condition()) return; await pause(2); }
  assert.fail('Offline event flow did not settle');
}

test('both language input→result→download events with Node File/Blob and FAKE DOM/Canvas; no browser claim', async () => {
  for (const language of ['zh-TW', 'en']) {
    const html = await readFile(new URL(language === 'en' ? '../public/en/index.html' : '../public/index.html', import.meta.url), 'utf8');
    const fixture = fakeDocument(language, html), events = new Map(), revoked = [], decoderCalls = [];
    const originals = { document: globalThis.document, createImageBitmap: globalThis.createImageBitmap, addEventListener: globalThis.addEventListener,
      create: URL.createObjectURL, revoke: URL.revokeObjectURL };
    globalThis.document = fixture.document;
    globalThis.addEventListener = (name, callback) => { const list = events.get(name) ?? []; list.push(callback); events.set(name, list); };
    globalThis.createImageBitmap = async (file, options) => {
      decoderCalls.push({ file, options });
      const m = inspectImageHeader(new Uint8Array(await file.arrayBuffer()));
      return bitmap(file.name, m.visualWidth, m.visualHeight);
    };
    URL.createObjectURL = (blob) => { assert.ok(blob instanceof Blob); return `blob:offline-${fixture.downloads.length}`; };
    URL.revokeObjectURL = (url) => revoked.push(url);
    const fire = (name, args = {}) => { for (const callback of events.get(name) ?? []) callback(args); };
    const $ = (id) => fixture.nodes.get(id);
    try {
      await import(`../public/js/app.js?offline-wiring=${language}`);
      assert.equal($('generate').disabled, true);
      const a = new File([makePng()], 'a\tB\n<script>.png', { type: 'image/png' });
      const b = new File([makePng()], 'B.png', { type: 'image/png' });
      $('files').files = [a, b]; $('files').dispatch('change');
      await until(() => $('status').dataset.state === 'ready');
      assert.equal(decoderCalls.length, 0); assert.equal($('source-list').children.length, 2);
      assert.ok($('source-list').textContent.includes('a\tB\n<script>.png'));
      assert.equal($('generate').disabled, false);
      $('generate').click(); await until(() => $('status').dataset.state === 'result');
      assert.equal(fixture.canvas.draws.length, 2); assert.equal($('preview').hidden, false);
      $('preview-scale').value = 'actual'; $('preview-scale').dispatch('change');
      assert.equal($('workspace').dataset.scale, 'actual'); assert.equal($('download-png').disabled, false);
      assert.deepEqual(decoderCalls[0].options, { imageOrientation: 'from-image' });
      $('download-png').click(); $('download-text').click();
      assert.deepEqual(fixture.downloads.map((d) => d.download), ['photo-contact-sheet.png', 'photo-contact-sheet-index.txt']);
      const up = $('source-list').querySelector('[data-row="1"][data-action="up"]'); up.focus(); up.click();
      assert.equal($('download-png').disabled, true); assert.equal($('preview').hidden, true); assert.equal(revoked.length, 2);
      assert.equal(fixture.document.activeElement.dataset.action, 'remove'); // the moved row's up control is now disabled
      $('generate').click(); await until(() => $('status').dataset.state === 'result');
      assert.equal(fixture.canvas.draws.at(-2)[0].id, 'B.png');
      $('show-names').checked = true; $('show-names').dispatch('change'); assert.equal($('download-text').disabled, true);
      $('columns').value = '6'; $('columns').dispatch('change'); assert.equal($('columns').value, '2');
      $('reset').click(); assert.equal($('source-list').children.length, 0); assert.equal($('preview').width, 0);
      fire('pagehide'); fire('pageshow', { persisted: true });
      $('files').files = [b]; $('files').dispatch('change'); await until(() => $('status').dataset.state === 'ready');
      $('generate').click(); await until(() => $('status').dataset.state === 'result');
      fire('pagehide'); assert.equal($('source-list').children.length, 0); assert.equal($('download-png').disabled, true);
    } finally {
      fire('pagehide');
      for (const key of ['document', 'createImageBitmap', 'addEventListener']) {
        if (originals[key] === undefined) delete globalThis[key]; else globalThis[key] = originals[key];
      }
      URL.createObjectURL = originals.create; URL.revokeObjectURL = originals.revoke;
    }
  }
});
