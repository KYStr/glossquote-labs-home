// 固定合成資料與 literal oracle；不讀任何使用者真實題庫。
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, validateSource, inspectCards, inspectPractice, createOrder, shuffleForTest, progressJSON, printableText } from '../public/js/core/flashcards.mjs';
import { messages } from '../public/js/i18n.mjs';
const csv = 'question,answer\nA,a\nB,b\nC,c\nD,d\nE,e';
const cards = () => parseCSV(csv).value;
const practice = () => ({ cards: cards(), ratings: ['unreviewed','again','remembered','unreviewed','again'], order: [2,3,4,5,1], position: 2, revealed: true });
const rejected = (result, code) => { assert.equal(result.ok, false); assert.equal(result.code, code); assert.equal(Object.hasOwn(result, 'value'), false); };

test('兩語合成CSV符合契約，來源ID穩定', () => {
  for (const locale of ['zh-Hant', 'en']) { const result = parseCSV(messages[locale].sampleCSV); assert.equal(result.ok, true); assert.deepEqual(result.value.map(c=>c.id),[1,2,3]); }
  assert.deepEqual(parseCSV('question,answer\n甲,乙\n甲,乙').value,[{id:1,question:'甲',answer:'乙'},{id:2,question:'甲',answer:'乙'}]);
});
test('quoted commas、雙引號與CRLF/CR包含欄內換行', () => {
  assert.deepEqual(parseCSV('\ufeff"question",answer\r\n" a,b ","c""d\re\r\nf"\r').value,[{id:1,question:' a,b ',answer:'c"d\ne\nf'}]);
  assert.deepEqual(parseCSV('question,answer\n"a\n",b').value,[{id:1,question:'a\n',answer:'b'}]);
});
test('保留Tab/emoji/combining/full-width與字面HTML', () => {
  const q='　e\u0301😀\t<img src=x onerror=alert(1)>　';
  assert.equal(parseCSV(`question,answer\n${q},</script>&`).value[0].question,q);
  assert.equal(parseCSV(`question,answer\n${q},</script>&`).value[0].answer,'</script>&');
});
test('標頭exact、BOM只允許開頭一個、空輸入拒絕', () => {
  for(const input of ['', 'Question,answer\na,b','question, answer\na,b',' question,answer\na,b','\ufeff\ufeffquestion,answer\na,b','q,a\na,b']) rejected(parseCSV(input),'HEADER');
});
test('不略過空記錄，不接受少欄多欄；末一LF只是終止符', () => {
  assert.equal(parseCSV('question,answer\na,b\n').ok,true);
  for(const input of ['question,answer\na','question,answer\na,b,c','question,answer\na,b\n\n','question,answer\n\na,b']) rejected(parseCSV(input),'COLUMNS');
  rejected(parseCSV('question,answer\n'),'CARD_COUNT');
});
test('引號語法失敗不寬鬆修補、不洩漏假內容', () => {
  for(const text of ['a"z,b','"a,b','"a"x,b','"a" ,b','"a""",b"']) { const result=parseCSV(`question,answer\n${text}`); rejected(result,'CSV'); assert.equal(result.record,2); assert.equal(JSON.stringify(result).includes(text),false); }
});
test('錯誤位置是CSV記錄號而非實體行號', () => {
  const result=parseCSV('question,answer\n"a\nb",c\n"d"x,e'); rejected(result,'CSV');assert.equal(result.record,3);
});
test('1與200張有效；201張整份拒絕', () => {
  assert.equal(parseCSV('question,answer\na,b').value.length,1);
  assert.equal(parseCSV('question,answer\n'+Array(200).fill('a,b').join('\n')).value.length,200);
  rejected(parseCSV('question,answer\n'+Array(201).fill('a,b').join('\n')),'CARD_COUNT');
});
test('每面碼點2000界限，不用UTF16/視覺字數取代', () => {
  assert.equal(parseCSV(`question,answer\n${'😀'.repeat(2000)},b`).ok,true);
  rejected(parseCSV(`question,answer\n${'😀'.repeat(2001)},b`),'FACE');
  assert.equal(parseCSV(`question,answer\n${'e\u0301'.repeat(1000)},b`).ok,true);
  rejected(parseCSV(`question,answer\n${'e\u0301'.repeat(1001)},b`),'FACE');
});
test('空白面與控制碼拒絕，不刪除修補', () => {
  for(const face of ['', ' ', '\t', '　', '\u0000','a\u007fb','a\u0085b','a\u001bb']) rejected(parseCSV(`question,answer\n${face},b`),'FACE');
  for(const face of ['\n','\r\n']) rejected(parseCSV(`question,answer\n"${face}",b`),'FACE');
});
test('原始UTF16與UTF8各exact邊界，超限先拒絕', () => {
  assert.equal(validateSource('a'.repeat(200000)).ok,true); rejected(validateSource('a'.repeat(200001)),'TOO_LARGE');
  assert.equal(validateSource('甲'.repeat(87381)+'a').ok,true); rejected(validateSource('甲'.repeat(87381)+'aa'),'TOO_LARGE');
  rejected(parseCSV('\ufeff'+'a'.repeat(200000)),'TOO_LARGE');
});
test('孤立surrogate所有位置拒絕，合法pair保留', () => {
  for(const value of ['\ud800','\udc00','x\ud800a','x\ud800','\ud800\ud800']) rejected(validateSource(value),'UNICODE');
  assert.equal(validateSource('x😀y').ok,true);
  for(const value of [null,{},[],3,new String('hello')]) rejected(validateSource(value),'SCHEMA');
});
test('exact card schema拒絕額外Symbol、hidden、getter、sparse與未知陣列鍵', () => {
  let calls=0;
  const probes=[];
  for(const key of ['extra',Symbol('fake')]) { const arr=cards().map(c=>({...c})); Object.defineProperty(arr[0],key,{value:1,enumerable:false}); probes.push(arr); }
  const accessor=cards().map(c=>({...c}));Object.defineProperty(accessor[0],'question',{get(){calls++;throw new Error('PRIVATE');}});probes.push(accessor);
  const sparse=[...cards()];delete sparse[1];probes.push(sparse);
  const extra=[...cards()];Object.defineProperty(extra,'extra',{value:1});probes.push(extra);
  const id=cards().map(c=>({...c}));id[0].id=2;probes.push(id);
  const missing=cards().map(c=>({...c}));delete missing[0].answer;probes.push(missing);
  for(const p of probes) rejected(inspectCards(p),'SCHEMA');
  assert.equal(calls,0);
});
test('不可讀Proxy失敗映固定錯誤（反射trap本身非可避免副作用）', () => {
  rejected(inspectCards(new Proxy([],{ownKeys(){throw new Error('PRIVATE');},getOwnPropertyDescriptor(){throw new Error('PRIVATE');}})),'SCHEMA');
  rejected(inspectPractice(new Proxy({}, {ownKeys(){throw new Error('PRIVATE');}})),'SCHEMA');
});
test('洗牌literal全0為2,3,4,5,1；不突變來源', () => {
  const source=cards();const before=JSON.stringify(source);let calls=0;
  assert.deepEqual(shuffleForTest(source,()=>{calls++;return 0;}).value,[2,3,4,5,1]);assert.equal(calls,4);assert.equal(JSON.stringify(source),before);
  assert.deepEqual(createOrder(source,false).value,[1,2,3,4,5]);
});
test('rejection literal max先拒絕，精確消耗5個uint32', () => {
  const values=[4294967295,5,1,2,1];let calls=0;
  assert.deepEqual(shuffleForTest(cards(),()=>values[calls++]).value,[5,4,3,2,1]);assert.equal(calls,5);
});
test('最多128次拒絕，沒有部分排列或fallback', () => {
  let calls=0;rejected(shuffleForTest(cards(),()=>{calls++;return 4294967295;}),'RANDOM');assert.equal(calls,128);
  for(const value of [-1,1.5,4294967296,NaN,'0',undefined]) rejected(shuffleForTest(cards(),()=>value),'RANDOM');
  rejected(shuffleForTest(cards(),()=>{throw new Error('PRIVATE');}),'RANDOM');
});
test('schema失敗不取亂數；1卡合法不取亂數；200卡排列完整', () => {
  let calls=0;const cb=()=>{calls++;return 0;};rejected(shuffleForTest([] ,cb),'SCHEMA');assert.equal(calls,0);
  assert.deepEqual(shuffleForTest([{id:1,question:'a',answer:'b'}],cb).value,[1]);assert.equal(calls,0);
  const many=parseCSV('question,answer\n'+Array(200).fill('a,b').join('\n')).value;
  const order=shuffleForTest(many,cb).value;assert.equal(new Set(order).size,200);assert.equal(calls,199);assert.deepEqual(order.slice(0,3),[2,3,4]);assert.equal(order.at(-1),1);
});
test('正式入口使用Crypto receiver，缺失/throw不fallback', () => {
  const original=Object.getOwnPropertyDescriptor(globalThis,'crypto');let called=0;const fake={getRandomValues(slot){assert.equal(this,fake);called++;slot[0]=0;return slot;}};
  try { Object.defineProperty(globalThis,'crypto',{value:fake,configurable:true});assert.deepEqual(createOrder(cards(),true).value,[2,3,4,5,1]);assert.equal(called,4);
    Object.defineProperty(globalThis,'crypto',{value:undefined,configurable:true});rejected(createOrder(cards(),true),'RANDOM');assert.deepEqual(createOrder(cards(),false).value,[1,2,3,4,5]);
    Object.defineProperty(globalThis,'crypto',{value:{getRandomValues(){throw new Error('PRIVATE');}},configurable:true});rejected(createOrder(cards(),true),'RANDOM');
  } finally {Object.defineProperty(globalThis,'crypto',original);}
});
test('progress exact schema ratings/order/position/revealed與getter拒絕', () => {
  for(const patch of [{ratings:['unreviewed']},{ratings:Array(5).fill('wrong')},{order:[1,2,3,4,4]},{order:[1,2,3,4,6]},{position:0},{position:6},{position:1.5},{revealed:0},{extra:true}]) rejected(inspectPractice({...practice(),...patch}),'SCHEMA');
  let calls=0;const state=practice();Object.defineProperty(state,'cards',{get(){calls++;return cards();}});rejected(inspectPractice(state),'SCHEMA');assert.equal(calls,0);
});
test('progress JSON literal、Unicode、無BOM及尾LF', () => {
  const result=progressJSON({cards:[{id:1,question:'甲\n<q>',answer:'a"b'}],ratings:['again'],order:[1],position:1,revealed:true});
  assert.equal(result.value,'{\n  "schemaVersion": 1,\n  "cards": [\n    {\n      "id": 1,\n      "question": "甲\\n<q>",\n      "answer": "a\\"b",\n      "rating": "again"\n    }\n  ],\n  "order": [\n    1\n  ],\n  "position": 1,\n  "revealed": true\n}\n');
  assert.notEqual(new TextEncoder().encode(result.value)[0],239);
});
test('可列印TXT兩語literal，使用者每行兩格含空行，來源順序', () => {
  const input=[{id:1,question:'A\n\nCard 9',answer:'<img>\nB'}];
  assert.equal(printableText(input,'en').value,'Flashcards — printable text\n\nCard 1\nQuestion:\n  A\n  \n  Card 9\nAnswer:\n  <img>\n  B\n');
  assert.equal(printableText(input,'zh-Hant').value,'問答卡 — 可列印文字\n\n卡片 1\n題目：\n  A\n  \n  Card 9\n答案：\n  <img>\n  B\n');
  rejected(printableText(input,'fr'),'SCHEMA');
});
