// Exact rational arithmetic. No DOM, locale, network, or binary float decisions.
const abs=n=>n<0n?-n:n;
function gcd(a,b){a=abs(a);b=abs(b);while(b){[a,b]=[b,a%b];}return a||1n;}
export function rat(n,d=1n){n=BigInt(n);d=BigInt(d);if(!d)throw new RangeError('zero denominator');if(d<0n){n=-n;d=-d;}const g=gcd(n,d);return {n:n/g,d:d/g};}
export const add=(a,b)=>rat(a.n*b.d+b.n*a.d,a.d*b.d);
export const sub=(a,b)=>rat(a.n*b.d-b.n*a.d,a.d*b.d);
export const mul=(a,b)=>rat(a.n*b.n,a.d*b.d);
export const div=(a,b)=>rat(a.n*b.d,a.d*b.n);
export const cmp=(a,b)=>{const d=a.n*b.d-b.n*a.d;return d<0n?-1:d>0n?1:0;};
export function roundedInteger(a,places){const scale=10n**BigInt(places),n=abs(a.n)*scale;const q=n/a.d+(2n*(n%a.d)>=a.d?1n:0n);return a.n<0n?-q:q;}
export function decimal(a,places=8,trim=true){let q=roundedInteger(a,places);const neg=q<0n;q=abs(q);let s=q.toString().padStart(places+1,'0');if(places)s=s.slice(0,-places)+'.'+s.slice(-places);if(trim&&places)s=s.replace(/0+$/,'').replace(/\.$/,'');return (neg?'-':'')+s;}
export const number=a=>Number(a.n)/Number(a.d);
export const defaults=Object.freeze({vmin:'20',vmax:'80',fmin:'1',fmax:'2',root:'16',width:'800'});
export const fields=Object.freeze(['vmin','vmax','fmin','fmax','root','width']);
const bounds={vmin:[6,240],vmax:[6,240],fmin:[.5,10],fmax:[.5,10],root:[8,32],width:[48,7680]};
// All accepted values have at most 4 fractional digits. Text controls preserve invalid raw lexemes.
export function parse(raw){if(typeof raw!=='string')return null;const s=raw.replace(/^[\t\n\v\f\r ]+|[\t\n\v\f\r ]+$/g,'');if(s.length>10||!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/.test(s))return null;const [i,f='']=s.split('.');return rat(BigInt(i+f),10n**BigInt(f.length));}
export function validate(raw){const values={},errors={};for(const k of fields){const x=parse(raw[k]);if(!x){errors[k]='grammar';continue;}const [lo,hi]=bounds[k];if(cmp(x,rat(Math.round(lo*10000),10000))<0||cmp(x,rat(hi))>0){errors[k]='range';continue;}values[k]=x;}if(values.vmin&&values.vmax&&cmp(sub(values.vmax,values.vmin),rat(1,4))<0)errors.vmax='viewportOrder';if(values.fmin&&values.fmax&&cmp(values.fmax,values.fmin)<0)errors.fmax='fontOrder';return {values,errors,valid:!Object.keys(errors).length};}
export function calculate(raw){const check=validate(raw);if(!check.valid)return {...check,result:null};const v=check.values,constant=cmp(v.fmin,v.fmax)===0;const slope=div(sub(v.fmax,v.fmin),sub(v.vmax,v.vmin));const idealA=sub(v.fmin,mul(slope,v.vmin)),idealB=mul(slope,rat(100));const a=rat(roundedInteger(idealA,8),100000000),b=rat(roundedInteger(idealB,8),100000000);const preferred=add(mul(a,v.root),div(mul(b,v.width),rat(100))),min=mul(v.fmin,v.root),max=mul(v.fmax,v.root);const state=constant?'constant':cmp(preferred,min)<=0?'minimum':cmp(preferred,max)>=0?'maximum':'fluid';const size=constant?min:cmp(preferred,min)<0?min:cmp(preferred,max)>0?max:preferred;const css=constant?`font-size: ${decimal(v.fmin)}rem;\n`:`font-size: clamp(${decimal(v.fmin)}rem, calc(${decimal(a)}rem + ${decimal(b)}vw), ${decimal(v.fmax)}rem);\n`;return {...check,result:{css,a,b,idealA,idealB,preferred,size,state,constant,min,max,vminPx:mul(v.vmin,v.root),vmaxPx:mul(v.vmax,v.root)}};}
export function sampleValid(text){return Array.from(text).length<=240;}
