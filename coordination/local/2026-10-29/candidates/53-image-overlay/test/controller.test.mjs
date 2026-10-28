import test from 'node:test';
import assert from 'node:assert/strict';
import { createController } from '../public/js/controller.mjs';
import { fakePlatform, fakeFile, twoFiles } from './fakes.mjs';
import { rgba, jpegFixture } from './fixtures.mjs';

test('real controller starts empty; explicit source flow produces exact PNG/JSON via injected offline codec', async () => {
  const {api,calls}=fakePlatform(), controller=createController(api);
  assert.equal(controller.snapshot().phase,'idle'); assert.equal(calls.decode,0); assert.equal(controller.snapshot().canDownload,false);
  await twoFiles(controller); assert.equal(controller.snapshot().canCompare,true);
  await controller.compare();
  const s=controller.snapshot();
  assert.equal(s.phase,'ready'); assert.equal(s.result.changed,1); assert.equal(s.result.total,2); assert.equal(s.result.percent,50);
  assert.deepEqual([...calls.rendered.pixels],[0,0,0,255,128,128,128,255]);
  assert.equal(calls.decode,2); assert.equal(calls.close,2);
  assert.equal(controller.download('png'),true); assert.equal(controller.download('json'),true);
  assert.deepEqual(calls.saved.map(item=>item.name),['image-comparison.png','image-comparison-stats.json']);
  assert.deepEqual([...new Uint8Array(await calls.created[0].blob.arrayBuffer()).subarray(0,8)],[137,80,78,71,13,10,26,10]);
  const text=await calls.created[1].blob.text();
  assert.ok(text.endsWith('\n')); assert.equal(text.charCodeAt(0),123);
  assert.deepEqual(JSON.parse(text),{schemaVersion:1,width:2,height:1,mode:'blend',opacity:50,threshold:0,changed:1,total:2,percent:50,comparison:'white-background-rgb-max-strict-greater',highlightRGB:[213,38,42]});
  assert.ok(!text.includes('before.png')); controller.dispose();
});
test('A06/A09 mismatched visual dimensions and spoofed SVG reject before decoder', async () => {
  const {api,calls}=fakePlatform(), controller=createController(api);
  await twoFiles(controller); await controller.compare();
  await controller.selectFile(1,fakeFile({width:1,height:2,pixels:rgba(0,0,0,255,0,0,0,255)}));
  assert.equal(controller.snapshot().error,'DIMENSION_MISMATCH'); assert.equal(controller.snapshot().canDownload,false);
  await controller.compare(); assert.equal(calls.decode,2);
  const svg=new TextEncoder().encode('<svg onload="attack()"/>');
  await controller.selectFile(1,fakeFile({name:'fake.png',bytes:svg})); await controller.compare();
  assert.equal(controller.snapshot().error,'UNSUPPORTED_FORMAT'); assert.equal(calls.decode,2); assert.equal(calls.rendered,null);
  controller.dispose();
});
test('A07 decoder dimensions must equal oriented header; wrong direction never resized', async () => {
  const {api,calls}=fakePlatform(), controller=createController(api);
  await controller.selectFile(0,fakeFile({width:20,height:10,bytes:jpegFixture({orientation:6})}));
  await controller.selectFile(1,fakeFile({width:10,height:20,pixels:new Uint8ClampedArray(10*20*4)}));
  await controller.compare();
  assert.equal(controller.snapshot().error,'DECODE_DIMENSIONS'); assert.equal(calls.close,1); assert.equal(calls.render,0);
  controller.dispose();
});
test('changing any setting synchronously clears result; pixel buffers are reused without redecoding', async () => {
  const {api,calls}=fakePlatform(), controller=createController(api);
  await twoFiles(controller); await controller.compare();
  controller.setSettings({mode:'difference',opacity:50,threshold:255});
  assert.equal(controller.snapshot().canDownload,false); assert.equal(calls.rendered,null);
  assert.equal(controller.download('png'),false);
  await controller.compare(); assert.equal(calls.decode,2); assert.equal(controller.snapshot().result.changed,0);
  controller.setSettings({mode:'blend',opacity:0,threshold:-1},'threshold');
  assert.equal(controller.snapshot().error,'SETTINGS_INVALID'); assert.equal(controller.snapshot().result,null);
  assert.equal(controller.snapshot().canCompare,false);
  controller.dispose();
});
test('A12 malicious filename is data only and never enters exported report or URL', async () => {
  const {api,calls}=fakePlatform(), controller=createController(api);
  await controller.selectFile(0,fakeFile({name:'<img src=x onerror=1>.png'}));
  await controller.selectFile(1,fakeFile({name:'資料\u202e🚧.png'}));
  assert.equal(controller.snapshot().sources[0].name,'<img src=x onerror=1>.png');
  await controller.compare(); controller.download('json');
  assert.ok(!(await calls.created[0].blob.text()).includes('<img'));
  assert.equal(calls.saved[0].name,'image-comparison-stats.json'); controller.dispose();
});
test('explicit sample load is editable fake data; clear releases all source and export references', async () => {
  const {api,calls,timers}=fakePlatform(), controller=createController(api);
  await controller.loadExample(); assert.equal(controller.snapshot().sources[0].sample,true);
  assert.equal(controller.snapshot().phase,'editing'); assert.equal(controller.snapshot().canDownload,false);
  await controller.compare(); controller.download('png'); controller.clear();
  assert.deepEqual(controller.snapshot().sources,[null,null]); assert.equal(controller.snapshot().result,null); assert.equal(calls.rendered,null);
  assert.equal(controller.download('png'),false);
  controller.dispose(); assert.equal(timers.size,0); assert.equal(calls.revoked.length,1);
});
