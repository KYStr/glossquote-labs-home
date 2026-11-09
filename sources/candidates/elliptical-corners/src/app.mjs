import {fields,corners,canonical,fraction,fixed} from './core.mjs';
import {createController} from './controller.mjs';
import {messages} from './messages.mjs';
const $=id=>document.getElementById(id);
function cell(tag,text){const el=document.createElement(tag);el.textContent=text;return el;}
export function start(){
 let lastModel=null,lastLanguage=null;
 const controller=createController({language:document.documentElement.lang,focus:k=>$(k).focus(),clearSelection:()=>{const t=$('css');t.value='';},render(s){
  const m=messages[s.lang];document.documentElement.lang=s.lang;document.title=m.title+' · GlossQuote Labs';
  for(const el of document.querySelectorAll('[data-msg]'))el.textContent=m[el.dataset.msg];
  $('language').textContent=s.lang==='en'?'繁體中文':'English';$('language').lang=s.lang==='en'?'zh-Hant':'en';
  for(const k of fields){const input=$(k);if(input.value!==s.raw[k])input.value=s.raw[k];const label=['w','h'].includes(k)?m[k]:m[k.slice(0,2)]+' · '+m[k.slice(2)];$('label-'+k).textContent=label+' (px)';const error=s.errors.find(e=>e.field===k);input.setAttribute('aria-invalid',String(!!error));$('error-'+k).textContent=error?m.errors[error.code]:'';}
  $('preview-frame').setAttribute('aria-label',m.preview);
  $('errors').replaceChildren(...s.errors.map(e=>{const a=document.createElement('a');a.href='#'+e.field;a.textContent=$('label-'+e.field).textContent+': '+m.errors[e.code];a.addEventListener('click',event=>{event.preventDefault();$(e.field).focus();});const li=document.createElement('li');li.append(a);return li;}));
  $('status').textContent=m.status[s.status]||'';$('result').hidden=!s.model;$('empty').hidden=!!s.model;$('select').disabled=!s.model;
  if(!s.model){$('shape').removeAttribute('style');$('rows').replaceChildren();$('factor').textContent='';$('limits').textContent='';lastModel=null;return;}
  const model=s.model;
  if(lastModel!==model||lastLanguage!==s.lang){
   $('factor').textContent=m.factor+': '+fraction(model.factor)+' ≈ '+fixed(model.factor,4)+' — '+(model.factor.n===model.factor.d?m.none:m.reduced);
   $('limits').textContent=m.limiting+': '+(model.limiting.length?model.limiting.map(x=>m[x]).join(' / '):m.noSides);
   const rows=model.pairs.map(p=>{const tr=document.createElement('tr'),th=cell('th',m[p.corner]);th.scope='row';tr.append(th,cell('td',canonical(model.values[p.corner+'x'])+' / '+canonical(model.values[p.corner+'y'])),cell('td',fixed(p.x,2)+' / '+fixed(p.y,2)),cell('td',p.square?m.square:m.ellipse));return tr;});$('rows').replaceChildren(...rows);
   const shape=$('shape');shape.style.width=canonical(model.values.w)+'px';shape.style.height=canonical(model.values.h)+'px';shape.style.borderRadius=model.css.slice('border-radius: '.length,-2);
   if($('css').value!==model.css)$('css').value=model.css;
  }
  lastModel=model;lastLanguage=s.lang;
 }});
 for(const k of fields){$(k).addEventListener('input',()=>controller.edit(k,$(k).value));$(k).addEventListener('compositionstart',()=>controller.composition(true));$(k).addEventListener('compositionend',()=>{controller.composition(false);controller.edit(k,$(k).value);});}
 $('form').addEventListener('submit',e=>{e.preventDefault();controller.submit();});
 $('reset').addEventListener('click',()=>controller.reset());
 for(const name of ['default','overlap'])$(name).addEventListener('click',()=>controller.example(name));
 $('language').addEventListener('click',()=>controller.language());
 $('select').addEventListener('click',()=>controller.select(()=>{$('css').focus();$('css').select();if($('css').selectionEnd-$('css').selectionStart!==$('css').value.length)throw Error('selection');}));
 window.addEventListener('pagehide',()=>controller.leave());window.addEventListener('pageshow',e=>{if(e.persisted)controller.restore();});
 $('generate').disabled=false;$('reset').disabled=false;$('default').disabled=false;$('overlap').disabled=false;$('language').disabled=false;$('boot-status').hidden=true;
}
