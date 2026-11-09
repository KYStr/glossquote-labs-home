import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../public/js/app.mjs';
import {harness} from './dom-harness.mjs';
const source='name,phone,email\r\nFictional A,+00120,fiction@example.invalid';
function setup(language='zh-Hant') { const h=harness(language);h.app=createApp(h.document,h.platform);return h; }
function ready(h,text=source) { h.$('source').value=text;h.$('source').emit('input');h.$('parse').emit('click');h.$('name').value='0';h.$('phone').value='1';h.$('email').value='2';h.$('prepare').emit('click');assert(h.app.state().hasOutput); }
function download(h){h.$('ack').checked=true;h.$('ack').emit('change');h.$('download').emit('click');}
test('both languages use the same preview then explicit confirmed download lifecycle',async()=>{
  for(const language of ['zh-Hant','en']) {const h=setup(language);ready(h);assert.equal(h.$('editor').disabled,false);assert.equal(h.$('preview').children.length,1);assert.equal(h.$('download').disabled,true);h.app.download();assert.equal(h.downloads.length,0);download(h);assert.equal(h.downloads.length,1);assert.equal(h.downloads[0].download,'contacts.vcf');assert((await h.urls[0].blob.text()).includes('TEL:+00120\r\n'));assert.equal(h.$('vcf').value,await h.urls[0].blob.text());h.fireTimers();assert.deepEqual(h.revoked,['blob:fake-0']);assert.equal(h.app.state().url,null);}
});
test('every source/mapping/header edit revokes old output and live download URL immediately',()=>{
  for(const [id,event]of [['source','input'],['name','input'],['phone','change'],['email','input'],['header','change']]) {const h=setup();ready(h);download(h);h.$(id).emit(event);assert.equal(h.app.state().hasOutput,false,id);assert.equal(h.$('download').disabled,true);assert.equal(h.$('ack').checked,false);assert.equal(h.$('preview').children.length,0);assert.equal(h.$('vcf').value,'');assert.deepEqual(h.revoked,['blob:fake-0']);h.app.download();assert.equal(h.downloads.length,1);}
});
test('repeated prepare, click, acknowledgment removal and clear do not leak URLs',()=>{
  const h=setup();ready(h);download(h);h.app.download();assert.deepEqual(h.revoked,['blob:fake-0']);h.$('ack').checked=false;h.$('ack').emit('change');assert.deepEqual(h.revoked,['blob:fake-0','blob:fake-1']);h.$('prepare').emit('click');assert.equal(h.$('ack').checked,false);download(h);h.$('clear').emit('click');assert.equal(h.$('source').value,'');assert.equal(h.app.state().hasRecords,false);assert.equal(h.app.state().hasOutput,false);assert.equal(h.timers.size,0);assert.equal(h.revoked.length,3);
});
test('pagehide clears content, download and file input for navigation or back-forward cache',()=>{
  const h=setup();ready(h);download(h);h.pagehide();assert.equal(h.$('source').value,'');assert.equal(h.$('file').value,'');assert.equal(h.$('vcf').value,'');assert.equal(h.$('preview').children.length,0);assert.equal(h.app.state().url,null);
});
test('new invalid CSV or invalid mapped contact cannot leave a valid prior output',()=>{
  const h=setup();ready(h);download(h);h.$('source').value='a,b\nc';h.$('source').emit('input');h.app.parse();assert.equal(h.app.state().hasOutput,false);assert.equal(h.app.state().hasRecords,false);assert(h.$('error').textContent);assert(h.$('error').focused);
  ready(h);h.$('phone').value='0';h.$('phone').emit('change');h.app.prepare();assert.equal(h.app.state().hasOutput,false);assert(h.$('error').textContent);assert.equal(h.$('download').disabled,true);
});
test('file size checked before reading; decoding failure invalidates old exports',()=>{
  const h=setup();ready(h);download(h);h.$('file').files=[{name:'fake.csv',size:262145}];h.app.loadFile();assert.equal(h.readers.length,0);assert.equal(h.app.state().hasOutput,false);assert.equal(h.revoked.length,1);
  h.$('file').files=[{name:'fake.csv',size:2}];h.app.loadFile();const r=h.readers.at(-1);r.readyState=2;r.result=new Uint8Array([255,255]).buffer;r.onload();assert(h.$('error').textContent);assert.equal(h.app.state().sourceKind,'text');
});
test('selected file raw CRLF preserved, then a manual edit switches to textarea authority',()=>{
  const h=setup();const raw='name,phone,email\r\n"Fictional\r\nA",001,fiction@example.invalid';h.$('file').files=[{name:'fake.csv',size:raw.length}];h.app.loadFile();h.readers[0].finish(raw);
  h.$('source').value=raw.replaceAll('\r\n','\n');h.app.parse();h.$('name').value='0';h.$('phone').value='1';h.$('email').value='2';h.app.prepare();assert.equal(h.$('preview').children[0].children[1].textContent,'Fictional\r\nA');
  h.$('source').emit('input');h.app.parse();h.$('name').value='0';h.$('phone').value='1';h.$('email').value='2';h.app.prepare();assert.equal(h.$('preview').children[0].children[1].textContent,'Fictional\nA');
});
test('late file completions after newer selection, edit or clear cannot overwrite state',()=>{
  for(const interruption of ['new','edit','clear','pagehide']) {const h=setup();h.$('file').files=[{name:'old.csv',size:source.length}];h.app.loadFile();const old=h.readers[0],late=old.onload;
    if(interruption==='new'){h.$('file').files=[{name:'new.csv',size:source.length}];h.app.loadFile();h.readers[1].finish(source.replace('Fictional A','Fictional B'));}
    if(interruption==='edit'){h.$('source').value='manually edited';h.$('source').emit('input');}
    if(interruption==='clear')h.app.clear();if(interruption==='pagehide')h.pagehide();
    const before=h.$('source').value;old.result=new TextEncoder().encode('stale').buffer;late();assert.equal(h.$('source').value,before);assert.notEqual(h.$('source').value,'stale');
  }
});
test('read error, cancel selection, wrong file and missing capability remain recoverable',()=>{
  const h=setup();h.$('file').files=[{name:'wrong.txt',size:1}];h.app.loadFile();assert.equal(h.readers.length,0);h.$('file').files=[{name:'fake.csv',size:source.length}];h.app.loadFile();h.readers[0].fail();assert.equal(h.app.state().reading,false);assert(h.$('error').textContent);h.$('file').files=[];h.app.loadFile();assert.equal(h.app.state().hasOutput,false);ready(h);assert(h.app.state().hasOutput);
  const blocked=harness();delete blocked.platform.FileReader;assert.equal(createApp(blocked.document,blocked.platform).supported,false);assert.equal(blocked.$('editor').disabled,true);
});
test('literal hostile-looking names rendered with textContent and 25-contact pagination',()=>{
  const h=setup('en');const rows=Array.from({length:26},(_,i)=>`<img src=x onerror=alert(${i})>,001,fiction@example.invalid`);ready(h,'name,phone,email\n'+rows.join('\n'));assert.equal(h.$('preview').children.length,25);assert.match(h.$('preview').children[0].children[1].textContent,/<img/u);h.$('next').emit('click');assert.equal(h.$('preview').children.length,1);assert.equal(h.$('next').disabled,true);h.$('previous').emit('click');assert.equal(h.$('preview').children.length,25);
});
test('object URL failure keeps reviewed content and permits retry without unintended download',()=>{
  const h=setup('en');ready(h);h.platform.URL.createObjectURL=()=>{throw new Error('synthetic');};download(h);assert.equal(h.downloads.length,0);assert(h.$('error').textContent);assert(h.app.state().hasOutput);assert.equal(h.app.state().url,null);assert.equal(h.document.body.children.length,0);
});
