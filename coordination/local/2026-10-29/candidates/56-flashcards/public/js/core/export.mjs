import { validateDeck, validateCards, fail, LIMITS } from './schema.mjs';

export function serializeDeck(cards, known = []) {
  const value = validateDeck({ schemaVersion: 1, cards, known: [...known] });
  const text = `${JSON.stringify(value, null, 2)}\n`;
  if (new TextEncoder().encode(text).byteLength > LIMITS.jsonBytes) fail('EXPORT_TOO_LARGE', 'output');
  return text;
}
export function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
const COPY = {
  'zh-Hant': { title: '問答卡：題目與答案對照', questions: '題目頁', answers: '答案對照', number: '題號', answer: '答案', note: '使用相同題號對照答案。可自行列印此檔案；不保證雙面印表機對位。' },
  en: { title: 'Flashcards: questions and answer key', questions: 'Question sheets', answers: 'Answer key', number: 'No.', answer: 'Answer', note: 'Match answers by number. Print this file yourself; duplex alignment is not guaranteed.' },
};
export function renderStudyHtml(cards, { locale = 'zh-Hant' } = {}) {
  const deck = validateCards(cards);
  if (!Object.hasOwn(COPY, locale)) fail('INVALID_LOCALE');
  const text = COPY[locale];
  const questions = deck.map((card, index) => `<li><span class="number">${index + 1}</span><p>${escapeHtml(card.question)}</p></li>`).join('\n');
  const answers = deck.map((card, index) => `<tr><th scope="row">${index + 1}</th><td>${escapeHtml(card.answer)}</td></tr>`).join('\n');
  return `<!doctype html>
<html lang="${locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${text.title}</title>
<style>:root{font-family:"Segoe UI",system-ui,sans-serif;color:#111410;background:#fff}body{margin:2rem;line-height:1.6}h1{font-size:1.75rem}h2{font-size:1.25rem}p,td{white-space:pre-wrap;overflow-wrap:anywhere;word-break:normal}ol{list-style:none;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}li{border:1px solid #60645c;padding:1rem;min-height:8rem;break-inside:avoid}li p{margin:0.5rem 0}.number{font-weight:700}table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{border:1px solid #60645c;padding:0.75rem;vertical-align:top}th:first-child{width:4rem}thead{display:table-header-group}@media(max-width:40rem){body{margin:1rem}ol{grid-template-columns:1fr}}@media print{@page{margin:15mm}body{margin:0}section.answers{break-before:page}li{min-height:35mm}tr{break-inside:avoid}}</style></head>
<body><h1>${text.title}</h1><p>${text.note}</p><section><h2>${text.questions}</h2><ol>${questions}</ol></section><section class="answers"><h2>${text.answers}</h2><table><thead><tr><th scope="col">${text.number}</th><th scope="col">${text.answer}</th></tr></thead><tbody>${answers}</tbody></table></section></body></html>\n`;
}
