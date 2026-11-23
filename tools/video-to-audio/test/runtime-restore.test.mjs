import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {checkBytes,selectTarEntries} from '../scripts/restore-pinned-runtime.mjs';

function entry(name,data,type='0'){
 const b=Buffer.from(data), h=Buffer.alloc(512), body=Buffer.alloc(Math.ceil(b.length/512)*512);
 h.write(name,0,100,'ascii');h.write(b.length.toString(8).padStart(11,'0')+'\0',124,12,'ascii');
 h.write(type,156,1,'ascii');b.copy(body);
 return Buffer.concat([h,body]);
}
const name='package/dist/esm/file.js';
test('restoration refuses a changed file even with the same byte length',()=>{
 const expected=Buffer.from('fixed'), pin={bytes:5,sha256:createHash('sha256').update(expected).digest('hex')};
 assert.equal(checkBytes(expected,pin,name),expected);
 assert.throws(()=>checkBytes(Buffer.from('wrong'),pin,name),/Pinned bytes\/hash mismatch/);
});
test('archive reader selects only the declared regular entries',()=>{
 const b=Buffer.concat([entry('package/other','ignore'),entry(name,'payload'),Buffer.alloc(512)]);
 const selected=selectTarEntries(b,new Set([name]));
 assert.deepEqual([...selected.keys()],[name]);assert.equal(selected.get(name).toString(),'payload');
});
test('archive reader fails closed on duplicate, nonregular and truncated selected entries',()=>{
 for(const [data,error] of [
  [Buffer.concat([entry(name,'a'),entry(name,'b')]),/Duplicate archive entry/],
  [entry(name,'a','2'),/Expected a regular archive entry/],
  [entry(name,'abc').subarray(0,514),/Truncated tar entry/],
  [entry('package/other','not wanted'),/Missing archive entry/]
 ])assert.throws(()=>selectTarEntries(data,new Set([name])),error);
});
