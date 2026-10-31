// 真app + 受控DOM/native adapter，不把synthetic IME/BFCache標成原生PASS。
import test from 'node:test';
import assert from 'node:assert/strict';
import { harness } from './dom-harness.mjs';
const valid='question,answer\nA,a\nB,b\nC,c';
async function ready(locale='en'){const h=await harness(locale);h.change('source',valid);h.submit();return h;}
function absent(h){assert.equal(h.node('practice').hidden,true);assert.equal(h.node('exports').hidden,true);assert.equal(h.node('question').textContent,'');assert.equal(h.node('answer').textContent,'');assert.equal(h.node('print-preview').value,'');assert.equal(h.node('download-progress').disabled,true);}
for(const locale of ['en','zh-Hant'])test(`${locale} 完整開始→翻面→自評→修正→前後卡→重啟`,async()=>{
  const h=await ready(locale);try{
    assert.equal(h.node('practice').hidden,false);assert.equal(h.node('answer').textContent,'');assert.equal(h.node('again').disabled,true);assert.equal(h.node('previous').disabled,true);assert.equal(h.document.activeElement.id,'position');
    h.click('again');assert.equal(h.node('summary').textContent.includes('1'),false);
    h.click('reveal');assert.equal(h.node('answer').textContent,'a');assert.equal(h.node('again').disabled,false);assert.equal(h.document.activeElement.id,'answer-heading');
    h.click('again');h.click('again');h.click('remembered');assert.match(h.node('summary').textContent,/remembered 1|已想起 1/);assert.match(h.node('summary').textContent,/again 0|再練習 0/);
    h.click('next');assert.equal(h.node('question').textContent,'B');assert.equal(h.node('answer').textContent,'');assert.equal(h.node('again').disabled,true);
    h.click('next');assert.equal(h.node('next').disabled,true);h.click('next');assert.equal(h.node('question').textContent,'C');
    h.click('previous');h.click('previous');assert.match(h.node('rating').textContent,/Remembered|已想起/);
    h.submit();assert.match(h.node('summary').textContent,/remembered 0|已想起 0/);assert.equal(h.node('answer').textContent,'');
  }finally{h.cleanup();}
});
test('空態與submit preventDefault，錯誤保留原稿並關聯source',async()=>{
 const h=await harness();try{assert.equal(h.node('editor').disabled,false);assert.equal(h.node('init-status').hidden,true);assert.equal(h.submit().defaultPrevented,true);absent(h);assert.equal(h.node('source').getAttribute('aria-invalid'),'true');assert.equal(h.document.activeElement.id,'source');assert.match(h.node('error').textContent,/first record/);}finally{h.cleanup();}
});
test('編輯即清舊結果與preview，下載lease保留但原值不復活',async()=>{
 const h=await ready();try{h.click('reveal');h.click('remembered');h.click('download-print');assert.equal(h.urls.size,1);h.change('source',valid+'x');absent(h);assert.equal(h.urls.size,1);h.change('source',valid);absent(h);h.tick();assert.equal(h.urls.size,0);assert.equal(h.node('source').getAttribute('aria-invalid'),null);}finally{h.cleanup();}
});
test('shuffle input/change與載入範例清舊練習，不自動產生',async()=>{
 const h=await ready();try{h.node('shuffle').checked=true;h.node('shuffle').emit('input');absent(h);h.submit();assert.equal(h.node('practice').hidden,false);h.node('shuffle').emit('change');absent(h);h.sample();absent(h);assert.equal(h.node('shuffle').checked,false);assert.match(h.node('source').value,/question,answer/);}finally{h.cleanup();}
});
test('compositionstart清舊練習且submit無效，end後需重啟',async()=>{
 const h=await ready();try{h.node('source').emit('compositionstart');absent(h);assert.equal(h.node('start').disabled,true);h.submit();absent(h);h.node('source').emit('compositionend');assert.equal(h.node('start').disabled,false);absent(h);h.submit();assert.equal(h.node('practice').hidden,false);}finally{h.cleanup();}
});
test('輸入錯誤/超限不留舊卡與匯出，不回顯私密測試marker',async()=>{
 const h=await ready();try{h.change('source','question,answer\n"FAKE_PRIVATE"x,b');h.submit();absent(h);assert.equal(h.node('error').textContent.includes('FAKE_PRIVATE'),false);assert.match(h.node('error').textContent,/record 2/);h.change('source','x'.repeat(200001));h.submit();assert.match(h.node('error').textContent,/200,000/);}finally{h.cleanup();}
});
test('XSS字面題答僅textContent，無動態img/script建立',async()=>{
 const h=await harness();try{h.change('source','question,answer\n<img src=x onerror=alert(1)>,</script>&');h.submit();h.click('reveal');assert.equal(h.node('question').textContent,'<img src=x onerror=alert(1)>');assert.equal(h.node('answer').textContent,'</script>&');assert.equal(h.created.some(e=>['IMG','SCRIPT'].includes(e.tagName)),false);}finally{h.cleanup();}
});
test('清除取消與Escape保留完整輸入/結果/URL，focus回發起者',async()=>{
 const h=await ready();try{h.click('reveal');h.click('again');h.click('download-print');const before=h.snapshot();h.click('clear');assert.equal(h.node('clear-dialog').open,true);assert.equal(h.document.activeElement.id,'cancel-clear');h.click('cancel-clear');assert.equal(h.snapshot(),before);assert.equal(h.document.activeElement.id,'clear');h.click('clear');assert.equal(h.node('clear-dialog').emit('cancel').defaultPrevented,true);assert.equal(h.snapshot(),before);assert.equal(h.urls.size,1);}finally{h.cleanup();}
});
test('確認清除恢復空態/關洗牌/回source；dialog失敗保留資料',async()=>{
 const h=await ready();try{h.failures.dialog=true;const source=h.node('source').value;h.click('clear');assert.equal(h.node('source').value,source);assert.equal(h.node('practice').hidden,false);assert.match(h.node('error').textContent,/Nothing was deleted/);h.failures.dialog=false;h.click('clear');h.click('confirm-clear');absent(h);assert.equal(h.node('source').value,'');assert.equal(h.node('shuffle').checked,false);assert.equal(h.document.activeElement.id,'source');assert.equal(h.node('clear-dialog').open,false);}finally{h.cleanup();}
});
test('visible/hidden不清除；pagehide清引用且persisted pageshow空態',async()=>{
 const h=await ready();try{h.click('download-progress');h.emit('visibilitychange');assert.equal(h.node('practice').hidden,false);h.emit('pagehide');absent(h);assert.equal(h.node('source').value,'');assert.equal(h.node('editor').disabled,true);h.emit('pageshow',{persisted:true});absent(h);assert.equal(h.node('editor').disabled,false);assert.equal(h.node('source').value,'');assert.equal(h.node('start').disabled,false);}finally{h.cleanup();}
});
test('切語言即清資料；普通pageshow不復活',async()=>{
 const h=await ready();try{h.node('language-link').emit('click');absent(h);assert.equal(h.node('source').value,'');h.emit('pageshow',{persisted:false});absent(h);assert.equal(h.node('editor').disabled,true);}finally{h.cleanup();}
});
test('下載JSON真Blob bytes/檔名/評分來源ID，TXT與預覽完全同bytes',async()=>{
 const h=await ready();try{h.click('reveal');h.click('again');h.click('next');h.click('download-progress');const d=h.downloads[0];assert.equal(d.name,'flashcards-progress.json');assert.equal(d.live,true);assert.equal(d.blob.type,'application/json;charset=utf-8');const text=await d.blob.text();assert.equal(text.endsWith('\n'),true);const data=JSON.parse(text);assert.equal(data.cards[0].rating,'again');assert.equal(data.cards[1].rating,'unreviewed');assert.equal(data.position,2);assert.equal(data.revealed,false);assert.deepEqual(data.order,[1,2,3]);h.click('download-print');const txt=h.downloads[1];assert.equal(txt.name,'flashcards-print.txt');assert.equal(txt.blob.type,'text/plain;charset=utf-8');assert.equal(await txt.blob.text(),h.node('print-preview').value);assert.equal(h.urls.size,2);assert.equal(h.node('practice').hidden,false);}finally{h.cleanup();}
});
test('下載60秒延遲撤銷不在click同步堆疊；最多4個且不提前撤銷',async()=>{
 const h=await ready();try{for(let i=0;i<4;i++)h.click('download-print');assert.equal(h.urls.size,4);assert(h.downloads.every(d=>d.live));assert([...h.timers.values()].every(t=>t.delay===60000));h.click('download-print');assert.equal(h.downloads.length,4);assert.equal(h.urls.size,4);assert.match(h.node('error').textContent,/Four/);h.tick();assert.equal(h.urls.size,0);h.click('download-print');assert.equal(h.downloads.length,5);}finally{h.cleanup();}
});
for(const failure of ['blob','url','click','timer'])test(`下載${failure}例外固定錯誤、保留練習、無殘留URL`,async()=>{
 const h=await ready();try{h.failures[failure]=true;h.click('download-print');assert.equal(h.node('practice').hidden,false);assert.match(h.node('error').textContent,/download could not/);assert.equal(h.node('error').textContent.includes('PRIVATE'),false);assert.equal(h.urls.size,0);}finally{h.cleanup();}
});
test('重新開始遇Crypto失敗清舊練習，不沿用舊shuffle結果',async()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'crypto');const h=await ready();try{Object.defineProperty(globalThis,'crypto',{value:undefined,configurable:true});h.node('shuffle').checked=true;h.submit();absent(h);assert.match(h.node('error').textContent,/Random values/);}finally{Object.defineProperty(globalThis,'crypto',original);h.cleanup();}
});
test('最大200卡可導航與TXT全數來源順序，不截斷',async()=>{
 const h=await harness();try{h.change('source','question,answer\n'+Array.from({length:200},(_,i)=>`Q${i+1},A${i+1}`).join('\n'));h.submit();for(let i=0;i<199;i++)h.click('next');assert.equal(h.node('question').textContent,'Q200');assert.equal(h.node('next').disabled,true);assert.match(h.node('print-preview').value,/Card 200\nQuestion:\n  Q200\nAnswer:\n  A200\n$/);}finally{h.cleanup();}
});
test('缺TextEncoder初始與persisted pageshow都保持failclosed',async()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'TextEncoder');let h;
 try{Object.defineProperty(globalThis,'TextEncoder',{value:undefined,configurable:true});h=await harness();assert.equal(h.node('editor').disabled,true);assert.equal(h.node('start').disabled,true);assert.match(h.node('error').textContent,/lacks a required/);h.emit('pageshow',{persisted:true});assert.equal(h.node('editor').disabled,true);assert.equal(h.node('start').disabled,true);}
 finally{h?.cleanup();Object.defineProperty(globalThis,'TextEncoder',original);}
});
