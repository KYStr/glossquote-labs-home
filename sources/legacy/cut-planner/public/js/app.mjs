import { createSession } from './session.mjs';
import { messages } from './i18n.mjs';
import { createRow, renderPlan } from './render.mjs';

export function initialize() {
  const language=document.documentElement.lang, m=messages[language];
  if(!m)throw Error('unsupported language');
  const byId=id=>document.getElementById(id);
  const form=byId('cut-form'),rowsHost=byId('rows'),status=byId('status'),results=byId('plan'),report=byId('report-text'),reportBox=byId('report-box');
  const copy=byId('copy'),download=byId('download'),summary=byId('error-summary'),dialog=byId('confirm-dialog');
  let serial=1,lastRendered=null,pendingAction=null,returnFocus=null;
  const session=createSession(language,{
    writeClipboard(text){if(!navigator.clipboard?.writeText)throw Error('unavailable');return navigator.clipboard.writeText(text);},
    makeBlob:(parts,options)=>new Blob(parts,options),createUrl:blob=>URL.createObjectURL(blob),revokeUrl:url=>URL.revokeObjectURL(url),
    setTimer:(fn,ms)=>setTimeout(fn,ms),clearTimer:id=>clearTimeout(id),
    download(url,filename){const a=document.createElement('a');a.href=url;a.download=filename;a.hidden=true;document.body.append(a);a.click();a.remove();}
  }, state=>{
    status.textContent=m.statuses[state.status];
    copy.disabled=!state.report||state.copyBusy;download.disabled=!state.report;
    copy.setAttribute('aria-busy',String(state.copyBusy));
    if(state.result!==lastRendered){lastRendered=state.result;if(state.result)renderPlan(results,state.result,m);else results.replaceChildren();}
    byId('result-content').hidden=!state.result;byId('empty-result').hidden=!!state.result;
    report.value=state.report?.text??'';reportBox.hidden=!state.report;
    if(state.status==='copy-denied'||state.status==='download-failed')reportBox.open=true;
  });
  const rowNodes=()=>[...rowsHost.querySelectorAll('.demand-row')];
  function updateRows(){
    const rows=rowNodes();let pieces=0,valid=true;
    rows.forEach((node,i)=>{
      node.querySelector('legend').textContent=m.row(i+1);
      const remove=node.querySelector('[data-remove-row]');remove.textContent=m.remove(i+1);remove.disabled=rows.length===1;
      const q=node.querySelector('[data-key="quantityRaw"]').value;
      if(!/^[0-9]{1,12}$/.test(q)||BigInt(q)>200n)valid=false;else pieces+=Number(q);
    });
    byId('row-count').textContent=m.counts(rows.length,valid?pieces:'—');byId('add-row').disabled=rows.length>=40;
  }
  function clearErrors(){summary.hidden=true;summary.textContent='';for(const node of form.querySelectorAll('[aria-invalid]'))node.removeAttribute('aria-invalid');for(const node of form.querySelectorAll('.field-error'))node.textContent='';}
  function resetForm(){
    byId('stock-length').value='';byId('end-trim').value='0';byId('kerf').value='0';serial=1;rowsHost.replaceChildren(createRow('r1',m));reportBox.open=false;clearErrors();updateRows();
  }
  function reset(){session.reset();resetForm();}
  function dirty(){
    const s=session.state(),rows=rowNodes();
    if(s.result||s.copyBusy||s.liveDownloads)return true;
    if(byId('stock-length').value!==''||byId('end-trim').value!=='0'||byId('kerf').value!=='0'||rows.length!==1)return true;
    return [...rows[0].querySelectorAll('input')].some(node=>node.value!==(node.dataset.key==='quantityRaw'?'1':''));
  }
  function confirmAction(kind,action){
    if(!dirty()){action();return;}
    returnFocus=document.activeElement;pendingAction=action;
    byId('confirm-title').textContent=kind==='language'?m.languageTitle:m.clearTitle;byId('confirm-description').textContent=m.confirmText;
    byId('confirm-accept').textContent=kind==='language'?m.confirmLanguage:m.confirmClear;
    dialog.showModal();byId('confirm-cancel').focus();
  }
  function closeDialog(){pendingAction=null;dialog.close();returnFocus?.focus();returnFocus=null;}
  byId('confirm-cancel').addEventListener('click',closeDialog);
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
  byId('confirm-accept').addEventListener('click',()=>{const action=pendingAction;pendingAction=null;dialog.close();action?.();returnFocus?.focus();returnFocus=null;});
  byId('language-link').addEventListener('click',event=>{event.preventDefault();const target=event.currentTarget.href;confirmAction('language',()=>{reset();window.location.assign(target);});});
  byId('clear').addEventListener('click',()=>confirmAction('clear',reset));
  byId('add-row').addEventListener('click',()=>{
    if(rowNodes().length>=40)return;session.edit();clearErrors();const row=createRow(`r${++serial}`,m);rowsHost.append(row);updateRows();row.querySelector('input').focus();
  });
  rowsHost.addEventListener('click',event=>{
    const button=event.target.closest('[data-remove-row]');if(!button||rowNodes().length<=1)return;
    const nodes=rowNodes(),node=button.closest('.demand-row'),index=nodes.indexOf(node);session.edit();clearErrors();node.remove();updateRows();rowNodes()[Math.min(index,rowNodes().length-1)].querySelector('input').focus();
  });
  form.addEventListener('input',()=>{session.edit();clearErrors();updateRows();});
  function readRequest(){return {stockLengthRaw:byId('stock-length').value,endTrimRaw:byId('end-trim').value,kerfRaw:byId('kerf').value,rows:rowNodes().map(node=>({id:node.dataset.rowId,...Object.fromEntries([...node.querySelectorAll('input')].map(input=>[input.dataset.key,input.value]))}))};}
  function showError(error){
    const message=m.errors[error.code]??m.statuses['report-error'];summary.textContent=`${m.errorHeading}: ${message}`;summary.hidden=false;
    const rootFields={'request.stockLengthRaw':'stock-length','request.endTrimRaw':'end-trim','request.kerfRaw':'kerf',usableLength:'end-trim'};
    let control=byId(rootFields[error.field]);const match=/^rows\.([0-9]+)\.(nameRaw|lengthRaw|quantityRaw)$/.exec(error.field);
    if(match)control=rowNodes()[Number(match[1])]?.querySelector(`[data-key="${match[2]}"]`);
    if(control){control.setAttribute('aria-invalid','true');byId(`${control.id}-error`).textContent=message;control.focus();}else summary.focus();
  }
  form.addEventListener('submit',event=>{event.preventDefault();clearErrors();const calculation=session.calculate(readRequest());if(!calculation.ok)showError(calculation.error);});
  copy.addEventListener('click',()=>{void session.copy();});download.addEventListener('click',()=>session.download());
  byId('select-report').addEventListener('click',()=>{report.focus();report.select();status.textContent=m.select;});
  window.addEventListener('pagehide',()=>{session.pagehide();if(dialog.open)closeDialog();resetForm();});
  window.addEventListener('pageshow',event=>{if(event.persisted){session.restore();resetForm();}});
  resetForm();session.reset();
  // All handlers and schema modules are ready before enabling work controls.
  byId('work-fields').disabled=false;
  for(const id of ['calculate','clear','add-row','confirm-cancel','confirm-accept','select-report'])byId(id).disabled=false;
  updateRows();
}
