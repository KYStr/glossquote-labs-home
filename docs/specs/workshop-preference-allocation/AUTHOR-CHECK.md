# 規格作者檢查

規格 `spec-workshop-preference-allocation-20261111`。2026-11-11，本文件記錄文件作者執行的核對。候選交由不同 actor 逐節驗收，尚未取得獨評或 spec-ready。產品面向均 `NOT_RUN`。[規格](SPEC.md) · [研究 brief](BRIEF.md) · [字面測例](fixtures.json)

## 順序規則與獨立重算

把未分配表示為 rank 4。對小測例枚舉每人的合法志願名次或 4 的完整向量，只在葉節點以每班使用座位數判斷可行性，再取按原報名順序字典序最小向量。任何可行前綴都可讓剩餘人留空而延伸，所以選擇第一個仍有位的最高志願會得到此向量。此方法可獨立比對規格中的逐列扣位；字典序只描述這個固定優先順序。

| 對照 | 按當次輸入順序的向量 | 交接結果 |
| --- | --- | --- |
| 標準五人 | 1, 2, 4, 1, 4 | W1 R01，W2 R02、R04。R03 志願滿額，R05 未填。 |
| R03 移首列 | 1, 2, 2, 4, 4 | W1 R03，W2 R01、R02。R04 志願滿額，R05 未填。 |
| W1/W2 各一席，先 R01 | 1, 4 | R01 選 W1，R03 的唯一志願已滿，W2 空一席，錄取 1。 |
| 兩人反向，先 R03 | 1, 2 | R03 選 W1，R01 選 W2，錄取 2。 |

四案都保存完整輸入、每列結果、每班座位及所有可下載字面 CSV。在所有正例另以獨立欄位比對重建下載 bytes，核對 CRLF、無 BOM、無尾換行、固定檔名、ASCII 狀態與代碼。前導零 ID、大小寫有別、課名含逗號／引號、第三志願、空班與全部未填各有具體例。

| 字面輸出 | UTF-8 bytes | SHA-256 |
| --- | ---: | --- |
| 標準整批 | 147 | `e8d425f48c5148ff4a6088fe324084fb35bff474dcb4d79bf269ebd4dd003131` |
| 標準 W2 單班 | 87 | `06a4389c0c3266a9736a535ea255c717f2da915fc25ed24f2184e93ef7c76a91` |
| 兩人先 R01 的空 W2 單班 | 49 | `06ae27ed6d2799b3ef20f01e3ad4ac336e40a1fefed6706f5021955fb16f7830` |

## 失敗順序、限制與 controller 核對

