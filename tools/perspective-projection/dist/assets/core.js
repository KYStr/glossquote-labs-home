// 嚴格原始字串契約與純數學模型；不讓 DOM、顯示捨入或瀏覽器量測反過來決定預期值。
export const fields=['a','b','ox','oy'];
export const defaults=Object.freeze({a:'20',b:'-30',ox:'50',oy:'50'});
export function parse(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {ok:false,errors:{schema:'schema'}};
 const ds=Object.getOwnPropertyDescriptors(raw);
 if(Reflect.ownKeys(ds).length!==4||fields.some(k=>!ds[k]||!('value'in ds[k])||typeof ds[k].value!=='string'))return {ok:false,errors:{schema:'schema'}};
 const values={},errors={};for(const k of fields){const s=ds[k].value;if(s.length>24){errors[k]='length';continue;}const t=s.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g,'');if(!t){errors[k]='empty';continue;}if(!/^[+-]?[0-9]+(?:\.[0-9])?$/.test(t)){errors[k]='syntax';continue;}const sign=t[0]==='-'?-1:1;const [whole,frac='0']=t.replace(/^[+-]/,'').split('.');const n=sign*(Number(whole)*10+Number(frac));const lo=k==='a'||k==='b'?-600:0,hi=k==='a'||k==='b'?600:1000;if(!Number.isSafeInteger(n)||n<lo||n>hi){errors[k]='range';continue;}values[k]=n===0?0:n;}
 return Object.keys(errors).length?{ok:false,errors}:{ok:true,values};
}
export function canonical(t){return t===0?'0':`${t<0?'-':''}${Math.floor(Math.abs(t)/10)}${Math.abs(t)%10?'.'+Math.abs(t)%10:''}`;}
export function display(v){if(!Number.isFinite(v))throw Error('nonfinite');const n=Math.sign(v)*Math.floor(Math.abs(v)*1e6+.5)/1e6;return n===0?'0':n.toFixed(6).replace(/0+$/,'').replace(/\.$/,'');}
export function outside(x,y){return x< -10||x>210||y< -10||y>130;}
export function model(v){
 const a=v.a/10*Math.PI/180,b=v.b/10*Math.PI/180,sa=a===0?0:Math.sin(a),ca=a===0?1:Math.cos(a),sb=b===0?0:Math.sin(b),cb=b===0?1:Math.cos(b),Q=[v.ox/5,v.oy*.12];
 const corners=[[0,0],[200,0],[200,120],[0,120]].map(([x,y],i)=>{const u=x-100,w0=y-60,X=100+cb*u,Y=60+ca*w0+sa*sb*u,Z=sa*w0-ca*sb*u,w=1-Z/500,px=Q[0]+(X-Q[0])/w,py=Q[1]+(Y-Q[1])/w;if(![X,Y,Z,w,px,py].every(Number.isFinite)||w<=.766)throw Error('model invariant');return Object.freeze({id:`P${i}`,x,y,X,Y,Z,w,px,py,outside:outside(px,py)});});
 const aabb=[Math.min(...corners.map(p=>p.px)),Math.min(...corners.map(p=>p.py)),Math.max(...corners.map(p=>p.px)),Math.max(...corners.map(p=>p.py))];
 return Object.freeze({values:Object.freeze({...v}),O:Object.freeze([100,60]),Q:Object.freeze(Q),corners:Object.freeze(corners),aabb:Object.freeze(aabb),css:css(v)});
}
export function calculate(raw){const p=parse(raw);if(!p.ok)return p;try{return{ok:true,result:model(p.values)}}catch{return{ok:false,errors:{schema:'invariant'}}}}
export function css(v){return `.preview-frame {\n  position: relative;\n  width: 220px;\n  height: 140px;\n  padding: 0;\n  border: 0;\n  overflow: hidden;\n}\n.perspective-parent {\n  position: absolute;\n  left: 10px;\n  top: 10px;\n  width: 200px;\n  height: 120px;\n  padding: 0;\n  border: 0;\n  perspective: 500px;\n  perspective-origin: ${canonical(v.ox)}% ${canonical(v.oy)}%;\n}\n.projected-rectangle {\n  position: absolute;\n  left: 0;\n  top: 0;\n  box-sizing: border-box;\n  width: 200px;\n  height: 120px;\n  padding: 0;\n  border: 0;\n  transform-box: border-box;\n  transform-origin: 50% 50% 0px;\n  transform: rotateX(${canonical(v.a)}deg) rotateY(${canonical(v.b)}deg);\n  backface-visibility: visible;\n}\n`;}
// 狀態核心只交付同一快照；任何編輯先失效，原字串從不被 canonical 值覆寫。
export function initial(lang='zh'){return {lang,raw:{...defaults},phase:'valid',errors:{},result:calculate(defaults).result};}
export function reduce(state,action){if(action.type==='edit')return {...state,raw:{...state.raw,[action.field]:action.value},phase:'dirty',errors:{},result:null};if(action.type==='lang')return {...state,lang:action.lang};if(action.type==='reset')return initial(state.lang);if(action.type==='example')return reduce({...state,raw:{...action.raw}}, {type:'generate'});if(action.type==='generate'){const r=calculate(state.raw);return {...state,phase:r.ok?'valid':'error',errors:r.ok?{}:r.errors,result:r.ok?r.result:null};}return state;}
