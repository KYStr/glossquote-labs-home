import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPlanner } from '../public/js/state.mjs';
import { copyFor, errorMessage } from '../public/js/copy.mjs';
import { initPlanner } from '../public/js/app.js';
import { fakePage } from '../scripts/test-support/dom-harness.mjs';

function example(language = 'zh-Hant', kind = 'normal') { const planner = createPlanner(language); planner.request(kind); planner.confirm(); return planner; }
function assertCleared(planner) { assert.equal(planner.state.result, null); assert.equal(planner.state.report, ''); assert.notEqual(planner.state.status, 'success'); }
test('initial values and ID counters do not manufacture a dirty draft', () => {
  const p = createPlanner('zh-Hant'); assert.equal(p.isInitial(), true);
  assert.equal(p.state.draft.observationDaysRaw, '30'); assert.equal(p.state.draft.leadDaysRaw, '7'); assert.equal(p.state.draft.coverageDaysRaw, '30');
  p.addRow(); const id = p.state.draft.items[0].id; p.removeRow(id);
  assert.notEqual(p.state.draft.items[0].id, id); assert.equal(p.isInitial(), true);
  assert.equal(p.request('language'), '/en/index.html');
});
test('both fixed examples always confirm, retain draft/result on cancel, and do not auto-calculate', () => {
  for (const [kind, packs, units, shortage, days] of [['normal',3,36,0,10],['shortage',4,48,5,2]]) {
    const p = createPlanner('zh-Hant'); p.request(kind); assert.equal(p.state.pending, kind); p.cancel(); assert.equal(p.isInitial(), true);
    p.request(kind); p.confirm(); assertCleared(p); assert.equal(p.state.draft.items[0].nameRaw, '耗材');
    assert.equal(p.calculate(), true); const row = p.state.result.items[0];
    assert.deepEqual([row.packsToOrder,row.orderUnits,row.shortageBeforeArrivalUnits,row.runwayWholeDays], [packs,units,shortage,days]);
    const before = structuredClone(p.state); p.request('normal'); p.cancel(); assert.deepEqual(p.state, before);
  }
});
test('every shared and row field edit immediately invalidates the previous report', () => {
  for (const key of ['observationDaysRaw','leadDaysRaw','coverageDaysRaw']) { const p = example(); p.calculate(); p.editDay(key,'2'); assertCleared(p); }
  for (const key of ['nameRaw','unitRaw','usedRaw','stockRaw','reserveRaw','packSizeRaw']) { const p = example(); p.calculate(); p.editRow(p.state.draft.items[0].id,key,'2'); assertCleared(p); }
});
for (const language of ['zh-Hant','en']) for (const kind of ['normal','shortage']) test(`${language} ${kind} built-in example is localized without changing quantities`, () => {
  const p = example(language,kind), row = p.state.draft.items[0];
  assert.equal(row.nameRaw, language === 'en' ? 'Supplies' : '耗材'); assert.equal(row.unitRaw, language === 'en' ? 'units' : '個');
  assert.equal(p.calculate(),true); const result = p.state.result.items[0];
  assert.deepEqual([result.packsToOrder,result.orderUnits,result.shortageBeforeArrivalUnits,result.runwayWholeDays],kind === 'normal' ? [3,36,0,10] : [4,48,5,2]);
  p.editRow(row.id,'nameRaw','自訂 😀'); p.editRow(row.id,'unitRaw','件'); p.calculate();
  assert.equal(p.state.result.items[0].name,'自訂 😀'); assert.equal(p.state.result.items[0].unit,'件');
});
test('row add/remove limits, stable IDs and invalidation', () => {
  const p = example(); p.calculate(); p.addRow(); assertCleared(p);
  const first = p.state.draft.items[0].id;
  while (p.state.draft.items.length < 30) assert.equal(p.addRow(), true);
  const ids = p.state.draft.items.map(row => row.id); assert.equal(new Set(ids).size,30); assert.equal(p.addRow(),false);
  assert.equal(p.removeRow(ids[1]),true); assert.equal(p.state.draft.items[0].id,first);
  p.addRow(); assert.equal(ids.includes(p.state.draft.items.at(-1).id), false);
  while (p.state.draft.items.length > 1) p.removeRow(p.state.draft.items.at(-1).id);
  assert.equal(p.removeRow(first),false);
});
test('clear and language confirmation cancel keep state; confirm wipes old references', () => {
  for (const kind of ['clear','language']) {
    const p = example('en'); p.calculate(); const before = structuredClone(p.state);
    p.request(kind); assert.equal(p.calculate(),false); assert.equal(p.editDay('leadDaysRaw','8'),false); p.cancel(); assert.deepEqual(p.state,before);
    const old = p.state.draft, oldRow = old.items[0]; p.request(kind); const target = p.confirm();
    assert.equal(oldRow.nameRaw, ''); assert.equal(old.items.length,0); assertCleared(p);
    if (kind === 'language') { assert.equal(target,'/index.html'); assert.equal(p.state.active,false); }
    else assert.equal(p.isInitial(),true);
  }
});
test('composition invalidates immediately, keeps raw draft and prevents calculation or destructive actions', () => {
  const p = example(); p.calculate(); p.beginComposition(); assertCleared(p);
  p.editRow(p.state.draft.items[0].id,'nameRaw','塗ㄌ');
  assert.equal(p.calculate(),false); assert.equal(p.addRow(),false); assert.equal(p.request('clear'),null); assert.equal(p.state.pending,null);
  assert.equal(p.state.draft.items[0].nameRaw,'塗ㄌ'); p.endComposition(); assert.equal(p.calculate(),true);
});
test('error clears output and recovery edits remove stale error; zero/no-order succeeds', () => {
  const p = example(); p.calculate(); const id = p.state.draft.items[0].id;
  p.editRow(id,'usedRaw','1e2'); assert.equal(p.calculate(),false); assertCleared(p); assert.equal(p.state.error.code,'QUANTITY_FORMAT');
  p.editRow(id,'usedRaw','0'); assert.equal(p.state.error,null); p.editRow(id,'stockRaw','3'); assert.equal(p.calculate(),true);
  assert.equal(p.state.status,'noOrder'); assert.equal(p.state.result.items[0].runwayWholeDays,null);
});
test('dispose clears pending, draft, report, result and composition; reset is fresh BFCache model state', () => {
  const p = example(); p.calculate(); p.request('shortage'); const old = p.state.draft, oldRow = old.items[0];
  p.dispose(); assertCleared(p); assert.equal(old.observationDaysRaw,''); assert.equal(old.items.length,0); assert.equal(oldRow.unitRaw,'');
  assert.equal(p.state.pending,null); assert.equal(p.state.active,false); assert.equal(p.calculate(),false);
  p.reset(); assert.equal(p.isInitial(),true); assert.equal(p.state.active,true); assert.notEqual(p.state.draft,old);
});
test('two-language copy has matching keys and field errors omit internal codes', () => {
  const zh = copyFor('zh-Hant'), en = copyFor('en');
  for (const key of ['fields','help','status','confirm','confirmAction','resultLabels']) assert.deepEqual(Object.keys(zh[key]),Object.keys(en[key]));
  for (const lang of ['zh-Hant','en']) for (const [code,field] of [['DAY_RANGE','leadDaysRaw'],['DAY_FORMAT','observationDaysRaw'],['QUANTITY_RANGE','items[0].packSizeRaw'],['NAME_EMPTY','items[0].nameRaw'],['UNIT_LINE_SEPARATOR','items[0].unitRaw']]) {
    assert.equal(errorMessage(code,field,lang).includes(code), false);
  }
});

