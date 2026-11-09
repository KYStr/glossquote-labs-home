import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from '../scripts/files.mjs';
import { boot } from '../public/js/app.mjs';
import en from '../public/js/locales/en.mjs';
import zh from '../public/js/locales/zh-Hant.mjs';
import { serializeProject } from '../public/js/core/schema.mjs';
import { fakeDocument, fakeHost } from './fake-dom.mjs';

async function setup(lang) {
  const doc = fakeDocument(await readFile(join(ROOT, 'public', lang === 'en' ? 'en/index.html' : 'index.html'), 'utf8'));
  const h = fakeHost(); const controller = boot(doc, h.host);
  const get = id => doc.getElementById(id);
  function fill(path, value, event = 'input') { const control = get(`field-${path.replaceAll('.', '-')}`); assert.ok(control, path); control.value = value; control.emit(event); }
  return { doc, get, fill, controller, words: lang === 'en' ? en : zh, ...h };
}
function keys(value, path = '') { return Object.keys(value).flatMap(key => typeof value[key] === 'object' ? keys(value[key], `${path}${key}.`) : `${path}${key}`).sort(); }
test('both locale dictionaries cover the same complete keys and error messages', () => {
  assert.deepEqual(keys(en), keys(zh));
  assert.ok(Object.values(en.errors).every(value => value.length > 10)); assert.ok(Object.values(zh.errors).every(value => value.length > 5));
});
for (const lang of ['zh-Hant', 'en']) {
  test(`Node fake DOM (${lang}): empty → real manual editing → 950g → Blob download → edit invalidates → invalid → recover`, async () => {
    const h = await setup(lang); const { get, fill, controller, words } = h;
    assert.equal(controller.session.project.meals.length, 0); assert.equal(get('workspace').disabled, false); assert.equal(get('status').textContent, words.idle); assert.equal(get('unsupported').hidden, true);
    get('add-meal').click(); fill('meals.0.name', 'Fictional dinner'); fill('meals.0.items.0.ingredient', 'Rice'); fill('meals.0.items.0.quantity', '500');
    const add = h.doc.querySelectorAll('button').find(node => node.textContent === words.addItem); assert.ok(add); add.click();
    fill('meals.0.items.1.ingredient', 'Rice'); fill('meals.0.items.1.quantity', '0.75'); fill('meals.0.items.1.unit', 'kg', 'change');
    get('add-stock').click(); fill('stock.0.ingredient', 'Rice'); fill('stock.0.quantity', '300');
    get('calculate').click(); assert.equal(controller.session.result.buy[0].buy, 950000n); assert.ok(get('results').textContent.includes('950 g')); assert.equal(get('export-panel').hidden, false);
    assert.equal(get('download-txt').className, 'primary'); assert.equal(get('calculate').className, '');
    get('download-txt').click(); assert.equal(h.doc.downloads[0].filename, 'pantry-shopping-list.txt');
    const text = await h.blobs.get(h.doc.downloads[0].url).text(); assert.ok(text.includes('Rice: 950 g'));
    fill('stock.0.quantity', 'bad'); assert.equal(controller.session.result, null); assert.equal(get('export-panel').hidden, true); assert.equal(get('download-txt').disabled, true); assert.equal(get('results').textContent.includes('950'), false);
    assert.equal(get('calculate').className, 'primary');
    get('calculate').click(); assert.equal(get('field-stock-0-quantity').getAttribute('aria-invalid'), 'true'); assert.equal(get('field-stock-0-quantity').value, 'bad'); assert.equal(h.doc.activeElement.id, 'field-stock-0-quantity');
    fill('stock.0.quantity', '300'); get('calculate').click(); assert.equal(controller.session.state, 'ready'); assert.equal(get('error-message').hidden, true);
    assert.ok(h.doc.querySelectorAll('input').every(node => node.type === 'checkbox' || h.doc.querySelectorAll('label').some(label => label.htmlFor === node.id || label.getAttribute('for') === node.id)));
  });
  test(`Node fake DOM (${lang}): labelled example, progress-only purchase, safe malicious text, clear`, async () => {
    const h = await setup(lang); const { get, fill, controller } = h;
    get('example').click(); assert.equal(get('example-note').hidden, false); get('calculate').click();
    const buyBefore = controller.session.result.buy[0].buy;
    const checkbox = h.doc.querySelectorAll('input').find(node => node.type === 'checkbox'); checkbox.checked = true; checkbox.emit('change');
    assert.equal(controller.session.result.buy[0].buy, buyBefore); assert.equal(controller.session.checked.size, 1);
    fill('meals.0.name', '<img src=x>'); fill('meals.0.items.0.ingredient', '<script>alert(1)</script>'); get('calculate').click();
    assert.ok(get('results').textContent.includes('<script>alert(1)</script>')); assert.equal(h.doc.querySelectorAll('img').length, 0);
    assert.equal(h.doc.querySelectorAll('script').length, 1); // The fixed module tag, no inserted scripts.
    get('clear').click(); assert.equal(controller.session.project.meals.length, 0); assert.equal(controller.session.checked.size, 0); assert.equal(get('status').textContent, h.words.idle);
  });
  test(`Node fake DOM (${lang}): import cancel/confirm, language-loss confirmation, pagehide cleanup`, async () => {
    const h = await setup(lang); const { get, controller, readers } = h;
    get('example').click(); get('calculate').click(); const originalName = controller.session.project.meals[0].name;
    const incoming = { schema: 1, meals: [{ id: 'new', name: '<img> fake', items: [{ ingredient: 'Noodles', quantity: '2', unit: 'customCount', unitLabel: 'bag' }] }], stock: [] };
    function select() { get('import-file').files = [{ size: 500 }]; get('import-file').emit('change'); readers.at(-1).complete(serializeProject(incoming)); }
    select(); assert.equal(get('import-preview').hidden, false); assert.ok(get('preview-content').textContent.includes('<img> fake')); assert.equal(h.doc.querySelectorAll('img').length, 0);
    get('dismiss-import').click(); assert.equal(controller.session.project.meals[0].name, originalName); assert.equal(controller.session.result, null);
    select(); get('confirm-import').click(); assert.equal(controller.session.project.meals[0].name, '<img> fake'); assert.equal(get('import-preview').hidden, true);
    const event = get('lang-link').emit('click'); assert.equal(event.defaultPrevented, true); assert.equal(get('confirm-area').hidden, false); assert.equal(h.navigation.length, 0);
    get('confirm-no').click(); assert.equal(h.navigation.length, 0); get('lang-link').emit('click'); get('confirm-yes').click(); assert.equal(h.navigation[0], lang === 'en' ? '/index.html' : '/en/index.html');
    h.events.get('pagehide')(); assert.equal(controller.disposed, true); assert.equal(get('meals').textContent, ''); assert.equal(controller.session.project.stock.length, 0);
  });
}
test('unsupported capabilities leave workspace disabled with safe notice', async () => {
  const doc = fakeDocument(await readFile(join(ROOT, 'public/index.html'), 'utf8'));
  const h = fakeHost(); h.host.FileReader = undefined;
  assert.equal(boot(doc, h.host), null); assert.equal(doc.getElementById('workspace').disabled, true); assert.equal(doc.getElementById('unsupported').hidden, false);
});
