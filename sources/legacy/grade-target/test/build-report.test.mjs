import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReport } from '../public/js/core/build-report.js';

// Fixed report oracles, independently transcribed from ACCEPTANCE C32/C35–C38.
const result = (status,target,earned,display,remaining,required,maximum,maxDisplay) => ({schemaVersion:1,status,targetHundredths:target,earnedNumerator:earned,earnedDisplay:display,remainingWeightBp:remaining,requiredAverageHundredths:required,maximumPossibleNumerator:maximum,maximumPossibleDisplay:maxDisplay});
const cases = [
  ['C32',result('target_feasible','7000','32000000','32.00','6000','6334','92000000','92.00'),
    ['目標：70.00 / 100','已取得的總成績貢獻：32.00 / 100','剩餘權重：60.00%','剩餘項目需達的加權平均：63.34 / 100','狀態：仍可達成'],
    ['Target: 70.00 / 100','Earned contribution to final grade: 32.00 / 100','Remaining weight: 60.00%','Weighted average needed across remaining components: 63.34 / 100','Status: Target is reachable']],
  ['C35',result('target_already_met','3000','40000000','40.00','6000','0','100000000','100.00'),
    ['目標：30.00 / 100','已取得的總成績貢獻：40.00 / 100','剩餘權重：60.00%','剩餘項目需達的加權平均：0.00 / 100','狀態：已達成目標；仍有項目尚未評分'],
    ['Target: 30.00 / 100','Earned contribution to final grade: 40.00 / 100','Remaining weight: 60.00%','Weighted average needed across remaining components: 0.00 / 100','Status: Target already met; some components are still ungraded']],
  ['C36',result('target_unreachable','6000','45000000','45.00','1000',null,'55000000','55.00'),
    ['目標：60.00 / 100','已取得的總成績貢獻：45.00 / 100','剩餘權重：10.00%','最高可能總成績：55.00 / 100','剩餘項目需達的加權平均：目標無法達到','狀態：目標無法達到'],
    ['Target: 60.00 / 100','Earned contribution to final grade: 45.00 / 100','Remaining weight: 10.00%','Maximum possible final grade: 55.00 / 100','Weighted average needed across remaining components: Target is not reachable','Status: Target is not reachable']],
  ['C37',result('complete_met','7000','70000000','70.00','0',null,'70000000','70.00'),
    ['目標：70.00 / 100','已取得的總成績貢獻：70.00 / 100','剩餘權重：0.00%','全部項目已評分；最終總成績：70.00 / 100','狀態：全部項目已評分，已達成目標'],
    ['Target: 70.00 / 100','Earned contribution to final grade: 70.00 / 100','Remaining weight: 0.00%','All components are graded; final grade: 70.00 / 100','Status: All components are graded; target met']],
  ['C38',result('complete_missed','6000','40000000','40.00','0',null,'40000000','40.00'),
    ['目標：60.00 / 100','已取得的總成績貢獻：40.00 / 100','剩餘權重：0.00%','全部項目已評分；最終總成績：40.00 / 100','狀態：全部項目已評分，未達成目標'],
    ['Target: 60.00 / 100','Earned contribution to final grade: 40.00 / 100','Remaining weight: 0.00%','All components are graded; final grade: 40.00 / 100','Status: All components are graded; target not met']]
];
const notes = {
  'zh-Hant':['空白成績代表尚未評分；輸入 0 代表已評分且得 0 分。','所需值是剩餘項目依權重合併後的平均，不是每項最低分，也不保證取得目標。','本工具依你的輸入試算，不代表學校官方計分規則。'],
  en:['A blank score means not graded; 0 means graded with a score of zero.','This is the weighted average across ungraded components, not a minimum for each one, and it does not guarantee the target.',"This calculator follows your inputs and does not represent your school's official grading rules."]
};
for (const [id,input,zh,en] of cases) for (const [language,middle] of [['zh-Hant',zh],['en',en]]) test(`${id} full ${language} snapshot and UTF-8 bytes`, () => {
  const text=[language==='en'?'Grade Target Calculator':'成績目標試算',...middle,...notes[language]].join('\n');
  const output={ok:true,text,filename:'glossquote-grade-target.txt',mimeType:'text/plain;charset=utf-8'};
  assert.deepEqual(buildReport(input,language),output); assert.deepEqual(buildReport(input,language),output);
  assert.equal(text.length<=1024,true); assert.equal(/[\r\uFEFF]/u.test(text),false); assert.equal(text.endsWith('\n'),false);
  assert.equal(Buffer.from(text).subarray(0,3).equals(Buffer.from([239,187,191])),false);
  assert.equal(new TextDecoder().decode(new TextEncoder().encode(text)),text);
});
const base = cases[0][1];
const invalid = input => assert.deepEqual(buildReport(input,'en'),{ok:false,error:{code:'invalid_result',field:'result'}});
test('C33 language error wins before schema; no language coercion', () => {
  for (const language of ['fr',null,{},new String('en'),'en\n']) assert.deepEqual(buildReport(null,language),{ok:false,error:{code:'invalid_language',field:'language'}});
});
test('report schema rejects unknown/missing/hidden/symbol/accessor/prototype and traps', () => {
  invalid({...base,debug:'CANARY'}); invalid(null); invalid(Object.assign(Object.create(null),base));
  for (const key of Object.keys(base)) {
    const missing={...base}; delete missing[key]; invalid(missing);
    const getter={...base}; let calls=0; Object.defineProperty(getter,key,{enumerable:true,get(){calls++;return 'CANARY';}}); invalid(getter); assert.equal(calls,0);
    const hidden={...base}; Object.defineProperty(hidden,key,{enumerable:false}); invalid(hidden);
  }
  const symbol={...base,[Symbol()]:1}; invalid(symbol);
  for (const trap of ['ownKeys','getPrototypeOf','getOwnPropertyDescriptor']) invalid(new Proxy(base,{[trap](){throw Error('CANARY');}}));
});
test('report rejects noncanonical, oversized, invalid derived fields and statuses', () => {
  for (const key of ['targetHundredths','earnedNumerator','remainingWeightBp','requiredAverageHundredths','maximumPossibleNumerator']) {
    for (const value of ['00','01','-1','1.0','1e2','1\n','１','0'.repeat(100000),null,1,1n,{},'100000001']) invalid({...base,[key]:value});
  }
  for (const [key,value] of [['schemaVersion','1'],['schemaVersion',2],['status','unknown'],['status','complete_met'],['earnedDisplay','32'],['earnedDisplay','32.01'],['maximumPossibleDisplay','91.99'],['maximumPossibleNumerator','92000001'],['requiredAverageHundredths','6333'],['remainingWeightBp','6001'],['targetHundredths','10001']]) invalid({...base,[key]:value});
  for (const [,input] of cases) { const before=JSON.stringify(input); assert.equal(buildReport(Object.freeze(input),'en').ok,true); assert.equal(JSON.stringify(input),before); }
});
