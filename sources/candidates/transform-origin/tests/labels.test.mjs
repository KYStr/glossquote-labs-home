import test from 'node:test';import assert from 'node:assert/strict';import {vertexLabels,placeLabels} from '../src/labels.mjs';import {transform,defaultRaw,validate,bounds} from '../src/core.mjs';
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
for(const [name,patch,b]of [['zero-x',{sx:'0'},'RTS'],['default',{},'RTS'],['mirror-close',{sx:'-2'},'SRT'],['point',{sx:'0',sy:'0'},'RTS']])test(`label identities and collision-free rectangles: ${name}`,()=>{
const v=validate({...defaultRaw(),...patch}).values,results=[transform(v,'TRS'),transform(v,b)],before=JSON.stringify(results),groups=vertexLabels(results);
for(let p=0;p<2;p++)assert.deepEqual(groups.filter(g=>g.panel===p).flatMap(g=>g.ids).sort(),[0,1,2,3]);
if(name==='zero-x')assert.equal(groups[0].text,'A·P0/P1');
const rb=bounds(results),scale=Math.max(rb[2]/650,rb[3]/330),box=[rb[0]-35*scale,rb[1]-35*scale,rb[2]+110*scale,rb[3]+70*scale],labels=placeLabels([{x:results[0].origin[0],y:results[0].origin[1],text:'O',panel:-1},...groups],box,scale);
for(let i=0;i<labels.length;i++){const r=labels[i].rect;assert.ok(r.x>=box[0]&&r.y>=box[1]&&r.x+r.w<=box[0]+box[2]&&r.y+r.h<=box[1]+box[3]);for(let j=0;j<i;j++)assert.equal(overlap(r,labels[j].rect),0);}
assert.equal(JSON.stringify(results),before);
});
