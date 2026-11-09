import test from 'node:test';
import assert from 'node:assert/strict';
import { createEffects } from '../public/js/lifecycle.js';

function fixture(clipboard) {
  let time=0, sequence=0; const timers=new Map(), revoked=[], changes=[];
  const effects=createEffects({ clipboard, createURL:()=>`blob:${++sequence}`,revokeURL:url=>revoked.push(url),setTimer:(fn,delay)=>{const id=++sequence;timers.set(id,{fn,at:time+delay});return id;},clearTimer:id=>timers.delete(id),now:()=>time,onChange:state=>changes.push({...state}) });
  const tick=amount=>{time+=amount;for(const [id,entry]of [...timers])if(entry.at<=time){timers.delete(id);entry.fn();}};
  return {effects,revoked,changes,timers,tick};
}
test('B12 stale resolve/reject/finally never overwrite a new copy',async()=>{
  for(const outcome of ['resolve','reject']) {
    const pending=[]; const f=fixture({writeText:()=>new Promise((resolve,reject)=>pending.push({resolve,reject}))});
    const old=f.effects.copy('fake old'); assert.equal(f.effects.snapshot().copyState,'pending');
    f.effects.invalidate(); const newer=f.effects.copy('fake new');
    const before=f.changes.length; pending[0][outcome](); await old;
    assert.equal(f.changes.length,before); assert.equal(f.effects.snapshot().copyState,'pending');
    pending[1].resolve(); await newer; assert.equal(f.effects.snapshot().copyState,'success');
  }
});
test('B12 generation/reset invalidates pending and rejection provides fixed failure',async()=>{
  let finish; const f=fixture({writeText:()=>new Promise(resolve=>{finish=resolve;})});
  const old=f.effects.copy('fake'); f.effects.reset(); const before=f.changes.length; finish(); await old;
  assert.equal(f.changes.length,before); assert.equal(f.effects.snapshot().copyState,'idle');
  for(const clipboard of [undefined,{writeText:()=>Promise.reject(Error('CANARY'))}]){const x=fixture(clipboard);await x.effects.copy('fake');assert.equal(x.effects.snapshot().copyState,'failed');assert.equal(JSON.stringify(x.changes).includes('CANARY'),false);}
});
test('B13 eight independent deadlines, capacity, invalidation keeps URLs',()=>{
  const f=fixture(); const urls=[];
  for(let i=0;i<8;i++){urls.push(f.effects.download(new Blob(['fake'])).url);f.tick(1000);}
  assert.deepEqual(f.effects.snapshot().deadlines,[30000,31000,32000,33000,34000,35000,36000,37000]);
  assert.deepEqual(f.effects.download(new Blob()),{ok:false,code:'capacity'});f.effects.invalidate();assert.equal(f.revoked.length,0);
  f.tick(22000);assert.deepEqual(f.revoked,[urls[0]]);assert.equal(f.effects.snapshot().activeDownloads,7);
  assert.equal(f.effects.download(new Blob()).ok,true);f.tick(1000);assert.deepEqual(f.revoked,[urls[0],urls[1]]);
  f.tick(29000);assert.equal(f.effects.snapshot().activeDownloads,0);assert.equal(f.revoked.length,9);
});
test('B14/B20 reset revokes all, timers cannot revoke twice',()=>{
  const f=fixture();const a=f.effects.download(new Blob()).url,b=f.effects.download(new Blob()).url;
  assert.equal(f.revoked.length,0);
  f.effects.reset();assert.deepEqual(f.revoked,[a,b]);assert.equal(f.timers.size,0);f.tick(40000);assert.deepEqual(f.revoked,[a,b]);assert.equal(f.effects.snapshot().activeDownloads,0);
});
