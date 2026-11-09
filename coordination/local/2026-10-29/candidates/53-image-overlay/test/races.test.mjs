import test from 'node:test';
import assert from 'node:assert/strict';
import { createController } from '../public/js/controller.mjs';
import { fakePlatform, fakeFile, deferred, twoFiles } from './fakes.mjs';
import { rgba } from './fixtures.mjs';

test('A10 late read cannot overwrite replacement metadata or revive output', async () => {
  const slow=deferred(), old=fakeFile({name:'old.png'});
  const {api,calls}=fakePlatform({read:async file => file===old ? slow.promise : file.bytes});
  const c=createController(api), pending=c.selectFile(0,old);
  await c.selectFile(0,fakeFile({name:'replacement.png'}));
  slow.resolve(old.bytes); await pending;
  assert.equal(c.snapshot().sources[0].name,'replacement.png');
  assert.equal(c.snapshot().canDownload,false); assert.equal(calls.render,0); c.dispose();
});
test('A10 late bitmap after source change closes and cannot paint the new generation', async () => {
  const slow=deferred(), started=deferred(); let closes=0;
  const {api,calls}=fakePlatform({decode:async () => { started.resolve(); return slow.promise; }});
  const c=createController(api); await twoFiles(c);
  const pending=c.compare(); await started.promise;
  await c.selectFile(0,fakeFile({name:'new.png'}));
  slow.resolve({width:2,height:1,close(){closes++;}}); await pending;
  assert.equal(closes,1); assert.equal(calls.render,0); assert.equal(c.snapshot().sources[0].name,'new.png');
  assert.equal(c.snapshot().result,null); c.dispose();
});
test('A11 cancel between pixel batches prevents result while allowing a later retry', async () => {
  const pause=deferred(), started=deferred(); let first=true;
  const {api,calls}=fakePlatform({yieldTask:async () => { if(first){first=false;started.resolve();await pause.promise;} }});
  const c=createController(api), pixels=new Uint8ClampedArray(1000*201*4);
  await c.selectFile(0,fakeFile({width:1000,height:201,pixels}));
  await c.selectFile(1,fakeFile({width:1000,height:201,pixels}));
  const pending=c.compare(); await started.promise;
  c.cancel(); assert.equal(c.snapshot().canDownload,false); assert.equal(c.snapshot().result,null);
  pause.resolve(); await pending; assert.equal(calls.render,0);
  await c.compare(); assert.equal(c.snapshot().phase,'ready'); assert.equal(c.snapshot().result.total,201000);
  assert.equal(c.snapshot().result.changed,0); c.dispose();
});
test('late PNG after clear or setting change cannot re-enable download or restore canvas', async () => {
  for (const action of ['clear','setting']) {
    const slow=deferred(), started=deferred();
    const {api,calls}=fakePlatform({encode:async () => {started.resolve();return slow.promise;}});
    const c=createController(api); await twoFiles(c);
    const pending=c.compare(); await started.promise;
    if(action==='clear') c.clear(); else c.setSettings({mode:'difference',opacity:20,threshold:9});
    assert.equal(calls.rendered,null); assert.equal(c.snapshot().canDownload,false);
    slow.resolve(new Blob(['fake'],{type:'image/png'})); await pending;
    assert.equal(c.snapshot().canDownload,false); assert.equal(c.snapshot().result,null); assert.equal(calls.created.length,0);
    c.dispose();
  }
});
test('20 second processing bound exits safely, preserves sources, closes late bitmap', async () => {
  const slow=deferred(), started=deferred(); let closed=0;
  const fake=fakePlatform({decode:async () => {started.resolve();return slow.promise;}});
  const c=createController(fake.api); await twoFiles(c);
  const pending=c.compare(); await started.promise;
  fake.flush(20_000);
  assert.equal(c.snapshot().error,'PROCESSING_LIMIT'); assert.equal(c.snapshot().sources.length,2);
  assert.equal(c.snapshot().hasData,true); assert.equal(c.snapshot().canDownload,false);
  slow.resolve({width:2,height:1,close(){closed++;}}); await pending;
  assert.equal(closed,1); assert.equal(c.snapshot().error,'PROCESSING_LIMIT'); c.dispose();
});
test('download leases last for browser handoff, expire within 30s, and pagehide disposal revokes immediately', async () => {
  const fake=fakePlatform(), c=createController(fake.api);
  await twoFiles(c); await c.compare();
  c.download('png'); c.download('png'); c.download('json');
  assert.equal(fake.calls.created.length,2); assert.equal(fake.calls.revoked.length,0);
  assert.ok([...fake.timers.values()].every(timer=>timer.delay>0 && timer.delay<=30_000));
  c.clear(); assert.equal(c.snapshot().canDownload,false); assert.equal(fake.calls.revoked.length,0);
  fake.flush(1500); assert.equal(fake.calls.revoked.length,2); assert.equal(fake.timers.size,0);
  await twoFiles(c); await c.compare(); c.download('png'); c.dispose();
  assert.equal(fake.calls.revoked.length,3); assert.equal(fake.timers.size,0);
});
test('A download → B result without advancing time uses B bytes; the old A timer cannot delete B lease', async () => {
  for (const format of ['png','json']) {
    const fake=fakePlatform(), c=createController(fake.api);
    await twoFiles(c); await c.compare(); c.download(format);
    const a=fake.calls.created[0], aBytes=new Uint8Array(await a.blob.arrayBuffer());
    const [aTimerId,aTimer]=[...fake.timers.entries()][0];
    assert.equal(aTimer.delay,1500);
    c.setSettings({mode:'blend',opacity:100,threshold:0}); await c.compare();
    c.download(format);
    assert.equal(fake.calls.created.length,2,'B must create a new URL before A expires');
    const b=fake.calls.created[1], bBytes=new Uint8Array(await b.blob.arrayBuffer());
    assert.notEqual(a.url,b.url); assert.notEqual(a.blob,b.blob);
    assert.notDeepEqual(aBytes,bBytes,'The fixtures produce different A and B output bytes');
    assert.equal(fake.calls.saved.at(-1).url,b.url);
    assert.equal(fake.calls.revoked.length,0,'A stays available during browser handoff');
    fake.timers.delete(aTimerId); aTimer.callback();
    assert.deepEqual(fake.calls.revoked,[a.url]);
    assert.equal(fake.timers.size,1,'B retains its own unexpired timer');
    c.download(format);
    assert.equal(fake.calls.created.length,2,'A timer must not remove the B reuse mapping');
    assert.equal(fake.calls.saved.at(-1).url,b.url);
    c.dispose(); assert.deepEqual(fake.calls.revoked,[a.url,b.url]); assert.equal(fake.timers.size,0);
  }
});
test('decode/encode/read/download failures clear previous success and expose only fixed error codes', async () => {
  for (const step of ['read','decode','encode','save']) {
    const fake=fakePlatform(), c=createController(fake.api);
    await twoFiles(c); await c.compare(); assert.equal(c.snapshot().canDownload,true);
    const privateError=new Error('RAW_FAKE_PRIVATE_CONTENT_123');
    if (step==='read') { fake.api.read=async()=>{throw privateError;}; await c.selectFile(0,fakeFile()); }
    else if (step==='decode') { fake.api.decode=async()=>{throw privateError;}; await c.selectFile(0,fakeFile()); await c.compare(); }
    else if (step==='encode') { fake.api.encode=async()=>null; await c.compare(); }
    else { fake.api.save=()=>{throw privateError;}; assert.equal(c.download('png'),false); }
    assert.equal(c.snapshot().canDownload,false); assert.equal(c.snapshot().result,null);
    assert.ok(['PROCESSING_FAILED','ENCODE_FAILED','DOWNLOAD_FAILED'].includes(c.snapshot().error));
    assert.ok(!JSON.stringify(c.snapshot()).includes('RAW_FAKE')); c.dispose();
  }
});
test('over-limit size is refused before FileReader and decoder; empty/missing source stays editable', async () => {
  const {api,calls}=fakePlatform(), c=createController(api);
  await c.selectFile(0,{name:'oversized.png',size:8_388_609});
  assert.equal(c.snapshot().error,'FILE_TOO_LARGE'); assert.equal(calls.read,0); assert.equal(calls.decode,0);
  c.clear(); await c.compare(); assert.equal(c.snapshot().error,'MISSING_SOURCE'); assert.equal(c.snapshot().errorField,'left');
  await c.selectFile(0,fakeFile({pixels:rgba(0,0,0,255,0,0,0,255)}));
  assert.equal(c.snapshot().sources[0].dimensions.width,2); c.dispose();
});
