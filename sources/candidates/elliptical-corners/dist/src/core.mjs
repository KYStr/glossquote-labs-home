// 百分之一 CSS px 整數與 BigInt 比例；只在指定樣式與畫面顯示時轉成字串。
export const corners=Object.freeze(['tl','tr','br','bl']);
export const fields=Object.freeze(['w','h',...corners.flatMap(c=>[c+'x',c+'y'])]);
export const defaults=Object.freeze(Object.fromEntries(fields.map(k=>[k,k==='w'?'240':k==='h'?'160':k.endsWith('x')?'24':'16'])));
export const overlap=Object.freeze(Object.fromEntries(fields.map(k=>[k,k==='w'||k==='h'?'100':'80'])));
const gcd=(a,b)=>{while(b)[a,b]=[b,a%b];return a;};
export function rat(n,d=1n){n=BigInt(n);d=BigInt(d);if(d<=0n||n<0n)throw Error('nonnegative rational');const g=gcd(n,d);return Object.freeze({n:n/g,d:d/g});}
export const fraction=r=>r.d===1n?String(r.n):`${r.n}/${r.d}`;
export function fixed(r,digits){const v=r.n*10n**BigInt(digits);let q=v/r.d;if((v%r.d)*2n>=r.d)q++;const s=String(q).padStart(digits+1,'0');return s.slice(0,-digits)+'.'+s.slice(-digits);}
export function canonical(hundredths){const n=String(hundredths).padStart(3,'0');return (n.slice(0,-2)+'.'+n.slice(-2)).replace(/\.?0+$/,'')||'0';}
export function parse(raw){
 if(!raw||typeof raw!=='object'||![null,Object.prototype].includes(Object.getPrototypeOf(raw)))return {ok:false,errors:[{field:'w',code:'schema'}]};
 const ds=Object.getOwnPropertyDescriptors(raw),keys=Reflect.ownKeys(ds);if(keys.length!==fields.length||keys.some(k=>typeof k!=='string'||!fields.includes(k))||fields.some(k=>!ds[k]?.enumerable||!Object.hasOwn(ds[k],'value')))return {ok:false,errors:[{field:'w',code:'schema'}]};
 const errors=[],values={};for(const field of fields){const raw=ds[field].value;let code;if(typeof raw!=='string')code='syntax';else if(raw.length>64)code='length';else{const s=raw.replace(/^[\t-\r ]+|[\t-\r ]+$/g,'');if(!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/.test(s))code='syntax';else{const [a,b='']=s.split('.'),n=BigInt(a)*100n+BigInt(b.padEnd(2,'0'));if(n>64000n||n<(['w','h'].includes(field)?4000n:0n))code='range';else values[field]=n;}}if(code)errors.push({field,code});}
 return errors.length?{ok:false,errors}:{ok:true,values:Object.freeze(values)};
}
export function compute(v){
 const sides=[['top',v.tlx+v.trx,v.w],['right',v.try+v.bry,v.h],['bottom',v.blx+v.brx,v.w],['left',v.tly+v.bly,v.h]];
 let factor=rat(1);for(const[,sum,limit]of sides)if(sum&&limit*factor.d<factor.n*sum)factor=rat(limit,sum);
 const limiting=factor.n===factor.d?[]:sides.filter(([,sum,limit])=>sum&&limit*factor.d===factor.n*sum).map(([side])=>side);
 const pairs=corners.map(c=>Object.freeze({corner:c,x:rat(v[c+'x']*factor.n,100n*factor.d),y:rat(v[c+'y']*factor.n,100n*factor.d),square:v[c+'x']===0n||v[c+'y']===0n}));
 const css=`border-radius: ${corners.map(c=>canonical(v[c+'x'])+'px').join(' ')} / ${corners.map(c=>canonical(v[c+'y'])+'px').join(' ')};\n`;
 return Object.freeze({values:v,factor,limiting:Object.freeze(limiting),pairs:Object.freeze(pairs),css});
}
export function generate(raw){const r=parse(raw);return r.ok?{ok:true,model:compute(r.values)}:r;}
