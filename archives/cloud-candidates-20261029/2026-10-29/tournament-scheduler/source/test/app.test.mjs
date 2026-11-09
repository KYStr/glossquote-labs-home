// 受控 DOM/Clipboard/URL 模型：驗控制狀態，不宣稱真瀏覽器、IME、BFCache 或下載交接。
import test from 'node:test';
import assert from 'node:assert/strict';
import { harness, deferred } from './dom-harness.mjs';
async function ready(h,roster='A\nB\nC'){await h.change('roster',roster);await h.submit();}
for(const language of ['en','zh-Hant']){
  test(`${language}: init guard, example not auto-generated and success`,async()=>{const h=await harness(language);try{
    assert.equal(h.node('editor').disabled,false);assert.equal(h.node('calculate').disabled,false);assert.equal(h.node('report').value,'');
    await h.example();assert.equal(h.node('roster').value.split('\n').length,5);assert.equal(h.node('report').value,'');
    assert.equal((await h.submit()).defaultPrevented,true);assert.equal(h.node('rounds').children.length,5);assert.equal(h.node('team-schedules').children.length,5);assert.equal(h.node('copy').disabled,false);
  }finally{await h.cleanup();}});
  test(`${language}: input/change/composition synchronously remove every stale result`,async()=>{const h=await harness(language);try{
    for(const [id,event]of [['roster','input'],['mode','change'],['roster','compositionstart']]){
      await ready(h);h.node(id).dispatch(event);
      assert.equal(h.node('report').value,'');assert.equal(h.node('result').hidden,true);assert.equal(h.node('rounds').children.length,0);assert.equal(h.node('team-schedules').children.length,0);assert.equal(h.node('copy').disabled,true);assert.equal(h.node('download').disabled,true);
      if(event==='compositionstart'){await h.submit();assert.equal(h.node('report').value,'');h.node('roster').dispatch('compositionend');}
    }
  }finally{await h.cleanup();}});
  test(`${language}: invalid input/mode associates error and doesn't echo`,async()=>{const h=await harness(language);try{
    await ready(h);await h.change('roster','PRIVATE_SENTINEL\u0000\nB');await h.submit();assert.equal(h.node('report').value,'');assert.equal(h.node('error-box').hidden,false);assert.equal(h.node('roster').getAttribute('aria-invalid'),'true');assert.equal(h.document.activeElement.id,'roster');assert.ok(!h.node('error-text').textContent.includes('PRIVATE_SENTINEL'));
    await h.change('roster','A\nB');assert.equal(h.node('roster').getAttribute('aria-invalid'),null);await h.change('mode','wrong','change');await h.submit();assert.equal(h.document.activeElement.id,'mode');assert.equal(h.node('mode').getAttribute('aria-describedby'),'mode-hint error-text');
  }finally{await h.cleanup();}});
  test(`${language}: XSS names are text only in rounds and per-team output`,async()=>{const h=await harness(language);try{
    const payload='<img src=x onerror=1>';await ready(h,payload+'\n</script>');
    assert.equal(h.node('rounds').children[0].children[1].children[0].textContent,`[#1] ${payload} ${language==='en'?'vs':'對'} [#2] </script>`);
    const all=[];const walk=n=>{all.push(n.tagName);n.children.forEach(walk);};walk(h.node('rounds'));walk(h.node('team-schedules'));assert.ok(!all.includes('IMG'));assert.ok(!all.includes('SCRIPT'));
  }finally{await h.cleanup();}});
  for(const outcome of ['resolve','reject'])test(`${language}: stale A ${outcome}/finally is total DOM/focus no-op while B pending`,async()=>{const h=await harness(language);try{
    const a=deferred(),b=deferred();let calls=0;h.clipboard(()=>++calls===1?a.promise:b.promise);
    await ready(h);await h.click('copy');await h.click('copy');assert.equal(calls,1);
    await ready(h,'X\nY');await h.click('copy');h.node('report').focus();const before=h.snapshot();const writes=h.document.writes;
    a[outcome](outcome==='reject'?new Error('PRIVATE_SENTINEL'):undefined);await h.spin();assert.equal(h.snapshot(),before);assert.equal(h.document.writes,writes);assert.equal(h.node('copy').getAttribute('aria-busy'),'true');
    b.resolve();await h.spin();assert.equal(h.node('copy').disabled,false);assert.equal(h.node('copy').getAttribute('aria-busy'),null);
  }finally{await h.cleanup();}});
  test(`${language}: Clipboard missing/sync throw/rejected Promise preserves manual report`,async()=>{const h=await harness(language);try{
    for(const writer of [null,()=>{throw new Error('PRIVATE_SENTINEL');},()=>Promise.reject(new Error('PRIVATE_SENTINEL'))]){
      await ready(h);const before=h.node('report').value;h.clipboard(writer);await h.click('copy');assert.equal(h.node('report').value,before);assert.equal(h.document.activeElement.id,'report');assert.equal(h.node('report').selectionEnd,before.length);assert.equal(h.node('copy').disabled,false);assert.ok(!h.node('status').textContent.includes('PRIVATE_SENTINEL'));
    }
  }finally{await h.cleanup();}});
  test(`${language}: download matches report UTF-8, fixed name, bounded grace and current result`,async()=>{const h=await harness(language);try{
    await ready(h,'甲\n😀');const report=h.node('report').value;await h.click('download');const record=h.downloads[0];assert.equal(record.name,'glossquote-tournament-schedule.txt');assert.equal(record.liveAtClick,true);assert.equal(h.urls.size,1);assert.equal(h.revoked.length,0);
    const blob=h.urls.get(record.url);assert.equal(blob.type,'text/plain;charset=utf-8');assert.deepEqual(new Uint8Array(await blob.arrayBuffer()),new Uint8Array(Buffer.from(report)));
    assert.equal([...h.timers.values()][0].delay,60000);await h.click('download');assert.equal(h.downloads.length,1);
    await ready(h,'New\nOther');assert.equal(h.node('download').disabled,true);assert.equal(h.urls.size,1);await h.tick();assert.equal(h.urls.size,0);assert.equal(h.node('download').disabled,false);await h.click('download');assert.equal(h.downloads.length,2);
  }finally{await h.cleanup();}});
  test(`${language}: clear cancel and Escape preserve complete state, confirm resets`,async()=>{const h=await harness(language);try{
    await ready(h);h.node('clear').focus();const before=h.snapshot();await h.click('clear');await h.click('cancel-clear');assert.equal(h.snapshot(),before);
    await h.click('clear');const event=h.node('clear-dialog').dispatch('cancel');assert.equal(event.defaultPrevented,true);assert.equal(h.snapshot(),before);
    await h.click('clear');await h.click('confirm-clear');assert.equal(h.node('roster').value,'');assert.equal(h.node('mode').value,'single');assert.equal(h.node('report').value,'');assert.equal(h.document.activeElement.id,'roster');
  }finally{await h.cleanup();}});
  test(`${language}: pagehide clears raw/results/URL and late Promise cannot revive; restore blank`,async()=>{const h=await harness(language);try{
    const pending=deferred();h.clipboard(()=>pending.promise);await ready(h);await h.click('copy');await h.click('download');h.event('pagehide',{persisted:true});assert.equal(h.node('roster').value,'');assert.equal(h.node('report').value,'');assert.equal(h.urls.size,0);assert.equal(h.timers.size,0);assert.equal(h.node('status').textContent,'');const before=h.snapshot();const writes=h.document.writes;
    pending.resolve();await h.spin();assert.equal(h.snapshot(),before);assert.equal(h.document.writes,writes);h.event('pageshow',{persisted:true});assert.equal(h.node('mode').value,'single');assert.equal(h.node('report').value,'');assert.equal(h.node('copy').disabled,true);
  }finally{await h.cleanup();}});
  test(`${language}: language navigation and repeat lifecycle starts blank`,async()=>{const h=await harness(language);try{
    for(let round=0;round<3;round++){await ready(h);await h.click('download');await h.click('language-link');assert.equal(h.node('roster').value,'');assert.equal(h.node('report').value,'');assert.equal(h.urls.size,0);h.event('pagehide');h.event('pageshow',{persisted:true});assert.equal(h.node('roster').value,'');}
  }finally{await h.cleanup();}});
  test(`${language}: maximum double schedule produces all 62 rounds and 32 team schedules`,async()=>{const h=await harness(language);try{
    await h.change('roster',Array.from({length:32},(_,i)=>`Team ${i+1}`).join('\n'));await h.change('mode','double','change');await h.submit();assert.equal(h.node('rounds').children.length,62);assert.equal(h.node('team-schedules').children.length,32);for(const team of h.node('team-schedules').children)assert.equal(team.children[1].children.length,62);
  }finally{await h.cleanup();}});
}
