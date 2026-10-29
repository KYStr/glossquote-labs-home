import test from 'node:test';
import assert from 'node:assert/strict';
import { LIMITS, ContactError, validateSource, decodeUtf8, parseCsv, mapContacts, escapeText, foldLine, serializeVCard } from '../public/js/core.mjs';
const fail = (fn,code) => assert.throws(fn,error=>error instanceof ContactError && error.code===code);
const fake = (extra={}) => ({name:'虛構聯絡人 A',phone:'+1 (202) 555-0100',email:'fiction@example.invalid',...extra});
const csv = rows => rows.map(row=>row.map(value=>`"${value.replaceAll('"','""')}"`).join(',')).join('\r\n');
const unfold = value => value.replace(/\r\n[ \t]/gu,'');
const mapping = {name:0,phone:1,email:2};
test('strict UTF-8, one BOM removal, Unicode, controls and byte limit',()=>{
  assert.equal(decodeUtf8(new Uint8Array([0xef,0xbb,0xbf,0x41])),'\uFEFFA');
  assert.equal(validateSource('\uFEFF\uFEFFA'),'\uFEFFA');
  assert.deepEqual(parseCsv('\uFEFF\uFEFFA'),[['\uFEFFA']]);
  fail(()=>decodeUtf8(new Uint8Array([0xc0,0xaf])),'INVALID_UTF8');
  fail(()=>decodeUtf8(new Uint8Array([0xff,0xfe,0x41,0])),'INVALID_UTF8');
  fail(()=>decodeUtf8(new Uint8Array(LIMITS.input+1)),'INPUT_LIMIT');
  fail(()=>validateSource('\ud800'),'INVALID_UNICODE'); fail(()=>validateSource('\udc00'),'INVALID_UNICODE');
  for(const code of [0,8,11,12,14,31,127,133,159]) fail(()=>validateSource(String.fromCharCode(code)),'CONTROL');
  assert.equal(validateSource('姓名 🧑🏽‍💻 e\u0301'),'姓名 🧑🏽‍💻 e\u0301');
  fail(()=>validateSource('中'.repeat(90000)),'INPUT_LIMIT'); fail(()=>validateSource({}),'INVALID_TEXT');
});
test('CSV strings preserve numeric spelling, quoted syntax and multiline raw content',()=>{
  assert.deepEqual(parseCsv('name,phone,email\r\n"虛構, A",00123,a@example.invalid\r\n'),[['name','phone','email'],['虛構, A','00123','a@example.invalid']]);
  assert.deepEqual(parseCsv('"a""b","line1\r\nline2\rline3\nline4"'),[['a"b','line1\r\nline2\rline3\nline4']]);
  assert.deepEqual(parseCsv(','),[['','']]); assert.deepEqual(parseCsv('\n'),[['']]);
  assert.deepEqual(parseCsv('a,'),[['a','']]); assert.deepEqual(parseCsv('""'),[['']]);
  for(const value of ['"open','a"b','"a" ,b','a\rb','"a"x']) fail(()=>parseCsv(value),'CSV_SYNTAX');
  fail(()=>parseCsv('a,b\nc'),'COLUMN_MISMATCH'); fail(()=>parseCsv(''),'EMPTY');
});
test('CSV bounds are exact, applied inside the parser',()=>{
  assert.equal(parseCsv('a'.repeat(4096))[0][0].length,4096);
  fail(()=>parseCsv('a'.repeat(4097)),'FIELD_LIMIT');
  assert.equal(parseCsv(Array(20).fill('a').join(',')).at(0).length,20);
  fail(()=>parseCsv(Array(21).fill('a').join(',')),'COLUMN_LIMIT');
  assert.equal(parseCsv(Array(501).fill('a').join('\n')).length,501);
  fail(()=>parseCsv(Array(502).fill('a').join('\n')),'ROW_LIMIT');
});
test('positional mapping has no header guessing, duplicate collapsing or numeric conversion',()=>{
  const records=parseCsv('same,same,same\n虛構 A,+00120,a@example.invalid\n虛構 A,00012,a@example.invalid');
  assert.deepEqual(mapContacts(records,mapping,true),[{name:'虛構 A',phone:'+00120',email:'a@example.invalid'},{name:'虛構 A',phone:'00012',email:'a@example.invalid'}]);
  assert.deepEqual(mapContacts([['Fictional A','00123']],{name:0,phone:1,email:-1},false),[{name:'Fictional A',phone:'00123',email:''}]);
  assert.equal(mapContacts([['Fictional B','b@example.invalid']],{name:0,phone:-1,email:1},false)[0].phone,'');
  for(const bad of [{name:-1,phone:1,email:2},{name:0,phone:-1,email:-1},{name:0,phone:0,email:2},{name:0,phone:1,email:3},{name:'0',phone:1,email:2},{...mapping,extra:0}]) fail(()=>mapContacts(records,bad,true),'MAPPING');
  fail(()=>mapContacts(records,mapping,'true'),'MAPPING');
  fail(()=>mapContacts([['name','phone','email']],mapping,true),'EMPTY');
  fail(()=>mapContacts(Array(501).fill(['Fake','000','']),mapping,false),'ROW_LIMIT');
  fail(()=>mapContacts([['Fake','000',''],['Bad']],mapping,false),'COLUMN_MISMATCH');
});
test('strict channel profiles reject silently changed/ambiguous values and no-channel contacts',()=>{
  for(const phone of ['=1+1','001\nFN:Evil','  +123','++123','123 ext 9','１２３','+','   ','1;TYPE=HOME:2','1'.repeat(81)]) fail(()=>serializeVCard([fake({phone})]),'PHONE');
  for(const email of ['a\r\nFN:Evil','a@example.invalid,other@example.invalid','Name <a@example.invalid>','a..b@example.invalid','a@-host.invalid','a@example..invalid','a@host','測試@example.invalid',' a@example.invalid','a@host.invalid ']) fail(()=>serializeVCard([fake({email})]),'EMAIL');
  for(const name of ['', ' \r\n ', '\tName', 'A\u2028B', 'a'.repeat(201)]) fail(()=>serializeVCard([fake({name})]),'NAME');
  fail(()=>serializeVCard([fake({phone:'',email:''})]),'NO_CHANNEL');
  fail(()=>serializeVCard([{...fake(),url:'https://example.invalid'}]),'CONTACT_SHAPE');
  assert.match(serializeVCard([fake({name:' A ',phone:'00123',email:''})]),/FN: A \r\n/u);
});
test('vCard 3.0 exact core properties and deterministic bytes',()=>{
  const output=serializeVCard([{name:'Fictional A',phone:'+00120',email:'fiction@example.invalid'}]);
  assert.equal(output,'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Fictional A\r\nN:;Fictional A;;;\r\nTEL:+00120\r\nEMAIL;TYPE=INTERNET:fiction@example.invalid\r\nEND:VCARD\r\n');
  assert(!output.startsWith('\uFEFF')); assert(!output.replaceAll('\r\n','').includes('\n'));
});
test('escaping neutralizes newline/property injection while preserving literal slash-n',()=>{
  const value='虛構\\n;姓,名\r\nEND:VCARD\nBEGIN:VCARD\rURL:https://example.invalid';
  const output=unfold(serializeVCard([fake({name:value})]));
  const lines=output.split('\r\n').filter(Boolean);
  assert.deepEqual(lines.map(line=>line.split(':')[0]),['BEGIN','VERSION','FN','N','TEL','EMAIL;TYPE=INTERNET','END']);
  assert.equal(lines.filter(line=>line==='BEGIN:VCARD').length,1);
  assert.equal(lines.filter(line=>line==='END:VCARD').length,1);
  assert.equal(escapeText('a\\n;b,c\r\nd\re\nf'),'a\\\\n\\;b\\,c\\nd\\ne\\nf');
  assert.equal(lines[2],`FN:${escapeText(value)}`);
});
test('Unicode-safe 75-octet folding, including continuation spaces, reconstructs the exact line',()=>{
  for(const value of ['A'.repeat(75),'A'.repeat(76),'FN:'+ '中🧑🏽‍💻e\u0301'.repeat(30), 'FN:'+ 'x'.repeat(71)+'\\,']) {
    const folded=foldLine(value); assert.equal(unfold(folded),value);
    for(const [index,line]of folded.split('\r\n').entries()) { assert(Buffer.byteLength(line,'utf8')<=75); assert(line.isWellFormed()); if(index) assert(line.startsWith(' ')); }
  }
  fail(()=>foldLine('a\nb'),'LINE'); fail(()=>foldLine('\ud800'),'LINE');
});
test('500 contacts accepted and output budget enforced without partial results',()=>{
  const contacts=Array.from({length:500},(_,i)=>fake({name:`Fictional ${i}`}));
  assert.equal((serializeVCard(contacts).match(/BEGIN:VCARD/gu)||[]).length,500);
  fail(()=>serializeVCard([...contacts,fake()]),'ROW_LIMIT');
  fail(()=>serializeVCard(Array.from({length:500},()=>fake({name:'🧑'.repeat(200)}))),'OUTPUT_LIMIT');
});
test('deterministic CSV round trip and property-injection corpus across 100 synthetic cases',()=>{
  let seed=9031; const next=()=>{seed=(seed*1664525+1013904223)>>>0;return seed;};
  const alphabet=['甲','🧑','a','"',',',';','\\','\r','\n',':',' '];
  for(let run=0;run<100;run++) {
    const name='Fake '+Array.from({length:30},()=>alphabet[next()%alphabet.length]).join('');
    const rows=[['name','phone','email'],[name,'00123','fiction@example.invalid']];
    assert.deepEqual(parseCsv(csv(rows)),rows);
    const output=unfold(serializeVCard(mapContacts(parseCsv(csv(rows)),mapping,true)));
    assert.equal(output.split('\r\n').filter(Boolean).length,7);
    assert(output.includes(`FN:${escapeText(name)}\r\n`));
  }
});
