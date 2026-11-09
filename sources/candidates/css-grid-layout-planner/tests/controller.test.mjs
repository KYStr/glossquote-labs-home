import test from 'node:test'; // 控制器測試使用受控時間而非冒充瀏覽器。
import assert from 'node:assert/strict'; // 狀態逐項精確驗證。
import { Controller } from '../public/controller.mjs'; // 匯入產品控制器。
const raw=()=>({columns:'3',rows:'2',rowHeight:'80',gap:'8',blocks:[{rowStart:'1',columnStart:'1',rowEnd:'2',columnEnd:'2'}]}); // 合法初稿。
function fixture(){ // 明示依賴替身只測事件協定。
  let clock=0,resolve;const timers=[],revoked=[];let seq=0; // 每例隔離時鐘與租約。
  const c=new Controller({now:()=>clock,schedule:(fn,ms)=>{const t={fn,ms,cancelled:false};timers.push(t);return t;},cancel:t=>{t.cancelled=true;},clipboard:()=>()=>new Promise(r=>{resolve=r;}),URLApi:{createObjectURL:()=>`blob:test-${++seq}`,revokeObjectURL:u=>revoked.push(u)}}); // 不讀真剪貼簿或開真下載。
  return {c,timers,revoked,time:n=>{clock=n;},resolve:()=>resolve()}; // 測試可延後 timer 交付。
} // 替身建構完成。
test('明確生成、編輯、組字與能力失敗失效',()=>{ // 不能沿舊結果取出。
  const {c}=fixture();assert.equal(c.state.result,null);c.generate(raw());assert.equal(c.state.result.columns,3);c.invalidate();assert.equal(c.state.result,null); // 初始與編輯。
  c.composition(true);c.generate(raw());assert.equal(c.state.result,null);c.composition(false);assert.equal(c.state.result,null);c.generate(raw());c.fail();assert.equal(c.state.message,'previewFailed'); // 組字結束不自動生成。
}); // 失效案例完成。
test('複製原五秒截止且晚timer不能改新操作',async()=>{ // 不依靠timer準時交付。
  const f=fixture();f.c.generate(raw());f.c.copy(raw());assert.equal(f.timers[0].ms,5000);f.time(5000);f.resolve();await Promise.resolve();assert.equal(f.c.state.message,'copyFallback'); // 整界拒採成功。
  f.c.copy(raw());const old=f.timers[0];old.fn();assert.equal(f.c.state.copying,true);f.time(9999);f.resolve();await Promise.resolve();assert.equal(f.c.state.message,'copied'); // 舊token不能結束新copy。
}); // 固定截止案例完成。
test('modal取消複製但保留結果',async()=>{ // 打開即失效未完成的回報。
  const f=fixture();f.c.generate(raw());const css=f.c.state.result.css;f.c.copy(raw());f.c.setModal(true);assert.equal(f.c.state.copying,false);assert.equal(f.c.state.result.css,css);f.resolve();await Promise.resolve();assert.equal(f.c.state.message,'ready');f.c.setModal(false);assert.equal(f.c.state.result.css,css); // 取消不能復活晚promise。
}); // 對話框案例完成。
test('下載固定三十秒且與結果世代分離',()=>{ // 一份lease不因編輯續命。
  const f=fixture();f.c.generate(raw());let delivered;assert.equal(f.c.download(raw(),(...a)=>{delivered=a;}),true);assert.deepEqual(delivered,['blob:test-1','grid.css']);assert.equal(f.timers[0].ms,30000); // 固定檔名與截止。
  f.time(1000);f.c.invalidate();f.c.generate(raw());assert.equal(f.c.download(raw(),()=>{}),false);f.c.reset();assert.ok(f.c.lease); // 編輯與clear不purge。
  f.time(30000);f.c.generate(raw());assert.equal(f.c.lease,null);assert.deepEqual(f.revoked,['blob:test-1']);f.c.download(raw(),()=>{});f.timers[0].fn();assert.equal(f.c.lease.url,'blob:test-2'); // 舊timer不撤新URL。
}); // 下載租約案例完成。
test('離開清結果與租約、visible不生成',async()=>{ // raw與modal DOM由app同步重設。
  const f=fixture();f.c.generate(raw());f.c.download(raw(),()=>{});f.c.copy(raw());f.c.hidden();assert.equal(f.c.state.result,null);assert.equal(f.c.lease,null);f.resolve();await Promise.resolve();f.c.visible();assert.equal(f.c.state.message,'background');assert.equal(f.c.state.result,null); // 不復活晚callback。
}); // 生命週期案例完成。
