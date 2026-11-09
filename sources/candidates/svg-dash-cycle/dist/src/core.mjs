export const DEFAULT_RAW = Object.freeze({length:'100',rows:Object.freeze(['10','5']),offset:'0',solid:false});
export class InputError extends Error { constructor(errors){super('Invalid input');this.errors=errors;} }
const trim = s => s.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g,'');
export function parseInteger(raw,min,max,signed=false){
 if(typeof raw!=='string')return {error:'type'};
 if(raw.length>12)return {error:'length'};
 const s=trim(raw);if(!s)return {error:'empty'};
 if(!(signed?/^-?[0-9]+$/:/^[0-9]+$/).test(s))return {error:'grammar'};
 const n=Number(s);if(!Number.isSafeInteger(n)||n<min||n>max)return {error:'range'};
 return {value:Object.is(n,-0)?0:n};
}
function dataObject(x,keys){return x&&Object.getPrototypeOf(x)===Object.prototype&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k)&&Object.hasOwn(Object.getOwnPropertyDescriptor(x,k),'value'));}
export function validate(raw){
 if(!dataObject(raw,['length','rows','offset','solid'])||typeof raw.solid!=='boolean'||!Array.isArray(raw.rows)||raw.rows.length<1||raw.rows.length>8||Reflect.ownKeys(raw.rows).length!==raw.rows.length+1||!Array.from({length:raw.rows.length},(_,i)=>Object.getOwnPropertyDescriptor(raw.rows,String(i))).every(d=>d&&Object.hasOwn(d,'value')&&typeof d.value==='string')||typeof raw.offset!=='string')throw new InputError({form:'schema'});
 const errors={},read=(key,value,min,max,signed)=>{const r=parseInteger(value,min,max,signed);if(r.error)errors[key]=r.error;return r.value;};
 const length=read('length',raw.length,1,400,false),rows=[],offset=raw.solid?0:read('offset',raw.offset,-1000,1000,true);
 if(!raw.solid)raw.rows.forEach((r,i)=>rows.push(read('row'+i,r,1,100,false)));
 if(Object.keys(errors).length)throw new InputError(Object.fromEntries(Object.entries(errors).sort(([a],[b])=>{const rank=k=>k==='length'?-1:k==='offset'?9:Number(k.slice(3));return rank(a)-rank(b);})));
 return Object.freeze({length,rows:Object.freeze(rows),offset,solid:raw.solid});
}
export function derive(raw){
 const v=validate(raw),pattern=v.solid?[]:(v.rows.length%2?[...v.rows,...v.rows]:[...v.rows]);
 const period=v.solid?null:pattern.reduce((a,b)=>a+b,0),phase=v.solid?null:((v.offset%period)+period)%period,intervals=[];
 if(v.solid)intervals.push([0,v.length]);else{
  let index=0,within=phase;while(within>=pattern[index]){within-=pattern[index++];}
  let x=0,remaining=pattern[index]-within,steps=0;
  while(x<v.length){if(++steps>2*v.length+16||intervals.length>400)throw new Error('WORK_BOUND');const end=Math.min(v.length,x+remaining);if(index%2===0&&end>x)intervals.push([x,end]);x=end;index=(index+1)%pattern.length;remaining=pattern[index];}
 }
 const snippet=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${v.length} 20" role="img" aria-label="${v.solid?'Solid':'Dashed'} line preview">\n  <line x1="0" y1="10" x2="${v.length}" y2="10" fill="none" stroke="#334155" stroke-width="4" stroke-linecap="butt" stroke-dasharray="${v.solid?'none':v.rows.join(' ')}" stroke-dashoffset="${v.offset}" />\n</svg>\n`;
 return Object.freeze({...v,pattern:Object.freeze(pattern),period,phase,intervals:Object.freeze(intervals.map(Object.freeze)),snippet});
}
export function createController(){
 let raw={length:DEFAULT_RAW.length,rows:[...DEFAULT_RAW.rows],offset:DEFAULT_RAW.offset,solid:false},result=derive(raw),errors={},status='generated',language='zh-Hant';
 const view=()=>({raw:{...raw,rows:[...raw.rows]},result,errors:{...errors},status,language});
 const dirty=()=>{result=null;errors={};status='dirty';};
 return {view,edit(key,value){if(key==='rows')raw.rows=[...value];else if(['length','offset','solid'].includes(key))raw[key]=value;else throw new Error('FIELD');dirty();return view();},add(){if(raw.rows.length<8){raw.rows.push('5');dirty();}return view();},remove(i){if(Number.isInteger(i)&&i>=0&&i<raw.rows.length&&raw.rows.length>1){raw.rows.splice(i,1);dirty();}return view();},generate(){try{result=derive(raw);errors={};status='generated';}catch(e){result=null;errors=e instanceof InputError?e.errors:{form:'internal'};status='error';}return view();},reset(){raw={length:'100',rows:['10','5'],offset:'0',solid:false};return this.generate();},language(value){if(!['en','zh-Hant'].includes(value))throw new Error('LANGUAGE');language=value;return view();},reconcile(){if(result&&result.snippet!==derive(raw).snippet)dirty();return view();}};
}
