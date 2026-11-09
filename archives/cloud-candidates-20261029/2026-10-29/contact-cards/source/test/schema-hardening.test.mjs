import test from 'node:test';
import assert from 'node:assert/strict';
// 同一份測試能指向 immutable baseline，先留下真實失敗再修復。
const core = await import(process.env.CONTACT_CORE_URL ?? '../public/js/core.mjs');
const { ContactError, mapContacts, serializeVCard } = core;
const mapping = () => ({ name: 0, phone: 1, email: 2 });
const records = () => [['Fictional A','00123','fiction@example.invalid']];
const contact = () => ({ name:'Fictional A',phone:'00123',email:'fiction@example.invalid' });
const fails = (fn,code) => assert.throws(fn,error=>error instanceof ContactError && error.code===code);
const variants = (source,key) => {
  const result=[];
  const symbol={...source};symbol[Symbol('extra')]='bad';result.push(['symbol extra',symbol]);
  const hidden={...source};Object.defineProperty(hidden,'hidden',{value:'bad'});result.push(['non-enumerable extra',hidden]);
  const field={...source};Object.defineProperty(field,key,{enumerable:false});result.push(['non-enumerable field',field]);
  const inherited=Object.assign(Object.create({inherited:'bad'}),source);result.push(['custom prototype',inherited]);
  return result;
};
test('mapping getters are rejected without invocation',()=>{
  let reads=0;const map=mapping();Object.defineProperty(map,'name',{enumerable:true,get(){reads++;return 0;}});
  fails(()=>mapContacts(records(),map,false),'MAPPING');assert.equal(reads,0);
});
test('contact getters are rejected without invocation',()=>{
  for(const key of ['name','phone','email']) {let reads=0;const value=contact();Object.defineProperty(value,key,{enumerable:true,get(){reads++;return contact()[key];}});fails(()=>serializeVCard([value]),'CONTACT_SHAPE');assert.equal(reads,0);}
});
test('mapping exact own data shape rejects symbols, hidden keys, hidden fields and prototypes',()=>{
  for(const [name,value]of variants(mapping(),'name')) assert.throws(()=>mapContacts(records(),value,false),error=>error instanceof ContactError && error.code==='MAPPING',name);
});
test('contact exact own data shape rejects symbols, hidden keys, hidden fields and prototypes',()=>{
  for(const [name,value]of variants(contact(),'name')) assert.throws(()=>serializeVCard([value]),error=>error instanceof ContactError && error.code==='CONTACT_SHAPE',name);
});
test('record arrays reject getters at outer and cell levels without invoking them',()=>{
  let reads=0;const row=records()[0];Object.defineProperty(row,'0',{enumerable:true,get(){reads++;return 'Fictional A';}});fails(()=>mapContacts([row],mapping(),false),'RECORD_SHAPE');assert.equal(reads,0);
  const outer=records();Object.defineProperty(outer,'0',{enumerable:true,get(){reads++;return records()[0];}});fails(()=>mapContacts(outer,mapping(),false),'RECORD_SHAPE');assert.equal(reads,0);
});
test('contacts arrays reject getters without invoking them',()=>{
  let reads=0;const values=[contact()];Object.defineProperty(values,'0',{enumerable:true,get(){reads++;return contact();}});fails(()=>serializeVCard(values),'CONTACT_SHAPE');assert.equal(reads,0);
});
test('arrays reject sparse, extra string/symbol/non-enumerable keys and hidden indices',()=>{
  for(const make of [()=>{const a=records();delete a[0];return a;},()=>Object.assign(records(),{extra:1}),()=>{const a=records();a[Symbol('extra')]=1;return a;},()=>{const a=records();Object.defineProperty(a,'extra',{value:1});return a;},()=>{const a=records();Object.defineProperty(a,'0',{enumerable:false});return a;}]) fails(()=>mapContacts(make(),mapping(),false),'RECORD_SHAPE');
  const row=records()[0];row.extra=1;fails(()=>mapContacts([row],mapping(),false),'RECORD_SHAPE');
  const list=[contact()];list.extra=1;fails(()=>serializeVCard(list),'CONTACT_SHAPE');
});
test('frozen ordinary arrays/data records remain valid and source is not mutated',()=>{
  const row=Object.freeze(records()[0]);const source=Object.freeze([row]);const map=Object.freeze(mapping());const output=mapContacts(source,map,false);
  assert.deepEqual(output,[contact()]);assert.match(serializeVCard(Object.freeze([Object.freeze(contact())])),/TEL:00123\r\n/u);assert.deepEqual(source,[row]);
});
test('revoked and throwing reflection proxies fail with stable errors, not raw trap messages',()=>{
  const revoked=()=>{const {proxy,revoke}=Proxy.revocable({},{});revoke();return proxy;};
  fails(()=>mapContacts(records(),revoked(),false),'MAPPING');fails(()=>mapContacts(revoked(),mapping(),false),'RECORD_SHAPE');fails(()=>serializeVCard([revoked()]),'CONTACT_SHAPE');
  for(const trap of ['getPrototypeOf','ownKeys','getOwnPropertyDescriptor']) {
    const hostile=new Proxy(mapping(),{[trap](){throw new Error('secret trap text');}});fails(()=>mapContacts(records(),hostile,false),'MAPPING');
  }
});
test('property-read proxy traps are not used; valid descriptor snapshots are accepted without getter reads',()=>{
  // 瀏覽器 JS 無通用 Proxy 偵測；反射 trap 可能執行，不能聲稱拒絕所有 Proxy。
  let reads=0;const map=new Proxy(mapping(),{get(){reads++;throw new Error('must not read');}});
  const value=new Proxy(contact(),{get(){reads++;throw new Error('must not read');}});
  assert.deepEqual(mapContacts(records(),map,false),[contact()]);assert.match(serializeVCard([value]),/FN:Fictional A/u);assert.equal(reads,0);
});

test('reflection traps throwing exotic or revoked values still produce stable shape errors',()=>{
  const {proxy,revoke}=Proxy.revocable({},{});revoke();
  for(const thrown of [proxy,null,undefined,'secret',42,Symbol('secret')]) {
    const map=new Proxy(mapping(),{ownKeys(){throw thrown;}});
    fails(()=>mapContacts(records(),map,false),'MAPPING');
  }
});
