import {fields,defaults,fixed,fraction,diagram} from './core.mjs'; // raw 與結果的單位、精度分開。
import {createController} from './controller.mjs';
import {messages} from './messages.mjs';
const language=document.documentElement.lang==='en'?'en':'zh',m=messages[language],$=id=>document.getElementById(id);
const el=(name,text)=>{const n=document.createElement(name);if(text!==undefined)n.textContent=text;return n;};
const svg=(name,attrs)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',name);for(const [key,value]of Object.entries(attrs))n.setAttribute(key,String(value));return n;}; // 固定呼叫端屬性與有限計算數字，沒有 raw markup。
let previous=null;
function render(state){
 for(const field of fields){if(field==='mode'){for(const radio of document.querySelectorAll('[name=mode]'))radio.checked=radio.value===state.raw.mode;}else if($(field).value!==state.raw[field])$(field).value=state.raw[field];}
 for(const field of fields){const error=state.errors.find(e=>e.field===field),control=field==='mode'?$('contain'):$(field);$('error-'+field).textContent=error?m[error.code]:'';control.setAttribute('aria-invalid',String(Boolean(error)));if(field==='mode')$('cover').setAttribute('aria-invalid',String(Boolean(error)));}
 $('status').textContent=m[state.status]||'';$('select').disabled=!state.model;$('result').hidden=!state.model;
 if(!state.model){$('output').value='';$('numbers').replaceChildren();$('fractions').replaceChildren();$('diagram').replaceChildren();$('snapshot').replaceChildren();previous=null;return;}
 if(previous===state.model)return;previous=state.model;const model=state.model;
 $('classification').textContent=m[model.classification];$('upscale').textContent=model.upscale?m.upscale:'';
 const snap=el('dl');for(const field of fields){snap.append(el('dt',m[field]||(language==='en'?'Mode':'適配方式')),el('dd',String(model.values[field])));}$('snapshot').replaceChildren(snap);
 const body=el('tbody'),exact=el('dl');for(const [key,value]of Object.entries(model.numbers)){const unit=key==='scale'?'×':key==='area'?'%':key.startsWith('crop')||['x0','y0','x1','y1','vw','vh'].includes(key)?m.sourceUnit:m.cssUnit;const row=el('tr');const head=el('th',m[key]);head.scope='row';row.append(head,el('td',`${fixed(value,key==='scale'?6:2)} ${unit}`));body.append(row);exact.append(el('dt',m[key]),el('dd',`${fraction(value)} ${unit}`));}
 $('numbers').replaceChildren(el('caption',m.geometry),body);$('fractions').replaceChildren(exact);$('output').value=model.css;draw(model);
}
function draw(model){const d=diagram(model,$('stage').clientWidth),v=model.values,node=svg('svg',{viewBox:`0 0 ${v.cw} ${v.ch}`,width:d.width,height:d.height,'aria-hidden':'true'}),defs=svg('defs',{}),clip=svg('clipPath',{id:'image-clip'});clip.append(svg('rect',{width:v.cw,height:v.ch}));defs.append(clip);node.append(defs,svg('rect',{width:v.cw,height:v.ch,class:'box-region'}));const g=svg('g',{'clip-path':'url(#image-clip)'});g.append(svg('rect',{x:d.x,y:d.y,width:d.rw,height:d.rh,class:'source-region'}));for(const f of[.25,.5,.75]){g.append(svg('line',{x1:d.x+d.rw*f,x2:d.x+d.rw*f,y1:d.y,y2:d.y+d.rh,class:'guide'}),svg('line',{x1:d.x,x2:d.x+d.rw,y1:d.y+d.rh*f,y2:d.y+d.rh*f,class:'guide'}));}node.append(g);$('diagram').replaceChildren(node);$('thin').textContent=d.thin?m.thin:'';}
const controller=createController({render,focus:field=>(field==='mode'?$('contain'):$(field)).focus(),clearSelection:()=>{$('output').setSelectionRange(0,0);}});
for(const field of fields){if(field==='mode'){for(const radio of document.querySelectorAll('[name=mode]'))radio.addEventListener('change',()=>controller.edit(field,radio.value));}else{const input=$(field);input.addEventListener('input',()=>controller.edit(field,input.value));input.addEventListener('compositionstart',()=>controller.composition(true));input.addEventListener('compositionend',()=>controller.composition(false));input.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.isComposing||e.keyCode===229))e.preventDefault();});}}
$('form').addEventListener('submit',e=>{e.preventDefault();controller.submit();});$('clear').addEventListener('click',()=>controller.clear());$('defaults').addEventListener('click',()=>controller.defaults());$('select').addEventListener('click',()=>controller.selection(()=>{$('output').focus();$('output').select();}));
document.addEventListener('visibilitychange',()=>{if(document.hidden)controller.hide();});window.addEventListener('pagehide',()=>controller.leave());window.addEventListener('pageshow',e=>controller.restore(e.persisted));window.addEventListener('resize',()=>{const model=controller.state().model;if(model)draw(model);});
for(const control of document.querySelectorAll('[data-init]'))control.disabled=false;$('boot-status').textContent='';