// A deliberately small, non-browser DOM double exercises actual event wiring.
// It proves no layout, native focus, accessibility, IME or browser lifecycle gate.
for (const [language, file] of [['zh-Hant','../public/index.html'],['en','../public/en/index.html']]) {
  const make = () => fakePage(readFileSync(new URL(file, import.meta.url),'utf8'),language);
  test(`[Node harness only] ${language} initialization and submit/error/confirm/report wiring`, () => {
    const { document, window } = make(); const app = initPlanner(document,window); const get = id => document.getElementById(id);
    assert.equal(app.model.isInitial(),true); assert.equal(get('calculate').disabled,false); assert.equal(get('report').disabled,true);
    get('calculate').click(); assert.equal(document.activeElement.id,`${app.model.state.draft.items[0].id}-nameRaw`);
    assert.equal(get('results').hidden,true); get('example-normal').click();
    assert.equal(get('confirmation').hidden,false); get('cancel').click(); assert.equal(document.activeElement,get('example-normal'));
    get('example-normal').click(); get('confirm').click(); assert.equal(get('report').value,'');
    get('calculate').click(); assert.equal(app.model.state.result.items[0].packsToOrder,3); assert.ok(get('report').value.length>100);
    assert.equal(get('report').readOnly,true); assert.equal(get('results').hidden,false);
    const input = get(`${app.model.state.draft.items[0].id}-nameRaw`); input.value = '<img src=x onerror=alert(1)>'; input.fire('input');
    assert.equal(get('report').value,''); assert.equal(get('result-list').children.length,0); get('calculate').click();
    assert.ok(get('result-list').textContent.includes('<img src=x onerror=alert(1)>')); assert.equal(document.querySelectorAll('img').length,0);
  });
  test(`[Node harness only] ${language} composition does not rewrite input or move fake focus`, () => {
    const { document, window } = make(); const { model } = initPlanner(document,window); const get = id => document.getElementById(id);
    get('example-normal').click(); get('confirm').click(); get('calculate').click();
    const input = get(`${model.state.draft.items[0].id}-nameRaw`); input.focus(); const before = document.focusCount;
    input.fire('compositionstart'); input.value = '耗ㄘ'; input.fire('input');
    assert.equal(get('report').value,''); assert.equal(get('results').hidden,true); assert.equal(get('calculate').disabled,true);
    assert.equal(input.value,'耗ㄘ'); assert.equal(document.focusCount,before);
    input.value = '耗材'; input.fire('compositionend'); assert.equal(get('calculate').disabled,false); assert.equal(get('report').value,'');
  });
  test(`[Node harness only] ${language} language, pagehide and persisted pageshow event wiring`, () => {
    const { document, window } = make(); const { model } = initPlanner(document,window); const get = id => document.getElementById(id);
    assert.equal(get('language').fire('click').defaultPrevented,false);
    get('example-shortage').click(); get('confirm').click(); get('calculate').click();
    assert.equal(get('language').fire('click').defaultPrevented,true); get('cancel').click(); assert.equal(model.state.result.items[0].packsToOrder,4);
    get('language').fire('click'); get('confirm').click(); assert.equal(window.destination,language==='en'?'/index.html':'/en/index.html');
    assert.equal(get('report').value,''); assert.equal(document.querySelectorAll('input').every(input=>input.value===''),true);
    window.fire('pageshow',{persisted:true}); assert.equal(model.isInitial(),true); assert.equal(get('observationDaysRaw').value,'30');
    get('example-normal').click(); get('confirm').click(); get('calculate').click(); window.fire('pagehide');
    assert.equal(model.state.active,false); assert.equal(get('report').value,''); assert.equal(get('result-list').children.length,0);
    assert.equal(document.querySelectorAll('input, textarea, button').every(control=>control.disabled),true);
    window.fire('pageshow',{persisted:true}); assert.equal(model.isInitial(),true); assert.equal(get('calculate').disabled,false);
  });
}
