import {Controller} from './controller.mjs'; // 真DOM接同一純核心控制器。
import {messages} from './i18n.mjs'; // 靜態雙語文案。
const lang=document.documentElement.lang==='en'?'en':'zh',t=messages[lang]; // 語言由固定HTML決定。
const $=id=>document.getElementById(id); // 只使用程式固定ID。
const defaults=()=>({x:'0',y:'8',blur:'16',spread:'0',hex:'',opacity:'25',mode:'outer'}); // 初始無有效顏色與陰影。
let nextId=1,rows=[{id:nextId++,raw:defaults()}],confirmAction=null,returnFocus=null; // 穩定層ID跟資料一起移動。
const fields=['x','y','blur','spread','hex','opacity','mode'],bounds={x:'−48…48 px',y:'−48…48 px',blur:'0…64 px',spread:'−24…24 px',opacity:'0…100%'}; // 顯示真規格範圍。
const raw=()=>({layers:rows.map(r=>({...r.raw}))}); // 傳普通自建資料，不讀任意屬性。
const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}; // 不用HTML注入拼接使用者內容。
const button=(text,fn)=>{const b=node('button',text);b.type='button';b.addEventListener('click',fn);return b;}; // 事件以正常監聽器綁定。
let rule=null;try{for(const sheet of document.styleSheets)for(const r of sheet.cssRules)if(r.selectorText==='#shadow-card')rule=r;}catch{} // 只查同源預定規則，缺失走安全失敗。
const c=new Controller({change:renderResult}); // 產品使用真時鐘、URL、Blob與clipboard。
function clearErrors(){for(const el of document.querySelectorAll('[aria-invalid]'))el.removeAttribute('aria-invalid');$('error').textContent='';} // 不留過期錯誤標記。
function invalidate(){c.invalidate();clearErrors();} // 每次輸入先撤結果再更新raw。
function renderRows(focus=null){ // 結構變動後重建安全節點與穩定ID。
  $('layers').replaceChildren();rows.forEach((row,index)=>{ // 層序由陣列固定，不依模式排序。
    const set=node('fieldset'),legend=node('legend',t.layer.replace('{n}',index+1));set.append(legend);const grid=node('div');grid.className='field-grid'; // 語意分組與響應式欄位。
    for(const key of fields){ // 每個輸入獨立label和提示。
      const wrap=node('div'),id=`layer-${row.id}-${key}`,label=node('label',t[key]);label.htmlFor=id;const input=node(key==='mode'?'select':'input');input.id=id; // ID只用內部數字與固定欄位。
      if(key==='mode'){for(const value of ['outer','inset']){const option=node('option',t[value]);option.value=value;input.append(option);}}else{input.type='text';input.inputMode=key==='hex'?'text':key==='x'||key==='y'||key==='spread'?'text':'numeric';input.autocomplete='off';input.spellcheck=false;} // 不用number或maxlength修剪字串。
      input.value=row.raw[key];const hint=node('small',key==='hex'?t.colorHint:key==='mode'?`${t.outer} / ${t.inset}`:t.range+bounds[key]);hint.id=id+'-hint';input.setAttribute('aria-describedby',key==='mode'?`${hint.id} geometry-help`:hint.id); // 不靠placeholder表達值。
      const edit=()=>{invalidate();row.raw[key]=input.value;};input.addEventListener('input',edit);input.addEventListener('change',edit);input.addEventListener('compositionstart',()=>c.composition(true));input.addEventListener('compositionend',()=>{row.raw[key]=input.value;c.composition(false);}); // 組字結束不自動產生。
      wrap.append(label,input,hint);grid.append(wrap); // 所有文案透過textContent或value。
    } // 結束欄位。
    const actions=node('div');actions.className='layer-actions';const earlier=button(t.earlier,()=>move(row.id,-1)),later=button(t.later,()=>move(row.id,1)),remove=button(t.remove,()=>removeRow(row.id));earlier.disabled=index===0;later.disabled=index===rows.length-1;remove.disabled=rows.length===1;actions.append(earlier,later,remove);set.append(grid,actions);$('layers').append(set); // 端點確實disabled，handler另核。
  });$('add').disabled=rows.length===4;if(focus)$(focus)?.focus(); // 新增或排序後明確聚焦HEX。
} // 結束層渲染。
function move(id,delta){if(c.modal)return;const i=rows.findIndex(r=>r.id===id),j=i+delta;if(j<0||j>=rows.length)return;invalidate();[rows[i],rows[j]]=[rows[j],rows[i]];renderRows(`layer-${id}-hex`);} // 無效端點不改generation。
function removeRow(id){if(c.modal||rows.length===1)return;const i=rows.findIndex(r=>r.id===id);invalidate();rows.splice(i,1);renderRows(`layer-${rows[Math.min(i,rows.length-1)].id}-hex`);} // 刪後聚焦原索引或末層。
function renderResult(){ // 預覽、摘要與取出共用同一快照。
  if(!$('status'))return;const s=c.state;try{if(rule)rule.style.setProperty('box-shadow',s.result?.shadowValue??'none');}catch{if(s.result){c.fail();return;}} // 不設定raw cssText或任意selector。
  $('result').hidden=!s.result;$('preview-empty').hidden=!!s.result;$('shadow-card').hidden=!s.result;$('css').value=s.result?.css??'';$('status').textContent=t[s.message]??t.internal;$('lease').textContent=c.lease?t.lease:''; // 修改立即撤舊結果。
  $('copy').disabled=!s.result||s.copying||c.modal||!c.available;$('download').disabled=!s.result||!!c.lease||c.modal||!c.available;$('generate').disabled=c.composing||c.modal||!c.available; // pending與dialog權限明確。
  $('summary').replaceChildren();if(s.result)for(const [i,l]of s.result.layers.entries())$('summary').append(node('li',`${t.layer.replace('{n}',i+1)} · ${t.x} ${l.x}px · ${t.y} ${l.y}px · ${t.blur} ${l.blur}px · ${t.spread} ${l.spread}px · ${l.hex} · ${l.opacity}% · ${t[l.mode]}`)); // 不回顯不可信raw。
} // 結束結果渲染。
function generate(event){event.preventDefault();if(c.modal)return;clearErrors();c.generate(raw());if(c.state.error){const e=c.state.error,match=/layers\[(\d+)\]\.([a-z]+)/.exec(e.path);if(match){const input=$(`layer-${rows[Number(match[1])].id}-${match[2]}`);input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby',`${input.id}-hint${match[2]==='mode'?' geometry-help':''} error`);$('error').textContent=`${t.layer.replace('{n}',Number(match[1])+1)} · ${t[match[2]]}: ${match[2]==='hex'?t.colorError:match[2]==='mode'?t.modeError:t.integer}`;input.focus();}else $('error').textContent=t.internal;return;}if(c.state.result){let supported=false;try{supported=!!rule&&CSS.supports('box-shadow',c.state.result.shadowValue);}catch{}if(!supported)c.fail();}} // 全部驗值後核真CSS能力，失敗清全結果。
function dirty(){return rows.length!==1||JSON.stringify(rows[0].raw)!==JSON.stringify(defaults())||!!c.state.result||c.state.copying||!!c.lease;} // 不因單純focus觸發確認。
function discardDialog(){confirmAction=null;returnFocus=null;if($('confirm-dialog').open)$('confirm-dialog').close();c.setModal(false);} // 跨生命週期不得留下舊確認回調。
function reset(purge=false){discardDialog();if(purge)c.dispose();else c.reset();rows=[{id:nextId++,raw:defaults()}];clearErrors();renderRows();} // 清除與離頁的URL例外分開。
function ask(action,trigger){if(c.modal)return;if(!dirty()){action();return;}confirmAction=action;returnFocus=trigger;c.setModal(true);$('confirm-dialog').showModal();$('cancel').focus();} // 正常modal隔離表單。
function cancelDialog(){const target=returnFocus;discardDialog();target?.focus();} // 取消保持raw/generation與有效結果。
$('form').addEventListener('submit',generate);$('add').addEventListener('click',()=>{if(c.modal||rows.length>=4)return;invalidate();const row={id:nextId++,raw:defaults()};rows.push(row);renderRows(`layer-${row.id}-hex`);}); // 新增上限有handler guard。
$('clear').addEventListener('click',()=>ask(()=>{reset();$(`layer-${rows[0].id}-hex`).focus();},$('clear'))); // 確認清除才變資料。
$('language').addEventListener('click',event=>{event.preventDefault();ask(()=>{location.href=$('language').href;},$('language'));}); // 固定另一語言頁，不帶使用者輸入。
$('cancel').addEventListener('click',cancelDialog);$('confirm-dialog').addEventListener('cancel',event=>{event.preventDefault();cancelDialog();});$('accept').addEventListener('click',()=>{const action=confirmAction;discardDialog();action?.();}); // Esc等同取消，接受只執行目前回調。
$('copy').addEventListener('click',()=>c.copy(raw()));$('download').addEventListener('click',()=>c.download(raw(),(url,name)=>{const a=node('a');a.href=url;a.download=name;document.body.append(a);try{a.click();}finally{a.remove();}})); // 真手勢下載，不讀檔案或剪貼簿。
document.addEventListener('visibilitychange',()=>{if(document.hidden)c.hidden();else c.visible();});window.addEventListener('pagehide',()=>reset(true));window.addEventListener('pageshow',()=>{reset(true);c.available=!document.hidden;renderResult();}); // 真生命週期，不注入成功旗標。
for(const el of document.querySelectorAll('[data-text]'))el.textContent=t[el.dataset.text];renderRows();renderResult(); // 初始化只有固定字典文案，沒有自動結果。
