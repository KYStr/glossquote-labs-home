import test from 'node:test'; // 只用內建 runner，不安裝瀏覽器替身套件。
import assert from 'node:assert/strict'; // 所有狀態期望明確斷言。
import {createController} from '../src/controller.mjs'; // 被測控制器不依賴 DOM。
const raw = {x1:'0.25',y1:'0.1',x2:'0.25',y2:'1'}; // 固定合法輸入快照。
function rig(options={}) { // 可控制單調鐘與真正回呼順序的作者替身。
  let now=0, hidden=false, id=0; const frames=new Map(), timers=new Map(), events=[], writes=[]; // 各排程獨立追蹤。
  let resolve, reject; const promise=new Promise((a,b)=>{resolve=a;reject=b;}); // 手動結算複製，不接 OS。
  const api=createController({hidden:()=>hidden, now:()=>now, frame:cb=>{frames.set(++id,cb);return id;}, cancelFrame:key=>frames.delete(key), setTimer:(cb,ms)=>{timers.set(++id,{cb,at:now+ms});return id;}, clearTimer:key=>timers.delete(key), writeText:options.writer || (options.absent?undefined:text=>{writes.push(text);if(options.throw)throw Error('denied');return promise;}), render:(state,event)=>events.push({state,event}), systemReduced:options.system}); // 替身完全注入且不聲稱原生。
  return {api,frames,timers,events,writes,resolve,reject,setTime:value=>{now=value;},hide:value=>{hidden=value;},frame:()=>{const next=frames.entries().next().value;if(next){frames.delete(next[0]);next[1]();}},timer:()=>{const next=timers.entries().next().value;if(next){timers.delete(next[0]);next[1].cb();}}}; // 測試可故意讓舊回呼晚到。
} // 結束測試時鐘。
const flush=async()=>{await Promise.resolve();await Promise.resolve();}; // 等候 promise handler，不等待實際三秒。
test('T06 initial, generate, play-pause-wait-continue and finish',()=>{ // 完整控制器正常旅程。
  const r=rig(),a=r.api; assert.equal(a.get().result,null); assert.equal(a.get().phase,'draft'); a.generate(raw); assert.equal(a.get().q,0); a.play(); assert.equal(r.frames.size,1); a.play(); assert.equal(r.frames.size,1); // 重按播放不倍增 RAF。
  r.setTime(500);r.frame();assert.equal(a.get().q,250000);a.pause();assert.equal(a.get().phase,'paused');assert.equal(r.frames.size,0); // 精確暫停四分之一時間。
  r.setTime(9000);a.resume();r.setTime(9500);r.frame();assert.equal(a.get().q,500000);r.setTime(10500);r.frame();assert.equal(a.get().phase,'finished');assert.equal(a.get().q,1000000);assert.deepEqual(a.get().y,{n:1n,d:1n});assert.equal(r.frames.size,0); // 長暫停不納入播放時間。
  a.play();assert.equal(a.get().q,0);a.stop();assert.equal(a.get().q,0);assert.equal(a.get().phase,'valid-idle');assert.equal(r.frames.size,0); // 重播與停止都歸零。
}); // 結束正常播放。
test('T06 radio cancels playing or paused while preserving CSS',()=>{ // 靜態觀察獨立於播放進度。
  const r=rig(),a=r.api;a.generate(raw);const css=a.get().result.css;a.play();a.select(625000);assert.equal(a.get().q,625000);assert.equal(a.get().elapsed,0);assert.equal(r.frames.size,0);assert.equal(a.get().result.css,css);a.play();assert.equal(a.get().q,0);a.pause();a.select(875000);assert.equal(a.get().phase,'valid-idle');a.select(1);assert.equal(a.get().q,875000); // 只允許九個時刻。
}); // 結束靜態觀察。
test('T07 all valid phases invalidate and stale RAF cannot revive',()=>{ // 各有效狀態共用取消契約。
  for(const phase of ['valid-idle','playing','paused','finished'])for(const action of ['edit','clear','leave','returnPage','dispose']){ // 有限狀態與取消矩陣。
    const r=rig(),a=r.api;a.generate(raw);if(phase!=='valid-idle')a.play();if(phase==='paused')a.pause();if(phase==='finished'){r.setTime(2000);r.frame();}const old=[...r.frames.values()];a[action]();for(const cb of old)cb();assert.equal(a.get().result,null);assert.equal(r.frames.size,0);assert.equal(r.timers.size,0);assert.equal(a.get().copy,'idle'); // 舊回呼不得恢復結果。
  } // 結束所有取消組合。
}); // 結束生命週期替身檢查。
test('T07 hidden guard, pageshow and dispose reject stale actions',()=>{ // 不用合成事件冒原生 BFCache。
  const r=rig(),a=r.api;a.generate(raw);r.hide(true);a.leave();a.generate(raw);a.play();a.copy();assert.equal(a.get().result,null);assert.equal(r.writes.length,0);r.hide(false);a.returnPage();assert.equal(a.get().result,null);a.generate(raw);a.dispose();a.generate(raw);a.play();a.copy();assert.equal(a.get().result,null); // 全部入口核 hidden/disposed。
}); // 結束隱藏入口。
test('T07 reduced motion OR, no auto restart and copy independence',()=>{ // 系統 true 不能被頁內 false 推翻。
  const r=rig({system:true}),a=r.api;a.generate(raw);a.reduced(false,true);a.play();assert.equal(r.frames.size,0);a.copy();a.reduced(true,false);assert.equal(a.get().copy,'pending');a.reduced(false,false);assert.equal(r.frames.size,0);a.play();r.setTime(500);r.frame();a.reduced(true,false);assert.equal(a.get().q,0);assert.equal(a.get().phase,'valid-idle');assert.equal(r.frames.size,0);a.clear();assert.equal(a.get().localReduced,false); // 清除只重設本地。
}); // 結束減動。
test('T07 geometry failure preserves results without restarting',()=>{ // 幾何無效不是數學失效。
  const r=rig(),a=r.api;a.generate(raw);const s=a.get().result;a.play();a.geometry(false);assert.equal(r.frames.size,0);assert.equal(a.get().result,s);a.play();assert.equal(r.frames.size,0);a.geometry(true);assert.equal(r.frames.size,0); // 恢復尺寸不自動播放。
}); // 結束幾何邊界。
for(const elapsed of [2999,3000,3001])for(const timerFirst of [false,true])test(`T08 clipboard deadline ${elapsed}, timerFirst=${timerFirst}`,async()=>{ // 期限與回呼先後的完整有限矩陣。
  const r=rig(),a=r.api;a.generate(raw);a.copy();a.copy();assert.equal(r.writes.length,1);assert.equal(r.timers.size,1);r.setTime(elapsed);if(timerFirst&&elapsed>=3000)r.timer();r.resolve();await flush();assert.equal(a.get().copy,elapsed<3000?'success':'fallback');assert.equal(r.timers.size,0); // 到期瞬間必為備援。
}); // 結束三秒截止矩陣。
test('T08 missing, synchronous denial and rejected clipboard stay fallback',async()=>{ // 三種不可用能力不可假報成功。
  for(const option of [{absent:true},{throw:true},{}]){const r=rig(option);r.api.generate(raw);r.api.copy();if(!option.absent&&!option.throw)r.reject(Error('denied'));await flush();assert.equal(r.api.get().copy,'fallback');assert.equal(r.timers.size,0);} // 不讀寫真剪貼簿。
}); // 結束拒絕與缺能力。
test('T08 every invalidation cancels pending copy and late success',async()=>{ // 舊 promise 不能污染新結果。
  for(const action of ['edit','clear','leave','returnPage','dispose','generate']){const r=rig(),a=r.api;a.generate(raw);a.copy();const late=[...r.timers.values()].map(x=>x.cb);a[action](raw);r.resolve();for(const cb of late)cb();await flush();assert.equal(a.get().copy,'idle');assert.equal(r.timers.size,0);} // 有效新快照也不接受舊成功。
}); // 結束複製代數失效。
test('T08 old request cannot complete a newer copy epoch',async()=>{ // 新一次 click 必須具有獨立權限。
  const pending=[]; const r=rig({writer:()=>new Promise(resolve=>pending.push(resolve))}),a=r.api;a.generate(raw);a.copy();const oldTimer=[...r.timers.values()][0].cb;r.setTime(3000);r.timer();assert.equal(a.get().copy,'fallback');a.copy();pending[0]();oldTimer();await flush();assert.equal(a.get().copy,'pending');pending[1]();await flush();assert.equal(a.get().copy,'success');assert.equal(r.timers.size,0); // 舊 promise 與舊 timer 均不能完成不同的新 promise。
}); // 結束再次複製。
test('T09 composition requires explicit generation and focus directives',()=>{ // 控制器焦點指令不冒原生鍵盤證據。
  const r=rig(),a=r.api;a.compositionStart();assert.equal(a.generate(raw),false);a.compositionEnd();assert.equal(a.get().result,null);a.generate({...raw,x1:'-'});assert.equal(r.events.at(-1).event.focus,'x1');a.edit();assert.equal(a.get().error,null);a.generate(raw);assert.equal(r.events.at(-1).event.focus,'generate');a.play();assert.equal(r.events.at(-1).event.focus,'pause');a.pause();assert.equal(r.events.at(-1).event.focus,'continue');a.resume();assert.equal(r.events.at(-1).event.focus,'pause');a.stop();assert.equal(r.events.at(-1).event.focus,'play');a.clear();assert.equal(r.events.at(-1).event.focus,'x1'); // 逐步確認停用前移焦契約。
}); // 結束組字與焦點指令。
