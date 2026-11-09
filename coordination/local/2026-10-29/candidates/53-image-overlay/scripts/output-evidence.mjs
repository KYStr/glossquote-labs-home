import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT } from './files.mjs';
import { createController } from '../public/js/controller.mjs';
import { inspectImage } from '../public/js/core/image-header.mjs';
import { fakePlatform, fakeFile } from '../test/fakes.mjs';

const WIDTH=480, HEIGHT=320;
function source(side) {
  const pixels=new Uint8ClampedArray(WIDTH*HEIGHT*4); pixels.fill(255);
  const rect=(x,y,width,height,color) => {
    for(let row=y;row<y+height;row++) for(let col=x;col<x+width;col++) pixels.set([...color,255],(row*WIDTH+col)*4);
  };
  rect(40+side*8,40,64,64,[17,20,16]); rect(128,48,240,16,[17,20,16]); rect(128,80,160,8,[17,20,16]);
  rect(40,144,400,80,[200,245,106]); rect(40,248,side?280:240,8,[85,89,79]); rect(40,272,320,8,[85,89,79]);
  return fakeFile({name:side?'synthetic-after.png':'synthetic-before.png',width:WIDTH,height:HEIGHT,pixels});
}
function decodeFixturePng(bytes) {
  assert.deepEqual(inspectImage(bytes),{kind:'png',width:WIDTH,height:HEIGHT,orientation:1});
  const data=[], types=[];
  for(let offset=8;offset<bytes.length;) {
    const length=Buffer.from(bytes.buffer,bytes.byteOffset+offset,4).readUInt32BE();
    const type=Buffer.from(bytes.subarray(offset+4,offset+8)).toString('ascii'); types.push(type);
    if(type==='IDAT') data.push(bytes.subarray(offset+8,offset+8+length));
    offset+=12+length;
  }
  assert.deepEqual(types,['IHDR','IDAT','IEND']);
  const raw=inflateSync(Buffer.concat(data)), pixels=new Uint8ClampedArray(WIDTH*HEIGHT*4);
  assert.equal(raw.length,(WIDTH*4+1)*HEIGHT);
  for(let row=0;row<HEIGHT;row++) {
    assert.equal(raw[row*(WIDTH*4+1)],0);
    pixels.set(raw.subarray(row*(WIDTH*4+1)+1,(row+1)*(WIDTH*4+1)),row*WIDTH*4);
  }
  return pixels;
}
export async function outputEvidence() {
  const output=join(ROOT,'evidence','m1','outputs'); await mkdir(output,{recursive:true});
  const files=[], left=source(0), right=source(1);
  async function save(name,bytes) {
    await writeFile(join(output,name),bytes,{flag:'wx'});
    files.push({path:`outputs/${name}`,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  await save('synthetic-before.png',left.bytes); await save('synthetic-after.png',right.bytes);
  for(const mode of ['blend','difference']) {
    const fake=fakePlatform(), controller=createController(fake.api);
    await controller.selectFile(0,left); await controller.selectFile(1,right);
    controller.setSettings({mode,opacity:50,threshold:0}); await controller.compare();
    assert.equal(controller.snapshot().phase,'ready');
    assert.equal(controller.snapshot().result.changed,1344); // 16*64 logo pixels + 40*8 line pixels
    assert.equal(controller.snapshot().result.total,153600);
    // The specified changed / total * 100 formula has a binary floating tail.
    // Integer counts are exact; the mathematical percentage is checked to 1e-12.
    assert.ok(Math.abs(controller.snapshot().result.percent-0.875)<1e-12);
    controller.download('png'); controller.download('json');
    const png=new Uint8Array(await fake.calls.created[0].blob.arrayBuffer()), pixels=decodeFixturePng(png);
    const at=(x,y)=>[...pixels.subarray((y*WIDTH+x)*4,(y*WIDTH+x)*4+4)];
    if(mode==='blend') {
      assert.deepEqual(at(42,42),[136,138,136,255]); assert.deepEqual(at(108,42),[136,138,136,255]);
      assert.deepEqual(at(48,42),[17,20,16,255]); assert.deepEqual(at(300,250),[170,172,167,255]);
    } else {
      assert.deepEqual(at(42,42),[213,38,42,255]); assert.deepEqual(at(48,42),[196,196,196,255]);
      assert.deepEqual(at(50,150),[237,237,237,255]);
      let red=0; for(let i=0;i<pixels.length;i+=4) if(pixels[i]===213&&pixels[i+1]===38&&pixels[i+2]===42) red++;
      assert.equal(red,1344);
    }
    assert.deepEqual(at(0,0),[255,255,255,255]);
    const text=await fake.calls.created[1].blob.text();
    assert.ok(text.endsWith('\n')); assert.equal(JSON.parse(text).changed,1344);
    await save(`${mode}-comparison.png`,png); await save(`${mode}-stats.json`,new TextEncoder().encode(text));
    controller.dispose(); assert.equal(fake.timers.size,0);
  }
  const report={status:'PASS',scope:'Real controller + pure core, synthetic pixels, injected Node codec/Canvas bridge. Valid PNG bytes, independently inflated and checked. NOT a native browser decode/Canvas/download test.',dimensions:{width:WIDTH,height:HEIGHT},expected:{changed:1344,total:153600,percent:0.875},files};
  await writeFile(join(ROOT,'evidence','m1','output-manifest.json'),`${JSON.stringify(report,null,2)}\n`,{flag:'wx'});
  return report;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const report=await outputEvidence(); process.stdout.write(`${JSON.stringify({status:report.status,files:report.files.length,expected:report.expected})}\n`);
}
