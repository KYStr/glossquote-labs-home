# 題庫抽卷與答案表｜作者檢查

文件來源為 `14d3dff09fe8f283726a7e8cb9eaadd905500516` 的固定 TASK 與研究 BRIEF。本人 actor `local-codex:01a1c8b8-1d30-7593-9793-f99d5f42f564`，claim `fh-quiz-claim-936e2143-6cba-431f-978a-def04adf3bf1`，registry r1651 的四個原操作已核對。當次 CAS 立即讀到較舊 r1647，後續唯讀核對公開 commit、全部事件和同一 registry bytes，確定 r1651 的工作狀態。作者檢查的範圍是文件及合成案例。[固定 registry](https://github.com/KYStr/glossquote-labs-home/blob/1d09642d3e46f0dcde3f95ed56ff7b5f27489559/coordination/work-registry.json) · [研究 BRIEF](https://github.com/KYStr/glossquote-labs-home/blob/14d3dff09fe8f283726a7e8cb9eaadd905500516/docs/specs/quiz-paper-builder/BRIEF.md)

## 重現命令

在四檔所在目錄執行。Node 24 ESM built-ins，無安裝、網路、產品程式或暫存檔。這段程式讀取已寫好的字面案例，使用 sticky CSV grammar、逐主題找最小、獨立 HTML 重建及有限控制器轉移來核對。固定來源的載入、SHA-256 及選題另以 Windows PowerShell 的 .NET SHA-256 ordinal 比較複核。

~~~sh
node --version
node --input-type=module -e "import {readFileSync} from 'node:fs'; const code=readFileSync('AUTHOR-CHECK.md','utf8').match(/~~~js\n([\s\S]*?)\n~~~/)[1]; await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));"
~~~

~~~js
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';

const names = ['AUTHOR-CHECK.md', 'BRIEF.md', 'SPEC.md', 'fixtures.json'];
assert.deepEqual(readdirSync('.').sort(), names);
const content = new Map(names.map(name => [name, new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(readFileSync(name))]));
let localLinks = 0;
for (const [name, text] of content) {
  assert(!text.startsWith('\ufeff') && !text.includes('\r'), name);
  assert(text.endsWith('\n') && !text.endsWith('\n\n'), name);
  if (name.endsWith('.md')) {
    for (const [, href] of text.matchAll(/\[[^\]\n]+\]\(([^)\s]+)\)/g)) {
      if (href.startsWith('https://')) continue;
      assert(names.includes(href), href);
      localLinks++;
    }
  }
}
const spec = content.get('SPEC.md');
const sections = ['goal', 'scope', 'userFlow', 'inputsOutputs', 'implementation', 'acceptance', 'tests', 'handoff'];
assert.deepEqual([...spec.matchAll(/^## \d\. (\w+)$/gm)].map(match => match[1]), sections);
const aspects = ['functionality', 'boundaries', 'privacy', 'security', 'usability', 'accessibility',
  'localization-seo', 'toolchain-provenance', 'compatibility'];
const criteriaBlock = spec.split('## 6. acceptance\n')[1].split('## 7. tests\n')[0];
const tick = String.fromCharCode(96);
for (const id of aspects) assert(criteriaBlock.includes('| ' + tick + id + tick + ' |'));

const f = JSON.parse(content.get('fixtures.json'));
assert.equal(f.schemaVersion, 1);
const header = 'id,topic,prompt,a,b,c,d,correct';
const error = (code, scope = 'source', record = null, column = null, quotaIndex = null) => ({ code, scope, record, column, quotaIndex });
const invalid = (code, record = null, column = null) => { throw error(code, 'source', record, column); };
const control = /[\u0000-\u001f\u007f-\u009f]/u;
const lineSeparator = /[\u2028\u2029]/u;
const blank = /^[\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]*$/u;
const whole = (regex, text) => regex.exec(text)?.[0] === text;
const size = text => [...text].length;

function parseFixture(input) {
  let text;
  if (input.kind === 'bytes') {
    const bytes = Buffer.from(input.hex, 'hex');
    if (bytes.length > 524288) invalid('SOURCE_TOO_LARGE');
    try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
    catch { invalid('SOURCE_UTF8'); }
  } else {
    text = input.text;
    if (text.length > 524288) invalid('SOURCE_TOO_LARGE');
    if (!text.isWellFormed()) invalid('SOURCE_UNICODE');
    if (Buffer.byteLength(text) > 524288) invalid('SOURCE_TOO_LARGE');
  }
  if (text.startsWith('\ufeff')) text = text.slice(1);
  if (text.startsWith('\ufeff')) invalid('CSV_BOM', 1, 1);
  if (text === '') invalid('SOURCE_EMPTY');
  const quoted = /"(?:[^"]|"")*"(?!")/y;
  const unquoted = /[^",\r\n]*/y;
  const topics = new Map();
  const ids = new Set();
  const rows = [];
  let cursor = 0;
  let record = 1;
  while (cursor < text.length) {
    if (record > 501) invalid('CSV_ROW_LIMIT', record);
    const fields = [];
    for (let column = 1; ; column++) {
      const isQuoted = text[cursor] === '"';
      const matcher = isQuoted ? quoted : unquoted;
      matcher.lastIndex = cursor;
      const match = matcher.exec(text);
      if (!match) {
        const illegalBeforeEof = /\0|\r(?!\n)/.exec(text.slice(cursor));
        if (illegalBeforeEof) invalid(illegalBeforeEof[0] === '\0' ? 'CSV_NUL' : 'CSV_NEWLINE', record, column);
        invalid('CSV_QUOTE', record, column);
      }
      const literal = match[0];
      const illegal = /\0|\r(?!\n)/.exec(literal);
      if (illegal) invalid(illegal[0] === '\0' ? 'CSV_NUL' : 'CSV_NEWLINE', record, column);
      fields.push(isQuoted ? literal.slice(1, -1).replaceAll('""', '"') : literal);
      cursor += literal.length;
      const next = text[cursor];
      if (next === ',') {
        if (column === 8) invalid('CSV_WIDTH', record, 9);
        cursor++;
        continue;
      }
      if (next === '\0') invalid('CSV_NUL', record, column);
      if (next === '\r') {
        if (text[cursor + 1] !== '\n') invalid('CSV_NEWLINE', record, column);
        cursor += 2;
      } else if (next === '\n') cursor++;
      else if (next !== undefined) invalid('CSV_QUOTE', record, column);
      break;
    }
    if (fields.length !== 8) invalid('CSV_WIDTH', record, fields.length + 1);
    if (record === 1) {
      const mismatch = header.split(',').findIndex((name, index) => fields[index] !== name);
      if (mismatch >= 0) invalid('CSV_HEADER', 1, mismatch + 1);
    } else {
      const [id, topic, prompt, a, b, c, d, correct] = fields;
      if (!whole(/^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/, id)) invalid('ID_FORMAT', record, 1);
      if (ids.has(id)) invalid('ID_DUPLICATE', record, 1);
      if (size(topic) < 1 || size(topic) > 60) invalid('TOPIC_LENGTH', record, 2);
      if (control.test(topic) || lineSeparator.test(topic)) invalid('TOPIC_CONTROL', record, 2);
      if (topic.startsWith(' ') || topic.endsWith(' ')) invalid('TOPIC_SPACE', record, 2);
      if (!topics.has(topic) && topics.size === 30) invalid('TOPIC_LIMIT', record, 2);
      for (const [index, value] of [prompt, a, b, c, d].entries()) {
        if (size(value) < 1 || size(value) > (index ? 200 : 500)) invalid('TEXT_LENGTH', record, index + 3);
        if (control.test(value.replace(/\r\n|\n/g, ''))) invalid('TEXT_CONTROL', record, index + 3);
        if (blank.test(value)) invalid('TEXT_BLANK', record, index + 3);
      }
      const choices = [a, b, c, d];
      const duplicate = choices.findIndex((choice, index) => choices.indexOf(choice) < index);
      if (duplicate >= 0) invalid('OPTION_DUPLICATE', record, 4 + duplicate);
      if (!['A', 'B', 'C', 'D'].includes(correct)) invalid('CORRECT_FORMAT', record, 8);
      ids.add(id);
      topics.set(topic, (topics.get(topic) ?? 0) + 1);
      rows.push({ id, topic, prompt, choices, correct });
    }
    record++;
  }
  if (!rows.length) invalid('CSV_EMPTY_BANK', 2);
  return { rows, topics: [...topics.keys()].sort().map(topic => ({ topic, available: topics.get(topic) })) };
}

const summarize = bank => ({ questions: bank.rows.length, topics: bank.topics });
function settingsError(bank, cfg) {
  if (!cfg || Object.keys(cfg).sort().join('/') !== 'quotas/seed/title'
      || typeof cfg.title !== 'string' || typeof cfg.seed !== 'string' || !Array.isArray(cfg.quotas)
      || cfg.quotas.length !== bank.topics.length || Array.from(cfg.quotas).some(value => typeof value !== 'string')) {
    return error('SETTINGS_SHAPE', 'quota');
  }
  if (size(cfg.title) < 1 || size(cfg.title) > 80) return error('TITLE_LENGTH', 'title');
  if (!cfg.title.isWellFormed() || control.test(cfg.title) || lineSeparator.test(cfg.title)) return error('TITLE_CONTROL', 'title');
  if (!whole(/^[A-Za-z0-9_-]{1,32}$/, cfg.seed)) return error('SEED_FORMAT', 'seed');
  for (const [i, value] of cfg.quotas.entries()) {
    if (!whole(/^(?:0|[1-9][0-9]{0,2})$/, value)) return error('QUOTA_FORMAT', 'quota', null, null, i);
    if (Number(value) > bank.topics[i].available) return error('QUOTA_RANGE', 'quota', null, null, i);
  }
  const total = cfg.quotas.reduce((sum, value) => sum + Number(value), 0);
  return total < 1 || total > 60 ? error('QUOTA_TOTAL', 'quota') : null;
}
function captureParse(input) {
  try { return summarize(parseFixture(input)); }
  catch (failure) { if (!failure?.code || !failure?.scope) throw failure; return failure; }
}
for (const [ref, bank] of Object.entries(f.banks)) {
  assert.deepEqual(parseFixture(f.sources[ref]), bank, ref);
  assert.deepEqual(summarize(bank), f.bankSummaries[ref], ref);
}
for (const row of f.errorCases) {
  const observed = row.stage === 'parse' ? captureParse(row.input) : settingsError(f.banks[row.input.bankRef], row.input.settings);
  assert.deepEqual(observed, row.expected, row.id);
}

const encoder = new TextEncoder();
const digest = async (seed, id) => Buffer.from(await webcrypto.subtle.digest('SHA-256',
  encoder.encode(['gq-quiz-v1', seed, id].join('\n')))).toString('hex');
async function pick(bank, cfg, fixedDigest) {
  assert.equal(settingsError(bank, cfg), null);
  const digests = Object.fromEntries(await Promise.all(bank.rows.map(async row => [row.id, fixedDigest ?? await digest(cfg.seed, row.id)])));
  const selected = [];
  for (const [i, topic] of bank.topics.entries()) {
    const remaining = bank.rows.filter(row => row.topic === topic.topic);
    for (let n = 0; n < Number(cfg.quotas[i]); n++) {
      let best = 0;
      for (let j = 1; j < remaining.length; j++) {
        const earlier = remaining[best].id;
        const later = remaining[j].id;
        if (digests[later] < digests[earlier] || (digests[later] === digests[earlier] && later < earlier)) best = j;
      }
      selected.push(remaining.splice(best, 1)[0]);
    }
  }
  return { digests, selected };
}
const sha256 = text => createHash('sha256').update(text, 'utf8').digest('hex');
const escape = text => Array.from(text, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '\r': '&#13;' })[ch] ?? ch).join('');
const styleHash = createHash('sha256').update(f.htmlContract.style, 'utf8').digest('base64');
assert.equal(styleHash, f.htmlContract.styleSha256Base64);
assert.equal(f.htmlContract.csp, "default-src 'none'; script-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'; style-src 'sha256-" + styleHash + "';");
const th = (scope, value) => '<th scope="' + scope + '">' + value + '</th>';
const bidi = value => '<bdi>' + escape(value) + '</bdi>';
const columnLabels = {
  'zh-Hant': ['題號', '題庫 ID', '主題', '正解', '正解文字'],
  en: ['No.', 'Question ID', 'Topic', 'Answer', 'Correct choice'],
};
function expectedHtml(role, model, lang) {
  const title = escape(model.title);
  const frame = [
    '<!doctype html>', '<html lang="' + lang + '">', '<head>', '<meta charset="utf-8">',
    '<meta http-equiv="Content-Security-Policy" content="' + f.htmlContract.csp + '">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">', '<meta name="robots" content="noindex,nofollow">',
    '<title>' + title + '</title>', '<style>' + f.htmlContract.style + '</style>', '</head>', '<body>', '<main>', '<h1>' + bidi(model.title) + '</h1>',
  ];
  if (role === 'student') {
    frame.push('<ol class="questions">');
    for (const q of model.questions) frame.push('<li class="question">', '<p>' + bidi(q.prompt) + '</p>', '<ol class="choices" type="A">',
      ...q.choices.map(value => '<li>' + bidi(value) + '</li>'), '</ol>', '</li>');
    frame.push('</ol>');
  } else {
    frame.push('<table>', '<thead><tr>' + columnLabels[lang].map(value => th('col', value)).join('') + '</tr></thead>', '<tbody>');
    for (const r of model.answers) {
      const cells = [bidi(r.id), bidi(r.topic), r.correct, bidi(r.answer)].map(value => '<td>' + value + '</td>').join('');
      frame.push('<tr>' + th('row', r.number) + cells + '</tr>');
    }
    frame.push('</tbody>', '</table>');
  }
  return frame.concat('</main>', '</body>', '</html>', '').join('\n');
}
const readFiles = new Set();
for (const entry of f.successCases) {
  const bank = parseFixture(f.sources[entry.sourceRef]);
  assert.deepEqual(summarize(bank), f.bankSummaries[entry.bankRef], entry.id);
  const { digests, selected } = await pick(bank, entry.settings);
  const ids = selected.map(row => row.id);
  if (entry.bankRef === 'sample') {
    const rank = f.ranking[entry.settings.seed];
    assert.deepEqual(digests, rank.digests, entry.id);
    assert.deepEqual(ids, rank.selected, entry.id);
  }
  const { title } = entry.settings;
  const student = { title, questions: selected.map((r, i) => ({ number: i + 1, prompt: r.prompt, choices: r.choices })) };
  const answer = { title, answers: selected.map((r, i) => ({ number: i + 1, id: r.id, topic: r.topic,
    correct: r.correct, answer: r.choices['ABCD'.indexOf(r.correct)] })) };
  assert.deepEqual({ student, answer }, f.papers[entry.paperRef], entry.id);
  for (const [role, model] of Object.entries({ student, answer })) {
    const ref = entry.files[role];
    const file = f.htmlFiles[ref];
    readFiles.add(ref);
    assert.equal(file.filename, role === 'student' ? 'quiz-student.html' : 'quiz-answer-key.html');
    assert.equal(file.mime, 'text/html;charset=utf-8');
    assert.equal(file.utf8, expectedHtml(role, model, entry.locale), ref);
    assert.equal(file.byteLength, Buffer.byteLength(file.utf8));
    assert.equal(file.sha256, sha256(file.utf8));
    assert(!file.utf8.includes('\r') && !file.utf8.startsWith('\ufeff') && file.utf8.endsWith('\n') && !file.utf8.endsWith('\n\n'));
    assert(!/<(?:img|script|iframe|form|a|link)\b/i.test(file.utf8), ref);
    assert(file.utf8.indexOf('Content-Security-Policy') < file.utf8.indexOf('<style>'), ref);
  }
}
assert.equal(readFiles.size, Object.keys(f.htmlFiles).length);
const normal = f.successCases.find(row => row.id === 'sample-zh');
const flipped = f.successCases.find(row => row.id === 'correct-only-changes-answer');
const reverse = f.successCases.find(row => row.id === 'reversed-bytes-equal');
assert.deepEqual(reverse.files, normal.files);
assert.equal(flipped.files.student, normal.files.student);
assert.notEqual(f.htmlFiles[flipped.files.answer].sha256, f.htmlFiles[normal.files.answer].sha256);
assert.equal(f.papers.flipped.answer.answers[0].answer, '中央山脈');
assert(f.htmlFiles.escapingStudent.utf8.includes('&gt;？&#13;\n&quot;第二行&quot;'));

