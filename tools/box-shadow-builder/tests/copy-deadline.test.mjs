import test from 'node:test'; // 獨立測試只驗受控控制器，不當原生剪貼簿。
import assert from 'node:assert/strict'; // 期望依固定規格三秒界，不讀產品實作生成。
import {Controller} from '../public/controller.mjs'; // 對應公開候選逐位元相同的真類別。
const raw=()=>({layers:[{x:'0',y:'8',blur:'16',spread:'0',hex:'#112233',opacity:'25',mode:'outer'}]}); // 固定合成正常資料。
for(const [elapsed,expected] of [[2999,'copied'],[3000,'copyFallback'],[3001,'copyFallback']])test(`promise completes at ${elapsed}ms before delayed timer delivery`,async()=>{ // 保留界內正控制和界外反例。
  let clock=0,resolve;const timers=[];const c=new Controller({now:()=>clock,clipboard:()=>()=>new Promise(r=>{resolve=r;}),schedule:(fn,ms)=>{timers.push({fn,ms});return timers.length;},cancel:()=>{}}); // 假時鐘只推進時間，不先交付timer以模擬事件迴圈延後。
  c.generate(raw());c.copy(raw());assert.equal(timers[0].ms,3000);clock=elapsed;resolve();await Promise.resolve(); // 真Promise微任務先完成，沒有注入結果狀態。
  assert.equal(c.state.message,expected);assert.equal(c.state.copying,false); // 超過原界不能把晚完成回寫成成功。
}); // 正反例同一輸入與控制器。
