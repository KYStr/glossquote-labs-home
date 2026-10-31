// 序列化有界，錯誤不回傳使用者原值。
import {fail,freeze} from './errors.mjs';
// 全形與 ASCII 的試算表前綴同樣阻止 CSV。
const risk=s=>/^[=+\-@＝＋－＠]/u.test(s)||/^[=+\-@＝＋－＠]/u.test(s.trimStart());
// 字串型別以 JSON 為權威；CSV 全格引用仍不是公式防護。
export function serialize(result,guard=()=>{}){guard();const risks=[];result.columns.forEach((c,i)=>{if(risk(c.label))risks.push({column:i+1,line:0});});const seen=new Set();result.rows.forEach(row=>row.values.forEach((v,i)=>{const key=JSON.stringify([i,v]);if(risk(v)&&!seen.has(key)){seen.add(key);risks.push({column:i+1});}}));const json=JSON.stringify(result,null,2)+'\n';guard();const encoder=new TextEncoder();if(encoder.encode(json).length>2097152)fail('OUTPUT_LIMIT',{limit:2097152});let csv=null;if(!risks.length){const quote=s=>'"'+s.replaceAll('"','""')+'"';const lines=[['caseId',...result.columns.map(c=>c.label)],...result.rows.map(r=>[r.caseId,...r.values])];const chunks=[];let size=0;for(const row of lines){guard();const line=row.map(quote).join(',')+'\r\n';size+=encoder.encode(line).length;if(size>2097152)fail('OUTPUT_LIMIT',{limit:2097152});chunks.push(line);}csv=chunks.join('');}guard();return freeze({json,csv,risks});}
