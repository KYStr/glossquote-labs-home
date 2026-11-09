// 控制器負責快照與非同步資源，DOM 只持有有界的原始欄位。
import {Controller} from './controller.mjs';
// 匯入此模組明列的內建或同源依賴，不載入遠端程式。
import {messages,errorMessage} from './i18n.mjs';
// 固定節點與靜態頁面語言決定顯示詞典，不讀 URL 資料。
const $=id=>document.getElementById(id),en=document.documentElement.lang==='en',m=messages[en?'en':'zh'];
// 色標、穩定 ID、CSS 規則與確認回呼僅存在本頁記憶體。
let rows=[],serial=0,rule=null,ready=false,pending=null,returnFocus=null;
// 不插入 HTML 或原始 CSS；所有可見文字透過 textContent。
function node(tag,text,attrs={}){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;}
// 唯一控制器將生命週期變化通知同一畫面更新函式。
const controller=new Controller({change:render});
// 讀取當下兩種色標欄位及角度，不混入 DOM 或額外屬性。
const raw=()=>({angle:$('angle').value,stops:rows.map(r=>({hex:$(r.id+'-hex').value,position:$(r.id+'-position').value}))});
// 以初始兩色標及角度的原字串核對是否仍有草稿。
const initial=()=>rows.length===2&&$('angle').value==='90'&&rows.every((r,i)=>$(r.id+'-hex').value===''&&$(r.id+'-position').value===String(i*100));
// 僅真草稿差異、結果、錯誤或複製狀態需要清除確認。
const dirty=()=>!initial()||!!controller.state.result||!!controller.state.error||controller.state.phase==='copying';
// 原生 CSSOM 唯一樣式寫入點，只接受純核心已驗證結果。
function render(state){if(!ready)return;const r=state.result;if(r){try{if(!rule||!CSS.supports('background-image',r.gradient))throw Error('unsupported');rule.style.setProperty('background-image',r.gradient);rule.style.setProperty('background-color',r.stops[0].hex);}catch{controller.fail('UNSUPPORTED');return;}}else if(rule){rule.style.removeProperty('background-image');rule.style.removeProperty('background-color');}$('result').hidden=!r;$('css').value=r?.css||'';$('summary').textContent=r?`${m.angle}: ${r.angle}°. ${r.stops.map((x,i)=>`${m.stop} ${i+1}: ${x.hex} ${x.position}%`).join('; ')}. ${m.hardcut}`:'';$('status').textContent=state.error?`${errorMessage(state.error.code,en)} (${state.error.code})`:(m[state.message]||m.changed);$('generate').disabled=controller.composing;$('copy').disabled=!r||state.phase==='copying';$('download').disabled=!r;$('select').disabled=!r;$('clear').disabled=!dirty();}
// 修改先清結果與 URL；不重建輸入避免打斷 IME 和游標。
function edit(){controller.invalidate();for(const n of document.querySelectorAll('[aria-invalid]'))n.removeAttribute('aria-invalid');}
// 此局部函式集中處理 wire 的固定狀態轉換。
function wire(input){input.addEventListener('input',edit);input.addEventListener('change',edit);input.addEventListener('compositionstart',()=>controller.composition(true));input.addEventListener('compositionend',()=>controller.composition(false));}
// 重排前保存完整 raw，不排序位置，不改寫輸入字串。
function capture(){for(const r of rows){r.hex=$(r.id+'-hex').value;r.position=$(r.id+'-position').value;}}
// 依目前有序草稿重建語意色標，維持原值與指定焦點。
function fields(focus){$('stops').replaceChildren();rows.forEach((r,i)=>{const f=node('fieldset'),legend=node('legend',`${m.stop} ${i+1}`);f.append(legend);for(const key of ['hex','position']){const id=r.id+'-'+key,input=node('input',undefined,{id,type:'text','aria-describedby':'status limits',inputmode:key==='position'?'numeric':'text',autocomplete:'off',spellcheck:'false'});input.value=r[key];wire(input);f.append(node('label',m[key],{for:id}),input);}const actions=node('div',undefined,{class:'actions'});for(const action of ['up','down','remove']){const b=node('button',`${m[action]} · ${i+1}`,{type:'button'});b.disabled=action==='up'?i===0:action==='down'?i===rows.length-1:rows.length===2;b.addEventListener('click',()=>{if(b.disabled)return;capture();controller.invalidate();if(action==='remove'){rows.splice(i,1);fields(rows[Math.min(i,rows.length-1)].id+'-hex');}else{const to=i+(action==='up'?-1:1);[rows[i],rows[to]]=[rows[to],rows[i]];fields(r.id+'-hex');}render(controller.state);});actions.append(b);}f.append(actions);$('stops').append(f);});$('stop-count').textContent=`${rows.length} / 8 · ${m.stop}`;$('add').disabled=rows.length===8;if(focus)$(focus)?.focus();}
// 清除確認閉包不可跨生命週期保留，取消則恢復原觸發焦點。
function discard(){pending=null;returnFocus=null;if($('dialog').open)$('dialog').close();}
// 此局部函式集中處理 confirm 的固定狀態轉換。
function confirm(action,trigger){if(!dirty()){action();return;}pending=action;returnFocus=trigger;$('dialog').showModal();$('keep').focus();}
// 此局部函式集中處理 close 的固定狀態轉換。
function close(accept){const action=pending,focus=returnFocus;discard();focus?.focus();if(accept)action?.();}
// 此局部函式集中處理 reset 的固定狀態轉換。
function reset(focus=false){discard();controller.composing=false;controller.invalidate('initial');$('angle').value='90';rows=[{id:'s'+(++serial),hex:'',position:'0'},{id:'s'+(++serial),hex:'',position:'100'}];fields(focus?rows[0].id+'-hex':null);render(controller.state);}
// 初始化錯誤時保留整個工作區 disabled，避免半就緒操作。
try{for(const n of document.querySelectorAll('[data-text]'))n.textContent=m[n.dataset.text];document.title=m.title;$('home').href=en?'https://glossquote.com/en/index.html':'https://glossquote.com/index.html';$('language').href=en?'../index.html':'en/index.html';for(const[q,a]of m.faqs){const d=node('details');d.append(node('summary',q),node('p',a));$('faq').append(d);}for(const sheet of document.styleSheets){if(!sheet.href||new URL(sheet.href).origin!==location.origin)continue;for(const candidate of sheet.cssRules)if(candidate.selectorText==='#gradient-preview')rule=candidate;}if(!rule)throw Error('missing rule');ready=true;reset();wire($('angle'));$('work').disabled=false;
// 依此檔案的固定契約處理下列明列資料，不擴大輸入或檔案範圍。
$('form').addEventListener('submit',event=>{event.preventDefault();if(controller.composing)return;for(const n of document.querySelectorAll('[aria-invalid]'))n.removeAttribute('aria-invalid');const state=controller.generate(raw());if(state.error){const f=state.error.field,match=/^stops\[(\d+)\]\.(hex|position)$/.exec(f),target=f==='angle'?$('angle'):match?$(rows[Number(match[1])].id+'-'+match[2]):$('generate');target.setAttribute('aria-invalid','true');target.focus();}});
// 新增只允許八列以內，先失效舊結果再聚焦新色標。
$('add').addEventListener('click',()=>{if(rows.length>=8)return;capture();controller.invalidate();const r={id:'s'+(++serial),hex:'',position:'100'};rows.push(r);fields(r.id+'-hex');render(controller.state);});
// 清除與取消走原生對話框，取消不改草稿或有效結果。
$('clear').addEventListener('click',()=>confirm(()=>reset(true),$('clear')));$('keep').addEventListener('click',()=>close(false));$('accept').addEventListener('click',()=>close(true));$('dialog').addEventListener('cancel',e=>{e.preventDefault();close(false);});
// 導航只走兩個固定已顯示連結，確認後才清除結果。
for(const id of ['language','home'])$(id).addEventListener('click',e=>{e.preventDefault();confirm(()=>{controller.invalidate();location.assign($(id).href);},$(id));});
// 取出只由明確按鈕事件啟動，臨時下載 anchor 使用固定檔名。
$('copy').addEventListener('click',()=>controller.copy(raw()));$('select').addEventListener('click',()=>{$('css').focus();$('css').select();});$('download').addEventListener('click',()=>controller.download(raw(),(url,name)=>{const a=node('a',undefined,{href:url,download:name});document.body.append(a);try{a.click();}finally{a.remove();}}));
// 隱藏保留草稿但清結果；離頁清資料，返回恢復空白狀態。
document.addEventListener('visibilitychange',()=>{if(document.hidden)controller.invalidate('hidden');});window.addEventListener('pagehide',()=>{discard();controller.invalidate('initial');$('angle').value='';rows=[];$('stops').replaceChildren();});window.addEventListener('pageshow',()=>reset());
// 未預期事件錯誤不回顯 stack 或輸入，立即清掉可取出的結果。
window.addEventListener('error',event=>{event.preventDefault();controller.fail('UNEXPECTED');});window.addEventListener('unhandledrejection',event=>{event.preventDefault();controller.fail('UNEXPECTED');});
// 初始化失敗維持停用並顯示固定雙語錯誤，不洩漏例外內容。
}catch{ready=false;$('work').disabled=true;$('status').textContent='Unable to initialize. Reload to retry.／無法初始化，請重新載入。';}
