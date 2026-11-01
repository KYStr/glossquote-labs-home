// Exact signed rational primitives; the flex model never rounds intermediate values.
const abs=n=>n<0n?-n:n;
const gcd=(a,b)=>{a=abs(a);b=abs(b);while(b)[a,b]=[b,a%b];return a;};
export function q(n,d=1n){n=BigInt(n);d=BigInt(d);if(!d)throw Error('zero denominator');if(d<0n){n=-n;d=-d;}const g=gcd(n,d);return Object.freeze({n:n/g,d:d/g});}
export const add=(a,b)=>q(a.n*b.d+b.n*a.d,a.d*b.d);
export const sub=(a,b)=>q(a.n*b.d-b.n*a.d,a.d*b.d);
export const mul=(a,b)=>q(a.n*b.n,a.d*b.d);
export const div=(a,b)=>q(a.n*b.d,a.d*b.n);
export const cmp=(a,b)=>{const n=a.n*b.d-b.n*a.d;return n<0n?-1:n>0n?1:0;};
export const absolute=a=>q(abs(a.n),a.d);
export const max=(...xs)=>xs.reduce((a,b)=>cmp(a,b)>=0?a:b);
export const sum=xs=>xs.reduce(add,q(0));
export const fraction=a=>a.d===1n?String(a.n):a.n+'/'+a.d;
export function fixed(a){const v=abs(a.n)*100n;let n=v/a.d;if((v%a.d)*2n>=a.d)n++;const s=String(n).padStart(3,'0');return (a.n<0n&&n?'-':'')+s.slice(0,-2)+'.'+s.slice(-2);}
export const itemDefault=()=>({b:'100',s:'1',m:'0'});
export const defaults=()=>({c:'240',items:Array.from({length:3},itemDefault)});
export const canonical=h=>{const s=String(h).padStart(3,'0');return (s.slice(0,-2)+'.'+s.slice(-2)).replace(/\.?0+$/,'');};
function closed(v,keys){if(!v||typeof v!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(v)))return false;const d=Object.getOwnPropertyDescriptors(v);return Reflect.ownKeys(d).length===keys.length&&keys.every(k=>d[k]?.enumerable&&Object.hasOwn(d[k],'value'));}
export function parse(raw){
 if(!closed(raw,['c','items'])||!Array.isArray(raw.items)||raw.items.length<3||raw.items.length>6||Array.from({length:raw.items.length},(_,i)=>Object.getOwnPropertyDescriptor(raw.items,String(i))).some(d=>!d||!Object.hasOwn(d,'value'))||raw.items.some(x=>!closed(x,['b','s','m'])))return {ok:false,errors:[{id:'count',code:'schema'}]};
 const errors=[],number=(s,id,lo,hi)=>{let code,n;if(typeof s!=='string')code='syntax';else if(s.length>64)code='length';else{const v=s.replace(/^[\t-\r ]+|[\t-\r ]+$/g,'');if(!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/.test(v))code='syntax';else{const[a,b='']=v.split('.');n=BigInt(a)*100n+BigInt(b.padEnd(2,'0'));if(n<lo||n>hi)code='range';}}if(code){errors.push({id,code});return null;}return n;};
 const c=number(raw.c,'c',4000n,120000n),items=raw.items.map((v,i)=>({b:number(v.b,'b'+i,0n,120000n),s:number(v.s,'s'+i,0n,400n),m:number(v.m,'m'+i,0n,120000n)}));return errors.length?{ok:false,errors}:{ok:true,value:{c,items}};
}
const deepFreeze=v=>{if(v&&typeof v==='object'){for(const x of Object.values(v))deepFreeze(x);Object.freeze(v);}return v;};
export function css(value){return `.flex-demo {\n  display: flex;\n  flex-flow: row nowrap;\n  writing-mode: horizontal-tb;\n  direction: ltr;\n  justify-content: flex-start;\n  align-items: flex-start;\n  box-sizing: content-box;\n  width: ${canonical(value.c)}px;\n  margin: 0;\n  padding: 0;\n  border: 0;\n  gap: 0;\n}\n.flex-demo > .item {\n  box-sizing: content-box;\n  height: 32px;\n  margin: 0;\n  padding: 0;\n  border: 0;\n  max-width: none;\n}\n`+value.items.map((x,i)=>`.flex-demo > .item:nth-child(${i+1}) { flex: 0 ${canonical(x.s)} ${canonical(x.b)}px; min-width: ${canonical(x.m)}px; }\n`).join('');}
export function compute(value){
 const C=q(value.c,100),items=value.items.map((x,i)=>({id:i+1,B:q(x.b,100),S:q(x.s,100),M:q(x.m,100)}));
 const H=items.map(x=>max(x.B,x.M)),noGrowth=cmp(sum(H),C)<0,rounds=[];
 const reasons=items.map((x,i)=>noGrowth?'grow-zero':!x.S.n&&cmp(x.B,H[i])<0?'both':!x.S.n?'zero-shrink':cmp(x.B,H[i])<0?'minimum-above-basis':'active');
 const frozen=reasons.map(x=>x!=='active'),targets=items.map((x,i)=>frozen[i]?H[i]:x.B),F0=sub(C,sum(targets));
 for(let round=0;frozen.some(x=>!x);round++){
  if(round>=items.length)throw Error('round cap');const active=items.map((x,i)=>i).filter(i=>!frozen[i]);
  const R=sub(C,sum(items.map((x,i)=>frozen[i]?targets[i]:x.B))),A=sum(active.map(i=>items[i].S)),D=sum(active.map(i=>mul(items[i].S,items[i].B)));
  const partial=mul(F0,A),Rstar=cmp(A,q(1))<0&&cmp(absolute(partial),absolute(R))<0?partial:R;
  const tentative=active.map(i=>!D.n?q(0):!Rstar.n?items[i].B:sub(items[i].B,div(mul(absolute(Rstar),mul(items[i].S,items[i].B)),D)));
  const limited=active.map((i,j)=>max(tentative[j],items[i].M,q(0))),V=sum(limited.map((x,j)=>sub(x,tentative[j])));if(V.n<0n)throw Error('negative violation');
  const newly=active.filter((i,j)=>!D.n||!V.n||cmp(limited[j],tentative[j])>0);if(!newly.length)throw Error('no progress');
  active.forEach((i,j)=>targets[i]=limited[j]);newly.forEach(i=>frozen[i]=true);
  rounds.push({active:active.map(i=>i+1),R,A,D,Rstar,tentative,limited,newly:newly.map(i=>i+1),zeroWeight:!D.n});
 }
 if(targets.some((x,i)=>cmp(x,items[i].M)<0||x.n<0n))throw Error('target invariant');
 const residual=sub(C,sum(targets));return deepFreeze({value,items,H,reasons,branch:noGrowth?'no-growth':'shrink',F0,rounds,targets,residual,overflow:max(q(0),sub(q(0),residual)),css:css(value)});
}
export function generate(raw){const r=parse(raw);return r.ok?{ok:true,model:compute(r.value)}:r;}
export function createController({render,focus,clear=()=>{},lang='zh-Hant'}){
 let raw=defaults(),model=null,errors=[],status='',language=lang,composing=false;
 const state=()=>({raw:{c:raw.c,items:raw.items.map(x=>({...x}))},model,errors:[...errors],status,lang:language});const emit=()=>render(state()),revoke=()=>{model=null;errors=[];status='';clear();};
 const api={state,edit(id,v){if(id==='c')raw.c=v;else{const m=/^([bsm])([0-5])$/.exec(id);if(!m||!raw.items[+m[2]])return;raw.items[+m[2]][m[1]]=v;}revoke();status='dirty';emit();},count(v){if(!['3','4','5','6'].includes(v)){revoke();errors=[{id:'count',code:'schema'}];status='invalid';emit();focus('count');return;}const n=Number(v);raw.items=raw.items.slice(0,n);while(raw.items.length<n)raw.items.push(itemDefault());revoke();emit();},composition(v){composing=v;if(v){revoke();emit();}},submit(){if(composing)return false;revoke();try{const r=generate(raw);if(!r.ok){errors=r.errors;status='invalid';emit();focus(errors[0].id);return false;}model=r.model;status=model.residual.n<0n?'overflow':'generated';emit();return true;}catch{status='internal';emit();return false;}},example(freeze=false){raw=defaults();if(freeze)raw.items[0].m='95';revoke();emit();},reset(){api.example();focus('c');},language(){language=language==='en'?'zh-Hant':'en';emit();},select(fn){if(!model)return;try{fn();status='selected';}catch{status='manual';}emit();},leave(){raw={c:'',items:raw.items.map(()=>({b:'',s:'',m:''}))};revoke();emit();},restore(){composing=false;api.example();}};emit();return api;
}
