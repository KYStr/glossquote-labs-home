// 獨審缺口與root批准的下載lease修正；先於舊產品碼重現，非原生browser證據。
import test from 'node:test';import assert from 'node:assert/strict';
import { parseCSV, printableText, inspectCards, inspectPractice } from '../public/js/core/flashcards.mjs';
import { harness } from './dom-harness.mjs';
const card=()=>({id:1,question:'Q',answer:'A'});
const state=()=>({cards:[card()],ratings:['unreviewed'],order:[1],position:1,revealed:false});
for(const sep of ['\u2028','\u2029'])test(`TXT保留${sep.codePointAt(0).toString(16)}但後續行有縮排`,()=>{
 const parsed=parseCSV(`question,answer\n"Q${sep}Card 99",A`);assert.equal(parsed.ok,true);assert.equal(parsed.value[0].question,`Q${sep}Card 99`);
 assert.equal(printableText(parsed.value,'en').value,`Flashcards — printable text\n\nCard 1\nQuestion:\n  Q${sep}  Card 99\nAnswer:\n  A\n`);
});
test('custom prototype record與practice拒絕，null prototype資料可接受',()=>{
 const c=Object.assign(Object.create({inherited:true}),card());assert.equal(inspectCards([c]).ok,false);
 const p=Object.assign(Object.create({inherited:true}),state());assert.equal(inspectPractice(p).ok,false);
 assert.equal(inspectCards([Object.assign(Object.create(null),card())]).ok,true);
});
test('non-enumerable必要欄位拒絕，不執行getter',()=>{
 const c=card();Object.defineProperty(c,'answer',{value:'A',enumerable:false});assert.equal(inspectCards([c]).ok,false);
 const p=state();Object.defineProperty(p,'revealed',{value:false,enumerable:false});assert.equal(inspectPractice(p).ok,false);
 let calls=0;const getter=card();Object.defineProperty(getter,'answer',{get(){calls++;return 'A';}});assert.equal(inspectCards([getter]).ok,false);assert.equal(calls,0);
});
test('陣列custom prototype或non-enumerable index拒絕',()=>{
 const arr=[card()];Object.setPrototypeOf(arr,Object.create(Array.prototype));assert.equal(inspectCards(arr).ok,false);
 const hidden=[card()];Object.defineProperty(hidden,'0',{value:card(),enumerable:false});assert.equal(inspectCards(hidden).ok,false);
});
async function ready(){const h=await harness();h.change('source','question,answer\nQ,A');h.submit();return h;}
for(const action of ['edit','restart','clear'])test(`已開始下載遇${action}保留60秒lease，但不能匯出舊練習`,async()=>{
 const h=await ready();try{h.click('download-print');const url=h.downloads[0].url;assert.equal(h.urls.has(url),true);
 if(action==='edit')h.change('source','question,answer\nNEW,A');else if(action==='restart')h.submit();else{h.click('clear');h.click('confirm-clear');}
 assert.equal(h.urls.has(url),true);
 if(action!=='restart'){assert.equal(h.node('download-print').disabled,true);assert.equal(h.node('print-preview').value,'');}
 h.tick();assert.equal(h.urls.has(url),false);
 }finally{h.cleanup();}
});
test('四個lease跨編輯仍限額；一個timer到期才恢復新練習下載',async()=>{
 const h=await ready();try{for(let i=0;i<4;i++)h.click('download-print');assert.equal(h.urls.size,4);assert.equal(h.node('download-print').disabled,true);
 h.change('source','question,answer\nNEW,A');h.submit();assert.equal(h.node('download-print').disabled,true);assert.match(h.node('error').textContent,/Four/);h.click('download-print');assert.equal(h.downloads.length,4);
 const [id,timer]=[...h.timers][0];h.timers.delete(id);timer.fn();assert.equal(h.urls.size,3);assert.equal(h.node('download-print').disabled,false);
 h.click('download-print');assert.equal(h.downloads.length,5);assert.equal(h.urls.size,4);
 }finally{h.cleanup();}
});
test('pagehide立即回收所有lease；已捕捉late timer不復活DOM/focus',async()=>{
 const h=await ready();try{h.click('download-print');const late=[...h.timers.values()][0].fn;h.emit('pagehide');const before=h.snapshot();const focus=h.document.activeElement;assert.equal(h.urls.size,0);late();assert.equal(h.snapshot(),before);assert.equal(h.document.activeElement,focus);
 h.emit('pageshow',{persisted:true});assert.equal(h.node('download-print').disabled,true);assert.equal(h.node('source').value,'');
 }finally{h.cleanup();}
});
