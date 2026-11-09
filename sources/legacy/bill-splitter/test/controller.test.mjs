import test from 'node:test';
import assert from 'node:assert/strict';

// A small DOM adapter exercises the real controller. This is NOT browser evidence.
let harnessSequence = 0;
async function harness(locale = 'en', initialWorkflow = 'advanced') {
  const nodes = new Map(), listeners = new Map(), blobs = new Map(), revoked = [], timers = new Map();
  let document, counter = 0, clipboard = async () => {}, failDownload = false;
  class Element {
    constructor(tag) { this.tagName = tag; this.children = []; this.attributes = new Map(); this.events = new Map(); this.dataset = {}; this.value = ''; this.textContent = ''; this.hidden = false; this.disabled = false; }
    set id(value) { this._id = value; nodes.set(value, this); } get id() { return this._id; }
    append(...children) { for (const child of children) { if (child.tagName === 'fragment') this.append(...child.children); else { child.parent = this; this.children.push(child); } } }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); }
    replaceChildren(...children) { const unregister = n => { if (nodes.get(n.id) === n) nodes.delete(n.id); n.children.forEach(unregister); }; this.children.forEach(unregister); this.children = []; this.append(...children); }
    setAttribute(name, value) { this.attributes.set(name, value); } removeAttribute(name) { this.attributes.delete(name); } getAttribute(name) { return this.attributes.get(name) ?? null; }
    addEventListener(name, handler) { if (!this.events.has(name)) this.events.set(name, []); this.events.get(name).push(handler); }
    querySelectorAll(selector) { const all = []; const visit = n => { n.children.forEach(c => { all.push(c); visit(c); }); }; visit(this); return all.filter(n => selector === '[aria-invalid]' ? n.attributes.has('aria-invalid') : selector === '.field-error' ? n.className?.split(' ').includes('field-error') : false); }
    focus() { if (['input','select','textarea','button'].includes(this.tagName) || this.id === 'form-error') document.activeElement = this; } select() { this.selected = true; }
    click() { if (this.tagName === 'a') { if (failDownload) throw new Error('SYNTHETIC_DOWNLOAD_FAILURE'); this.clicked = true; return; } return this.emit('click'); }
    emit(name) { const event = { target: this, preventDefault() {} }, pending = []; let n = this; do { for (const handler of n.events.get(name) ?? []) pending.push(handler(event)); n = n.parent; } while (n); return Promise.all(pending); }
  }
  document = { documentElement: { lang: locale }, createElement: tag => new Element(tag), createDocumentFragment: () => new Element('fragment'), getElementById: id => nodes.get(id), activeElement: null, body: new Element('body') };
  const ids = ['bill-form','workflow-quick','workflow-advanced','advanced-options','quick-help','calculate','precision','mode','people','people-count','people-limit','add-person','clear','example','copy','download','form-error','draft-state','calculation-status','result-content','empty-result','report','output','output-status'];
  const staticTags = {
    'bill-form': 'form', precision: 'select', mode: 'select',
    'workflow-quick': 'input', 'workflow-advanced': 'input', calculate: 'button', 'advanced-options': 'div', 'quick-help': 'p',
    people: 'div', 'people-count': 'span', 'people-limit': 'span',
    'add-person': 'button', clear: 'button', example: 'button', copy: 'button', download: 'button',
    'form-error': 'p', 'draft-state': 'p', 'calculation-status': 'p',
    'result-content': 'div', 'empty-result': 'p', report: 'textarea', output: 'div', 'output-status': 'p'
  };
  for (const id of ids) { const node = new Element(staticTags[id]); node.id = id; if (id !== 'bill-form') document.body.append(node); }
  const form = nodes.get('bill-form'); document.body.append(form);
  for (const id of ['workflow-quick','workflow-advanced','precision','mode','people','form-error']) { nodes.get(id).remove(); form.append(nodes.get(id)); }
  form.reset = () => { nodes.get('precision').value = '2'; nodes.get('mode').value = 'equal'; nodes.get('workflow-quick').checked = true; nodes.get('workflow-advanced').checked = false; };
  form.reset();
  const originals = { document: globalThis.document, window: globalThis.window, navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator'), create: URL.createObjectURL, revoke: URL.revokeObjectURL, timeout: globalThis.setTimeout, clear: globalThis.clearTimeout };
  globalThis.document = document;
  globalThis.window = { addEventListener: (type, fn) => listeners.set(type, fn) };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: text => clipboard(text) } } });
  URL.createObjectURL = blob => { const url = `blob:test-${++counter}`; blobs.set(url, blob); return url; };
  URL.revokeObjectURL = url => { revoked.push(url); blobs.delete(url); };
  globalThis.setTimeout = (fn, delay) => { const token = ++counter; timers.set(token, { fn, delay }); return token; };
  globalThis.clearTimeout = token => timers.delete(token);
  await import(`../public/js/app.mjs?test=${locale}-${++harnessSequence}`);
  // Existing regression cases explicitly enter advanced mode; actual default is tested separately.
  if (initialWorkflow === 'advanced') { nodes.get('workflow-advanced').checked = true; nodes.get('workflow-quick').checked = false; await nodes.get('workflow-advanced').emit('change'); }
  return {
    nodes, document, blobs, revoked, timers,
    setClipboard(fn) { clipboard = fn; }, setDownloadFailure(value) { failDownload = value; },
    click: id => nodes.get(id).emit('click'),
    async input(id, value) { nodes.get(id).value = value; await nodes.get(id).emit('input'); },
    async change(id, value) { const node = nodes.get(id); if (id.startsWith('workflow-')) node.checked = value; else node.value = value; await node.emit('change'); },
    calculate: () => form.emit('submit'),
    hide: () => listeners.get('pagehide')(),
    restore() { globalThis.document = originals.document; globalThis.window = originals.window; Object.defineProperty(globalThis, 'navigator', originals.navigator); URL.createObjectURL = originals.create; URL.revokeObjectURL = originals.revoke; globalThis.setTimeout = originals.timeout; globalThis.clearTimeout = originals.clear; }
  };
}
test('S20/S21 real controller: both late clipboard success and failure preserve new result/status', async () => {
  const h = await harness();
  try {
    for (const reject of [false, true]) {
      await h.click('clear'); await h.input('paid-1', '100'); await h.calculate();
      let finish;
      h.setClipboard(() => new Promise((resolve, fail) => { finish = reject ? () => fail(new Error('FAKE_FAILURE')) : resolve; }));
      const pending = h.click('copy');
      assert.equal(h.nodes.get('output-status').textContent, 'Copying…');
      await h.input('name-1', 'New fake name'); assert.equal(h.nodes.get('copy').disabled, true);
      await h.calculate(); const report = h.nodes.get('report').value;
      assert.ok(report.includes('New fake name')); assert.equal(h.nodes.get('copy').disabled, false);
      finish(); await pending;
      assert.equal(h.nodes.get('report').value, report); assert.equal(h.nodes.get('output-status').textContent, ''); assert.equal(h.nodes.get('copy').disabled, false); assert.notEqual(h.document.activeElement?.id, 'report');
    }
    h.setClipboard(async () => { throw new Error('DENIED'); }); await h.click('copy');
    assert.ok(h.nodes.get('output-status').textContent.includes('Clipboard access is unavailable')); assert.equal(h.document.activeElement.id, 'report'); assert.equal(h.nodes.get('report').selected, true);
  } finally { h.restore(); }
});
test('U14 controller: quick is default, transfer-first result, hidden advanced drafts survive switching', async () => {
  for (const locale of ['en','zh-Hant']) {
    const h=await harness(locale,'quick');
    try {
      assert.equal(h.nodes.get('workflow-quick').checked,true); assert.equal(h.nodes.has('total'),false);assert.equal(h.nodes.has('paid-toggle'),false);
      for(const id of [1,2,3]) assert.equal(h.nodes.get(`paid-${id}`).value,'0');
      await h.input('paid-1','900');await h.input('paid-2','300');await h.calculate();
      const report=h.nodes.get('report').value;assert.ok(report.includes('100.00')&&report.includes('400.00'));
      assert.equal(h.nodes.get('result-content').children[0].tagName,'h3');assert.equal(h.nodes.get('result-content').children[1].tagName,'ul');
      await h.change('workflow-advanced',true);assert.equal(h.nodes.get('report').value,'');assert.equal(h.nodes.get('copy').disabled,true);
      await h.change('mode','shares');await h.input('weight-1','bad draft');await h.input('weight-2','0');
      await h.change('workflow-quick',true);await h.calculate();assert.equal(h.nodes.get('report').value,report);
      await h.change('workflow-advanced',true);assert.equal(h.nodes.get('mode').value,'shares');assert.equal(h.nodes.get('weight-1').value,'bad draft');assert.equal(h.nodes.get('weight-2').value,'0');assert.equal(h.nodes.get('report').value,'');
      await h.calculate();assert.equal(h.document.activeElement.id,'weight-1');assert.equal(h.nodes.get('copy').disabled,true);
      await h.change('workflow-quick',true);await h.click('add-person');assert.equal(h.nodes.get('paid-4').value,'0');await h.calculate();assert.ok(h.nodes.get('report').value.includes(locale==='en'?'People: 4':'參與人數: 4'));
      await h.click('clear');assert.equal(h.document.activeElement.id,'name-1');assert.equal(h.nodes.get('workflow-quick').checked,true);assert.equal(h.nodes.get('mode').value,'equal');for(const id of [1,2,3])assert.equal(h.nodes.get(`paid-${id}`).value,'0');
      await h.calculate();assert.ok(h.nodes.get('report').value.includes(locale==='en'?'Nobody has paid':'目前沒有人付款'));
      await h.input('paid-1','99999999.99');await h.input('paid-2','0.01');await h.calculate();assert.equal(h.document.activeElement.id,'paid-1');assert.equal(h.nodes.get('paid-1').getAttribute('aria-invalid'),'true');assert.equal(h.nodes.get('report').value,'');
      await h.change('workflow-advanced',true);await h.click('clear');assert.equal(h.document.activeElement.id,'name-1');assert.equal(h.nodes.get('workflow-advanced').checked,true);
    } finally {h.restore();}
  }
});
test('U14 clipboard late success/error cannot cross workflow revisions; new quick Blob report matches preview',async()=>{
  const h=await harness('en','quick');
  try {
    for(const reject of [false,true]) {
      await h.change('workflow-quick',true);await h.click('example');await h.calculate();let finish;
      h.setClipboard(()=>new Promise((ok,fail)=>{finish=reject?()=>fail(Error('FAKE_DENIAL')):ok;}));const pending=h.click('copy');
      await h.change('workflow-advanced',true);await h.click('example');await h.calculate();const report=h.nodes.get('report').value;finish();await pending;assert.equal(h.nodes.get('report').value,report);assert.equal(h.nodes.get('output-status').textContent,'');assert.equal(h.nodes.get('copy').disabled,false);
    }
    await h.change('workflow-quick',true);await h.click('example');await h.calculate();await h.click('download');assert.equal(await [...h.blobs.values()][0].text(),h.nodes.get('report').value);await h.change('workflow-advanced',true);assert.equal(h.blobs.size,0);assert.equal(h.nodes.get('download').disabled,true);
  }finally{h.restore();}
});
test('U14 group errors: zero shares and sum over cap target visible controls with recoverable aria links', async () => {
  for (const locale of ['en','zh-Hant']) {
    const h = await harness(locale);
    try {
      await h.input('paid-1','100'); await h.change('mode','shares');
      for (const id of [1,2,3]) await h.input(`weight-${id}`,'0');
      await h.calculate();
      const weight = h.nodes.get('weight-1');
      assert.equal(h.document.activeElement.id,'weight-1'); assert.equal(weight.getAttribute('aria-invalid'),'true'); assert.equal(weight.getAttribute('aria-describedby'),'weight-1-error');
      assert.ok(h.nodes.get('weight-1-error').textContent.includes(locale==='en'?'At least one':'至少一人'));
      assert.equal(h.nodes.get('report').value,''); assert.equal(h.nodes.get('copy').disabled,true);
      await h.input('weight-1','1'); assert.equal(weight.getAttribute('aria-invalid'),null); assert.equal(h.nodes.get('weight-1-error').textContent,''); assert.equal(weight.getAttribute('aria-describedby'),'weight-1-error');
      await h.calculate(); assert.equal(h.nodes.get('copy').disabled,false);
      for (const precision of ['2','0']) {
        await h.click('clear'); await h.change('precision',precision); await h.input('paid-1',precision==='2'?'99999999.99':'99999999');await h.input('paid-2',precision==='2'?'0.01':'1'); await h.calculate();
        const paid=h.nodes.get('paid-1'); assert.equal(h.document.activeElement.id,'paid-1'); assert.equal(paid.getAttribute('aria-invalid'),'true'); assert.equal(paid.getAttribute('aria-describedby'),'paid-1-error');
        assert.ok(h.nodes.get('paid-1-error').textContent.includes('99,999,999'));
        await h.input('paid-1','100'); assert.equal(paid.getAttribute('aria-invalid'),null); assert.equal(h.nodes.get('paid-1-error').textContent,''); await h.calculate(); assert.equal(h.nodes.get('copy').disabled,false);
      }
    } finally { h.restore(); }
  }
});
test('S21/S22 actual Blob bytes, failure, timers and clear/change/pagehide release all object URLs', async () => {
  for (const locale of ['en','zh-Hant']) {
    const h = await harness(locale);
    try {
      await h.click('example'); await h.calculate();
      await h.click('download'); assert.equal(h.blobs.size, 1);
      const bytes = Buffer.from(await [...h.blobs.values()][0].arrayBuffer()), report = h.nodes.get('report').value;
      assert.equal(bytes.toString('utf8'), report); assert.ok(!bytes.subarray(0, 3).equals(Buffer.from([239,187,191]))); assert.ok(!report.includes('\r')); assert.ok(report.endsWith('\n') && !report.endsWith('\n\n'));
      assert.equal([...h.timers.values()][0].delay, 30000);
      [...h.timers.values()][0].fn(); assert.equal(h.blobs.size, 0);
      for (const action of ['change','clear','hide']) {
        await h.click('example'); await h.calculate(); await h.click('download');
        if (action === 'change') await h.input('paid-1','901'); if (action === 'clear') await h.click('clear'); if (action === 'hide') h.hide();
        assert.equal(h.blobs.size, 0); assert.equal(h.nodes.get('report').value, ''); assert.equal(h.nodes.get('copy').disabled, true); assert.equal(h.nodes.get('download').disabled, true);
      }
      await h.click('example'); await h.calculate(); h.setDownloadFailure(true); await h.click('download');
      assert.equal(h.blobs.size, 0); assert.ok(h.nodes.get('output-status').textContent.includes(locale === 'en' ? 'Could not create' : '無法建立'));
      assert.equal(h.document.body.children.filter(n => n.tagName === 'a').length, 0);
    } finally { h.restore(); }
  }
});
