export const FIELDS=Object.freeze(['aNumerator','aDenominator','bNumerator','bDenominator']);
export const OPS=Object.freeze({add:'+',subtract:'-',multiply:'*',divide:'/'});
export const DEFAULT=Object.freeze({aNumerator:'1',aDenominator:'6',operator:'add',bNumerator:'1',bDenominator:'3'});
export function parseField(raw,denominator=false){
 if(typeof raw!=='string')return{error:'type'};
 if(raw.length>18)return{error:'length'};
 const text=raw.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g,'');
 if(!text)return{error:'empty'};
 if(!/^-?[0-9]+$/.test(text))return{error:'grammar'};
 const value=BigInt(text);if(value>1000000000000n||value< -1000000000000n)return{error:'range'};
 if(denominator&&value===0n)return{error:'zeroDenominator'};
 return{value};
}
const abs=n=>n<0n?-n:n;
export function gcd(a,b){a=abs(a);b=abs(b);let i=0;while(b){if(++i>256)throw Error('GCD_GUARD');[a,b]=[b,a%b];}return a;}
export function normalize(n,d){if(d<0n){n=-n;d=-d;}const g=gcd(n,d);return Object.freeze({n:n/g,d:d/g});}
export const fraction=({n,d})=>d===1n?String(n):`${n}/${d}`;
export function mixed({n,d}){const q=abs(n)/d,r=abs(n)%d;if(r===0n)return String(n/d);if(q===0n)return fraction({n,d});const value=`${q} + ${r}/${d}`;return n<0n?`-(${value})`:value;}
export function calculate(input){
 const keys=[...FIELDS,'operator'];if(!input||Object.getPrototypeOf(input)!==Object.prototype||Reflect.ownKeys(input).length!==5||!keys.every(k=>{const d=Object.getOwnPropertyDescriptor(input,k);return d&&'value'in d;})||typeof input.operator!=='string'||!Object.hasOwn(OPS,input.operator))return Object.freeze({errors:Object.freeze({schema:'schema'})});
 const values={},errors={};for(const key of FIELDS){const p=parseField(input[key],key.endsWith('Denominator'));if(p.error)errors[key]=p.error;else values[key]=p.value;}
 if(Object.keys(errors).length)return Object.freeze({errors:Object.freeze(errors)});
 try{const a=normalize(values.aNumerator,values.aDenominator),b=normalize(values.bNumerator,values.bDenominator);if(input.operator==='divide'&&b.n===0n)return Object.freeze({errors:Object.freeze({bNumerator:'zeroDivisor'})});
 let N,D;
 if(input.operator==='add'||input.operator==='subtract'){N=a.n*b.d+(input.operator==='add'?b.n:-b.n)*a.d;D=a.d*b.d;}
 else if(input.operator==='multiply'){N=a.n*b.n;D=a.d*b.d;}else{N=a.n*b.d;D=a.d*b.n;}
 const signNormalized=D<0n;if(signNormalized){N=-N;D=-D;}const G=gcd(N,D),result=Object.freeze({n:N/G,d:D/G});const out={operator:input.operator,a:fraction(a),b:fraction(b),unreduced:`${N}/${D}`,gcd:String(G),result:fraction(result),mixed:mixed(result),signNormalized,numerator:String(result.n),denominator:String(result.d)};
 out.line=`(${out.a}) ${OPS[input.operator]} (${out.b}) = ${out.unreduced}`;out.summary=[['operation',out.operator],['a',out.a],['b',out.b],['unreduced',out.unreduced],['gcd',out.gcd],['result',out.result],['mixed',out.mixed]].map(([k,v])=>`${k}: ${v}\n`).join('');return Object.freeze(out);
 }catch{return Object.freeze({errors:Object.freeze({schema:'internal'})});}
}
export function createController(lang='zh-Hant'){let raw={...DEFAULT},result=calculate(raw),status='success',language=lang;const state=()=>Object.freeze({raw:Object.freeze({...raw}),result,status,language});return Object.freeze({state,edit(key,value){if(!Object.hasOwn(DEFAULT,key))throw Error('Unknown field');raw={...raw,[key]:value};result=null;status='dirty';return state();},calculate(){result=calculate(raw);status=result.errors?'error':'success';return state();},reset(){raw={...DEFAULT};result=calculate(raw);status='success';return state();},language(value){if(!['en','zh-Hant'].includes(value))throw Error('Unknown language');language=value;return state();},reconcile(){if(status==='success'){const expected=calculate(raw);if(expected.errors||expected.summary!==result?.summary){result=null;status='dirty';}}return state();}});}
