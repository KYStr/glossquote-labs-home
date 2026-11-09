// 管線層級：錯誤類別彼此不同（格式/根元素/尺寸無法判定/上限），fixtures F1–F4 走完整管線。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { processInput, PASTE_CHAR_CAP, FILE_BYTE_CAP } from '../public/js/core/process.mjs';
import { STRINGS } from '../public/js/core/strings.mjs';

const NS = 'xmlns="http://www.w3.org/2000/svg"';
const paste = (text) => processInput(text, { size: text.length, capUnit: 'chars' });

test('F1 文件走完整管線：ok、rule 1、零移除', () => {
  const result = paste(`<svg ${NS} width="200" height="100" viewBox="0 0 200 100"><rect width="200" height="100" fill="#3366cc"/></svg>`);
  assert.equal(result.status, 'ok');
  assert.equal(result.intrinsic.rule, 1);
  assert.equal(result.intrinsic.width, 200);
  assert.equal(result.intrinsic.height, 100);
  assert.equal(result.counts.total, 0);
});

test('F4: 無尺寸無 viewBox → undeterminable（與其他錯誤類別不同）', () => {
  const result = paste(`<svg ${NS}><circle r="10"/></svg>`);
  assert.equal(result.status, 'error');
  assert.equal(result.error.code, 'undeterminable');
});

test('格式錯誤：標籤不匹配 → not-well-formed，附行列', () => {
  const result = paste(`<svg ${NS}>\n<rect></svg>`);
  assert.equal(result.status, 'error');
  assert.equal(result.error.code, 'not-well-formed');
  assert.equal(typeof result.error.line, 'number');
  assert.equal(typeof result.error.column, 'number');
});

test('格式錯誤：未定義實體、重複屬性、未閉合標籤', () => {
  assert.equal(paste(`<svg ${NS}><text>&nosuch;</text></svg>`).error.code, 'not-well-formed');
  assert.equal(paste(`<svg ${NS} width="1" width="2"/>`).error.code, 'not-well-formed');
  assert.equal(paste(`<svg ${NS}><rect>`).error.code, 'not-well-formed');
  assert.equal(paste('not xml at all').error.code, 'not-well-formed');
});

test('DOCTYPE：無內部子集可接受；帶內部子集拒絕', () => {
  assert.equal(paste(`<!DOCTYPE svg><svg ${NS} viewBox="0 0 24 24"/>`).status, 'ok');
  assert.equal(paste(`<!DOCTYPE svg [<!ENTITY x "y">]><svg ${NS} viewBox="0 0 24 24"/>`).error.code, 'not-well-formed');
});

test('字元參照可解析並在序列化還原為字元', () => {
  const result = paste(`<svg ${NS} viewBox="0 0 24 24"><text>&#65;&#x42;</text></svg>`);
  assert.equal(result.status, 'ok');
  assert.ok(result.serialized.includes('AB'));
});

test('根元素錯誤：無名稱空間的 svg、其他根元素', () => {
  const noNs = paste('<svg viewBox="0 0 24 24"/>');
  assert.equal(noNs.error.code, 'root');
  assert.equal(noNs.error.found, 'svg');
  assert.equal(noNs.error.foundNamespace, null);
  const html = paste('<html xmlns="http://www.w3.org/1999/xhtml"/>');
  assert.equal(html.error.code, 'root');
  assert.equal(html.error.found, 'html');
});

test('貼上上限：恰 200,000 字元可過，200,001 擋下並回報實際大小', () => {
  const head = `<svg ${NS} viewBox="0 0 24 24"><!--`;
  const tail = `--><rect width="24" height="24"/></svg>`;
  const padding = 'x'.repeat(PASTE_CHAR_CAP - head.length - tail.length);
  const exact = head + padding + tail;
  assert.equal(exact.length, PASTE_CHAR_CAP);
  assert.equal(paste(exact).status, 'ok');
  const over = exact + ' ';
  const result = paste(over);
  assert.equal(result.error.code, 'input-over-cap');
  assert.equal(result.error.size, PASTE_CHAR_CAP + 1);
  assert.equal(result.error.limit, PASTE_CHAR_CAP);
});

test('檔案上限：2,000,000 位元組可過，2,000,001 擋下', () => {
  const svg = `<svg ${NS} viewBox="0 0 24 24"/>`;
  assert.equal(processInput(svg, { size: FILE_BYTE_CAP, capUnit: 'bytes' }).status, 'ok');
  const result = processInput(svg, { size: FILE_BYTE_CAP + 1, capUnit: 'bytes' });
  assert.equal(result.error.code, 'input-over-cap');
  assert.equal(result.error.capUnit, 'bytes');
});

test('雙語字串鍵集合完全一致', () => {
  assert.deepEqual(Object.keys(STRINGS.en).sort(), Object.keys(STRINGS.zh).sort());
});
