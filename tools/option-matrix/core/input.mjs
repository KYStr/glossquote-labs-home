// 匯入固定錯誤與不可變快照工具。
import {fail, freeze} from './errors.mjs';
// 僅接受普通資料物件及完全相符的自有資料欄位，不觸發 getter。
function record(value, keys) { if (!value || Object.getPrototypeOf(value) !== Object.prototype) fail('SCHEMA_INVALID'); const ds = Object.getOwnPropertyDescriptors(value); if (Reflect.ownKeys(ds).length !== keys.length || keys.some(k => !ds[k] || !('value' in ds[k]))) fail('SCHEMA_INVALID'); return ds; }
// 陣列不允許洞、額外欄位、符號或 accessor。
function array(value) { if (!Array.isArray(value) || Object.getPrototypeOf(value)!==Array.prototype) fail('SCHEMA_INVALID'); const ds=Object.getOwnPropertyDescriptors(value); if (Reflect.ownKeys(ds).length!==value.length+1) fail('SCHEMA_INVALID'); for(let i=0;i<value.length;i++) if(!ds[i] || !('value' in ds[i])) fail('SCHEMA_INVALID'); }
// Unicode 先拒未配對代理碼；選項來源只暫容許換行分隔。
function unicode(s, separators=false, details={}) { for(let i=0;i<s.length;i++){ const n=s.charCodeAt(i); if(n>=0xd800&&n<=0xdbff){const b=s.charCodeAt(++i);if(!(b>=0xdc00&&b<=0xdfff))fail('INVALID_UNICODE',details);}else if(n>=0xdc00&&n<=0xdfff)fail('INVALID_UNICODE',details);else if((n<32&&!(separators&&(n===10||n===13)))||(n>=127&&n<=159)||n===0x2028||n===0x2029||(n>=0x202a&&n<=0x202e)||(n>=0x2066&&n<=0x2069))fail('CONTROL_NOT_ALLOWED',details); } }
// 僅修剪 ASCII 空格；不做正規化或型別轉換。
const trim = s => s.replace(/^ +| +$/g,'');
// 驗證全部原始資料，再產出位置化 ID 的獨立凍結快照。
export function validateDraft(draft) { const top=record(draft,['dimensions']); const dims=top.dimensions.value; array(dims); if(dims.length<1||dims.length>6)fail('DIMENSION_COUNT',{limit:6}); const names=new Set(),ids=new Set(),columns=[];let bytes=0,rowCount=1;
 // 每維的 descriptor 已先核實，以下讀取不會執行 accessor。
 for(let i=0;i<dims.length;i++){const d=record(dims[i],['id','name','optionsText']);const id=d.id.value,name=d.name.value,raw=d.optionsText.value,pos={dimension:i+1};if(typeof id!=='string'||!/^d[1-6]$/.test(id)||ids.has(id)||typeof name!=='string'||typeof raw!=='string')fail('SCHEMA_INVALID',pos);ids.add(id);if(name.length>128||raw.length>4096)fail('INPUT_LIMIT',pos);unicode(name,false,pos);unicode(raw,true,pos);bytes+=new TextEncoder().encode(name).length+new TextEncoder().encode(raw).length;if(bytes>32768)fail('INPUT_LIMIT',{limit:32768});const label=trim(name);if(!label.trim())fail('NAME_EMPTY',pos);if([...label].length>40)fail('NAME_LIMIT',{...pos,limit:40});if(/^caseid$/i.test(label))fail('NAME_RESERVED',pos);if(names.has(label))fail('NAME_DUPLICATE',pos);names.add(label);const values=raw===''?[]:raw.replace(/\r\n?/g,'\n').split('\n');if(values.at(-1)==='')values.pop();if(values.length<1)fail('OPTION_EMPTY',pos);if(values.length>12)fail('OPTION_LIMIT',{...pos,limit:12});const seen=new Map(),options=[];
 // 每行保存原字面內容，只移除規格允許的 ASCII 邊空格。
 for(let j=0;j<values.length;j++){const v=trim(values[j]),loc={...pos,line:j+1};if(!v.trim())fail('OPTION_EMPTY',loc);if([...v].length>80)fail('OPTION_LIMIT',{...loc,limit:80});if(seen.has(v))fail('OPTION_DUPLICATE',{...loc,otherLine:seen.get(v)});seen.set(v,j+1);options.push(v);}if(rowCount>Math.floor(2000/options.length))fail('COMBINATION_LIMIT',{limit:2000});rowCount*=options.length;columns.push({id:`d${i+1}`,label,options}); }
 // 呼叫者不能修改生成快照以改變尚在執行的任務。
 return freeze({columns,rowCount}); }
