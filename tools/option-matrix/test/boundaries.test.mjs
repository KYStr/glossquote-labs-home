// 容量、Unicode 與非同步邊界使用明確 oracle，不拿測試數量當品質分。
import test from 'node:test';
// 內建斷言讓每個未達要求直接失敗。
import assert from 'node:assert/strict';
// 輸入驗證與固定錯誤。
import {validateDraft} from '../core/input.mjs';
// 純列舉是輸出容量案例的實際生產路徑。
import {enumerate} from '../core/product.mjs';
// 實際有界序列化。
import {serialize} from '../core/export.mjs';
// 可控讓步用來確證舊任務不會覆寫新結果。
import {Session} from '../core/session.mjs';
// 下載受控故障不冒稱作業系統拒絕下載。
import {DownloadLease} from '../download.mjs';
// 產生指定長度的合法維度項。
const dim=(name='N',optionsText='x',id='d1')=>({id,name,optionsText});
// 每份錯誤精確匹配固定代碼。
const check=(dimensions,code)=>assert.throws(()=>validateDraft({dimensions}),e=>e.code===code);
// 原字串界線與修剪後碼點界線分別檢查。
test('raw name128 and options4096; codepoints40/80',()=>{for(const n of [127,128])assert.equal(validateDraft({dimensions:[dim(' '.repeat(n-1)+'N')]}).rowCount,1);check([dim(' '.repeat(128)+'N')],'INPUT_LIMIT');for(const n of [4095,4096])assert.equal(validateDraft({dimensions:[dim('N',' '.repeat(n-1)+'x')]}).rowCount,1);check([dim('N',' '.repeat(4096)+'x')],'INPUT_LIMIT');for(const n of [39,40])assert.equal(validateDraft({dimensions:[dim('字'.repeat(n))]}).rowCount,1);check([dim('字'.repeat(41))],'NAME_LIMIT');for(const n of [79,80])assert.equal(validateDraft({dimensions:[dim('N','字'.repeat(n))]}).rowCount,1);check([dim('N','字'.repeat(81))],'OPTION_LIMIT');});
// 名稱空白、大小寫與保留名稱處理不混淆。
test('names duplicate case and schema primitive',()=>{check([dim(' ')],'NAME_EMPTY');check([dim('\u3000')],'NAME_EMPTY');check([dim('N'),dim('N','y','d2')],'NAME_DUPLICATE');assert.equal(validateDraft({dimensions:[dim('N'),dim('n','y','d2')]}).rowCount,1);for(const value of [null,1,true,new String('x')])check([dim('N',value)],'SCHEMA_INVALID');const d=dim();d.other=1;check([d],'SCHEMA_INVALID');const arr=[dim()];arr.extra=1;check(arr,'SCHEMA_INVALID');});
// 明確生成2,000列及末筆 caseId，避免只驗證計數函式。
test('full 2000 rows and output limit',async()=>{const cols=[10,10,10,2,1,1].map((n,i)=>dim('N'+i,Array.from({length:n},(_,j)=>String(j)).join('\n'),'d'+(i+1)));const r=await enumerate(validateDraft({dimensions:cols}));assert.equal(r.rows.length,2000);assert.equal(r.rows.at(-1).caseId,'C2000');assert.deepEqual(r.rows.at(-1).values,['9','9','9','1','0','0']);const large=cols.map((d,i)=>({...d,optionsText:d.optionsText.split('\n').map(x=>'"'.repeat(79)+x).join('\n')}));const big=await enumerate(validateDraft({dimensions:large}));assert.throws(()=>serialize(big),e=>e.code==='OUTPUT_LIMIT');});
// 同時多次生成時舊進度與舊完成都不能恢復過期資料。
test('new generation owns result; cancel and late progress ignored',async()=>{let release;const seen=[];const s=new Session({onChange:x=>seen.push(x.phase),yieldTask:()=>new Promise(r=>release=r)});const large={dimensions:[dim('A','0\n1\n2\n3\n4\n5\n6\n7\n8\n9'),dim('B','0\n1\n2\n3\n4\n5\n6\n7\n8\n9','d2'),dim('C','0\n1','d3')]};const old=s.generate(large);await Promise.resolve();await s.generate({dimensions:[dim('New','new')]});release();await old;assert.equal(s.state.result.rows[0].values[0],'new');s.cancel();assert.equal(s.state.files,null);});
// 期限跨越序列化也必須整份拒絕，不能留下半份 JSON。
test('absolute timeout does not commit',async()=>{let clock=0;const s=new Session({now:()=>clock,yieldTask:async()=>{clock=5000;}});await s.generate({dimensions:[dim('A','0\n1\n2\n3\n4\n5\n6\n7\n8\n9'),dim('B','0\n1\n2\n3\n4\n5\n6\n7\n8\n9','d2'),dim('C','0\n1','d3')]});assert.equal(s.state.error.code,'TIMEOUT');assert.equal(s.state.files,null);});
// 清除後的舊回呼不會清掉新租期或重新啟用舊結果。
test('URL clear and old callbacks are isolated',()=>{const callbacks=[],revoked=[];let seq=0;const l=new DownloadLease({URLApi:{createObjectURL:()=>`blob:${++seq}`,revokeObjectURL:x=>revoked.push(x)},BlobType:class{},schedule:f=>{callbacks.push(f);return callbacks.length;},cancel:()=>{}});l.start('a','json',()=>{});l.clear();l.start('b','json',()=>{});callbacks[0]();assert.equal(l.lease.url,'blob:2');callbacks[1]();assert.deepEqual(revoked,['blob:1','blob:2']);const absent=new DownloadLease({URLApi:{},BlobType:class{}});assert.equal(absent.start('x','json',()=>{}).code,'UNSUPPORTED');});
// 瀏覽器原生 timer 需使用全域 receiver；不能以 DownloadLease instance 當 this。
test('T08 timer wrappers preserve global receiver',()=>{const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;let scheduled=false,cleared=false;globalThis.setTimeout=function(fn,ms){assert.equal(this,globalThis);assert.equal(ms,10000);scheduled=true;return 42;};globalThis.clearTimeout=function(id){assert.equal(this,globalThis);assert.equal(id,42);cleared=true;};try{const lease=new DownloadLease({URLApi:{createObjectURL:()=> 'blob:receiver-test',revokeObjectURL:()=>{}},BlobType:Blob});assert.equal(lease.start('safe','json',()=>{}).ok,true);assert.equal(scheduled,true);lease.clear();assert.equal(cleared,true);}finally{globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}});
