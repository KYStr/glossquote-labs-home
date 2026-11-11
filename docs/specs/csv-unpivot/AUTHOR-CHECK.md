# CSV 橫表轉明細作者核對

`labs-csv-unpivot-spec-20261111` · `spec-csv-unpivot-20261111` · 2026-11-11

[規格](SPEC.md) · [固定研究簡報副本](BRIEF.md) · [可執行字面資料](fixtures.json)

作者 `local-codex:01a1c8b8-14a2-78e0-894d-e59a735656b2`。ACK、登記、claim 與 start 逐筆讀回於 r1640–r1643，`claimId=fh-reg-sched-17-csv-unpivot-claim-7d640077-e5d`。初次承接依預設分支 `3d47dd3a2f5e89761791378d01d87ba80c36a351`，研究來源固定 `14d3dff09fe8f283726a7e8cb9eaadd905500516`。 [承接快照](https://github.com/KYStr/glossquote-labs-home/blob/54db5e26aa516858e098669afeffd2cdc40361e1/coordination/work-registry.json) · [固定 TASK](https://github.com/KYStr/glossquote-labs-home/blob/14d3dff09fe8f283726a7e8cb9eaadd905500516/docs/reviews/five-hour-2026-11-11/dispatch/new-spec-csv-unpivot/TASK.md)

## 作者檢查範圍

- 借用表原始案例、確切座標、錯誤優先順序、容量及可重算檔案均附字面預期。短案例的列與保護位置手列，原值 JSON 以指定 key order 從這些資料序列化為固定字串。作者驗算器另用黏附的欄位文法配對、按欄產生後按來源位置排序的模型、以及首碼點正規式。正式產品預定採四態解析與按來源列展開。
- 讀取檔案實際 bytes、UTF-8 大小、CSV 跨行及重複表頭、空字串和單一空格、相同識別值、公式標記、每項獨立下載上限、每步完整狀態與允許的下載 effect 都有驗算。大型資料用固定參數重建，輸出長度逐列加總，任何檔案超限仍核對其他檔案的條件。
- 控制器作者檢查比對版本、pending、錯誤、下載 bytes 及失效規則。未有產品程式。實機、正式 Worker、Network／Storage、Blob、可及性、SEO、部署與外驗保持 `NOT_RUN`。文件分數由獨立評審提供。
- 規則來源為 CSV Workbench 固定 `risk.mjs` 及測試，其 parser 和匯出合約已比對。固定樹與 package 未發現可核實的程式重用授權，文件採引用固定行為與獨立驗算。 [原判定](https://github.com/KYStr/glossquote-labs-csv-workbench/blob/fbd488d0622d81e175e1d367801e2959232af22e/public/js/core/risk.mjs) · [原測例](https://github.com/KYStr/glossquote-labs-csv-workbench/blob/fbd488d0622d81e175e1d367801e2959232af22e/test/risk.test.mjs)
- 承接前已比對 registry、PR 與相近工具原始行為。r1639 的登記、分支及同名 PR 搜尋均無本案競爭工作。#284 提供 byte-identical 的研究 brief。WorkBench 保留列形狀，table-reconcile 對兩表，fixed-width-slicer 按 bytes 切欄。本案逐格展開並保留原值及座標。 [承接前 registry](https://github.com/KYStr/glossquote-labs-home/blob/3d47dd3a2f5e89761791378d01d87ba80c36a351/coordination/work-registry.json) · [研究來源 PR](https://github.com/KYStr/glossquote-labs-home/pull/284) · [選欄核心](https://github.com/KYStr/glossquote-labs-csv-workbench/blob/fbd488d0622d81e175e1d367801e2959232af22e/public/js/core/selection.mjs) · [對帳核心](https://github.com/KYStr/glossquote-labs-table-reconcile/blob/ce9a9260bac2d8ffd31fb5710de946b4996d1ef7/public/js/core/reconcile.mjs) · [固定寬度](https://github.com/KYStr/glossquote-labs-home/blob/a5e7356dae36d2aac3db068352a916d76c7594c3/docs/specs/fixed-width-slicer/SPEC.md)

## 可重現命令

在四檔所在的資料夾執行，使用 Node.js 24 的 built-ins。單一命令從本文件擷取下方程式，只讀本地四檔，沒有安裝、網路或輸出檔案。成功印出各測例計數和四檔 SHA-256，任何不一致 exit 非 0。Git blob 核對以原始 bytes 執行，請保留來源檔換行。

```sh
node --version
node --input-type=module -e "import{readFileSync}from'node:fs';const l=readFileSync('AUTHOR-CHECK.md','utf8').split(/\r?\n/);const a=l.indexOf('<!-- AUTHOR-ORACLE-BEGIN -->'),b=l.indexOf('<!-- AUTHOR-ORACLE-END -->');if(a<0||b<=a+3)throw Error('Missing oracle');await import('data:text/javascript;base64,'+Buffer.from(l.slice(a+2,b-1).join('\n')).toString('base64'));"
```

## 執行紀錄

本次執行使用 Node.js `v24.14.0`，以本頁可重現命令執行，exit 0。37 個來源解析、26 個轉換、48 個 predicate、27 個容量／形狀案例通過。5 組控制器共 75 步，包含 5 次晚到回傳維持原狀及 4 次精確下載效果。11 個相對連結大小寫及路徑核對通過。固定 BRIEF Git blob 為 `027a96f41f082843c7e1fa45cfbac8e122dc3334`。

借用表保留空白時原值 CSV 127 bytes、JSON 173 bytes。公式探針保護 CSV 60 bytes、JSON 103 bytes，只有一個前導單引號差異。三種下載分別有 8 MiB−1、8 MiB、8 MiB+1 的重建輸入與精確期望。分頁例在第 2 頁下載仍有完整 26 筆。程式輸出同時列出實際四檔大小與 SHA-256，供與固定候選的讀回內容比對。

## 作者驗算器

<!-- AUTHOR-ORACLE-BEGIN -->
```js
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';

const LIMIT = 1_048_576;
const OUT = 8_388_608;
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const control = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u;
const risky = /^[\u0020\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*[\t\r\n=+\-@＝＋－＠]/u;
const fail = (code, record = null, column = null, field = null) => ({
  ok: false, error: { code, record, column, field }
});
const hasKeys = (o, keys) => !!o && typeof o === 'object' && !Array.isArray(o)
  && Object.keys(o).length === keys.length && keys.every(k => Object.hasOwn(o,k));
const validName = s => s.isWellFormed() && !control.test(s) && !/[\t\r\n]/u.test(s)
  && /[^ ]/u.test(s) && Array.from(s).length <= 120;
const utf8 = s => Buffer.byteLength(s, 'utf8');
const sourceText = text => ({ kind: 'text', text });
const sourceFile = text => ({ kind: 'file', hex: Buffer.from(text, 'utf8').toString('hex') });

function parseOracle(input) {
  let text;
  if (input.kind === 'file' && hasKeys(input, ['kind','hex']) && /^(?:[0-9a-f]{2})*$/u.test(input.hex)) {
    const bytes = Buffer.from(input.hex, 'hex');
    if (bytes.length > LIMIT) return fail('INPUT_BYTES');
    try { text = decoder.decode(bytes); } catch { return fail('INVALID_UTF8'); }
  } else if (input.kind === 'text' && hasKeys(input, ['kind','text']) && typeof input.text === 'string') {
    text = input.text;
    if (text.length > LIMIT) return fail('INPUT_BYTES');
    if (!text.isWellFormed()) return fail('INVALID_UNICODE');
    if (utf8(text) > LIMIT) return fail('INPUT_BYTES');
  } else {
    return fail('SOURCE_SCHEMA');
  }
  if (text.startsWith('\uFEFF\uFEFF')) return fail('DUPLICATE_BOM',1,1);
  if (text.startsWith('\uFEFF')) text = text.slice(1);
  if (!text) return fail('EMPTY_SOURCE',1,1);
  const quoted = /"((?:""|[^"])*?)"(?!")/uy;
  const plain = /[^",\r\n]*/uy;
  const records = [];
  let cells = 0;
  let cursor = 0;
  while (cursor < text.length) {
    const row = [];
    const record = records.length + 1;
    while (true) {
      const column = row.length + 1;
      const isQuoted = text[cursor] === '"';
      const pattern = isQuoted ? quoted : plain;
      pattern.lastIndex = cursor;
      const match = pattern.exec(text);
      if (!match) {
        const rest = text.slice(cursor+1).replaceAll('""','"');
        const invalid = rest.search(control);
        if (invalid >= 0 && invalid <= 16_384) return fail('CONTROL_CHAR',record,column);
        if (rest.length > 16_384) return fail('FIELD_LIMIT',record,column);
        return fail('UNCLOSED_QUOTE',record,column);
      }
      const value = isQuoted ? match[1].replaceAll('""','"') : match[0];
      const invalid = value.search(control);
      if (invalid >= 0 && invalid <= 16_384) return fail('CONTROL_CHAR',record,column);
      if (value.length > 16_384) return fail('FIELD_LIMIT',record,column);
      cursor += match[0].length;
      const next = text[cursor];
      const lf = next === '\n';
      const crlf = next === '\r' && text[cursor+1] === '\n';
      if (next !== undefined && control.test(next)) return fail('CONTROL_CHAR',record,column);
      if (next === '\r' && !crlf) return fail('BARE_CR',record,column);
      if (next !== undefined && next !== ',' && !lf && !crlf) {
        return fail(isQuoted ? 'AFTER_QUOTE' : 'QUOTE_IN_UNQUOTED',record,column);
      }
      if (column > 48) return fail('COLUMN_LIMIT',record,column);
      row.push(value);
      if (next === ',') { cursor++; continue; }
      cursor += crlf ? 2 : lf ? 1 : 0;
      break;
    }
    if (record === 1) {
      if (row.length < 2) return fail('HEADER_WIDTH',1,2);
      for (const [j,value] of row.entries()) {
        if (!validName(value)) return fail('HEADER_NAME',1,j+1);
        if (row.indexOf(value) !== j) return fail('DUPLICATE_HEADER',1,j+1);
      }
    } else {
      const width = records[0].length;
      if (width !== row.length) return fail('ROW_WIDTH',record,Math.min(width,row.length)+1);
      if (record > 2001) return fail('ROW_LIMIT',record);
    }
    cells += row.length;
    if (cells > 100_000) return fail('CELL_LIMIT',record);
    records.push(row);
  }
  return { ok:true, table:{ headers:records[0], rows:records.slice(1) } };
}

function projection(input, options) {
  const parsed = parseOracle(input);
  if (!parsed.ok) return parsed;
  const { headers, rows } = parsed.table;
  if (!hasKeys(options,['roles','attributeName','valueName','skipEmpty'])
    || !Array.isArray(options.roles) || typeof options.attributeName !== 'string'
    || typeof options.valueName !== 'string' || typeof options.skipEmpty !== 'boolean') {
    return fail('OPTIONS_SCHEMA');
  }
  const indices = role => options.roles.flatMap((value,i) => value===role ? [i] : []);
  if (options.roles.length !== headers.length) return fail('ROLE_LENGTH',null,null,'roles');
  const bad = options.roles.findIndex(v => !['keep','expand','omit'].includes(v));
  if (bad !== -1) return fail('ROLE_VALUE',null,bad+1,'roles');
  const keep = indices('keep');
  const expand = indices('expand');
  if (!keep.length) return fail('KEEP_REQUIRED',null,null,'roles');
  if (!expand.length) return fail('EXPAND_REQUIRED',null,null,'roles');
  const columns = keep.map(i=>headers[i]);
  for (const name of ['attributeName','valueName']) {
    const value = options[name];
    if (!validName(value)) return fail('OUTPUT_NAME',null,null,name);
    if (columns.includes(value)) return fail('OUTPUT_NAME_COLLISION',null,null,name);
    columns.push(value);
  }
  const pairs = expand.flatMap(column=>rows.map((row,index)=>({column,index,empty:row[column]===''})));
  const emptyCells = pairs.filter(x=>x.empty).length;
  const selected = (options.skipEmpty ? pairs.filter(x=>!x.empty) : pairs)
    .sort((a,b)=>a.index-b.index||a.column-b.column);
  if (selected.length > 20_000) return fail('RESULT_ROWS');
  const counts = {potential:pairs.length,actual:selected.length,emptyCells,
    skippedEmpty:pairs.length-selected.length,omittedColumns:indices('omit').map(i=>i+1)};
  return {ok:true,columns,counts,keep,origins:selected.map(({index,column})=>[index+2,column+1]),
    rows:selected.map(({index,column})=>[...keep.map(i=>rows[index][i]),headers[column],rows[index][column]])};
}

const csvRow = row => row.map(s=>'"'+s.split('"').join('""')+'"').join(',');
const jsonFile = (columns, rows) => JSON.stringify({schemaVersion:1,columns,rows})+'\n';
const unavailable = status => ({status,byteLength:null,utf8:null});
const file = utf8Text => {
  const byteLength = utf8(utf8Text);
  return byteLength<=OUT ? {status:'ready',byteLength,utf8:utf8Text} : {status:'too-large',byteLength,utf8:null};
};

function convertOracle(input, options) {
  const projected = projection(input,options);
  if (!projected.ok) return projected;
  const {columns,rows,origins,counts,keep} = projected;
  const matrix = [columns,...rows];
  const risk = [];
  const protectedMatrix = matrix.map((row,r)=>row.map((value,c)=>{
    if (!risky.test(value)) return value;
    let sourceRecord = null, sourceColumn = null;
    if (r === 0 && c < keep.length) { sourceRecord = 1; sourceColumn = keep[c]+1; }
    if (r > 0) {
      const [originRecord,originColumn] = origins[r-1];
      sourceRecord = c === keep.length ? 1 : originRecord;
      sourceColumn = c < keep.length ? keep[c]+1 : originColumn;
    }
    risk.push({record:r+1,column:c+1,sourceRecord,sourceColumn});
    return "'"+value;
  }));
  const files = {
    rawCsv:risk.length ? unavailable('formula-risk') : file(matrix.map(csvRow).join('\r\n')),
    protectedCsv:risk.length ? file(protectedMatrix.map(csvRow).join('\r\n')) : unavailable('unavailable'),
    originalJson:file(jsonFile(columns,rows))
  };
  return {ok:true,result:{columns,rows,origins,counts,risk,files}};
}

function asciiSource(targetBytes) {
  const rows = ['id,x'];
  let remaining = targetBytes - 4;
  while (remaining > 0) {
    const rowBytes = Math.min(16_387, remaining);
    assert.ok(rowBytes >= 3);
    rows.push('a,'+'v'.repeat(rowBytes-3));
    remaining -= rowBytes;
  }
  const text = rows.join('\n');
  assert.equal(utf8(text),targetBytes);
  return text;
}

const rectangle = (columns,rows) => [
  Array.from({length:columns},(_,i)=>'c'+String(i+1).padStart(2,'0')).join(','),
  ...Array(rows).fill(Array(columns).fill('a').join(','))
].join('\n');
const expandOptions = (n, skipEmpty = false) => ({roles:['keep',...Array(n).fill('expand')],attributeName:'attribute',valueName:'value',skipEmpty});
const attrColumns = n => Array.from({length:n},(_,i)=>'x'+String(i+1).padStart(2,'0'));
const sizes = bytes => ({status:bytes<=OUT?'ready':'too-large',byteLength:bytes});
const unavailableSize = status => ({status,byteLength:null});
const parseShape = table => ({ok:true,rows:table.rows.length,columns:table.headers.length});

function measureArtifact(args) {
  const attrs = attrColumns(20);
  const source = [['id',...attrs].join(',')];
  for(let i=0;i<1000;i++) {
    const width = Math.floor(args.keepChars/1000)+(i<args.keepChars%1000 ? 1 : 0);
    const id = args.marked ? '+'+'A'.repeat(width-1) : 'A'.repeat(width);
    const values = Array(20).fill(args.marked ? '=1' : 'v');
    if(i===0) values[0] += ' '.repeat(args.padding);
    source.push([id,...values].join(','));
  }
  const text = source.join('\n');
  const result = projection(sourceText(text),expandOptions(20));
  assert.ok(result.ok);
  let csvBytes = utf8(csvRow(result.columns));
  let jsonBytes = utf8(jsonFile(result.columns,[]));
  let riskCount = 0;
  for (const row of result.rows) {
    csvBytes += 2 + utf8(csvRow(row.map(s=>{
      if (!risky.test(s)) return s;
      riskCount++;
      return "'"+s;
    })));
    jsonBytes += utf8(JSON.stringify(row));
  }
  jsonBytes += Math.max(0,result.rows.length-1);
  return {ok:true,inputBytes:utf8(text),rows:result.rows.length,riskCount,files:{
    rawCsv:riskCount ? unavailableSize('formula-risk') : sizes(csvBytes),
    protectedCsv:riskCount ? sizes(csvBytes) : unavailableSize('unavailable'),
    originalJson:sizes(jsonBytes)
  }};
}

function boundary({recipe,args}) {
  if (recipe==='artifact-bytes') return measureArtifact(args);
  if (recipe==='expanded-rows') {
    const attrs = attrColumns(args.expand);
    const source = [['id',...attrs].join(',')];
    for(let i=0;i<args.rows;i++) source.push(['001',...Array(args.expand).fill(args.lastEmpty && i===args.rows-1 ? '' : 'v')].join(','));
    const result = projection(sourceText(source.join('\n')),expandOptions(args.expand,args.skipEmpty));
    return result.ok ? {ok:true,counts:result.counts,firstOrigin:result.origins[0],lastOrigin:result.origins.at(-1)} : result;
  }
  let input;
  let source;
  if (recipe==='ascii-source-bytes') {
    source = asciiSource(args.targetBytes);
    input = args.kind==='file' ? sourceFile(source) : sourceText(source);
  } else if (recipe==='utf8-header-source-bytes') {
    source = 'é'+asciiSource(args.targetBytes-2);
    assert.equal(utf8(source),args.targetBytes);
    assert.ok(source.length<=LIMIT);
    input = sourceText(source);
  } else if (recipe==='header-codepoints') {
    input = sourceText('🙂'.repeat(args.count)+',x');
  } else if (recipe==='field-units') {
    input = sourceText('id,x\n001,'+'🙂'.repeat(Math.floor(args.count/2))+'a'.repeat(args.count%2));
  } else {
    assert.equal(recipe,'rectangle');
    const rectangular = rectangle(args.columns,args.rows);
    input = sourceText(args.shortLast ? rectangular.slice(0,rectangular.lastIndexOf('\n')+1)+'a' : rectangular);
  }
  const parsed = parseOracle(input);
  if (!parsed.ok) return parsed;
  const shape = parseShape(parsed.table);
  if (recipe==='ascii-source-bytes') shape.bytes = utf8(source);
  if (recipe==='header-codepoints') shape.firstHeaderCodePoints = Array.from(parsed.table.headers[0]).length;
  if (recipe==='field-units') shape.firstDataValueUnits = parsed.table.rows[0][1].length;
  if (recipe==='rectangle' && args.columns===48 && args.rows===2000) shape.totalCells = (shape.rows+1)*shape.columns;
  return shape;
}

const names = {rawCsv:'unpivot.csv',protectedCsv:'unpivot-protected.csv',originalJson:'unpivot-original.json'};
const mime = {rawCsv:'text/csv;charset=utf-8',protectedCsv:'text/csv;charset=utf-8',originalJson:'application/json;charset=utf-8'};
const disabled = {rawCsv:false,protectedCsv:false,originalJson:false};
const initialOptions = {roles:[],attributeName:'attribute',valueName:'value',skipEmpty:false};
const initialState = {phase:'empty',source:'none',sourceVersion:0,run:0,headers:[],dataRows:null,
  options:initialOptions,pending:null,error:null,page:null,review:false,result:null,downloads:disabled};
const summarize = r => ({counts:r.counts,riskCount:r.risk.length,
  files:Object.fromEntries(Object.entries(r.files).map(([k,{status,byteLength}])=>[k,{status,byteLength}]))});

function traceCheck(trace, cases) {
  let previous = initialState, activeFileResult = null;
  let stale = 0, effects = 0;
  for (const [i,step] of trace.steps.entries()) {
    const {event,expected:s,effects:writes} = step;
    const label = trace.id+' step '+(i+1)+' '+event.type;
    assert.ok(hasKeys(s,Object.keys(initialState)),label);
    assert.ok(hasKeys(s.options,Object.keys(initialOptions)),label);
    assert.ok(hasKeys(s.downloads,Object.keys(disabled)),label);
    const pending = previous.pending;
    const matching = event.type==='DELIVER' && pending && ['kind','sourceVersion','run'].every(k=>pending[k]===event[k]);
    const clearing = ['RESET','PAGEHIDE'].includes(event.type)
      || (event.type==='PAGESHOW' && event.persisted && previous.phase!=='empty');
    const freshSource = clearing || event.type==='EDIT_SOURCE';
    const starts = ['READ','PREVIEW'].includes(event.type);
    const newRun = freshSource || starts || event.type==='EDIT_OPTIONS' || event.type==='CANCEL';
    assert.equal(s.run,previous.run+Number(newRun),label);
    assert.equal(s.sourceVersion,previous.sourceVersion+Number(freshSource),label);
    if (clearing) assert.deepEqual(s,{...initialState,run:s.run,sourceVersion:s.sourceVersion},label);
    if (event.type==='EDIT_SOURCE') {
      assert.deepEqual(s,{...initialState,run:s.run,sourceVersion:s.sourceVersion,source:event.source.kind,phase:'source-dirty'},label);
    }
    if (starts) {
      assert.deepEqual(s.pending,{kind:event.type==='READ'?'read':'preview',sourceVersion:s.sourceVersion,run:s.run},label);
      assert.equal(s.phase,event.type==='READ'?'reading':'converting',label);
      assert.equal(s.result,null,label);
      assert.equal(s.error,null,label);
    }
    if (event.type==='EDIT_OPTIONS') {
      assert.deepEqual(s.options,{...previous.options,...event.patch},label);
      assert.deepEqual(s.headers,previous.headers,label);
      assert.equal(s.dataRows,previous.dataRows,label);
      assert.equal(s.phase,'loaded',label);
      assert.equal(s.result,null,label);
    }
    if (event.type==='CANCEL') {
      assert.equal(s.phase,'canceled',label);
      assert.equal(s.pending,null,label);
      assert.deepEqual(s.options,previous.options,label);
      assert.equal(s.result,null,label);
    }
    if (event.type==='DELIVER' && !matching) {
      assert.deepEqual(s,previous,label);
      stale++;
    }
    if (matching) {
      const data = event.payload.caseId ? cases.get(event.payload.caseId) : event.payload;
      assert.ok(data,label);
      assert.equal(s.pending,null,label);
      if (!data.ok) {
        assert.equal(s.phase,'error',label);
        assert.deepEqual(s.error,data.error,label);
        assert.equal(s.result,null,label);
      } else if (event.kind==='read') {
        assert.equal(s.phase,'loaded',label);
        assert.deepEqual(s.headers,data.table.headers,label);
        assert.equal(s.dataRows,data.table.rows.length,label);
        assert.deepEqual(s.options,{...initialOptions,roles:Array(s.headers.length).fill('omit')},label);
      } else {
        activeFileResult = data.result;
        assert.equal(s.page,1,label);
        assert.deepEqual(s.result,summarize(activeFileResult),label);
      }
    }
    if (event.type==='OBSERVE' || (event.type==='PAGESHOW'&&!clearing)) assert.deepEqual(s,previous,label);
    if (event.type==='PAGE') {
      const max = previous.result ? Math.max(1,Math.ceil(previous.result.counts.actual/25)) : 0;
      assert.deepEqual(s,event.page>=1 && event.page<=max ? {...previous,page:event.page} : previous,label);
    }
    if (event.type==='OPEN_PROTECTION' && previous.result?.files.protectedCsv.status==='ready') assert.equal(s.review,true,label);
    if (event.type==='CLOSE_PROTECTION') assert.equal(s.review,false,label);
    if (event.type==='DOWNLOAD' && previous.downloads[event.file]) {
      assert.equal(writes.length,1,label);
      assert.deepEqual(writes[0],{kind:'download',filename:names[event.file],mime:mime[event.file],utf8:activeFileResult.files[event.file].utf8},label);
      if(event.file==='protectedCsv') assert.equal(s.review,false,label);
      effects++;
    } else {
      assert.deepEqual(writes,[],label);
      if(event.type==='DOWNLOAD') assert.deepEqual(s,previous,label);
    }
    if (!s.result) {
      activeFileResult = null;
      assert.deepEqual(s.downloads,disabled,label);
      assert.equal(s.review,false,label);
      assert.equal(s.page,null,label);
    } else {
      assert.deepEqual(s.result,summarize(activeFileResult),label);
      assert.equal(s.phase,'result',label);
      const available = name => s.result.files[name].status==='ready';
      assert.deepEqual(s.downloads,{rawCsv:available('rawCsv'),
        protectedCsv:s.review&&available('protectedCsv'),originalJson:available('originalJson')},label);
    }
    previous = s;
  }
  return {stale,effects};
}

const filenames = ['AUTHOR-CHECK.md','BRIEF.md','SPEC.md','fixtures.json'];
assert.deepEqual(readdirSync('.').sort(),filenames);
const files = Object.fromEntries(filenames.map(name=>[name,readFileSync(name)]));
const brief = files['BRIEF.md'];
assert.equal(createHash('sha1').update('blob '+brief.length+'\0').update(brief).digest('hex'),
  '027a96f41f082843c7e1fa45cfbac8e122dc3334');
let links = 0;
for (const [name,bytes] of Object.entries(files)) {
  const text = decoder.decode(bytes);
  if (!name.endsWith('.md')) continue;
  for (const match of text.matchAll(/\]\(([^)\s]+)\)/gu)) {
    const link = match[1];
    if (/^https:\/\//u.test(link) || link.startsWith('#')) continue;
    assert.ok(filenames.includes(link),name+' relative link '+link);
    links++;
  }
}
const spec = decoder.decode(files['SPEC.md']);
assert.deepEqual([...spec.matchAll(/^## (\S+)$/gmu)].map(x=>x[1]),[
  'goal','scope','userFlow','inputsOutputs','implementation','acceptance','tests','handoff'
]);
for (const id of ['functionality','boundaries','privacy','security','usability','accessibility','localization-seo','toolchain-provenance','compatibility']) {
  assert.ok(spec.includes('| '+String.fromCharCode(96)+id+String.fromCharCode(96)+' |'),id);
}
const fixtures = JSON.parse(decoder.decode(files['fixtures.json']));
assert.equal(fixtures.schemaVersion,1);
for (const key of ['parse','conversions','bounds','controller']) {
  const ids = fixtures[key].map(item=>item.id);
  assert.equal(new Set(ids).size,ids.length,key);
}
for (const item of fixtures.parse) assert.deepEqual(parseOracle(item.source),item.expected,item.id);
for (const item of fixtures.conversions) assert.deepEqual(convertOracle(item.source,item.options),item.expected,item.id);
for (const item of fixtures.predicate) {
  assert.equal(risky.test(item.value),item.risky);
  assert.equal(item.risky ? "'"+item.value : item.value,item.protected);
}
for (const item of fixtures.bounds) assert.deepEqual(boundary(item),item.expected,item.id);
const cases = new Map(fixtures.conversions.map(item=>[item.id,item.expected]));
const traceCounts = fixtures.controller.map(trace=>traceCheck(trace,cases));
console.log(JSON.stringify({
  status:'PASS',node:process.version,parse:fixtures.parse.length,conversions:fixtures.conversions.length,
  predicate:fixtures.predicate.length,bounds:fixtures.bounds.length,controller:fixtures.controller.length,
  steps:fixtures.controller.reduce((n,x)=>n+x.steps.length,0),stale:traceCounts.reduce((n,x)=>n+x.stale,0),
  effects:traceCounts.reduce((n,x)=>n+x.effects,0),relativeLinks:links,
  files:filenames.map(name=>({name,bytes:files[name].length,sha256:createHash('sha256').update(files[name]).digest('hex')}))
}));
```
<!-- AUTHOR-ORACLE-END -->
