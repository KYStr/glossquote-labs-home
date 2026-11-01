import {defaults,generate} from './core.mjs'; // 純計算與狀態分離，不持久化 raw。
export function createController({render,focus,clearSelection=()=>{}}){
 let raw={...defaults},model=null,errors=[],status='',composing=false;
 const state=()=>({raw:{...raw},model,errors:[...errors],status});
 const emit=()=>render(state());
 const revoke=message=>{model=null;errors=[];status=message;clearSelection();};
 const api={state,edit(field,value){raw[field]=value;revoke('dirty');emit();},composition(active){composing=active;if(active){revoke('dirty');emit();}},submit(){if(composing)return false;revoke('');try{const r=generate(raw);if(!r.ok){errors=r.errors;status='invalid';emit();focus(errors[0].field);return false;}model=r.model;status='generated';emit();return true;}catch{revoke('internal');emit();return false;}},clear(){raw={sw:'',sh:'',cw:'',ch:'',mode:'cover',p:'',q:''};revoke('');emit();focus('sw');},defaults(){raw={...defaults};revoke('');emit();},hide(){revoke('dirty');emit();},leave(){raw={sw:'',sh:'',cw:'',ch:'',mode:'cover',p:'',q:''};revoke('');emit();},restore(persisted){if(persisted)api.leave();},selection(f){if(!model)return;try{f();status='selected';}catch{status='manual';}emit();}};
 emit();return api;
}
