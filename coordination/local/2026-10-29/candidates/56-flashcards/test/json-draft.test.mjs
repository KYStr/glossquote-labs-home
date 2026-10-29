import test from 'node:test';
import assert from 'node:assert/strict';
import { mount } from '../public/js/app.mjs';
import { page } from '../scripts/pages.mjs';
import { fakeDocument, fakeHost } from './fake-document.mjs';
import zh from '../public/js/locales/zh-Hant.mjs';
import en from '../public/js/locales/en.mjs';

const DRAFT = ' \n{\n  "schemaVersion": 1,\n  "cards": [{"id":17,"question":"Pasted draft < & 😀","answer":"Original answer"}],\n  "known": [17]\n}\n ';
const FILE_JSON = '{"schemaVersion":1,"cards":[{"id":29,"question":"Selected file card","answer":"File answer"}],"known":[]}';
const encode = text => new TextEncoder().encode(text);
const settle = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject, cancelled = false;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject, cancel: () => { cancelled = true; }, get cancelled() { return cancelled; } };
}
function setup(copy, readFile) {
  const doc = fakeDocument(page(copy)), host = fakeHost();
  const controller = mount(doc, host, { readFile });
  const get = id => doc.getElementById(id);
  get('source').value = 'question,answer\nA,a\nB,b\nC,c'; get('source').fire('input'); get('start').click();
  get('reveal').click(); get('assessKnown').click();
  get('jsonText').value = DRAFT; get('jsonText').fire('input');
  get('outputType').value = 'json'; get('prepare').click();
  assert.ok(controller.snapshot().prepared);
  const original = controller.snapshot().session;
  const select = size => { get('jsonFile').files = [{ size }]; get('jsonFile').fire('change'); };
  const unchanged = () => {
    assert.equal(get('jsonText').value, DRAFT, 'The exact pasted draft, including whitespace, must survive');
    assert.equal(controller.snapshot().session, original, 'The old session must not be replaced before confirmation');
    assert.deepEqual([...controller.snapshot().session.known], [1]);
    assert.equal(controller.snapshot().prepared, null, 'Old prepared output must remain invalid');
  };
  return { controller, host, get, select, unchanged };
}

for (const copy of [zh, en]) {
  for (const scenario of ['oversized', 'read-failed', 'invalid-utf8', 'invalid-schema', 'invalid-json']) {
    test(`R01 app fake DOM (${copy.locale}): ${scenario} JSON selection preserves pasted draft and old progress`, async () => {
      const task = deferred(); let reads = 0;
      const fixture = setup(copy, () => { reads++; return task; });
      try {
        fixture.select(scenario === 'oversized' ? 2097153 : 100);
        fixture.unchanged();
        const expected = { oversized: 'SOURCE_TOO_LARGE', 'read-failed': 'FILE_READ_FAILED', 'invalid-utf8': 'INVALID_UTF8', 'invalid-schema': 'INVALID_SCHEMA', 'invalid-json': 'INVALID_JSON' }[scenario];
        if (scenario === 'oversized') assert.equal(reads, 0);
        else if (scenario === 'read-failed') task.reject(new Error('FAKE_FILE_FAILURE'));
        else task.resolve(scenario === 'invalid-utf8' ? Uint8Array.from([195, 40]) : encode(scenario === 'invalid-schema' ? '{"schemaVersion":2,"cards":[],"known":[]}' : '{'));
        await settle();
        fixture.unchanged(); assert.equal(fixture.controller.snapshot().error.code, expected);
        assert.equal(fixture.get('error').hidden, false); assert.ok(fixture.get('error').textContent.includes(copy.errors[expected]));
        assert.equal(fixture.get('importPreview').hidden, true); assert.equal(fixture.get('importSource').textContent, '');
      } finally { fixture.host.fire('pagehide'); }
    });
  }
  test(`R01 app fake DOM (${copy.locale}): cancelling a JSON read preserves the draft even after late completion`, async () => {
    const task = deferred(), fixture = setup(copy, () => task);
    try {
      fixture.select(100); fixture.unchanged(); assert.equal(fixture.get('busy').hidden, false);
      fixture.get('cancelRead').click(); fixture.unchanged(); assert.equal(task.cancelled, true);
      task.resolve(encode(FILE_JSON)); await settle(); fixture.unchanged();
      assert.equal(fixture.get('busy').hidden, true); assert.equal(fixture.get('importPreview').hidden, true); assert.equal(fixture.controller.snapshot().pendingImportSource, null);
    } finally { fixture.host.fire('pagehide'); }
  });
  test(`R01 app fake DOM (${copy.locale}): file preview identifies its source; cancelling keeps the distinct paste draft`, async () => {
    const task = deferred(), fixture = setup(copy, () => task);
    try {
      fixture.select(100); task.resolve(encode(FILE_JSON)); await settle(); fixture.unchanged();
      assert.equal(fixture.get('importPreview').hidden, false); assert.equal(fixture.get('importSource').textContent, copy.ui.importFromFile);
      assert.equal(fixture.get('incomingCards').children[0].textContent, 'Selected file card');
      fixture.get('cancelImport').click(); fixture.unchanged(); assert.equal(fixture.get('importSource').textContent, '');
      fixture.get('previewImport').click(); fixture.unchanged();
      assert.equal(fixture.get('importSource').textContent, copy.ui.importFromPaste); assert.equal(fixture.get('incomingCards').children[0].textContent, 'Pasted draft < & 😀');
      fixture.get('cancelImport').click(); fixture.unchanged();
    } finally { fixture.host.fire('pagehide'); }
  });
  test(`R01 app fake DOM (${copy.locale}): only confirmed paste replacement clears the pasted draft`, () => {
    const fixture = setup(copy, () => { throw new Error('NO_FILE_SHOULD_BE_READ'); });
    try {
      fixture.get('previewImport').click(); fixture.unchanged(); assert.equal(fixture.get('importSource').textContent, copy.ui.importFromPaste);
      fixture.get('cancelImport').click(); fixture.unchanged();
      fixture.get('previewImport').click(); fixture.unchanged(); fixture.get('confirmImport').click();
      assert.equal(fixture.get('jsonText').value, ''); assert.equal(fixture.controller.snapshot().session.cards.length, 1);
      assert.equal(fixture.controller.snapshot().session.cards[0].question, 'Pasted draft < & 😀'); assert.deepEqual([...fixture.controller.snapshot().session.known], [17]);
      assert.equal(fixture.get('importPreview').hidden, true); assert.equal(fixture.get('importSource').textContent, '');
    } finally { fixture.host.fire('pagehide'); }
  });
  test(`R01 app fake DOM (${copy.locale}): confirmed file replacement clears the kept draft and imports the file`, async () => {
    const task = deferred(), fixture = setup(copy, () => task);
    try {
      fixture.select(100); task.resolve(encode(FILE_JSON)); await settle(); fixture.unchanged();
      assert.equal(fixture.get('importSource').textContent, copy.ui.importFromFile); fixture.get('confirmImport').click();
      assert.equal(fixture.get('jsonText').value, ''); assert.equal(fixture.controller.snapshot().session.cards[0].question, 'Selected file card');
      assert.deepEqual([...fixture.controller.snapshot().session.known], []); assert.equal(fixture.get('importPreview').hidden, true);
    } finally { fixture.host.fire('pagehide'); }
  });
}
