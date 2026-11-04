// 受控時鐘與 Promise 驗證真控制器；不冒稱瀏覽器權限或下載實證。
import test from 'node:test';
// 匯入此模組明列的內建或同源依賴，不載入遠端程式。
import assert from 'node:assert/strict';
// 匯入此模組明列的內建或同源依賴，不載入遠端程式。
import {Controller} from '../public/controller.mjs';
// 讀取當下兩種色標欄位及角度，不混入 DOM 或額外屬性。
const raw=()=>({angle:'90',stops:[{hex:'#ff0000',position:'0'},{hex:'#0000ff',position:'100'}]});
// 此局部函式集中處理 fixture 的固定狀態轉換。
function fixture(clipboard){let now=0,id=0;const timers=new Map(),revoked=[];let url=0;const c=new Controller({clipboard,schedule:(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id;},cancel:id=>timers.delete(id),URLApi:{createObjectURL:()=>`blob:${++url}`,revokeObjectURL:u=>revoked.push(u)}});return {c,timers,revoked,tick(ms){now+=ms;for(const[k,v]of [...timers])if(v.at<=now){timers.delete(k);v.fn();}}};}
// 成功只可由目前 generation 的真 Promise 終態啟用。
test('copy invoked synchronously; one in flight and late completion discarded',async()=>{let resolve,calls=0;const f=fixture(()=>()=>{calls++;return new Promise(r=>resolve=r);});f.c.generate(raw());f.c.copy(raw());assert.equal(calls,1);f.c.copy(raw());assert.equal(calls,1);f.c.invalidate('hidden');resolve();await Promise.resolve();assert.equal(f.c.state.result,null);assert.equal(f.c.state.message,'hidden');});
// 逾時後前一 Promise 不可覆蓋第二次複製回條。
test('timeout guard and subsequent copy are independent',async()=>{const callbacks=[];const f=fixture(()=>()=>new Promise(r=>callbacks.push(r)));f.c.generate(raw());f.c.copy(raw());f.tick(3000);assert.equal(f.c.state.message,'copyFallback');f.c.copy(raw());callbacks[0]();await Promise.resolve();assert.equal(f.c.state.phase,'copying');callbacks[1]();await Promise.resolve();assert.equal(f.c.state.message,'copied');assert.equal(f.timers.size,0);});
// API 缺失、同步拒絕與 getter 錯誤都提供手動備援。
test('clipboard failure modes preserve selectable CSS',()=>{for(const provider of [()=>undefined,()=>()=>{throw Error('denied');},()=>{throw Error('getter');}]){const f=fixture(provider);f.c.generate(raw());f.c.copy(raw());assert.equal(f.c.state.message,'copyFallback');assert.ok(f.c.state.result.css);}});
// 靜默改值或 IME 期間不得取出舊結果。
test('raw snapshot and composition prevent stale exports',()=>{const f=fixture(()=>()=>{});f.c.generate(raw());const changed=raw();changed.angle='0';assert.equal(f.c.current(changed),false);f.c.generate(raw());f.c.composition(true);f.c.generate(raw());assert.equal(f.c.state.result,null);f.c.composition(false);assert.equal(f.c.state.result,null);});
// 下載只保有一個 URL，第二次先撤銷；三十秒和修改皆回收。
test('download URL lease, deadline and lifecycle cleanup',()=>{const f=fixture();f.c.generate(raw());const got=[];assert.equal(f.c.download(raw(),(...x)=>got.push(x)),true);assert.deepEqual(got,[['blob:1','gradient.css']]);assert.deepEqual(f.revoked,[]);f.c.download(raw(),()=>{});assert.deepEqual(f.revoked,['blob:1']);f.tick(29999);assert.equal(f.c.url,'blob:2');f.tick(1);assert.deepEqual(f.revoked,['blob:1','blob:2']);f.c.download(raw(),()=>{});f.c.invalidate('hidden');assert.equal(f.c.url,null);assert.equal(f.timers.size,0);});
// 交瀏覽器當下若離頁，不能回寫已失效的成功訊息。
test('download delivery failure and synchronous lifecycle are guarded',()=>{const f=fixture();f.c.generate(raw());assert.equal(f.c.download(raw(),()=>{throw Error('blocked');}),false);assert.equal(f.c.state.message,'downloadFallback');assert.equal(f.c.url,null);f.c.download(raw(),()=>f.c.invalidate('pagehide'));assert.equal(f.c.state.message,'pagehide');assert.equal(f.c.state.result,null);assert.equal(f.timers.size,0);});
