export const RATES=Object.freeze([24,25,30,50,60]);
export const DEFAULT=Object.freeze({rate:25,mode:'timecode',timecodeRaw:'00:01:00:00',framesRaw:'1500',offsetRaw:'0'});
export const trimASCII=s=>s.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g,'');
export function rawToken(raw,field){if(typeof raw!=='string')return{field,code:'type'};if(raw.length>16)return{field,code:'length'};const value=trimASCII(raw);return value?{value}:{field,code:'empty'};}
export function formatTimecode(index,rate){const whole=Math.floor(index/rate);return[Math.floor(whole/3600),Math.floor(whole/60)%60,whole%60,index%rate].map(n=>String(n).padStart(2,'0')).join(':');}
export function exactSeconds(index,rate){let a=index,b=rate;while(b)[a,b]=[b,a%b];return rate/a===1?String(index/a):`${index/a}/${rate/a}`;}
export function calculate(input){
 const keys=Object.keys(DEFAULT);if(!input||Object.getPrototypeOf(input)!==Object.prototype||Reflect.ownKeys(input).length!==keys.length||!keys.every(k=>{const d=Object.getOwnPropertyDescriptor(input,k);return d&&'value'in d;})||!RATES.includes(input.rate)||!['timecode','frames'].includes(input.mode)||!['timecodeRaw','framesRaw','offsetRaw'].every(k=>typeof input[k]==='string'))return Object.freeze({errors:Object.freeze({schema:'schema'})});
 const field=input.mode==='timecode'?'timecodeRaw':'framesRaw',errors={},source=rawToken(input[field],field),offset=rawToken(input.offsetRaw,'offsetRaw'),day=86400*input.rate;let N,O;
 if(source.code)errors[field]=source.code;
 else if(input.mode==='timecode'){
  if(!/^[0-9]{2}:[0-9]{2}:[0-9]{2}:[0-9]{2}$/.test(source.value))errors[field]='timeGrammar';
  else{const[h,m,s,f]=source.value.split(':').map(Number);if(h>23||m>59||s>59||f>=input.rate)errors[field]='timeRange';else N=((h*60+m)*60+s)*input.rate+f;}
 }else if(!/^[0-9]+$/.test(source.value))errors[field]='frameGrammar';else{N=Number(source.value);if(!Number.isSafeInteger(N)||N>=day)errors[field]='frameRange';}
 if(offset.code)errors.offsetRaw=offset.code;
 else if(!/^-?[0-9]+$/.test(offset.value))errors.offsetRaw='offsetGrammar';else{O=Number(offset.value);if(!Number.isSafeInteger(O)||Math.abs(O)>day)errors.offsetRaw='offsetRange';if(Object.is(O,-0))O=0;}
 if(Object.keys(errors).length)return Object.freeze({errors:Object.freeze(errors)});
 const R=N+O;if(R<0||R>=day)return Object.freeze({errors:Object.freeze({offsetRaw:R<0?'underflow':'overflow'})});
 const out={rate:input.rate,sourceIndex:N,sourceTimecode:formatTimecode(N,input.rate),offset:O,resultIndex:R,resultTimecode:formatTimecode(R,input.rate),sourceSeconds:exactSeconds(N,input.rate),resultSeconds:exactSeconds(R,input.rate)};
 out.summary=[['rate-fps',out.rate],['source-index',N],['source-timecode',out.sourceTimecode],['offset-frames',O],['result-index',R],['result-timecode',out.resultTimecode],['source-seconds',out.sourceSeconds],['result-seconds',out.resultSeconds]].map(([k,v])=>`${k}: ${v}\n`).join('');return Object.freeze(out);
}
export function createController(lang='zh-Hant'){let raw={...DEFAULT},result=calculate(raw),status='success',language=lang;const state=()=>Object.freeze({raw:Object.freeze({...raw}),result,status,language});return Object.freeze({state,edit(key,value){if(!Object.hasOwn(DEFAULT,key))throw Error('Unknown field');raw={...raw,[key]:value};result=null;status='dirty';return state();},calculate(){result=calculate(raw);status=result.errors?'error':'success';return state();},reset(){raw={...DEFAULT};result=calculate(raw);status='success';return state();},language(value){if(!['en','zh-Hant'].includes(value))throw Error('Unknown language');language=value;return state();},reconcile(){if(status==='success'){const expected=calculate(raw);if(expected.errors||expected.summary!==result?.summary){result=null;status='dirty';}}return state();}});}
