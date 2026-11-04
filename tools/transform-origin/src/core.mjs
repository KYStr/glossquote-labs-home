export const LIMITS = Object.freeze({tx:{min:-500,max:500,precision:1,unit:'px',value:'10'},ty:{min:-500,max:500,precision:1,unit:'px',value:'20'},angle:{min:-360,max:360,precision:1,unit:'deg',value:'90'},sx:{min:-3,max:3,precision:2,unit:'',value:'2'},sy:{min:-3,max:3,precision:2,unit:'',value:'3'},originX:{min:-100,max:200,precision:1,unit:'%',value:'0'},originY:{min:-100,max:200,precision:1,unit:'%',value:'0'}});
export const ORDERS=Object.freeze(['TRS','TSR','RTS','RST','STR','SRT']);
export const POINTS=Object.freeze([[0,0],[200,0],[200,100],[0,100]].map(Object.freeze));
export const defaultRaw=()=>Object.fromEntries(Object.entries(LIMITS).map(([k,v])=>[k,v.value]));
export function parseField(raw,key){
 const rule=LIMITS[key]; if(!rule||typeof raw!=='string') return {error:'format'};
 const value=raw.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g,'');
 if(!/^[+-]?[0-9]+(?:\.[0-9]+)?$/.test(value))return {error:'format'};
 if((value.split('.')[1]||'').length>rule.precision)return {error:'precision'};
 const number=Number(value); if(!Number.isFinite(number)||number<rule.min||number>rule.max)return {error:'range'};
 return {value:Object.is(number,-0)?0:number};
}
export function validate(raw){const values={},errors={};for(const k of Object.keys(LIMITS)){const r=parseField(raw[k],k);if(r.error)errors[k]=r.error;else values[k]=r.value;}return {values,errors,valid:Object.keys(errors).length===0};}
export function multiply(m,n){const [a,b,c,d,e,f]=m,[g,h,i,j,k,l]=n;return [a*g+c*h,b*g+d*h,a*i+c*j,b*i+d*j,a*k+c*l+e,b*k+d*l+f];}
export function transform(v,order){
 if(!ORDERS.includes(order))throw new Error('Invalid transform order');
 if(Object.keys(LIMITS).some(k=>!Number.isFinite(v[k])))throw new Error('Nonfinite transform value');
 const quarter=v.angle/90; let cos,sin;if(Number.isInteger(quarter)){const i=((quarter%4)+4)%4;cos=[1,0,-1,0][i];sin=[0,1,0,-1][i];}else{cos=Math.cos(v.angle*Math.PI/180);sin=Math.sin(v.angle*Math.PI/180);}
 const matrices={T:[1,0,0,1,v.tx,v.ty],R:[cos,sin,-sin,cos,0,0],S:[v.sx,0,0,v.sy,0,0]};
 const list=[...order].reduce((m,k)=>multiply(m,matrices[k]),[1,0,0,1,0,0]);
 const [a,b,c,d,e,f]=list,origin=[2*v.originX,v.originY];const [ox,oy]=origin;
 const matrix=[a,b,c,d,e+ox-a*ox-c*oy,f+oy-b*ox-d*oy];
 const vertices=POINTS.map(([x,y])=>[a*x+c*y+matrix[4],b*x+d*y+matrix[5]]);
 return {matrix,vertices,origin,det:v.sx*v.sy,aabb:[Math.min(...vertices.map(p=>p[0])),Math.min(...vertices.map(p=>p[1])),Math.max(...vertices.map(p=>p[0])),Math.max(...vertices.map(p=>p[1]))]};
}
export function display(n){if(Math.abs(n)<0.0000005)return '0';const rounded=Math.sign(n)*Math.round((Math.abs(n)+Number.EPSILON)*1e6)/1e6;return Object.is(rounded,-0)?'0':rounded.toFixed(6).replace(/\.?0+$/,'');}
export function css(v,order,panel){if(!ORDERS.includes(order)||!['a','b'].includes(panel))throw new Error('Invalid CSS structure');const f={T:`translate(${v.tx}px, ${v.ty}px)`,R:`rotate(${v.angle}deg)`,S:`scale(${v.sx}, ${v.sy})`};return `.demo-${panel} {\n  box-sizing: border-box;\n  width: 200px;\n  height: 100px;\n  padding: 0;\n  border: 0;\n  transform-box: border-box;\n  transform-origin: ${v.originX}% ${v.originY}%;\n  transform: ${[...order].map(k=>f[k]).join(' ')};\n}\n`;}
export function bounds(results){const points=[...POINTS,...results.flatMap(r=>[r.origin,...r.vertices])];const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);const minX=Math.min(...xs)-20,minY=Math.min(...ys)-20;return [minX,minY,Math.max(40,Math.max(...xs)-minX+20),Math.max(40,Math.max(...ys)-minY+20)];}