const b = f.boundaryCases;
const csv = rows => [header, ...rows, ''].join('\n');
const paste = text => ({ kind: 'paste', text });
const enumerated = (count, pattern) => Array.from({ length: count }, (_, i) => pattern.replaceAll('{n:3}', String(i + 1).padStart(3, '0')));
for (const variant of b.sourceBytes.variants) {
  const { rowCount, idPrefix, idPad, topic, prompt, a, b: optionB, c, d, correct } = b.sourceBytes;
  const repeat = ({ character, count }) => character.repeat(count);
  const rows = Array.from({ length: rowCount }, (_, i) => [
    idPrefix + String(i + 1).padStart(idPad, '0'), topic, repeat(prompt), repeat(a), repeat(optionB),
    c.character.repeat(c.baseCount + Number(i < c.extraForRows1Through) + (i === 0 ? variant.firstRowCOffset : 0)), d, correct,
  ].join(','));
  assert.equal(Buffer.byteLength(csv(rows)), variant.byteLength);
  assert.deepEqual(captureParse(paste(csv(rows))), variant.expected);
}
for (const variant of b.recordCount.variants) assert.deepEqual(captureParse(paste(csv(enumerated(variant.records, b.recordCount.rowPattern)))), variant.expected);
for (const variant of b.topicCount.variants) {
  const actual = captureParse(paste(csv(enumerated(variant.records, b.topicCount.rowPattern))));
  if (actual.code) assert.deepEqual(actual, variant.expected);
  else assert.deepEqual({ questions: actual.questions, topicCount: actual.topics.length, first: actual.topics[0].topic,
    last: actual.topics.at(-1).topic, availableEach: Math.max(...actual.topics.map(row => row.available)) }, variant.expected);
}
const bank61 = parseFixture(paste(csv(enumerated(b.drawCount.bank.recordCount, b.drawCount.bank.rowPattern))));
const pick60 = await pick(bank61, b.drawCount.accepted.settings);
assert.equal(pick60.selected.length, 60);
assert.equal(new Set(pick60.selected.map(row => row.id)).size, 60);
assert.deepEqual(settingsError(bank61, b.drawCount.rejected.settings), b.drawCount.rejected.expected);
for (const item of b.codePoints) {
  for (const [which, count] of [['valid', item.validCount], ['invalid', item.invalidCount]]) {
    const value = item.unit.repeat(count);
    const fields = ['Q', 'T', 'p', 'a', 'b', 'c', 'd', 'A'];
    const cfg = { title: '練習題', seed: 'lesson-1', quotas: ['1', '1'] };
    let observed;
    if (item.field in cfg) {
      cfg[item.field] = value;
      observed = settingsError(f.banks.sample, cfg);
    } else {
      fields[header.split(',').indexOf(item.field)] = value;
      observed = captureParse(paste(csv([fields.join(',')])));
      if (observed.questions === 1) observed = null;
    }
    assert.deepEqual(observed, which === 'valid' ? null : item.expected, item.field);
  }
}
for (const variant of b.outputBytes.variants) {
  const pair = [variant.studentBytes, variant.answerBytes].map(length => Buffer.alloc(length, b.outputBytes.fillByte));
  const result = pair.some(bytes => bytes.length > 2097152) ? error('OUTPUT_TOO_LARGE', 'output') : 'ok';
  assert.deepEqual(result, variant.expected);
}
const utf16 = parseFixture(b.utf16TopicOrder.source);
assert.deepEqual(utf16.topics.map(row => row.topic), b.utf16TopicOrder.topics);
assert.deepEqual((await pick(utf16, b.utf16TopicOrder.settings)).selected.map(row => row.id), b.utf16TopicOrder.ids);
assert.deepEqual((await pick(parseFixture(b.digestTie.source), b.digestTie.settings, b.digestTie.digestHex)).selected.map(row => row.id), b.digestTie.ids);

