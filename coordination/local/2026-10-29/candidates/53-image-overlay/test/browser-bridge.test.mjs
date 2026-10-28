import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrowserPlatform } from '../public/js/controller.mjs';
import { deferred } from './fakes.mjs';

// API-call contract only. These objects do not implement a browser, color
// management, orientation rendering, permission handling or native downloading.
function bridge(overrides={}) {
  const calls=[], output=new Uint8ClampedArray([255,255,255,255]);
  const context={
    fillRect(...args){calls.push(['fill',this.fillStyle,...args]);},
    drawImage(...args){calls.push(['draw',...args]);},
    getImageData(...args){calls.push(['readPixels',...args]);return {data:output};},
    putImageData(...args){calls.push(['put',...args]);}
  };
  const canvas={width:1,height:1,getContext(...args){calls.push(['context',...args]);return context;},toBlob(callback,type){calls.push(['encode',type]);callback(new Blob(['mock'],{type:'image/png'}));}};
  const win={
    createImageBitmap:async (...args)=>{calls.push(['decode',...args]);return {width:1,height:1,close(){calls.push(['close']);}};},
    FileReader:class {},File:class {},Blob,ImageData:class {constructor(data,width,height,settings){Object.assign(this,{data,width,height,settings});}},
    URL:{createObjectURL(){return 'blob:mock';},revokeObjectURL(){}},setTimeout,clearTimeout,
    ...overrides
  };
  return {canvas,win,calls,output,platform:createBrowserPlatform(canvas,{},win)};
}
test('bridge requests from-image once; white fill precedes unscaled draw and sRGB 8-bit extraction', async () => {
  const {platform,calls,output}=bridge(), abort=new AbortController(), file={mock:true};
  const bitmap=await platform.decode(file,abort.signal);
  assert.deepEqual(calls.find(call=>call[0]==='decode'),['decode',file,{imageOrientation:'from-image'}]);
  assert.equal(platform.flattenBitmap(bitmap,1,1),output);
  assert.deepEqual(calls.slice(-3),[['fill','#ffffff',0,0,1,1],['draw',bitmap,0,0],['readPixels',0,0,1,1,{colorSpace:'srgb'}]]);
  bitmap.close(); assert.equal(calls.filter(call=>call[0]==='close').length,1);
});
test('bridge aborts pending decode and closes the late native object', async () => {
  const pending=deferred(); let closed=0;
  const {platform}=bridge({createImageBitmap:()=>pending.promise}), abort=new AbortController();
  const decoding=platform.decode({},abort.signal); abort.abort();
  await assert.rejects(decoding,/CANCELLED/);
  pending.resolve({close(){closed++;}}); await Promise.resolve();
  assert.equal(closed,1);
});
test('bridge toBlob null, cancellation and unsupported feature yield fixed errors', async () => {
  const {platform,canvas}=bridge();
  canvas.toBlob=callback=>callback(null);
  await assert.rejects(platform.encode(new AbortController().signal),/ENCODE_FAILED/);
  let late; canvas.toBlob=callback=>{late=callback;};
  const abort=new AbortController(), encoding=platform.encode(abort.signal); abort.abort();
  await assert.rejects(encoding,/CANCELLED/); late(new Blob(['mock'],{type:'image/png'}));
  assert.throws(()=>bridge({createImageBitmap:undefined}),/UNSUPPORTED_BROWSER/);
});
