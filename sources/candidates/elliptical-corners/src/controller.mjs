import {defaults,overlap,fields,generate} from './core.mjs';
export function createController({render,focus,clearSelection=()=>{},language='zh-Hant'}){
 let raw={...defaults},model=null,errors=[],status='',lang=language,composing=false;
 const state=()=>({raw:{...raw},model,errors:[...errors],status,lang});
 const emit=()=>render(state());
 const revoke=()=>{model=null;errors=[];status='';clearSelection();};
 const api={state,edit(k,v){if(!fields.includes(k))return;raw[k]=v;revoke();status='dirty';emit();},composition(active){composing=active;if(active){revoke();status='dirty';emit();}},submit(){if(composing)return false;revoke();try{const r=generate(raw);if(!r.ok){errors=r.errors;status='invalid';emit();focus(errors[0].field);return false;}model=r.model;status='generated';emit();return true;}catch{status='internal';emit();return false;}},example(which){raw={...(which==='overlap'?overlap:defaults)};revoke();emit();},reset(){api.example('default');focus('w');},language(){lang=lang==='en'?'zh-Hant':'en';emit();},select(fn){if(!model)return;try{fn();status='selected';}catch{status='manual';}emit();},leave(){raw=Object.fromEntries(fields.map(k=>[k,'']));revoke();emit();},restore(){composing=false;api.example('default');}};emit();return api;
}