- 欄寬錯優先於同一來源前段欄值錯，工作坊的錯優先於志願錯。空隙定位到空白後第一個填值，優先於該欄 ID 格式錯。參照逐欄判定，先遇未知工作坊即停止，即使下一欄也重覆。無效 UTF-8 用首錯前綴定位到欄，前綴已含不合法結構時先回前面的結構錯。
- 上限用可重現輸入構造，30／31 個工作坊與 500／501 筆報名分別對應首個超限 record 32／502。500 筆都只有 W1，W1 恰有 500 席，因此 500 列全分配。ASCII 大小案的表頭、LF、`W1,` 和 `,1` 共 32 bytes，另有 131,040 個 `a` 剛好 128 KiB，故進入課名長度檢查；多 1 byte 先拒絕。每個 🪵 是一碼點／兩 UTF-16 units，80 個合法、81 個超限。
- Controller 的六條序列共有 56 份完整快照及效果列表。用另一個 reader/URL 帳本核對讀取世代、是否仍有檔案讀取、舊回呼無效果、結果版本、分班與 URL 建立／重用／撤銷，並用枚舉結果核對完整狀態下的統計和下載。快照為文件中逐步寫定的值。模擬工作不充當真實 browser、FileReader、OS 下載或裝置證據。
- 範圍對照含固定研究來源、實際近似產品程式與相同用途查詢，依 [BRIEF](BRIEF.md) 的固定引用取回。UTF-8 fatal 與 BOM 的設計依 Encoding，讀取中止和 Blob 採 File API；不引入套件或外部 runtime 資產。 [WHATWG Encoding](https://encoding.spec.whatwg.org/#interface-textdecoder) · [File API](https://w3c.github.io/FileAPI/#FileReader-interface)

WA-01 加入零位元組檔案讀取、來源錯誤、停用匯出、清空貼上與重新貼入的完整快照。驗證已選空檔在 record 1、column 1 回 SOURCE_EMPTY，清空貼上恢復為缺一表。取消系統選檔仍不送出 READ。

## 可重做的文件檢查

在固定候選的 checkout 使用 Node 24 以上。把下方 verifier 存為自己的暫存 `verify-workshop-spec.mjs`，在 repo 根目錄執行下列命令。只讀三份規格資料，無網路、無安裝、無產品原始碼。

```sh
node --version
node verify-workshop-spec.mjs docs/specs/workshop-preference-allocation
```

作者實際用 Node `v24.14.0` 執行同一腳本，以自己的四檔工作目錄為參數，exit `0`。輸出前三行的 bytes／SHA-256 如上，最後一行如下。

```json
{"core":50,"positives":9,"negatives":41,"boundaries":10,"controller":6,"snapshots":56,"sections":8,"productCriteria":9,"status":"PASS"}
```

<details>
<summary>離線文件 verifier</summary>

```js
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'docs/specs/workshop-preference-allocation';
const f = JSON.parse(readFileSync(join(dir, 'fixtures.json'), 'utf8'));
const spec = readFileSync(join(dir, 'SPEC.md'), 'utf8');
const brief = readFileSync(join(dir, 'BRIEF.md'), 'utf8');
const header = 'participant_id,workshop_id,status,preference_rank';
const fatal = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const hash = text => createHash('sha256').update(text).digest('hex');
const text = input => input.kind === 'bytes' ? fatal.decode(Buffer.from(input.hex, 'hex')) : input.text;
const lines = source => source.replace(/^\uFEFF/u, '').replace(/(?:\r\n|\n)$/u, '').split(/\r\n|\n/u);

function fields(line) {
  const token = /(?:"((?:""|[^"])*)"|([^",]*))(?=,|$)/uy;
  const values = [];
  let offset = 0;
  while (offset <= line.length) {
    token.lastIndex = offset;
    const match = token.exec(line);
    if (!match) return { values, fault: values.length + 1 };
    values.push(match[1] !== undefined ? match[1].replaceAll('""', '"') : match[2]);
    if (token.lastIndex === line.length) break;
    offset = token.lastIndex + 1;
  }
  return { values, fault: null };
}

function positive(workshops, preferences) {
  const classes = lines(workshops).slice(1).map(line => {
    const { values: [id, title, capacity], fault } = fields(line);
    assert.equal(fault, null);
    return { id, title, capacity: Number(capacity) };
  });
  const people = lines(preferences).slice(1).map(line => {
    const { values: [id, ...choices], fault } = fields(line);
    assert.equal(fault, null);
    return { id, choices: choices.filter(Boolean) };
  });
  return { classes, people };
}

// Enumerate complete rank vectors. Rank 4 leaves an entry unplaced.
// Test total seat feasibility only at a leaf. Keep the lexicographic minimum.
function oracle({ classes, people }) {
  let best;
  function visit(prefix) {
    if (prefix.length === people.length) {
      for (const c of classes) {
        const count = prefix.filter((rank, i) => rank < 4 && people[i].choices[rank - 1] === c.id).length;
        if (count > c.capacity) return;
      }
      if (!best || prefix.join('') < best.join('')) best = prefix;
      return;
    }
    const n = people[prefix.length].choices.length;
    for (let rank = 1; rank <= n; rank++) visit([...prefix, rank]);
    visit([...prefix, 4]);
  }
  visit([]);
  assert(best);
  return best.map((rank, i) => {
    const { id, choices } = people[i];
    return { participantId: id, workshopId: rank === 4 ? null : choices[rank - 1],
      status: rank < 4 ? 'assigned' : choices.length ? 'choices_full' : 'no_preference',
      preferenceRank: rank === 4 ? null : rank };
  });
}

function summarize(classes, rows) {
  const workshops = classes.map(c => {
    const assigned = rows.filter(row => row.workshopId === c.id).length;
    return { workshopId: c.id, title: c.title, capacity: c.capacity, assigned, remaining: c.capacity - assigned };
  });
  const totals = {
    participants: rows.length,
    assigned: rows.filter(row => row.status === 'assigned').length,
    choicesFull: rows.filter(row => row.status === 'choices_full').length,
    noPreference: rows.filter(row => row.status === 'no_preference').length,
    capacity: classes.reduce((sum, c) => sum + c.capacity, 0),
    remaining: workshops.reduce((sum, c) => sum + c.remaining, 0),
  };
  assert.equal(totals.participants, totals.assigned + totals.choicesFull + totals.noPreference);
  assert.equal(totals.capacity - totals.assigned, totals.remaining);
  assert(workshops.every(c => c.remaining >= 0 && c.assigned + c.remaining === c.capacity));
  return { totals, workshops, rows };
}

function csv(rows) {
  return [header, ...rows.map(row => [
    row.participantId, row.workshopId ?? '', row.status, row.preferenceRank ?? '',
  ].join(','))].join('\r\n');
}

function verifyArtifact(artifact, rows, file) {
  assert.deepEqual(artifact, { filename: file, mime: 'text/csv;charset=utf-8', text: csv(rows) });
  const bytes = Buffer.from(artifact.text, 'utf8');
  assert(bytes.every(byte => byte < 128));
  assert(!artifact.text.endsWith('\r\n'));
  assert(!artifact.text.replaceAll('\r\n', '').match(/[\r\n]/u));
}

function witness(c) {
  const e = c.expected.error;
  const input = c.input[e.source];
  assert(spec.includes('|' + ' \u0060' + e.code + '\u0060 |'), c.id + ' code absent from SPEC');
  assert.deepEqual(c.expected.downloads, []);
  if (e.code === 'SOURCE_SCHEMA') {
    assert.deepEqual([e.record, e.column, Object.keys(input).length], [null, null, 3]);
    return;
  }
  const invalidBytes = input.kind === 'bytes';
  if (invalidBytes) {
    const bytes = Buffer.from(input.hex, 'hex');
    assert.throws(() => fatal.decode(bytes), TypeError);
    const prefix = fatal.decode(bytes.subarray(0, bytes.findIndex(byte => byte === 0xc3 || byte === 0xf0)));
    assert.deepEqual([e.record, e.column], [2, 2]);
    if (e.code === 'CSV_SYNTAX') assert.equal(fields(lines(prefix)[1]).fault, 2);
    else {
      assert.equal(e.code, 'INVALID_UTF8');
      assert.match(lines(prefix)[1], /^W1,"?$/u);
    }
    return;
  }
  const raw = text(input);
  const sourceLines = lines(raw);
  const { values, fault } = fields(sourceLines[e.record - 1] ?? '');
  const value = values[e.column - 1];
  const width = e.source === 'workshops' ? 3 : 4;
  const ids = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/u;
  switch (e.code) {
    case 'SOURCE_EMPTY':
      assert(raw === '' || raw === '\uFEFF');
      assert.deepEqual([e.record,e.column],[1,1]);
      break;
    case 'DATA_ROWS_REQUIRED':
      assert.equal(sourceLines.length, 1);
      assert.deepEqual([e.record,e.column],[2,1]);
      break;
    case 'HEADER_MISMATCH': {
      const required = ['workshop_id', 'title', 'capacity'];
      assert.equal(e.record, 1);
      assert.equal(e.column, values.findIndex((field, index) => field !== required[index]) + 1);
      break;
    }
    case 'COLUMN_COUNT':
      assert.notEqual(values.length, width);
      assert.equal(e.column, Math.min(width, values.length) + 1);
      break;
    case 'CSV_SYNTAX':
      if (c.id === 'lone-cr') {
        assert.match(raw, /\r(?!\n)/u);
        assert.deepEqual([e.record,e.column],[1,3]);
      } else assert.equal(fault, e.column);
      break;
    case 'CONTROL_CHARACTER':
      assert(raw.includes('\t') || raw.includes('\u2028') || /"[^"]*\n[^"]*"/u.test(raw));
      assert.deepEqual([e.record,e.column],[2,2]);
      break;
    case 'UNEXPECTED_BOM':
      assert(raw.replace(/^\uFEFF/u,'').includes('\uFEFF'));
      assert(value.includes('\uFEFF'));
      break;
    case 'INVALID_UNICODE':
      assert.match(value, /[\uD800-\uDFFF]/u);
      break;
    case 'DUPLICATE_ID':
      assert.equal(e.column, 1);
      assert(sourceLines.slice(1, e.record - 1).some(line => fields(line).values[0] === value));
      break;
    case 'ID_FORMAT':
      assert(!ids.test(value));
      break;
    case 'TITLE_LENGTH':
      assert.equal(e.column, 2);
      assert.equal(value.length, 0);
      break;
    case 'TITLE_BLANK':
      assert.equal(e.column, 2);
      assert(value.length > 0 && value.trim() === '');
      break;
    case 'CAPACITY_FORMAT':
      assert.equal(e.column, 3);
      assert(!/^[1-9][0-9]*$/u.test(value));
      break;
    case 'CAPACITY_RANGE':
      assert.match(value, /^[1-9][0-9]*$/u);
      assert(BigInt(value) > 500n);
      break;
    case 'PREFERENCE_GAP':
      assert(value && values.slice(1, e.column - 1).includes(''));
      break;
    case 'DUPLICATE_PREFERENCE':
      assert(value && values.slice(1, e.column - 1).includes(value));
      break;
    case 'UNKNOWN_WORKSHOP':
      assert(!lines(text(c.input.workshops)).slice(1).some(line => fields(line).values[0] === value));
      break;
    default: assert.fail(c.id + ': no witness');
  }
}

function generate(form) {
  if (form.form === 'literal') return form.text;
  if (form.form === 'repeat') return form.prefix + form.unit.repeat(form.count) + form.suffix;
  assert.equal(form.form, 'numbered');
  const rows = [];
  for (let i = form.first; i <= form.last; i++) rows.push(form.pattern.replaceAll('{n}', String(i).padStart(form.width, '0')));
  return [form.header, ...rows].join('\n');
}

function checkBoundary(c) {
  const w = generate(c.input.workshops), p = generate(c.input.preferences);
  const e = c.expected;
  if (e.workshopsBytes) assert.equal(Buffer.byteLength(w), e.workshopsBytes);
  if (!e.ok) {
    const error = e.error;
    if (error.code === 'ROW_LIMIT') assert.equal(lines(error.source === 'workshops' ? w : p).length, error.record);
    else if (error.code === 'INPUT_TOO_LARGE') assert(Buffer.byteLength(w) > 131072);
    else if (error.code === 'TITLE_LENGTH') assert([...fields(lines(w)[1]).values[1]].length > 80);
    else if (error.code === 'ID_FORMAT') assert.equal(fields(lines(p)[1]).values[0].length, 33);
    else assert.fail(c.id);
    assert.deepEqual(e.downloads, []);
    return;
  }
  const parsed = positive(w, p);
  const rows = parsed.people.length > 5 ? parsed.people.map(({ id, choices }) => {
    assert.deepEqual(choices, ['W1']);
    assert.equal(parsed.classes.length, 1);
    assert.equal(parsed.classes[0].capacity, parsed.people.length);
    return { participantId: id, workshopId: 'W1', status: 'assigned', preferenceRank: 1 };
  }) : oracle(parsed);
  const result = summarize(parsed.classes, rows);
  assert.equal(result.workshops.length, e.workshopCount);
  assert.deepEqual(result.totals, e.totals);
  assert.deepEqual(rows.at(0), e.firstRow);
  assert.deepEqual(rows.at(-1), e.lastRow);
  if (e.lastRoster) verifyArtifact(e.lastRoster, rows.filter(row => row.workshopId === 'W30'), 'workshop-30-roster.csv');
  if (e.batchLineCount) assert.equal(csv(rows).split('\r\n').length, e.batchLineCount);
  if (e.rosterLineCount) assert.equal(csv(rows.filter(row => row.workshopId === 'W1')).split('\r\n').length, e.rosterLineCount);
  if (e.titleCodePoints) {
    assert.equal([...parsed.classes[0].title].length, e.titleCodePoints);
    assert.equal(parsed.classes[0].title.length, e.titleUtf16Units);
  }
}

function checkController(test) {
  const urls = new Map();
  const readers = new Map();
  let previous;
  let urlNumber = 0;
  for (const { event, expected: { snapshot: s, effects } } of test.steps) {
    const label = test.id + ': ' + event.type;
    assert.equal(Object.keys(s).length, 11, label);
    const ws = s.sources.workshops, ps = s.sources.preferences;
    const mutating = new Set(['EDIT','READ','CANCEL','RETAIN','EXAMPLE','RESET','LEAVE','RESTORE']);
    assert.equal(s.revision, (previous?.revision ?? 0) + Number(mutating.has(event.type)), label);
    for (const [name, src] of Object.entries(s.sources)) {
      assert.equal(Object.keys(src).length, 5);
      const both = ['EXAMPLE','RESET','LEAVE','RESTORE'].includes(event.type);
      const one = ['EDIT','READ','CANCEL','RETAIN'].includes(event.type) && event.source === name;
      assert.equal(src.generation, (previous?.sources[name].generation ?? 0) + Number(both || one), label);
    }
    if (event.type === 'LOAD' || event.type === 'READ_ERROR') {
      const current = readers.get(event.source);
      if (current !== event.generation) {
        assert.deepEqual(s, previous, label + ' stale');
        assert.deepEqual(effects, []);
      } else {
        readers.delete(event.source);
        if (event.type === 'LOAD' && !s.sources[event.source].issue) {
          assert.equal(s.sources[event.source].text, fatal.decode(Buffer.from(event.hex, 'hex')));
          assert.equal(s.sources[event.source].origin, 'file');
        }
      }
    }
    const ready = s.result || s.preview ? positive(ws.text, ps.text) : null;
    if (s.preview) assert.deepEqual(s.preview, { workshopCount: ready.classes.length, participantCount: ready.people.length });
    const allocated = s.result ? summarize(ready.classes, oracle(ready)) : null;
    if (allocated) assert.deepEqual(s.result, allocated.totals);
    assert.equal(s.downloads.batch, Boolean(allocated));
    assert.equal(s.downloads.roster, Boolean(allocated) && s.selected !== '@unassigned');
    for (const effect of effects) {
      if (effect.type === 'read') {
        assert(!readers.has(effect.source));
        assert.equal(effect.generation, s.sources[effect.source].generation);
        readers.set(effect.source, effect.generation);
      } else if (effect.type === 'abort') {
        assert.equal(readers.get(effect.source), effect.generation);
        readers.delete(effect.source);
      } else if (effect.type === 'createURL') {
        assert.equal(effect.url, 'blob:fixture/' + ++urlNumber);
        const batch = event.kind === 'batch';
        const number = allocated.workshops.findIndex(c => c.workshopId === s.selected) + 1;
        const name = batch ? 'workshop-assignments.csv' : 'workshop-' + String(number).padStart(2, '0') + '-roster.csv';
        const rows = batch ? allocated.rows : allocated.rows.filter(row => row.workshopId === s.selected);
        verifyArtifact(effect.artifact, rows, name);
        urls.set(effect.url, effect.artifact.filename);
      } else if (effect.type === 'download') {
        assert.equal(urls.get(effect.url), effect.filename);
        assert.equal(Boolean(effect.throws), event.fixtureThrow === 'download');
      } else if (effect.type === 'revoke') {
        assert(urls.delete(effect.url));
      } else assert.fail(label + ' unknown effect');
    }
    assert.deepEqual(s.activeExports, [...urls.values()]);
    for (const [name, src] of Object.entries(s.sources)) assert.equal(src.reading, readers.has(name));
    const issues = [ws.issue, ps.issue].filter(Boolean);
    if (!readers.size && !issues.length) {
      const emptyFile = Object.entries(s.sources).find(([, input]) => input.origin === 'file' && input.text === '');
      if (emptyFile) assert.deepEqual(s.validation, { source: emptyFile[0], code: 'SOURCE_EMPTY', record: 1, column: 1 });
    }
    const phase = readers.size ? 'loading' : issues.some(e => e.code !== 'READ_CANCELLED') ? 'error'
      : issues.length ? 'cancelled' : s.validation ? 'error' : ws.origin === 'empty' && ps.origin === 'empty' ? 'empty'
      : ws.origin === 'empty' || ps.origin === 'empty' ? 'partial' : allocated ? 'complete' : s.needsReallocation ? 'dirty' : 'ready';
    assert.equal(s.phase, phase, label);
    if (['RESET','LEAVE','RESTORE'].includes(event.type)) {
      assert.deepEqual([ws.text,ps.text,ws.origin,ps.origin], ['', '', 'empty', 'empty']);
      assert.equal(s.needsReallocation,false);
      assert.equal(urls.size,0);
      assert.equal(readers.size,0);
    }
    previous = s;
  }
}

const sections = [...spec.matchAll(/^## ([A-Za-z]+)$/gm)].map(match => match[1]);
assert.deepEqual(sections, ['goal','scope','userFlow','inputsOutputs','implementation','acceptance','tests','handoff']);
const criteria = [...spec.matchAll(/^\| \u0060(functionality|boundaries|privacy|security|usability|accessibility|localization-seo|toolchain-provenance|compatibility)\u0060 \|/gm)].map(match => match[1]);
assert.equal(new Set(criteria).size, 9);
assert(brief.includes('[SPEC.md](SPEC.md)') && brief.includes('[fixtures.json](fixtures.json)'));
const all = [...f.coreCases,...f.generatedBoundaries,...f.controllerCases];
assert.equal(new Set(all.map(c => c.id)).size, all.length);
for (const c of f.coreCases) {
  if (!c.expected.ok) { witness(c); continue; }
  const parsed = positive(text(c.input.workshops), text(c.input.preferences));
  const rows = oracle(parsed);
  assert.deepEqual(c.expected.result, summarize(parsed.classes, rows), c.id);
  assert.equal(c.expected.downloads.length, parsed.classes.length + 1);
  verifyArtifact(c.expected.downloads[0], rows, 'workshop-assignments.csv');
  parsed.classes.forEach((workshop, index) => verifyArtifact(c.expected.downloads[index + 1],
    rows.filter(row => row.workshopId === workshop.id), 'workshop-' + String(index + 1).padStart(2, '0') + '-roster.csv'));
}
for (const c of f.generatedBoundaries) checkBoundary(c);
for (const c of f.controllerCases) checkController(c);
const find = id => f.coreCases.find(c => c.id === id);
const pairs = [['standard','standard-reordered'],['two-person-order-lower-fill','two-person-order-higher-fill']];
for (const [left, right] of pairs) {
  const a = find(left), b = find(right);
  assert.deepEqual(a.input.workshops,b.input.workshops);
  assert.deepEqual(lines(text(a.input.preferences)).sort(),lines(text(b.input.preferences)).sort());
  assert.notDeepEqual(a.expected.downloads,b.expected.downloads);
}
assert.equal(find(pairs[1][0]).expected.result.totals.assigned, 1);
assert.equal(find(pairs[1][1]).expected.result.totals.assigned, 2);
const samples = [
  find('standard').expected.downloads[0], find('standard').expected.downloads[2],
  find('two-person-order-lower-fill').expected.downloads[2],
];
for (const a of samples) console.log(JSON.stringify({ filename:a.filename, bytes:Buffer.byteLength(a.text), sha256:hash(a.text) }));
console.log(JSON.stringify({ core:f.coreCases.length, positives:f.coreCases.filter(c=>c.expected.ok).length,
  negatives:f.coreCases.filter(c=>!c.expected.ok).length, boundaries:f.generatedBoundaries.length,
  controller:f.controllerCases.length, snapshots:f.controllerCases.reduce((n,c)=>n+c.steps.length,0),
  sections:sections.length, productCriteria:criteria.length, status:'PASS' }));
```

</details>

## 尚待驗證

產品核心、建置、Chromium 桌面、實體行動 Safari／Chrome、真 200% zoom、輔具、Network／Storage、原生選檔／保存及正式站檢查均 `NOT_RUN`。獨立 reviewer 應對固定候選重新跑文件檢查，逐項核對八節、產品九面向和可攜連結。實際 PR、commit、四檔 bytes 與讀回證據見此任務的交接收據。