function checkTrace(trace) {
  const empty = (locale, epoch) => ({ phase: 'empty', locale, epoch, hasSource: false, bank: null,
    settings: { title: locale === 'en' ? 'Practice quiz' : '練習題', seed: 'lesson-1', quotas: [] }, active: null,
    preview: null, downloads: { student: false, answer: false }, downloadCount: 0, notice: null, error: null, composition: null });
  let current = empty(trace.initial.locale, 1);
  assert.deepEqual(current, trace.initial);
  let serial = 0;
  let compositionSerial = 0;
  let leaseSerial = 0;
  let posted = false;
  let output;
  let source;
  const leases = new Set();
  const counts = { starts: 0, posts: 0, terminates: 0, staticRevokes: 0, downloads: 0, outputRevokes: 0, navigations: 0 };
  for (const [index, step] of trace.steps.entries()) {
    let e = step.event;
    let next = structuredClone(current);
    let effect = null;
    function terminate() {
      if (!next.active) return;
      counts.terminates++;
      if (!posted) counts.staticRevokes++;
      next.active = null;
      posted = false;
    }
    function releaseAll() {
      const all = [...leases];
      counts.outputRevokes += all.length;
      leases.clear();
      return all;
    }
    function clearOutput() {
      next.preview = null;
      next.notice = null;
      output = undefined;
      const revoked = releaseAll();
      if (revoked.length) effect = { kind: 'revoke', leaseIds: revoked };
    }
    function start(kind) {
      next.active = { kind, epoch: current.epoch, run: ++serial };
      counts.starts++;
      next.phase = kind === 'read' ? 'reading' : 'generating';
    }
    function clear(locale) {
      terminate();
      clearOutput();
      source = undefined;
      next = empty(locale, current.epoch + 1);
    }
    if (e.type === 'composition-end') {
      const active = current.composition;
      e = active?.id === e.id
        ? { type: active.field, index: active.index, value: e.value, committed: true }
        : { type: 'ignored' };
      if (e.committed) next.composition = null;
    }
    const validField = e.field === 'quota'
      ? Number.isInteger(e.index) && e.index >= 0 && e.index < current.settings.quotas.length
      : ['source', 'title', 'seed'].includes(e.field) && e.index === null;
    if (e.type === 'composition-start' && !current.composition && validField && Number.isSafeInteger(e.id) && e.id > compositionSerial) {
      compositionSerial = e.id;
      terminate(); clearOutput();
      if (current.active) effect = { kind: 'terminate', run: current.active.run };
      next.error = null;
      next.phase = next.bank ? 'dirty-settings' : next.hasSource ? 'dirty-source' : 'empty';
      next.composition = { id: e.id, field: e.field, index: e.index };
    } else if (current.composition && !e.committed && (['read', 'generate', 'download'].includes(e.type)
      || (e.type === current.composition.field && (e.type !== 'quota' || e.index === current.composition.index)))) {
      // Intermediate DOM input is invisible to the committed model.
    } else if (e.type === 'source' || e.type === 'sample') {
      const incoming = e.committed ? (e.value === '' ? undefined : { kind: 'paste', text: e.value })
        : f.sources[e.sourceRef ?? 'sample'];
      if (JSON.stringify(source) !== JSON.stringify(incoming)) {
        terminate(); clearOutput();
        source = incoming;
        next.composition = null; next.hasSource = Boolean(source);
        next.bank = null; next.settings.quotas = []; next.phase = source ? 'dirty-source' : 'empty'; next.error = null;
      }
    } else if (e.type === 'title' || e.type === 'seed' || e.type === 'quota') {
      const previous = e.type === 'quota' ? current.settings.quotas[e.index] : current.settings[e.type];
      if (previous !== e.value) {
        terminate(); clearOutput();
        next.composition = null;
        if (e.type === 'quota') next.settings.quotas[e.index] = e.value;
        else next.settings[e.type] = e.value;
        next.error = null; next.phase = next.bank ? 'dirty-settings' : next.hasSource ? 'dirty-source' : 'empty';
      }
    } else if (e.type === 'read' && !current.active && !current.bank) {
      clearOutput(); next.error = null; next.bank = null; next.settings.quotas = [];
      if (current.hasSource && e.adapterCreateFails) {
        counts.staticRevokes++;
        next.phase = 'error'; next.error = error('WORKER_UNAVAILABLE', 'worker');
      }
      else if (current.hasSource) start('read');
      else { next.phase = 'error'; next.error = error('SOURCE_EMPTY'); }
    } else if (e.type === 'generate' && current.bank && !current.active) {
      clearOutput();
      next.error = settingsError(current.bank, current.settings);
      if (next.error) next.phase = 'error';
      else start('generate');
    } else if (e.type === 'worker' && e.fromRun === current.active?.run) {
      const m = e.message;
      if (m.kind === 'ready' && !posted) { posted = true; counts.posts++; counts.staticRevokes++; }
      else if (m.epoch === current.epoch && m.run === current.active.run) {
        const deliveredAfterReady = posted;
        terminate();
        if (!deliveredAfterReady) { next.phase = 'error'; next.error = error('WORKER_FAILED', 'worker'); }
        else if (m.kind === 'loaded') {
          next.bank = summarize(f.banks[m.bankRef]); next.settings.quotas = next.bank.topics.map(() => '0'); next.phase = 'configured';
        } else if (m.kind === 'generated') {
          output = f.successCases.find(row => row.id === m.outputRef);
          assert.deepEqual(output.settings, current.settings);
          assert.equal(output.locale, current.locale);
          next.phase = 'ready'; next.preview = 'student';
        } else { assert.equal(m.kind, 'failed'); next.phase = 'error'; next.error = m.error; }
      }
    } else if (current.active && (e.type === 'cancel' || (e.type === 'timeout' && e.epoch === current.epoch && e.run === current.active.run))) {
      terminate(); clearOutput();
      effect = { kind: 'terminate', run: current.active.run };
      next.phase = e.type === 'cancel' ? 'cancelled' : 'error';
      next.error = e.type === 'cancel' ? null : error('WORKER_TIMEOUT', 'worker');
    } else if (e.type === 'select' && current.phase === 'ready') next.preview = e.role;
    else if (e.type === 'download' && current.phase === 'ready' && leases.size < 4) {
      const fileRef = output.files[e.role];
      assert(f.htmlFiles[fileRef]);
      const leaseId = 'lease-' + ++leaseSerial;
      leases.add(leaseId); counts.downloads++;
      next.notice = leases.size === 4 ? 'download-limit' : 'download-requested';
      effect = { kind: 'download', fileRef, leaseId };
    } else if (e.type === 'lease-expired' && leases.delete(e.leaseId)) {
      counts.outputRevokes++;
      if (next.notice === 'download-limit') next.notice = null;
      effect = { kind: 'revoke', leaseIds: [e.leaseId] };
    } else if (e.type === 'language' && e.confirmed) {
      const revokeLeaseIds = [...leases];
      clear(e.locale); counts.navigations++;
      effect = { kind: 'navigate', path: e.locale === 'en' ? '/en/index.html' : '/index.html' };
      if (revokeLeaseIds.length) effect.revokeLeaseIds = revokeLeaseIds;
    } else if (e.type === 'reset' || e.type === 'pagehide' || (e.type === 'pageshow' && e.persisted)) clear(current.locale);
    next.downloadCount = leases.size;
    const enabled = next.phase === 'ready' && leases.size < 4;
    next.downloads = { student: enabled, answer: enabled };
    assert.deepEqual(next, step.expected, trace.id + ' step ' + (index + 1));
    assert.deepEqual(effect, step.effect, trace.id + ' effect ' + (index + 1));
    current = next;
  }
  assert.deepEqual(counts, trace.adapterCounts, trace.id);
}
for (const trace of f.controllerTraces) checkTrace(trace);
const controllerSteps = f.controllerTraces.reduce((sum, trace) => sum + trace.steps.length, 0);
console.log(JSON.stringify({ ok: true, docs: names.length, sections: sections.length, productAspects: aspects.length,
  localLinks, successes: f.successCases.length, errors: f.errorCases.length, boundaryGroups: Object.keys(b).length,
  htmlFiles: readFiles.size, controllerTraces: f.controllerTraces.length, controllerSteps, styleHash }));
