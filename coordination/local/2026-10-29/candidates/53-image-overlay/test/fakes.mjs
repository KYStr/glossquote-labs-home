import { pngFixture, rgba } from './fixtures.mjs';

export function fakeFile({ name='synthetic.png', width=2, height=1, pixels=rgba(0,0,0,255,255,255,255,255), bytes=null } = {}) {
  const data=bytes ?? pngFixture({width,height,pixels});
  return {name,size:data.byteLength,bytes:data,pixels,width,height};
}
export function deferred() {
  let resolve,reject;
  const promise=new Promise((yes,no) => { resolve=yes; reject=no; });
  return {promise,resolve,reject};
}
export function fakePlatform(overrides={}) {
  const calls={read:0,decode:0,close:0,render:0,clear:0,created:[],revoked:[],saved:[],rendered:null};
  let timerId=0;
  const timers=new Map();
  const api={
    async read(file) { calls.read++; return file.bytes; },
    async decode(file) { calls.decode++; return {width:file.width,height:file.height,pixels:file.pixels,close(){calls.close++;}}; },
    flattenBitmap(bitmap) { return bitmap.pixels.slice(); },
    render(pixels,width,height) { calls.render++; calls.rendered={pixels:pixels.slice(),width,height}; },
    clearCanvas() { calls.clear++; calls.rendered=null; },
    async encode() { return new Blob([pngFixture(calls.rendered)],{type:'image/png'}); },
    jsonBlob(text) { return new Blob([text],{type:'application/json;charset=utf-8'}); },
    createURL(blob) { const url=`blob:fake-${calls.created.length}`; calls.created.push({url,blob}); return url; },
    revokeURL(url) { calls.revoked.push(url); },
    save(url,name) { calls.saved.push({url,name}); },
    setTimer(callback,delay) { const id=++timerId; timers.set(id,{callback,delay}); return id; },
    clearTimer(id) { timers.delete(id); },
    async yieldTask() {},
    async exampleFiles() { return [fakeFile({name:'example-before.png'}),fakeFile({name:'example-after.png',pixels:rgba(0,0,0,255,0,0,0,255)})]; },
    ...overrides
  };
  return {api,calls,timers,flush(delay) { for (const [id,timer] of [...timers]) if (timer.delay===delay) { timers.delete(id); timer.callback(); } }};
}
export async function twoFiles(controller) {
  await controller.selectFile(0,fakeFile({name:'before.png'}));
  await controller.selectFile(1,fakeFile({name:'after.png',pixels:rgba(0,0,0,255,0,0,0,255)}));
}
