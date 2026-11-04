// 純計算與狀態核心：只接受封閉原始欄位，所有邊界判斷使用精確有理數。
export const POSITIONS = Object.freeze(['jump-end','jump-start','jump-none','jump-both']);
export const MODES = Object.freeze(['decimal','boundary']);
const gcd=(a,b)=>{while(b){[a,b]=[b,a%b]}return a<0n?-a:a;};
export function rational(n,d=1n){if(d<=0n)throw Error('denominator');const g=gcd(n,d);return Object.freeze({n:n/g,d:d/g});}
export const fraction=r=>r.d===1n?String(r.n):`${r.n}/${r.d}`;
export function percentage(r){const negative=r.n<0n;const n=(negative?-r.n:r.n)*1000000n;let q=n/r.d;if(2n*(n%r.d)>=r.d)q++;const s=String(q).padStart(5,'0');return `${negative&&q?'-':''}${s.slice(0,-4)}.${s.slice(-4)}%`;}
const full=(re,s)=>{const m=re.exec(s);return !!m&&m[0]===s;};
export function validate(request){
 const errors=[];const err=(field,code)=>errors.push({field,code});
 if(!request||typeof request!=='object'||Array.isArray(request)||![Object.prototype,null].includes(Object.getPrototypeOf(request)))return {ok:false,errors:[{field:'N',code:'schema'}]};
 const ds=Object.getOwnPropertyDescriptors(request);const ks=Reflect.ownKeys(ds);if(ks.some(k=>typeof k!=='string'||!('value'in ds[k])))return {ok:false,errors:[{field:'N',code:'schema'}]};
 const mode=ds.mode?.value;const expected=['N','position','progress','mode','before',...(mode==='boundary'?['k']:[])];
 if(ks.length!==expected.length||expected.some(k=>!Object.hasOwn(ds,k)))return {ok:false,errors:[{field:'N',code:'schema'}]};
 const {N,position,progress,before,k}=request;
 // 未使用的十進位文字可不合法，但其 schema 型別仍須是字串。
 if(typeof progress!=='string')return {ok:false,errors:[{field:'progress',code:'schema'}]};
 let count;
 if(typeof N!=='string'||N.length<1||N.length>16)err('N','length');
 else if(!full(/^[1-9][0-9]*/,N))err('N','countSyntax');
 else if(BigInt(N)>100n)err('N','countRange');else count=Number(N);
 if(!POSITIONS.includes(position))err('position','position');else if(count===1&&position==='jump-none')err('position','none');
 if(!MODES.includes(mode))err('mode','mode');
 let p;
 if(mode==='decimal'){
  if(typeof progress!=='string'||progress.length<1||progress.length>16)err('progress','length');
  else if(!full(/^(?:0|1)(?:\.[0-9]{1,6})?/,progress))err('progress','progressSyntax');
  else{const [a,b='']=progress.split('.');const n=BigInt(a)*1000000n+BigInt(b.padEnd(6,'0'));if(n>1000000n)err('progress','progressRange');else p=rational(n,1000000n);}
 }else if(mode==='boundary'&&count){if(!Number.isInteger(k)||k<0||k>count)err('k','boundary');else p=rational(BigInt(k),BigInt(count));}
 if(typeof before!=='boolean')err('before','before');
 return errors.length?{ok:false,errors}:{ok:true,N:count,position,mode,before,p,k:mode==='boundary'?k:null};
}
// before 只在 p×N 精確為整數時減一步；單位區間兩端再依標準夾界。
export function evaluate(N,position,p,before){const product=p.n*BigInt(N);const h=product/p.d;let c=h+(position==='jump-start'||position==='jump-both'?1n:0n);if(before&&product%p.d===0n)c--;const J=BigInt(N+(position==='jump-none'?-1:position==='jump-both'?1:0));if(J<=0n)throw Error('invalid jumps');if(c<0n)c=0n;if(c>J)c=J;return Object.freeze({h,c,J,y:rational(c,J)});}
export function generate(request){const v=validate(request);if(!v.ok)return v;const result=evaluate(v.N,v.position,v.p,v.before);const rows=Array.from({length:v.N+1},(_,k)=>{const p=rational(BigInt(k),BigInt(v.N));return Object.freeze({k,p,before:evaluate(v.N,v.position,p,true).y,after:evaluate(v.N,v.position,p,false).y});});const segments=Array.from({length:v.N},(_,k)=>({left:rational(BigInt(k),BigInt(v.N)),right:rational(BigInt(k+1),BigInt(v.N)),y:evaluate(v.N,v.position,rational(BigInt(2*k+1),BigInt(2*v.N)),false).y}));return Object.freeze({...v,...result,rows:Object.freeze(rows),segments:Object.freeze(segments),css:`animation-timing-function: steps(${v.N}, ${v.position});\n`});}
export const defaults=()=>({N:'4',position:'jump-end',mode:'decimal',progress:'0.25',before:false});
export function initialState(){return {raw:defaults(),k:null,builtN:null,result:null,errors:[],phase:'initial',composing:false};}
// 每次輸入或生命週期事件撤銷舊快照；邊界選項僅由成功產生建立。
export function transition(state,action){let s={...state,raw:{...state.raw}};const clear=()=>{s.result=null;s.errors=[];s.phase='dirty';};
 switch(action.type){
 case 'edit':if(!['N','position','mode','progress','before'].includes(action.field))throw Error('field');s.raw[action.field]=action.value;clear();if(action.field==='N'||action.field==='mode'){s.k=null;s.builtN=null;}break;
 case 'boundary':s.k=action.value;clear();break;
 case 'compose':s.composing=action.value;if(action.value)clear();break;
 case 'generate':if(s.composing)return state;{const req={...s.raw,...(s.raw.mode==='boundary'?{k:s.k??0}:{})};const r=generate(req);s.result=r.ok?r:null;s.errors=r.ok?[]:r.errors;s.phase=r.ok?'success':'error';if(r.ok&&r.mode==='boundary'){s.k=r.k;s.builtN=r.N;}break;}
 case 'reset':return initialState();
 case 'example':s=initialState();if(action.name==='both')s.raw={...s.raw,position:'jump-both',progress:'1'};return s;
 case 'suspend':clear();s.k=null;s.builtN=null;break;
 default:throw Error('action');
 }return s;
}
