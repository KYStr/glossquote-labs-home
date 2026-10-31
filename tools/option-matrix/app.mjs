// 純核心與畫面分離，所有使用者字串只寫 textContent 或 value。
import {validateDraft} from './core/input.mjs';
// 生命週期由單一 session 管理，畫面不重新實作列舉。
import {Session} from './core/session.mjs';
// 單下載租期獨立於結果有效期。
import {DownloadLease} from './download.mjs';
// 共用雙語詞典保證錯碼與操作對等。
import {messages,errors} from './i18n.mjs';
// 只由靜態文件 lang 決定語言，不把輸入放進 URL。
const english=document.documentElement.lang==='en',m=messages[english?'en':'zh'],$=id=>document.getElementById(id);
// 頁面僅持有一份草稿；初始兩個空維度。
let draft=[],page=0,confirmAction=null,returnFocus=null,composeDepth=0;
// 建立 DOM 時統一使用字面文字與屬性。
function el(tag,text,attrs={}){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;}
// 對輸入值的任何變動先撤銷舊結果。
const session=new Session({onChange:renderResult});
// 租期到期只能刷新目前狀態按鈕，不能恢復舊結果。
const lease=new DownloadLease({changed:()=>downloadState()});
// 靜態文案從同鍵字典取得。
for(const node of document.querySelectorAll('[data-text]'))node.textContent=m[node.dataset.text];
// 同語首頁依相對位置固定，導航前仍要確認草稿。
$('home').href=english?'https://glossquote.com/en/index.html':'https://glossquote.com/index.html';$('language').href=english?'../index.html':'en/index.html';
// 結構快照只包含規格允許的欄位。
const snapshot=()=>({dimensions:draft.map(d=>({...d}))});
// 任何非空原字串都視為草稿，不默默丟棄空白輸入。
const dirty=()=>draft.some(d=>d.name!==''||d.optionsText!=='')||!!session.state.result;
// 錯誤只顯示詞典文字與數字位置，不回顯原值。
function errorText(e){const a=errors[e.code]||errors.EXPORT_FAILED;return `${a[english?1:0]} (${e.code}) ${Object.entries(e.details||{}).map(([k,v])=>`${k}: ${v}`).join(', ')}`;}
// 即時驗證只計數，不建立結果或檔案。
function validate(){for(const n of document.querySelectorAll('[aria-invalid]'))n.removeAttribute('aria-invalid');try{const s=validateDraft(snapshot());$('validation').textContent=`${m.count}: ${s.rowCount} · ${s.columns.map(c=>`${c.label}: ${c.options.length}`).join(' / ')}`;$('generate').disabled=composeDepth>0||session.state.phase==='generating';}catch(e){$('validation').textContent=`${m.invalid}: ${errorText(e)}`;$('generate').disabled=true;const d=draft[e.details?.dimension-1];if(d){$(d.id+'-name').setAttribute('aria-invalid','true');$(d.id+'-options').setAttribute('aria-invalid','true');}}}
// 輸入處理不重建欄位，避免丟失游標和組字內容。
function changed(d,key,value){session.invalidate();page=0;d[key]=value;validate();}
// 每個維度用原生 fieldset/legend；端點排序鈕以 aria-disabled 與事件 guard 停用，保持同鈕焦點。
function fields(focusId){$('fields').replaceChildren();draft.forEach((d,i)=>{const f=el('fieldset'),legend=el('legend',`${m.dimension} ${i+1}`);f.append(legend);for(const[key,label,tag]of [['name',m.name,'input'],['optionsText',m.options,'textarea']]){const id=d.id+(key==='name'?'-name':'-options'),input=el(tag,undefined,{id,'aria-describedby':'validation limits',...(tag==='textarea'?{rows:'4'}:{type:'text'})});input.value=d[key];input.addEventListener('input',()=>changed(d,key,input.value));input.addEventListener('change',()=>changed(d,key,input.value));input.addEventListener('compositionstart',()=>{composeDepth++;session.composition(true);validate();});input.addEventListener('compositionend',()=>{composeDepth=Math.max(0,composeDepth-1);session.composition(composeDepth>0);d[key]=input.value;validate();});f.append(el('label',label,{for:id}),input);}const actions=el('div',undefined,{class:'row'});for(const[action,label]of [['up',m.up],['down',m.down],['remove',m.remove]]){const b=el('button',label,{type:'button',id:d.id+'-'+action});const boundary=(action==='up'&&i===0)||(action==='down'&&i===draft.length-1);b.disabled=action==='remove'&&draft.length===1;if(action!=='remove')b.setAttribute('aria-disabled',String(boundary));b.addEventListener('click',()=>{if(b.getAttribute('aria-disabled')==='true')return;const perform=()=>{session.invalidate();page=0;if(action==='remove'){draft.splice(draft.indexOf(d),1);fields(draft[Math.min(i,draft.length-1)].id+'-name');}else{const at=draft.indexOf(d),to=at+(action==='up'?-1:1);[draft[at],draft[to]]=[draft[to],draft[at]];fields(d.id+'-'+action);}validate();};if(action==='remove'&&(d.name||d.optionsText))confirm(m.remove,perform,b);else perform();});actions.append(b);}f.append(actions);$('fields').append(f);});$('add').disabled=draft.length===6;if(focusId){const n=$(focusId);if(n?.disabled)$(focusId.replace(/-(up|down)$/,'-name'))?.focus();else n?.focus();}}
// 原生 modal 包住焦點；預設放在保留資料，取消不動任何狀態。
function confirm(label,action,trigger){confirmAction=action;returnFocus=trigger;$('confirm-title').textContent=label;$('dialog').showModal();$('keep').focus();}
// 關閉確認時先復原焦點，僅明確接受才執行動作。
function closeConfirm(accepted){const action=confirmAction,focus=returnFocus;confirmAction=null;returnFocus=null;$('dialog').close();focus?.focus();if(accepted)action?.();}
// Escape 與取消按鈕走同一無副作用路徑。
$('dialog').addEventListener('cancel',e=>{e.preventDefault();closeConfirm(false);});$('keep').onclick=()=>closeConfirm(false);$('accept').onclick=()=>closeConfirm(true);
// 生命週期重設丟棄舊確認動作與舊節點焦點，不執行或復原離頁前的回呼。
function discardConfirm(){confirmAction=null;returnFocus=null;if($('dialog').open)$('dialog').close();}
// 完整清除只作用頁內資料及自己的下載租期。
function reset(example=false){discardConfirm();composeDepth=0;session.composition(false);lease.clear();draft=example?[{id:'d1',name:english?'Login':'登入',optionsText:english?'Guest\nMember':'訪客\n會員'},{id:'d2',name:english?'Language':'語言',optionsText:'繁中\nEnglish'}]:[{id:'d1',name:'',optionsText:''},{id:'d2',name:'',optionsText:''}];page=0;fields('d1-name');validate();}
// 只有不存在於草稿的最小 ID 才能分配。
$('add').onclick=()=>{if(draft.length===6)return;session.invalidate();const id=Array.from({length:6},(_,i)=>`d${i+1}`).find(id=>!draft.some(d=>d.id===id));draft.push({id,name:'',optionsText:''});fields(id+'-name');validate();};
// 重複生成由 disabled 與 session token 共同防護。
$('generate').onclick=()=>{if(session.state.phase==='generating'||composeDepth)return;page=0;session.generate(snapshot());};$('cancel').onclick=()=>{session.cancel();validate();};
// 所有破壞性動作先處理取消語意，不能把確認當成輸入變更。
for(const[id,example]of [['clear',false],['example',true]])$(id).onclick=()=>{const action=()=>reset(example);if(dirty())confirm(m[id],action,$(id));else action();};
// 頁內語言及主頁導航先確認；不安裝 beforeunload。
for(const id of ['home','language'])$(id).onclick=e=>{if(!dirty())return;e.preventDefault();const url=$(id).href;confirm(m[id],()=>{session.invalidate();lease.clear();location.assign(url);},$(id));};
// 分頁從同一凍結結果取最多50列，不重新生成。
function table(){const r=session.state.result;$('table').replaceChildren();if(!r)return;const pages=Math.ceil(r.rows.length/50);page=Math.max(0,Math.min(page,pages-1));const head=el('thead'),tr=el('tr');for(const label of ['caseId',...r.columns.map(c=>c.label)])tr.append(el('th',label,{scope:'col'}));head.append(tr);const body=el('tbody');for(const row of r.rows.slice(page*50,(page+1)*50)){const tr=el('tr');tr.append(el('th',row.caseId,{scope:'row'}));row.values.forEach(v=>tr.append(el('td',v)));body.append(tr);}$('table').append(el('caption',m.result),head,body);$('page').textContent=`${m.page} ${page+1} / ${pages}`;$('prev').disabled=page===0;$('next').disabled=page===pages-1;}
// 前後頁在端點停住，不循環。
$('prev').onclick=()=>{page--;table();};$('next').onclick=()=>{page++;table();};
// 下載按鈕只能引用當前有效輸出與空租期。
function downloadState(){if(!$('json'))return;const f=session.state.files,busy=!!lease.lease;$('json').disabled=!f||busy||!lease.supported();$('csv').disabled=!f||f.csv===null||busy||!lease.supported();$('download-status').textContent=busy?m.busy:!lease.supported()?m.unsupported:'';}
// 結果清除時同時清除表格與 JSON 的 DOM 引用。
function renderResult(){const s=session.state;$('status').textContent=s.phase==='ready'?m.ready:s.phase==='generating'?`${m.generating}: ${s.progress} / ${s.total}`:s.error?errorText(s.error):m.empty;$('output').hidden=s.phase!=='ready';$('cancel').disabled=s.phase!=='generating';$('json-preview').value=s.files?.json||'';$('risk').textContent=s.files?.risks.length?`${m.csvRisk}: ${s.files.risks.length}; ${s.files.risks.map(x=>x.column).join(', ')}`:'';table();downloadState();if(draft.length)validate();}
// 瀏覽器下載失敗只顯示固定代碼，不聲稱 OS 已儲存。
for(const kind of ['json','csv'])$(kind).onclick=()=>{const data=session.state.files?.[kind];if(data==null)return;const result=lease.start(data,kind,(url,name)=>{const a=el('a',undefined,{href:url,download:name});document.body.append(a);try{a.click();}finally{a.remove();}});if(!result.ok)$('download-status').textContent=errorText(result);};
// 背景只取消進行中的工作；完成結果與草稿可以保留。
document.addEventListener('visibilitychange',()=>{if(document.hidden&&session.state.phase==='generating'){session.cancel();validate();}});
// 離頁及 BFCache 返回清除資料，不能復活舊下載或結果。
window.addEventListener('pagehide',()=>{discardConfirm();session.invalidate();lease.clear();draft=[];$('fields').replaceChildren();});window.addEventListener('pageshow',e=>{if(e.persisted)reset();});
// 初次載入保持兩空欄，不自動生成範例或下載。
reset();
