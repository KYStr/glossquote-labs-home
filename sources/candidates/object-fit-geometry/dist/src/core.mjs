// 固定七欄與 exact rational：所有幾何在轉成示意 SVG 之前都不經浮點。
export const fields=Object.freeze(['sw','sh','cw','ch','mode','p','q']);
export const defaults=Object.freeze({sw:'800',sh:'600',cw:'300',ch:'200',mode:'cover',p:'50',q:'50'});
const abs=n=>n<0n?-n:n;
export function rat(n,d=1n){n=BigInt(n);d=BigInt(d);if(!d)throw Error('denominator');if(d<0n){n=-n;d=-d;}let a=abs(n),b=d;while(b){[a,b]=[b,a%b];}return Object.freeze({n:n/a,d:d/a});}
export const add=(a,b)=>rat(a.n*b.d+b.n*a.d,a.d*b.d);
export const neg=a=>rat(-a.n,a.d);
export const sub=(a,b)=>add(a,neg(b));
export const mul=(a,b)=>rat(a.n*b.n,a.d*b.d);
export const div=(a,b)=>rat(a.n*b.d,a.d*b.n);
export const cmp=(a,b)=>{const x=a.n*b.d-b.n*a.d;return x<0n?-1:x>0n?1:0;};
const min=(a,b)=>cmp(a,b)<0?a:b,max=(a,b)=>cmp(a,b)>0?a:b;
export const fraction=a=>a.d===1n?String(a.n):`${a.n}/${a.d}`;
export function fixed(a,digits=2){ // 精確半遠離零，不先把 scale 四捨五入。
 const scale=10n**BigInt(digits),v=abs(a.n)*scale;let q=v/a.d;if(2n*(v%a.d)>=a.d)q++;
 const s=q.toString().padStart(digits+1,'0'),sign=a.n<0n&&q!==0n?'-':'';return sign+(digits?s.slice(0,-digits)+'.'+s.slice(-digits):s);
}
export function parse(raw){ // descriptors 避免呼叫不可信 getter，也不接受額外欄位。
 if(!raw||typeof raw!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(raw)))return {ok:false,errors:[{field:'sw',code:'schema'}]};
 const ds=Object.getOwnPropertyDescriptors(raw),keys=Reflect.ownKeys(ds);
 if(keys.length!==fields.length||keys.some(k=>typeof k!=='string'||!fields.includes(k))||fields.some(k=>!ds[k]?.enumerable||!Object.hasOwn(ds[k],'value')))return {ok:false,errors:[{field:'sw',code:'schema'}]};
 const values={},errors=[];
 for(const field of fields){const v=ds[field].value;let code;
  if(field==='mode'){if(v!=='contain'&&v!=='cover')code='mode';else values.mode=v;}
  else if(typeof v!=='string')code='syntax';else if(v.length>16)code='length';else {const token=v.replace(/^[ \t\n\r]+|[ \t\n\r]+$/g,'');if(!/^[0-9]{1,4}$/.test(token))code='syntax';else {const n=Number(token),position=field==='p'||field==='q';if(n<(position?0:1)||n>(position?100:4096))code='range';else values[field]=n;}}
  if(code)errors.push({field,code});
 }
 return errors.length?{ok:false,errors}:{ok:true,values:Object.freeze(values)};
}
export function css(v){ // 只使用已驗證的 canonical 數字與封閉 enum。
 return `.fit-image {\n  display: block;\n  box-sizing: content-box;\n  width: ${v.cw}px;\n  height: ${v.ch}px;\n  padding: 0;\n  border: 0;\n  object-fit: ${v.mode};\n  object-position: ${v.p}% ${v.q}%;\n}\n`;
}
export function compute(v){
 const z=rat(0),sw=rat(v.sw),sh=rat(v.sh),cw=rat(v.cw),ch=rat(v.ch),sx=div(cw,sw),sy=div(ch,sh),s=(v.mode==='contain'?min:max)(sx,sy);
 const rw=mul(sw,s),rh=mul(sh,s),x=mul(sub(cw,rw),rat(v.p,100)),y=mul(sub(ch,rh),rat(v.q,100));
 const l=max(z,x),t=max(z,y),r=min(cw,add(x,rw)),b=min(ch,add(y,rh));
 const x0=div(sub(l,x),s),y0=div(sub(t,y),s),x1=div(sub(r,x),s),y1=div(sub(b,y),s),vw=sub(x1,x0),vh=sub(y1,y0);
 const numbers=Object.freeze({scale:s,rw,rh,x,y,x0,y0,x1,y1,vw,vh,cropLeft:x0,cropTop:y0,cropRight:sub(sw,x1),cropBottom:sub(sh,y1),marginLeft:l,marginTop:t,marginRight:sub(cw,r),marginBottom:sub(ch,b),area:mul(rat(100),div(mul(vw,vh),mul(sw,sh)))});
 return Object.freeze({values:v,numbers,classification:cmp(rw,cw)===0&&cmp(rh,ch)===0?'exact':v.mode==='contain'?'letterbox':'crop',upscale:cmp(s,rat(1))>0,css:css(v)});
}
export function generate(raw){const p=parse(raw);return p.ok?{ok:true,model:compute(p.values)}:p;}
export function diagram(model,availableWidth){ // 唯一容許轉 Number 的呈現邊界，保持真比例及薄圖警告。
 const v=model.values,width=Math.max(0,Math.min(480,availableWidth)),k=Math.min(width/v.cw,320/v.ch);
 return {width:v.cw*k,height:v.ch*k,thin:v.cw*k<2||v.ch*k<2,...Object.fromEntries(['rw','rh','x','y'].map(key=>[key,Number(model.numbers[key].n)/Number(model.numbers[key].d)]))};
}
