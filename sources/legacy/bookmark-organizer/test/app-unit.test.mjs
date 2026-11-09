import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { probeDocument } from './ui-probe.mjs';
import { parseInput } from '../public/js/core/parser.js';
import { bytes } from './fixtures.mjs';
const source = '<TITLE>PRIVATE ENVELOPE</TITLE><DL><DT><H3>A</H3><DL><DT><A HREF="https://example.com/a">&lt;img src=x onerror=alert(1)&gt;</A><DT><A HREF="https://example.com/a">Second</A></DL></DL>';
for (const [lang, page] of [['zh-Hant', '../public/index.html'], ['en', '../public/en/index.html']]) {
  test(`[NODE_ONLY] ${lang}: controller wiring, literal title, confirmation, movement, artifacts and pagehide`, async () => {
    const html = await readFile(new URL(page, import.meta.url), 'utf8');
    const doc = probeDocument(html, lang), windowHandlers = {}, workers = [], blobs = [], revoked = [];
    const previous = { document: globalThis.document, window: globalThis.window, Worker: globalThis.Worker, create: URL.createObjectURL, revoke: URL.revokeObjectURL };
    globalThis.document = doc;
    globalThis.window = { addEventListener(name, callback) { windowHandlers[name] = callback; } };
    globalThis.Worker = class {
      constructor() { workers.push(this); }
      postMessage(message) { this.message = message; }
      terminate() { this.terminated = true; }
    };
    URL.createObjectURL = blob => { blobs.push(blob); return `blob:probe-${blobs.length}`; };
    URL.revokeObjectURL = value => revoked.push(value);
    try {
      await import(`../public/js/app.js?probe=${lang}`);
      const get = id => doc.getElementById(id);
      get('source').files = [{ name: '<img>.html', size: bytes(source).length, async arrayBuffer() { return bytes(source).buffer; } }];
      get('source').dispatch('change');
      await Promise.resolve();
      const worker = workers.at(-1), jobId = worker.message.jobId;
      worker.onmessage({ data: { type: 'result', jobId, result: parseInput(bytes(source), { jobId }) } });
      assert.equal(get('workspace').hidden, false);
      assert(get('bookmarks').textContent.includes('<img src=x onerror=alert(1)>'));
      assert(!get('bookmarks').textContent.includes('PRIVATE ENVELOPE'));
      const tags = node => [node.tagName, ...node.children.flatMap(tags)];
      assert(!tags(get('bookmarks')).includes('IMG'));
      assert(get('source-summary').textContent.includes('<img>.html'));
      assert.equal(blobs.length, 0); assert.equal(doc.downloads.length, 0);
      get('keeper-1').dispatch('change');
      assert.equal(get('include-0').checked, true); assert.equal(get('include-1').checked, true);
      get('keep-url-group-001').click();
      assert.equal(get('confirmation').hidden, false);
      get('cancel-exclude').click(); assert.equal(get('include-0').checked, true);
      get('include-1').checked = false; get('include-1').dispatch('change');
      assert.equal(get('include-1').checked, true);
      get('confirm-exclude').click(); assert.equal(get('include-1').checked, false);
      get('move-0').click(); get('new-path').value = 'Work\n2026'; get('folder-form').dispatch('submit');
      assert.equal(get('folder-editor').hidden, true);
      get('download-html').click(); get('download-json').click();
      assert.deepEqual(doc.downloads.map(item => item.download), ['bookmarks-organized.html', 'duplicate-report.json']);
      assert.deepEqual(parseInput(bytes(await blobs[0].text())).bookmarks.map(item => [item.title, item.folderPath]), [['<img src=x onerror=alert(1)>', ['Work', '2026']]]);
      assert.deepEqual(JSON.parse(await blobs[1].text()).bookmarks.map(item => [item.included, item.originalFolderPath, item.folderPath]), [[true, ['A'], ['Work', '2026']], [false, ['A'], ['A']]]);
      get('rename-path').value = 'private edit'; get('new-path').value = 'private new path';
      windowHandlers.pagehide();
      assert.equal(get('workspace').hidden, true); assert.equal(get('bookmarks').textContent, '');
      assert.equal(get('folder-tree').textContent, ''); assert.equal(get('source-summary').textContent, '');
      assert.equal(get('rename-from').options.length, 0); assert.equal(get('destination').options.length, 0);
      assert.equal(get('rename-path').value, ''); assert.equal(get('new-path').value, '');
      assert.deepEqual(revoked, ['blob:probe-1', 'blob:probe-2']);
      assert.equal(get('download-html').disabled, true);
    } finally {
      globalThis.document = previous.document; globalThis.window = previous.window; globalThis.Worker = previous.Worker;
      URL.createObjectURL = previous.create; URL.revokeObjectURL = previous.revoke;
    }
  });
}
