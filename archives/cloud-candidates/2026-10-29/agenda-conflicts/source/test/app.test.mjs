import test from 'node:test';
import assert from 'node:assert/strict';
import { harness, fill } from './dom-harness.mjs';
import { COPY } from '../public/js/i18n.mjs';
for(const locale of ['zh-Hant','en']) {
  test(`${locale}: real app computes, associates errors and invalidates every field`,()=>harness(locale,api=>{
    const {get,click}=api;assert.equal(get('workspace').disabled,false);assert.equal(get('roomBufferRaw').value,'0');assert.equal(get('dateRaw').value,'');assert.equal(get('download').disabled,true);
    fill(api);click('calculate');assert.equal(get('result').hidden,false);assert.match(get('report').value,/09:00–10:00/);assert.match(get('report').value,/1 ↔ 2/);
    for(const id of ['dateRaw','timeBasisRaw','roomBufferRaw','speakerBufferRaw','r1-titleRaw','r1-roomRaw','r1-speakersRaw','r1-startRaw','r1-endRaw']){
      fill(api);click('calculate');get(id).fire('input');assert.equal(get('report').value,'',id);assert.equal(get('download').disabled,true,id);assert.equal(get('result').hidden,true,id);
    }
    fill(api);get('dateRaw').value='1900-02-29';click('calculate');assert.equal(get('dateRaw').getAttribute('aria-invalid'),'true');assert.equal(get('dateRaw').getAttribute('aria-describedby'),'error');assert.equal(api.doc.activeElement.id,'dateRaw');
    get('dateRaw').value='2026-10-28';get('dateRaw').fire('change');assert.equal(get('dateRaw').getAttribute('aria-invalid'),null);click('calculate');assert.equal(get('result').hidden,false);
    get('r1-endRaw').value='09:00';click('calculate');assert.equal(api.doc.activeElement.id,'r1-endRaw');assert.equal(get('result').hidden,true);
  }));
  test(`${locale}: clear and language cancel/Escape preserve input, report and focus`,()=>harness(locale,api=>{
    const {get,click}=api;fill(api);click('calculate');const report=get('report').value;const before=api.doc.querySelectorAll('input').map(n=>n.value);
    for(const origin of ['clear','language'])for(const cancel of ['button','escape','native-cancel']){
      click(origin);assert.equal(get('confirmation').open,true);assert.equal(get('workspace').disabled,true);assert.equal(api.doc.activeElement.id,'confirm-cancel');
      click('add');assert.equal(get('count').textContent,COPY[locale].count(2));
      if(cancel==='button')click('confirm-cancel');else if(cancel==='escape')api.doc.fire('keydown',{key:'Escape'});else get('confirmation').fire('cancel');
      assert.equal(get('confirmation').open,false);assert.equal(get('workspace').disabled,false);assert.deepEqual(api.doc.querySelectorAll('input').map(n=>n.value),before);assert.equal(get('report').value,report);assert.equal(api.doc.activeElement.id,origin);assert.deepEqual(api.navigation,[]);
    }
    click('clear');click('confirm-accept');assert.equal(get('dateRaw').value,'');assert.equal(get('roomBufferRaw').value,'0');assert.equal(get('r1-titleRaw').value,'');assert.equal(get('report').value,'');assert.equal(api.doc.activeElement.id,'dateRaw');
    fill(api);click('calculate');click('language');click('confirm-accept');assert.deepEqual(api.navigation,[locale==='en'?'../index.html':'en/index.html']);assert.ok(api.doc.querySelectorAll('input').every(n=>n.value===''));assert.equal(get('report').value,'');assert.equal(get('rows').children.length,0);
  }));
  test(`${locale}: IME, add/remove, bounds and stable IDs`,()=>harness(locale,api=>{
    const {get,click}=api;fill(api);click('calculate');get('r1-titleRaw').fire('compositionstart');get('r1-titleRaw').value='組字';get('r1-titleRaw').focus();click('calculate');
    assert.equal(get('report').value,'');assert.equal(get('status').textContent,COPY[locale].composing);assert.equal(api.doc.activeElement.id,'r1-titleRaw');get('r1-titleRaw').fire('compositionend');click('calculate');assert.equal(get('result').hidden,false);
    click('add');assert.equal(get('report').value,'');assert.equal(api.doc.activeElement.id,'r3-titleRaw');
    const remove3=api.doc.querySelectorAll('button').find(n=>n.textContent===COPY[locale].remove(3));remove3.click();click('add');assert.ok(get('r4-titleRaw'));assert.equal(get('r3-titleRaw'),null);
    while(get('rows').children.length<60)click('add');assert.equal(get('add').disabled,true);click('add');assert.equal(get('rows').children.length,60);
    while(get('rows').children.length>1)api.doc.querySelectorAll('button').find(n=>n.textContent===COPY[locale].remove(1)).click();
    const last=api.doc.querySelectorAll('button').find(n=>n.textContent===COPY[locale].remove(1));assert.equal(last.disabled,true);last.click();assert.equal(get('rows').children.length,1);
  }));
  test(`${locale}: download bytes, limits, delayed revoke and edit invalidation`,()=>harness(locale,async api=>{
    const {get,click}=api;fill(api);click('calculate');const report=get('report').value;click('download');
    assert.equal(api.clicked.length,1);assert.equal(api.clicked[0].filename,'glossquote-agenda-conflicts.txt');assert.equal(api.clicked[0].blob.type,'text/plain;charset=utf-8');assert.deepEqual(Buffer.from(await api.clicked[0].blob.arrayBuffer()),Buffer.from(report,'utf8'));
    assert.equal(api.revoked.length,0);assert.equal(api.urls.size,1);assert.equal([...api.timers.values()][0].delay,60000);
    for(let i=1;i<9;i++)click('download');assert.equal(api.clicked.length,8);assert.equal(api.urls.size,8);assert.equal(get('status').textContent,COPY[locale].downloadLimit);
    const[id]=api.timers.keys();api.timer(id);assert.equal(api.urls.size,7);click('download');assert.equal(api.clicked.length,9);assert.equal(api.urls.size,8);
    get('r1-titleRaw').fire('input');assert.equal(api.urls.size,8);assert.equal(api.timers.size,8);assert.equal(get('download').disabled,true);click('download');assert.equal(api.clicked.length,9);
    api.event('pagehide');assert.equal(api.urls.size,0);assert.equal(api.timers.size,0);
  }));
  test(`${locale}: download failures clean URL and never claim saved success`,()=>harness(locale,api=>{
    const {get,click}=api;fill(api);click('calculate');api.failCreate(true);click('download');assert.equal(get('status').textContent,COPY[locale].downloadError);assert.equal(api.urls.size,0);
    api.failCreate(false);api.failClick(true);click('download');assert.equal(get('status').textContent,COPY[locale].downloadError);assert.equal(api.urls.size,0);assert.equal(api.timers.size,0);assert.equal(api.doc.querySelectorAll('a').filter(n=>n.download).length,0);
    api.failClick(false);click('download');assert.equal(get('status').textContent,COPY[locale].downloadStarted);
  }));
  test(`${locale}: pagehide clears sensitive values/URLs; synthetic restored pages reset`,()=>harness(locale,api=>{
    const {get,click}=api;fill(api);click('calculate');click('download');const oldInput=get('r1-titleRaw');click('clear');api.event('pagehide');
    assert.equal(oldInput.value,'');assert.equal(get('rows').children.length,0);assert.equal(get('report').value,'');assert.equal(get('error').textContent,'');assert.equal(get('status').textContent,'');assert.equal(api.urls.size,0);assert.equal(api.timers.size,0);assert.equal(get('confirmation').open,false);
    api.event('pageshow',{persisted:true});assert.equal(get('dateRaw').value,'');assert.equal(get('roomBufferRaw').value,'0');assert.equal(get('rows').children.length,2);assert.equal(get('r1-titleRaw').value,'');
    click('confirm-accept');assert.deepEqual(api.navigation,[]);assert.equal(get('rows').children.length,2);
  }));
  test(`${locale}: XSS payload is plain report text without HTML nodes`,()=>harness(locale,api=>{
    fill(api);api.get('r1-titleRaw').value='<img src=x onerror=alert(1)> & </script>';api.click('calculate');assert.match(api.get('report').value,/<img src=x onerror=alert\(1\)> & <\/script>/);assert.equal(api.doc.querySelectorAll('img').length,0);
  }));
}
