export const BASES = Object.freeze([2,8,10,16]);
export const WIDTHS = Object.freeze([8,16,32,64]);
export const DEFAULT = Object.freeze({raw:'-1',base:10,width:8,signedness:'signed'});
export function closedRecord(value, keys) {
  if (!value || Object.getPrototypeOf(value)!==Object.prototype) return false;
  const own=Reflect.ownKeys(value);
  return own.length===keys.length && keys.every(k=>{const d=Object.getOwnPropertyDescriptor(value,k);return d && 'value' in d;});
}
export function parseRaw(raw, base) {
  if(typeof raw!=='string') return {error:'type'};
  if(raw.length>80) return {error:'length'};
  const text=raw.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g,'');
  if(!text) return {error:'empty'};
  const patterns={2:/^-?[01]+$/,8:/^-?[0-7]+$/,10:/^-?[0-9]+$/,16:/^-?[0-9a-fA-F]+$/};
  if(!BASES.includes(base)||!patterns[base].test(text)) return {error:'grammar'};
  const minus=text[0]==='-';let n=0n;
  for(const char of text.slice(minus?1:0).toLowerCase()) n=n*BigInt(base)+BigInt('0123456789abcdef'.indexOf(char));
  return {value:minus?-n:n};
}
export function inspect(input) {
  if(!closedRecord(input,['raw','base','width','signedness'])||!BASES.includes(input.base)||!WIDTHS.includes(input.width)||!['signed','unsigned'].includes(input.signedness))return Object.freeze({error:'schema'});
  const parsed=parseRaw(input.raw,input.base);if(parsed.error)return Object.freeze(parsed);
  const n=parsed.value,w=input.width,M=2n**BigInt(w),half=M/2n;
  const min=input.signedness==='signed'?-half:0n,max=input.signedness==='signed'?half-1n:M-1n;
  if(n<min||n>max)return Object.freeze({error:'range',min:String(min),max:String(max)});
  const u=n<0n?M+n:n,s=u>=half?u-M:u,bits=u.toString(2).padStart(w,'0');
  const bytes=u.toString(16).toUpperCase().padStart(w/4,'0').match(/../g).join(' ');
  const rows=Object.freeze(Array.from({length:w},(_,j)=>{const index=w-1-j,weight=2n**BigInt(index);return Object.freeze({index,bit:bits[j],unsignedWeight:String(weight),signedWeight:String(index===w-1?-weight:weight)});}));
  const result={width:w,inputMode:input.signedness,decimal:String(n),binary:n.toString(2),octal:n.toString(8),hex:n.toString(16),bits,bytes,asSigned:String(s),asUnsigned:String(u),min:String(min),max:String(max),rows};
  result.summary=[['width',w],['input-mode',result.inputMode],['decimal',result.decimal],['binary',result.binary],['octal',result.octal],['hex',result.hex],['bits',bits],['bytes-msb-first',bytes],['as-signed',result.asSigned],['as-unsigned',result.asUnsigned]].map(([k,v])=>`${k}: ${v}\n`).join('');
  return Object.freeze(result);
}
export function createController(lang='zh-Hant') {
  let raw={...DEFAULT},result=inspect(raw),status='success',language=lang;
  const state=()=>Object.freeze({raw:Object.freeze({...raw}),result,status,language});
  return Object.freeze({state,edit(key,value){if(!Object.hasOwn(DEFAULT,key))throw Error('Unknown field');raw={...raw,[key]:value};result=null;status='dirty';return state();},inspect(){result=inspect(raw);status=result.error?'error':'success';return state();},reset(){raw={...DEFAULT};result=inspect(raw);status='success';return state();},language(value){if(!['zh-Hant','en'].includes(value))throw Error('Unknown language');language=value;return state();},reconcile(){if(status==='success'){const expected=inspect(raw);if(expected.error||expected.summary!==result?.summary){result=null;status='dirty';}}return state();}});
}
