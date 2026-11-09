import test from 'node:test';
import assert from 'node:assert/strict';

// Small deterministic DOM adapter for controller races and resource lifetime.
// This is Node evidence only; real browser and native download evidence is separate.
test('T03 revisions, late clipboard success/rejection, fallback, CR reversion and Blob cleanup', async t => {
  const nodes = new Map(); let active = null;
  class Node extends EventTarget {
    constructor(tag = 'div') { super(); this.tag = tag; this.children = []; this.dataset = {}; this.attributes = {}; this.disabled = false; this.hidden = false; this._value = ''; this._text = ''; const classes = new Set(); this.classList = { add: c => classes.add(c), remove: c => classes.delete(c), toggle: (c, on) => on ? classes.add(c) : classes.delete(c) }; }
    set id(value) { this._id = value; nodes.set(value, this); } get id() { return this._id; }
    set value(value) { this._value = String(value).replace(/\r\n?|\n/gu, '\n'); } get value() { return this._value; }
    set textContent(value) { this._text = String(value); this.children = []; } get textContent() { return this._text + this.children.map(n => n.textContent).join(''); }
    append(...items) { for (const item of items) { item.parent = this; this.children.push(item); } }
    replaceChildren(...items) { this.children = []; this._text = ''; this.append(...items); }
    setAttribute(key, value) { this.attributes[key] = value; } removeAttribute(key) { delete this.attributes[key]; }
    focus() { active = this; } select() { this.selected = true; }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(n => n !== this); }
    click() { if (!this.disabled) this.dispatchEvent(new Event('click')); }
    input(value) { this.value = value; this.dispatchEvent(new Event('input')); }
  }
  const doc = { documentElement: { lang: 'en' }, body: new Node('body'), createElement: tag => new Node(tag), getElementById: id => nodes.get(id) };
  for (const id of ['source', 'result', 'status', 'changed', 'copy', 'download', 'draft-note', 'rows', 'raw-source', 'parsed', 'workspace', 'inspection', 'generate', 'add', 'tracking', 'row-count', 'source-error', 'inspect', 'workspace-title', 'clear', 'example', 'empty-rows']) { const node = new Node(['source', 'result'].includes(id) ? 'textarea' : 'div'); node.id = id; }
  nodes.get('copy').dataset.label = 'Copy URL';
  const restore = [];
  function replace(object, key, value) { const descriptor = Object.getOwnPropertyDescriptor(object, key); Object.defineProperty(object, key, { configurable: true, writable: true, value }); restore.push(() => descriptor ? Object.defineProperty(object, key, descriptor) : delete object[key]); }
  t.after(() => restore.reverse().forEach(fn => fn()));
  const window = new EventTarget(); const clipboard = {}; const made = [], revoked = [], timers = new Map(); let timerId = 0;
  replace(globalThis, 'document', doc); replace(globalThis, 'window', window); replace(globalThis, 'navigator', { clipboard });
  replace(URL, 'createObjectURL', blob => { const url = `blob:fixture-${made.length}`; made.push({ url, blob }); return url; });
  replace(URL, 'revokeObjectURL', url => revoked.push(url));
  replace(globalThis, 'setTimeout', (callback, ms) => { const id = ++timerId; timers.set(id, { callback, ms }); return id; });
  replace(globalThis, 'clearTimeout', id => timers.delete(id));
  await import('../public/js/app.mjs?controller-regression');
  const node = id => nodes.get(id), inspect = source => { node('source').input(source); node('inspect').click(); }, generate = () => node('generate').click();
  const source = 'https://example.com/?q=a%0Db%0D%0Ac&x=1'; inspect(source); generate(); assert.equal(node('result').value, source);
  node('edit-r1-value').input('2'); assert.equal(node('result').value, ''); assert.equal(node('copy').disabled, true);
  generate(); assert.equal(node('result').value, 'https://example.com/?q=a%0Db%0D%0Ac&x=2');
  node('edit-r0-value').input('changed'); node('edit-r0-value').input('a\nb\nc'); generate(); assert.equal(node('result').value, 'https://example.com/?q=a%0Db%0D%0Ac&x=2');
  let resolve, reject;
  clipboard.writeText = () => new Promise((a, b) => { resolve = a; reject = b; });
  node('copy').click(); assert.equal(node('copy').disabled, true);
  node('source').input('https://example.com/?new=1'); resolve(); await Promise.resolve(); await Promise.resolve();
  assert.equal(node('result').value, ''); assert.equal(node('copy').disabled, true); assert.equal(node('status').textContent, '');
  node('inspect').click(); generate(); node('copy').click(); node('clear').click(); reject(new Error('FAKE_ONLY')); await Promise.resolve(); await Promise.resolve();
  assert.equal(node('status').textContent, 'Tool content cleared. Copied or downloaded content has not been deleted.'); assert.equal(active, node('source'));
  inspect('https://example.com/?a=甲😀'); generate(); clipboard.writeText = async () => { throw new Error('FAKE_DENIAL'); }; node('copy').click(); await Promise.resolve(); await Promise.resolve();
  assert.match(node('status').textContent, /Could not copy automatically/); assert.equal(node('result').selected, true); assert.equal(node('copy').disabled, false);
  node('download').click(); assert.equal(await made[0].blob.text(), 'https://example.com/?a=甲😀\n'); assert.equal([...timers.values()][0].ms, 30_000);
  node('edit-r0-value').input('new'); assert.deepEqual(revoked, ['blob:fixture-0']); assert.equal(timers.size, 0);
  generate(); node('download').click(); window.dispatchEvent(new Event('pagehide')); assert.deepEqual(revoked, ['blob:fixture-0', 'blob:fixture-1']);
  assert.equal(node('source').value, ''); assert.equal(node('result').value, ''); assert.equal(node('copy').disabled, true); assert.equal(node('rows').children.length, 0);
});
