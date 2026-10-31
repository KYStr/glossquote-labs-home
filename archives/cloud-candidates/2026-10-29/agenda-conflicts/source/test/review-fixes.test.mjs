// 獨審三項反例的 maker red/green 回歸；不是第二份獨審。
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,readdirSync,rmSync,existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { harness,fill } from './dom-harness.mjs';
import { buildProject } from '../scripts/build.mjs';
for(const locale of ['zh-Hant','en']){
  test(`${locale}: initiated download retains grace after edit while future download becomes invalid`,()=>harness(locale,async api=>{
    fill(api);api.click('calculate');api.click('download');const url=api.clicked[0].url;const blob=api.clicked[0].blob;const before=await blob.text();
    api.get('r1-titleRaw').value='Changed';api.get('r1-titleRaw').fire('input');
    assert.equal(api.get('report').value,'');assert.equal(api.get('download').disabled,true);assert.equal(api.urls.has(url),true,'initiated URL must retain grace');assert.equal(api.timers.size,1);assert.equal(await api.urls.get(url).text(),before);
    api.click('download');assert.equal(api.clicked.length,1);api.click('calculate');assert.equal(api.urls.has(url),true);api.click('download');assert.equal(api.urls.size,2);
    const[first]=api.timers.keys();api.timer(first);assert.equal(api.urls.has(url),false);assert.equal(api.urls.size,1);
    api.event('pagehide');assert.equal(api.urls.size,0);assert.equal(api.timers.size,0);
  }));
  test(`${locale}: dialog opening failure preserves report and recovers enabled controls`,()=>harness(locale,api=>{
    fill(api);api.click('calculate');const report=api.get('report').value;const values=api.doc.querySelectorAll('input').map(n=>n.value);const dialog=api.get('confirmation'),original=dialog.showModal;
    for(const origin of ['clear','language']){
      dialog.showModal=()=>{throw Error('PRIVATE_SENTINEL');};api.get(origin).focus();assert.doesNotThrow(()=>api.click(origin));
      assert.equal(api.get('workspace').disabled,false);assert.equal(api.get('report').value,report);assert.deepEqual(api.doc.querySelectorAll('input').map(n=>n.value),values);assert.ok(api.get('error').textContent.length>0);assert.ok(!api.get('error').textContent.includes('PRIVATE_SENTINEL'));assert.equal(api.doc.activeElement.id,origin);
      dialog.showModal=original;api.click(origin);assert.equal(dialog.open,true,'pending must be reset after failure');api.click('confirm-cancel');assert.equal(dialog.open,false);
    }
    assert.deepEqual(api.navigation,[]);
  }));
}
const expected=['404.html','_headers','en/index.html','index.html','js/app.mjs','js/core.mjs','js/i18n.mjs','robots.txt','styles.css'];
function fixture(t){const root=mkdtempSync(join(tmpdir(),'agenda-semantic-'));mkdirSync(join(root,'public'));mkdirSync(join(root,'public/en'));mkdirSync(join(root,'public/js'));for(const path of expected)copyFileSync(fileURLToPath(new URL(`../public/${path}`,import.meta.url)),join(root,'public',path));copyFileSync(fileURLToPath(new URL('../package.json',import.meta.url)),join(root,'package.json'));t.after(()=>rmSync(root,{recursive:true,force:true}));return root;}
const mutate=(root,path,fn)=>{const target=join(root,'public',path);writeFileSync(target,fn(readFileSync(target,'utf8')));};
for(const oldDist of [false,true])test(`build rejects indexable ZH before output mutation; old dist ${oldDist}`,t=>{
  const root=fixture(t);if(oldDist)buildProject(root);const before=oldDist?readFileSync(join(root,'dist/index.html')):null;
  mutate(root,'index.html',s=>s.replace('content="noindex,nofollow"','content="index,follow"'));
  assert.throws(()=>buildProject(root));
  if(oldDist)assert.deepEqual(readFileSync(join(root,'dist/index.html')),before);else assert.equal(existsSync(join(root,'dist')),false);
  assert.equal(readdirSync(root).filter(name=>name.startsWith('.preview-')).length,0);
});
for(const locale of ['zh-Hant','en']){
  test(`${locale}: confirmed clear keeps initiated lease; stale timer cannot revive empty UI`,()=>harness(locale,api=>{
    fill(api);api.click('calculate');api.click('download');const url=api.clicked[0].url, [timerId,timer]=[...api.timers][0];
    api.click('clear');api.click('confirm-accept');assert.equal(api.urls.has(url),true);assert.equal(api.timers.has(timerId),true);assert.equal(api.get('report').value,'');assert.equal(api.get('download').disabled,true);assert.equal(api.get('dateRaw').value,'');
    api.timer(timerId);assert.equal(api.urls.size,0);assert.equal(api.get('report').value,'');assert.equal(api.get('download').disabled,true);
    fill(api);api.click('calculate');api.click('download');const stale=[...api.timers.values()][0].fn;api.event('pagehide');api.event('pageshow',{persisted:true});stale();timer.fn();
    assert.equal(api.urls.size,0);assert.equal(api.get('report').value,'');assert.equal(api.get('download').disabled,true);assert.equal(api.get('dateRaw').value,'');
  }));
  test(`${locale}: close failure detaches modal safely, unlocks and keeps cancel semantics`,()=>harness(locale,api=>{
    fill(api);api.click('calculate');const report=api.get('report').value,dialog=api.get('confirmation');const original=dialog.close;
    api.click('clear');dialog.close=()=>{throw Error('PRIVATE_CLOSE');};assert.doesNotThrow(()=>api.click('confirm-cancel'));
    assert.equal(api.get('workspace').disabled,false);assert.equal(dialog.open,false);assert.equal(api.get('confirmation'),dialog);assert.equal(api.get('report').value,report);assert.equal(api.doc.activeElement.id,'clear');
    api.click('clear');assert.doesNotThrow(()=>api.click('confirm-accept'));assert.equal(dialog.open,false);assert.equal(api.get('workspace').disabled,false);assert.equal(api.get('report').value,'');
    dialog.close=original;fill(api);api.click('calculate');api.click('language');api.click('confirm-cancel');assert.equal(api.navigation.length,0);
  }));
}
for(const [name,path,change]of [
  ['English noindex','en/index.html',s=>s.replace('content="noindex,nofollow"','content="index,follow"')],
  ['404 noindex','404.html',s=>s.replace('content="noindex,nofollow"','content="index,follow"')],
  ['CSP network','_headers',s=>s.replace("connect-src 'none'","connect-src *")],
  ['robots indexing','robots.txt',()=> 'User-agent: *\nAllow: /\n'],
  ['no-JS enablement','index.html',s=>s.replace('id="workspace" disabled','id="workspace"')],
  ['runtime network API','js/app.mjs',s=>s+'\nfetch("https://example.invalid/");\n'],
  ['syntax error','js/core.mjs',s=>s+'\nconst = ;\n']
])test(`semantic ${name} fails before overwriting existing dist`,t=>{
  const root=fixture(t);buildProject(root);const before=readFileSync(join(root,'dist/index.html'));mutate(root,path,change);
  assert.throws(()=>buildProject(root));assert.deepEqual(readFileSync(join(root,'dist/index.html')),before);assert.equal(readdirSync(root).filter(n=>n.startsWith('.preview-')).length,0);
});
