// 列舉只依合法快照與控制回呼，完全不接 DOM。
import {freeze} from './errors.mjs';
// 第一維最慢、最後一維最快；每128列讓出一次工作。
export async function enumerate(snapshot,{guard=()=>{},yieldTask=()=>new Promise(r=>setTimeout(r,0)),progress=()=>{}}={}){const rows=[],indices=snapshot.columns.map(()=>0);for(let n=0;n<snapshot.rowCount;n++){guard();rows.push({caseId:`C${String(n+1).padStart(4,'0')}`,values:snapshot.columns.map((c,i)=>c.options[indices[i]])});for(let k=indices.length-1;k>=0;k--){indices[k]++;if(indices[k]<snapshot.columns[k].options.length)break;indices[k]=0;}if((n+1)%128===0){guard();progress(n+1);await yieldTask();guard();}}guard();return freeze({schemaVersion:1,tool:'option-matrix',columns:snapshot.columns.map(c=>({id:c.id,label:c.label})),rows});}
