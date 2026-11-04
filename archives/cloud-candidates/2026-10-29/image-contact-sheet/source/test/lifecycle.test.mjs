import test from 'node:test';
import assert from 'node:assert/strict';
import { harness, imageFile, deferred } from './dom-harness.mjs';
// 每例重新載入實際 app 模組，stub 僅提供外部 DOM/codec 邊界。
for(const language of ['en','zh-Hant'])test(`${language}: add / build / downloads / edit invalidation`,async()=>{
  const h=await harness(language);try{
    assert.equal(h.node('png').disabled,true);assert.equal(h.node('build').disabled,true);assert.equal(h.node('files').disabled,false);
    await h.add([imageFile('<img onerror=1>.png'),imageFile('第二張.png')]);assert.equal(h.node('items').children.length,2);assert.equal(h.node('build').disabled,false);
    assert.equal(h.node('items').children[0].children[1].children[0].textContent,'1. <img onerror=1>.png');
    await h.build();assert.equal(h.node('png').disabled,false);assert.equal(h.node('preview').children.length,1);
    h.node('png').click();h.node('index').click();h.node('png').click();assert.equal(h.urlMap.size,2);assert.equal(h.downloads.length,3);
    assert.equal(h.downloads[0].name,'photo-contact-sheet.png');assert.equal(h.downloads[1].name,'photo-contact-sheet-index.txt');
    const index=await h.urlMap.get(h.downloads[1].url).text();assert.match(index,language==='en'?/^Photo contact sheet/:/^照片聯絡表/);
    await h.change('columns','3');assert.equal(h.node('png').disabled,true);assert.equal(h.urlMap.size,0);assert.equal(h.node('preview').children.length,0);
  }finally{h.cleanup();}
});
test('atomic bad batch preserves existing list and invalidates previous export',async()=>{
  const h=await harness();try{await h.add([imageFile('keep.png')]);await h.build();await h.add([imageFile('new.png'),{...imageFile('bad.png'),arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer}]);assert.equal(h.node('items').children.length,1);assert.equal(h.node('png').disabled,true);assert.match(h.node('status').textContent,/not a supported/);}finally{h.cleanup();}
});
test('size cap rejects before arrayBuffer or native decoder call',async()=>{
  const h=await harness();try{let read=0,decode=0;h.setDecoder(()=>{decode++;});await h.add([{name:'huge.png',size:8_388_609,arrayBuffer:async()=>{read++;}}]);assert.equal(read,0);assert.equal(decode,0);assert.equal(h.node('items').children.length,0);}finally{h.cleanup();}
});
test('multiple image decode is serial and every bitmap is closed',async()=>{
  const h=await harness();try{let outstanding=0,max=0;const bitmaps=[];h.setDecoder(async file=>{outstanding++;max=Math.max(max,outstanding);await new Promise(resolve=>setImmediate(resolve));const bitmap=h.bitmap(file.meta.width,file.meta.height);bitmap.close=()=>{bitmap.closed=true;outstanding--;};bitmaps.push(bitmap);return bitmap;});await h.add([imageFile(),imageFile(),imageFile()]);assert.equal(max,1);assert.equal(outstanding,0);assert.ok(bitmaps.every(x=>x.closed));}finally{h.cleanup();}
});
test('cancel during decode fences late success and closes bitmap',async()=>{
  const h=await harness();try{const late=deferred();h.setDecoder(()=>late.promise);await h.add([imageFile()]);h.node('cancel').click();const bitmap=h.bitmap();late.resolve(bitmap);await h.spin();assert.equal(bitmap.closed,true);assert.equal(h.node('items').children.length,0);assert.equal(h.node('png').disabled,true);assert.equal(h.node('files').disabled,false);}finally{h.cleanup();}
});
test('clear requires confirm, keep and Escape retain current work',async()=>{
  const h=await harness();try{await h.add([imageFile()]);h.node('clear').focus();h.node('clear').click();assert.equal(h.node('confirmation').open,true);h.node('keep').click();assert.equal(h.node('items').children.length,1);assert.equal(h.document.activeElement,h.node('clear'));h.node('clear').click();h.node('confirmation').dispatch('cancel');assert.equal(h.node('items').children.length,1);h.node('clear').click();h.node('discard').click();assert.equal(h.node('items').children.length,0);assert.equal(h.node('png').disabled,true);}finally{h.cleanup();}
});
test('Escape while confirmation is open does not cancel active decode',async()=>{
  const h=await harness();try{const late=deferred();h.setDecoder(()=>late.promise);await h.add([imageFile()]);h.node('clear').click();h.key({key:'Escape'});h.node('confirmation').dispatch('cancel');late.resolve(h.bitmap());await h.spin();assert.equal(h.node('items').children.length,1);}finally{h.cleanup();}
});
test('reorder and delete invalidate output, preserve focus and update numbered order',async()=>{
  const h=await harness();try{await h.add([imageFile('A.png'),imageFile('B.png')]);await h.build();h.node('items').children[0].querySelector('[data-action="down"]:not(:disabled)').click();assert.equal(h.node('items').children[0].children[1].children[0].textContent,'1. B.png');assert.equal(h.node('png').disabled,true);assert.equal(h.document.activeElement.disabled,false);h.node('items').children[1].querySelector('[data-action="remove"]:not(:disabled)').click();assert.equal(h.node('items').children.length,1);}finally{h.cleanup();}
});
test('late encoding cannot recreate result after cancel',async()=>{
  const h=await harness();try{await h.add([imageFile()]);let finish;h.setEncoder(callback=>{finish=callback;});await h.build();h.node('cancel').click();finish(new Blob(['stale'],{type:'image/png'}));await h.spin();assert.equal(h.node('png').disabled,true);assert.equal(h.node('preview').children.length,0);}finally{h.cleanup();}
});
test('output blob MIME and actual header dimensions are checked',async()=>{
  const h=await harness();try{await h.add([imageFile()]);h.setEncoder(callback=>callback(new Blob(['wrong'],{type:'image/jpeg'})));await h.build();assert.equal(h.node('png').disabled,true);assert.match(h.node('status').textContent,/PNG encoding failed/);}finally{h.cleanup();}
});
test('encoding timeout has no result; late callback stays discarded',async()=>{
  const h=await harness();try{await h.add([imageFile()]);let finish;h.setEncoder(callback=>{finish=callback;});await h.build();await h.tick(30_000);assert.equal(h.node('png').disabled,true);assert.equal(h.node('build').disabled,false);finish(new Blob(['late'],{type:'image/png'}));await h.spin();assert.equal(h.node('preview').children.length,0);}finally{h.cleanup();}
});
test('decode timeout releases UI but native lease blocks concurrent decoder calls',async()=>{
  const h=await harness();try{const late=deferred();let calls=0;h.setDecoder(()=>{calls++;return late.promise;});await h.add([imageFile()]);await h.tick(30_000);assert.equal(h.node('files').disabled,false);await h.add([imageFile()]);assert.equal(calls,1);assert.match(h.node('status').textContent,/previous native decode/);const bitmap=h.bitmap();late.resolve(bitmap);await h.spin();assert.equal(bitmap.closed,true);assert.match(h.node('status').textContent,/previous native decode/);}finally{h.cleanup();}
});
test('pagehide / persisted pageshow detaches old job and late status cannot clobber new epoch',async()=>{
  const h=await harness();try{const late=deferred();h.setDecoder(()=>late.promise);await h.add([imageFile()]);h.emit('pagehide');h.emit('pageshow',{persisted:true});assert.equal(h.node('files').disabled,false);const initial=h.node('status').textContent;const bitmap=h.bitmap();late.resolve(bitmap);await h.spin();assert.equal(bitmap.closed,true);assert.equal(h.node('status').textContent,initial);assert.equal(h.node('items').children.length,0);assert.equal(h.node('png').disabled,true);}finally{h.cleanup();}
});
test('pagehide clears URL references and existing export',async()=>{
  const h=await harness();try{await h.add([imageFile()]);await h.build();h.node('png').click();assert.equal(h.urlMap.size,1);h.emit('pagehide');assert.equal(h.urlMap.size,0);assert.equal(h.node('items').children.length,0);assert.equal(h.node('preview').children.length,0);}finally{h.cleanup();}
});
test('download URLs are bounded and expire after the last explicit click',async()=>{
  const h=await harness();try{await h.add([imageFile()]);await h.build();for(let i=0;i<100;i++)h.node('png').click();assert.equal(h.urlMap.size,1);assert.equal([...h.timers.values()].filter(x=>x.delay===60_000).length,1);await h.tick(60_000);assert.equal(h.urlMap.size,0);assert.equal(h.node('png').disabled,false);}finally{h.cleanup();}
});
test('empty numeric settings are not silently treated as zero',async()=>{
  const h=await harness();try{await h.add([imageFile()]);await h.change('gap','');assert.equal(h.node('estimate').textContent,'');await h.build();assert.equal(h.node('png').disabled,true);assert.match(h.node('status').textContent,/integer ranges/);}finally{h.cleanup();}
});
