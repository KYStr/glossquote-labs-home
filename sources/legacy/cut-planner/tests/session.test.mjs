import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../public/js/session.mjs';
const input = () => ({stockLengthRaw:'100',endTrimRaw:'0',kerfRaw:'2',rows:[{id:'r1',nameRaw:'A',lengthRaw:'49',quantityRaw:'2'}]});
function harness() {
  let now=0,next=0;
  const timers=new Map(), urls=[], revoked=[], downloads=[], writes=[], events=[], deferred=[];
  const adapters={
    writeClipboard(text){writes.push(text);return new Promise((resolve,reject)=>deferred.push({resolve,reject}));},
    makeBlob(parts,options){return new Blob(parts,options);},
    createUrl(blob){const url=`mock:cut-${urls.length}`;urls.push({url,blob,time:now});return url;},
    revokeUrl(url){revoked.push(url);},
    download(url,filename){downloads.push({url,filename});},
    setTimer(fn,ms){const id=++next;timers.set(id,{fn,at:now+ms});return id;},
    clearTimer(id){timers.delete(id);}
  };
  const session=createSession('en',adapters,s=>events.push(s));
  function advance(ms){now+=ms;for(const [id,t]of [...timers])if(t.at<=now){timers.delete(id);t.fn();}}
  return {session,adapters,timers,urls,revoked,downloads,writes,events,deferred,advance};
}
test('session initial, invalid, immutable success and edit invalidate report',()=>{
  const h=harness(),s=h.session;assert.equal(s.state().result,null);assert.equal(s.state().report,null);assert.equal(s.download(),false);
  assert.equal(s.calculate(input()).ok,true);assert.ok(Object.isFrozen(s.state().result.sticks[0].pieces));
  s.edit();assert.equal(s.state().status,'stale');assert.equal(s.state().report,null);assert.equal(s.download(),false);
  const bad=input();bad.stockLengthRaw='';assert.equal(s.calculate(bad).ok,false);assert.equal(s.state().result,null);
  assert.equal(s.calculate(input()).ok,true);
});
test('copy adapter receives current complete report; resolve and finally',async()=>{
  const h=harness(),s=h.session;s.calculate(input());const text=s.state().report.text;assert.equal(h.writes.length,0);
  const p=s.copy();assert.equal(s.state().status,'copying');assert.equal(s.state().copyBusy,true);assert.deepEqual(h.writes,[text]);
  assert.equal(await s.copy(),false);h.deferred[0].resolve();await p;assert.equal(s.state().status,'copied');assert.equal(s.state().copyBusy,false);
});
test('copy denial exposes manual-copy state with report intact',async()=>{
  const h=harness(),s=h.session;s.calculate(input());const p=s.copy();h.deferred[0].reject(Error('private mocked error'));await p;
  assert.equal(s.state().status,'copy-denied');assert.ok(s.state().report.text.startsWith('GlossQuote'));assert.equal(s.state().copyBusy,false);
});
for(const settle of ['resolve','reject'])test(`late clipboard ${settle}/finally cannot replace newer revision/request/generation`,async()=>{
  const h=harness(),s=h.session;s.calculate(input());const old=s.copy();s.edit();s.calculate(input());const newer=s.copy();
  h.deferred[0][settle]();await old;assert.equal(s.state().status,'copying');assert.equal(s.state().copyBusy,true);
  h.deferred[1].resolve();await newer;assert.equal(s.state().status,'copied');
  const oldPage=s.copy();s.pagehide();s.restore();s.calculate(input());const afterRestore=s.copy();
  h.deferred[2][settle]();await oldPage;assert.equal(s.state().status,'copying');assert.equal(s.state().copyBusy,true);
  h.deferred[3].resolve();await afterRestore;assert.equal(s.state().status,'copied');
});
test('each mock URL lasts exactly its independent 30s; edit/recompute preserve URLs',async()=>{
  const h=harness(),s=h.session;s.calculate(input());const report=s.state().report;
  assert.equal(s.download(),true);h.advance(10000);assert.equal(s.download(),true);
  assert.equal(await h.urls[0].blob.text(),report.text);assert.equal(h.urls[0].blob.type,'text/plain;charset=utf-8');
  assert.deepEqual(h.downloads[0],{url:'mock:cut-0',filename:'glossquote-cut-plan.txt'});
  s.edit();s.calculate(input());assert.deepEqual(h.revoked,[]);h.advance(19999);assert.deepEqual(h.revoked,[]);
  h.advance(1);assert.deepEqual(h.revoked,['mock:cut-0']);assert.equal(s.state().liveDownloads,1);
  h.advance(9999);assert.equal(s.state().liveDownloads,1);h.advance(1);assert.deepEqual(h.revoked,['mock:cut-0','mock:cut-1']);
});
test('live URL limit rejects ninth without creating or revoking any; capacity returns on expiry',()=>{
  const h=harness(),s=h.session;s.calculate(input());for(let i=0;i<8;i++)assert.equal(s.download(),true);
  assert.equal(s.download(),false);assert.equal(s.state().status,'download-limit');assert.equal(h.urls.length,8);assert.deepEqual(h.revoked,[]);
  h.advance(30000);assert.equal(h.revoked.length,8);assert.equal(s.download(),true);
});
test('model no-op preserves deadlines; reset revokes all and expires copy; lifecycle clears generation',async()=>{
  const h=harness(),s=h.session;s.calculate(input());s.download();h.advance(2000);s.download();const copy=s.copy();
  const before=s.state();h.advance(5000);assert.deepEqual(s.state(),before); // cancellation calls no session mutator
  s.reset();assert.equal(s.state().status,'initial');assert.equal(s.state().report,null);assert.equal(h.timers.size,0);assert.equal(h.revoked.length,2);
  h.deferred[0].resolve();await copy;assert.equal(s.state().status,'initial');
  s.calculate(input());s.download();const gen=s.state().pageGeneration;s.pagehide();assert.equal(s.state().pageGeneration,gen+1);assert.equal(h.timers.size,0);
  s.restore();assert.equal(s.state().report,null);assert.equal(s.state().pageGeneration,gen+2);
});
test('adapters may fail without exposing errors or retaining a partial result',async()=>{
  const h=harness();h.adapters.writeClipboard=()=>{throw Error('mock');};h.adapters.makeBlob=()=>{throw Error('mock');};h.session.calculate(input());
  await h.session.copy();assert.equal(h.session.state().status,'copy-denied');assert.equal(h.session.download(),false);assert.equal(h.session.state().status,'download-failed');
});
test('timer setup failure revokes its newly created mock URL',()=>{
  const h=harness();h.adapters.setTimer=()=>{throw Error('mock timer error');};h.session.calculate(input());
  assert.equal(h.session.download(),false);assert.equal(h.session.state().liveDownloads,0);assert.deepEqual(h.revoked,['mock:cut-0']);
});
