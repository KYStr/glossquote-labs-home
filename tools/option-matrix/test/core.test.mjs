// Node 內建測試，不引入第三方套件或把 fixture 誤稱原生瀏覽器。
import test from 'node:test';
// 全部預期 tuple 與錯碼獨立寫明。
import assert from 'node:assert/strict';
// 被測輸入契約。
import {validateDraft} from '../core/input.mjs';
// 被測固定順序列舉。
import {enumerate} from '../core/product.mjs';
// 被測輸出與公式風險。
import {serialize} from '../core/export.mjs';
// 被測非同步所有權。
import {Session} from '../core/session.mjs';
// 被測下載租期。
import {DownloadLease} from '../download.mjs';
// 建立明確純資料草稿，每維 ID 穩定唯一。
const draft=(...values)=>({dimensions:values.map((v,i)=>({id:`d${i+1}`,name:`Name${i}`,optionsText:v}))});
// 固定錯碼斷言不依賴例外原文。
const rejects=(d,code)=>assert.throws(()=>validateDraft(d),e=>e.code===code);
// 基本與不等長列舉用 literal 預期。
test('T01 literal single and 2x3 and six dimensions',async()=>{assert.deepEqual((await enumerate(validateDraft(draft('a\nb','x\ny\nz')))).rows.map(r=>r.values),[['a','x'],['a','y'],['a','z'],['b','x'],['b','y'],['b','z']]);assert.deepEqual((await enumerate(validateDraft(draft('x')))).rows,[{caseId:'C0001',values:['x']}]);assert.deepEqual((await enumerate(validateDraft(draft('a','b','c','d','e','f')))).rows[0].values,['a','b','c','d','e','f']);});
// 合法可達容量邊界而非偽造1999/2001乘積。
test('T03 reachable products and dimension/option counts',()=>{const list=n=>Array.from({length:n},(_,i)=>String(i)).join('\n');for(const [counts,n]of [[[2,9,10,11],1980],[[2,10,10,10],2000]])assert.equal(validateDraft(draft(...counts.map(list))).rowCount,n);for(const counts of [[2,7,12,12],[10,10,10,3]])rejects(draft(...counts.map(list)),'COMBINATION_LIMIT');rejects(draft(),'DIMENSION_COUNT');rejects(draft(...Array(7).fill('x')),'DIMENSION_COUNT');rejects(draft(list(13)),'OPTION_LIMIT');});
// 每個字串邊界與正規化規則獨立核查。
test('T02/T04 literal text, duplicates and controls',()=>{assert.deepEqual(validateDraft(draft('紅\r\n藍\r\n')).columns[0].options,['紅','藍']);for(const v of ['a\n\nb','a\n\n','\n'])rejects(draft(v),'OPTION_EMPTY');rejects(draft(' a \na'),'OPTION_DUPLICATE');assert.equal(validateDraft(draft('a','a')).rowCount,1);rejects(draft('😀'.repeat(81)),'OPTION_LIMIT');assert.equal(validateDraft(draft('😀'.repeat(80))).columns[0].options[0].length,160);for(const n of [0,9,31,127,159,0x2028,0x2029,0x202a,0x202e,0x2066,0x2069])rejects(draft(String.fromCharCode(n)),'CONTROL_NOT_ALLOWED');for(const v of ['\ud800','\udfff','a\ud800x'])rejects(draft(v),'INVALID_UNICODE');assert.deepEqual(validateDraft(draft('é\ne\u0301')).columns[0].options,['é','e\u0301']);const d=draft('x');d.dimensions[0].name='CASEID';rejects(d,'NAME_RESERVED');});
// Getter 不可因驗證被呼叫；洞與未知鍵都拒絕。
test('T05 exact schema and immutable snapshot',()=>{let calls=0;const d=draft('x');Object.defineProperty(d.dimensions[0],'name',{get(){calls++;return'x';}});rejects(d,'SCHEMA_INVALID');assert.equal(calls,0);rejects({dimensions:[,]},'SCHEMA_INVALID');const a=draft('x');a.extra=1;rejects(a,'SCHEMA_INVALID');const b=draft('x'),s=validateDraft(b);b.dimensions[0].optionsText='y';assert.equal(s.columns[0].options[0],'x');assert(Object.isFrozen(s.columns[0].options));});
// JSON/CSV 預期以 literal 字串固定，不借被測函式生成。
test('T06 exact serializers and formula risk',async()=>{const r=await enumerate(validateDraft(draft('001'))),f=serialize(r);assert.equal(f.csv,'"caseId","Name0"\r\n"C0001","001"\r\n');assert.equal(f.json,'{\n  "schemaVersion": 1,\n  "tool": "option-matrix",\n  "columns": [\n    {\n      "id": "d1",\n      "label": "Name0"\n    }\n  ],\n  "rows": [\n    {\n      "caseId": "C0001",\n      "values": [\n        "001"\n      ]\n    }\n  ]\n}\n');for(const text of ['=1+1','\u00a0+x','＠x']){const f=serialize(await enumerate(validateDraft(draft(text))));assert.equal(f.csv,null);assert.equal(JSON.parse(f.json).rows[0].values[0],text);}const q=serialize(await enumerate(validateDraft(draft('a,"b'))));assert(q.csv.includes('"a,""b"'));});
// 舊任務在編輯後完成也不得提交；五秒截止是絕對時間。
test('T07 stale completion, cancellation, composition and timeout',async()=>{let release;const s=new Session({yieldTask:()=>new Promise(r=>{release=r;})}),a=draft(...[2,10,10].map(n=>Array.from({length:n},(_,i)=>String(i)).join('\n')));const promise=s.generate(a);await Promise.resolve();s.invalidate();release();await promise;assert.equal(s.state.result,null);s.composition(true);await s.generate(draft('x'));assert.equal(s.state.result,null);let now=0;const t=new Session({now:()=>{now+=2000;return now;}});await t.generate(draft('x'));assert.equal(t.state.error.code,'TIMEOUT');});
// 下載租期失敗與清除使用受控 adapter；不冒原生下載證據。
test('T08 single URL, edit grace and cleanup',()=>{let callback,revoked=[];const l=new DownloadLease({URLApi:{createObjectURL:()=> 'blob:one',revokeObjectURL:x=>revoked.push(x)},BlobType:class{},schedule:f=>{callback=f;return 1;},cancel:()=>{}});assert(l.start('{}','json',()=>{}).ok);assert.equal(l.start('{}','csv',()=>{}).code,'EXPORT_FAILED');assert.deepEqual(revoked,[]);callback();assert.deepEqual(revoked,['blob:one']);assert.equal(l.lease,null);assert.equal(l.start('{}','json',()=>{throw Error('no');}).code,'EXPORT_FAILED');assert.equal(l.lease,null);});
