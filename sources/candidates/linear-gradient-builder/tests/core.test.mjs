// 固定預期獨立寫死，不呼叫受測 serializer 建 expected。
import test from 'node:test';
// 使用 Node 內建嚴格斷言，零測試套件。
import assert from 'node:assert/strict';
// 正式核心直接由測試與正常頁共用。
import {buildGradient} from '../public/core.mjs';
// 合成紅藍例不含任何私人資料。
const request=()=>({angle:'90',stops:[{hex:'#ff0000',position:'0'},{hex:'#0000ff',position:'100'}]});
// 原規格四行 CSS 含結尾 LF，兩語核心不分叉。
const expected='.gradient-background { /* 固定背景類別 */\n  background-color: #FF0000; /* 首色備援底色 */\n  background-image: linear-gradient(90deg, #FF0000 0%, #0000FF 100%); /* 有序線性漸層 */\n} /* 背景規則結束 */\n';
// 正常例需 exact bytes、正規化且不改 raw。
test('T01 literal CSS and immutable output',()=>{const raw=request(),r=buildGradient(raw);assert.equal(r.css,expected);assert.equal(Buffer.byteLength(r.css),224);assert.equal(raw.stops[0].hex,'#ff0000');assert(Object.isFrozen(r.stops[0]));});
// 四方向只在這裡證字串，實際方向目視另須瀏覽器。
test('T02 directions',()=>{for(const angle of ['0','90','180','270'])assert.equal(buildGradient({...request(),angle}).gradient,`linear-gradient(${angle}deg, #FF0000 0%, #0000FF 100%)`);});
// 同位置與非端點保留語義，不自動排序合併。
test('T03 T04 equal and nonendpoint stops',()=>{const r=buildGradient({angle:'90',stops:[{hex:'#ff0000',position:'0'},{hex:'#ff0000',position:'50'},{hex:'#0000ff',position:'50'},{hex:'#0000ff',position:'100'}]});assert.equal(r.gradient,'linear-gradient(90deg, #FF0000 0%, #FF0000 50%, #0000FF 50%, #0000FF 100%)');const q=request();q.stops[0].position='20';q.stops[1].position='80';assert.equal(buildGradient(q).gradient,'linear-gradient(90deg, #FF0000 20%, #0000FF 80%)');});
// 長度格式範圍優先序與角度邊界。
test('T05 angle boundaries',()=>{for(const [angle,code]of [['','ANGLE_LENGTH'],['0000','ANGLE_LENGTH'],['00','ANGLE_FORMAT'],['090','ANGLE_FORMAT'],['+1','ANGLE_FORMAT'],['1.0','ANGLE_FORMAT'],['1e2','ANGLE_FORMAT'],['９０','ANGLE_FORMAT'],['-1','ANGLE_FORMAT'],['360','ANGLE_RANGE']])assert.equal(buildGradient({...request(),angle}).code,code);for(const angle of ['0','1','358','359'])assert.equal(buildGradient({...request(),angle}).ok,true);});
// 色碼只接受固定七字元，位置格式及範圍不能自動修正。
test('T05 hex and position boundaries',()=>{for(const [hex,code]of [['#12345','HEX_LENGTH'],['#1234567','HEX_LENGTH'],['#gg0000','HEX_FORMAT'],['<img>xx','HEX_FORMAT']]){const q=request();q.stops[0].hex=hex;assert.equal(buildGradient(q).code,code);}for(const [position,code]of [['','POSITION_LENGTH'],['0000','POSITION_LENGTH'],['01','POSITION_FORMAT'],['-1','POSITION_FORMAT'],['101','POSITION_RANGE'],['50%','POSITION_FORMAT']]){const q=request();q.stops[0].position=position;assert.equal(buildGradient(q).code,code);}for(const p of ['0','1','99','100']){const q=request();q.stops[0].position=p;assert.equal(buildGradient(q).ok,true);}});
// 先列數再內容，合法列數和最大輸出皆有界。
test('T06 count bounds',()=>{for(const n of [1,2,3,7,8,9]){const q={angle:'359',stops:Array.from({length:n},()=>({hex:'#FFFFFF',position:'100'}))};const r=buildGradient(q);assert.equal(r.ok,n>=2&&n<=8);if(r.ok)assert(Buffer.byteLength(r.css)<=512);else assert.equal(r.code,'STOP_COUNT');}const q=request();q.stops=Array(9);Object.defineProperty(q.stops,'8',{get(){throw Error('getter invoked');}});assert.equal(buildGradient(q).code,'STOP_COUNT');});
// 所有不合法 descriptor／自有鍵不觸發存取器。
test('T06 schema and getters',()=>{let calls=0;const getter={get angle(){calls++;return '90';},stops:request().stops};assert.equal(buildGradient(getter).code,'REQUEST_INVALID');const array=request().stops;Object.defineProperty(array,'0',{get(){calls++;}});assert.equal(buildGradient({angle:'90',stops:array}).code,'REQUEST_INVALID');assert.equal(calls,0);for(const q of [null,[],{...request(),extra:1},{...request(),angle:90},{...request(),stops:[,{}]}])assert.equal(buildGradient(q).code,'REQUEST_INVALID');const q=request();Object.defineProperty(q,'hidden',{value:1});assert.equal(buildGradient(q).code,'REQUEST_INVALID');const r=request();r[Symbol('x')]=1;assert.equal(buildGradient(r).code,'REQUEST_INVALID');});
// 全列格式完成才檢順序，指向後列；角度錯先於色碼。
test('T07 order and error precedence',()=>{const q=request();q.stops[0].position='60';q.stops[1].position='40';assert.deepEqual(buildGradient(q),{ok:false,code:'STOP_ORDER',field:'stops[1].position'});q.stops[1].position='60';assert.equal(buildGradient(q).ok,true);q.angle='360';q.stops[0].hex='bad';assert.equal(buildGradient(q).code,'ANGLE_RANGE');});