~~~

## 檢查範圍與狀態

作者於 2026-11-11 台北時間使用 Node `v24.14.0` 執行上述離線命令，exit 0。核對四檔、八個文件面向、九個產品驗收 ID、11 條相對連結、7 個成功案例、40 個精確錯誤案例、8 組邊界、9 份完整 HTML、3 條控制器 trace 共 85 步。組字案例包含未改值撤銷下載、終止忙碌 Worker、拒絕晚到結果及重設後的晚到 compositionend。樣式的 SHA-256 Base64 為 `zN91wbzdYDm8DL79bfTqhVG92Io1YZZzU1hGzSI5yoY=`。

固定 `lesson-1` 的繁中學員檔為 1,674 bytes，SHA-256 `22153b192067e9968d8baaf74efb8218e0e4b7ef0b50b46807dea79a419b26f4`。G01 正解改為 B 時仍使用這一完整學員檔，講師首列更新為 B／中央山脈。倒序 CSV 與單 BOM、混合分隔、合法引用表頭的案例共用原本兩檔。

| 文件 | 作者自查 |
| --- | --- |
| 使用情境與差異 | 本地與雲端問答卡、批次套版皆讀固定原始碼，遠端 registry 與 PR 查重 |
| 排序與精確 bytes | Node 與 .NET 各驗 `lesson-1`、`lesson-3`；凍結完整學員和答案 HTML 與固定 style hash |
| 兩語狀態與防晚到 | 逐事件核對完整 Snapshot、effects 及 adapter 呼叫數 |
| 真實產品檢查 | NOT_RUN。本候選為文件。真瀏覽器、桌面焦點隔離、裝置、讀屏、列印、正式網站及部署由後續產品工作驗證 |
| 文件獨立審查 | 待非作者核對同一公開 PR head 的八個面向；`spec.acceptanceCriteria` 綁 [SPEC](SPEC.md) 的九項產品驗收 |

相對入口：[BRIEF](BRIEF.md) · [SPEC](SPEC.md) · [字面案例](fixtures.json)。作者固定文檔驗證應記錄 Node 版本、exit code 和完整摘要。候選 commit、PR、公開檔案 Git blob／SHA-256 與逐檔 bytes 的讀回保存在任務 HANDOFF，避免在文件中自我引用未生成的 commit。
