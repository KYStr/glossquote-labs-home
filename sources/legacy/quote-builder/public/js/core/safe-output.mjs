import { formatMinor, formatQuantity } from './decimal.mjs';

export const quoteLabels = Object.freeze({
  'zh-Hant': { title: '報價單', from: '出價方', to: '客戶', missing: '未填', currency: '幣別', item: '品項', quantity: '數量', price: '單價', amount: '金額', subtotal: '小計', discount: '固定折扣', after: '折後額', rate: '自訂稅率', tax: '稅額', total: '合計', note: '備註', noNote: '無', footer: '此文件為自行填寫的報價資料，不是發票。不提供稅務適用性或法律效力判斷。' },
  en: { title: 'Quote', from: 'From', to: 'Client', missing: 'Not provided', currency: 'Currency', item: 'Item', quantity: 'Quantity', price: 'Unit price', amount: 'Amount', subtotal: 'Subtotal', discount: 'Fixed discount', after: 'After discount', rate: 'Custom rate', tax: 'Tax', total: 'Total', note: 'Notes', noNote: 'None', footer: 'This document contains quote data entered by its author. It is not an invoice and provides no tax applicability or legal validity check.' },
});
export function escapeHtmlText(value) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
export function serializeQuoteJson(input) {
  return JSON.stringify({ schema: 'gq.quote', version: 1, currency: input.currency, parties: { from: input.parties.from, to: input.parties.to }, items: input.items.map(({ description, quantity, unitPrice }) => ({ description, quantity, unitPrice })), discount: input.discount, taxRate: input.taxRate, note: input.note }, null, 2) + '\n';
}
export function renderQuoteHtml(input, totals, { lang = 'zh-Hant' } = {}) {
  const language = lang === 'en' ? 'en' : 'zh-Hant';
  const label = quoteLabels[language];
  const escape = escapeHtmlText;
  const money = value => escape(`${input.currency} ${formatMinor(value)}`);
  const row = (name, value, className = '') => `<div class="summary-row ${className}"><dt>${escape(name)}</dt><dd>${value}</dd></div>`;
  const rows = input.items.map((item, index) => {
    const result = totals.items[index];
    return `<tr><td class="text">${escape(item.description)}</td><td data-label="${label.quantity}">${formatQuantity(result.quantityMilli)}</td><td data-label="${label.price}">${money(result.unitPriceMinor)}</td><td data-label="${label.amount}">${money(result.lineMinor)}</td></tr>`;
  }).join('\n');
  return `<!doctype html>
<html lang="${language}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${label.title}</title>
<style>
:root{color-scheme:light;font-family:"Segoe UI",system-ui,sans-serif;color:#111410;background:#f3f0e8}*{box-sizing:border-box}body{margin:0;padding:2rem}main{max-width:62rem;margin:auto;background:#fff;padding:3rem}h1{font-size:2rem;margin:0 0 2rem}h2{font-size:1rem;margin:2rem 0 .5rem}.parties{display:grid;grid-template-columns:1fr 1fr;gap:2rem}.text{white-space:pre-wrap;overflow-wrap:anywhere}dt{color:#55594f}dd{margin:.5rem 0 0}.parties dd{font-size:1.25rem}table{width:100%;border-collapse:collapse;margin:2rem 0;table-layout:fixed}th,td{text-align:right;padding:.75rem .5rem;border-bottom:1px solid #b8bbb2;overflow-wrap:anywhere;vertical-align:top}th:first-child,td:first-child{text-align:left;width:40%}th{font-size:.875rem}td:not(:first-child),.summary dd{font-variant-numeric:tabular-nums}.summary{max-width:28rem;margin:0 0 0 auto}.summary-row{display:flex;justify-content:space-between;gap:1rem;padding:.5rem 0}.summary dd{margin:0;text-align:right;overflow-wrap:anywhere}.total{font-size:1.5rem;border-top:2px solid #111410;padding-top:1rem}.total dt{color:#111410}footer{font-size:.75rem;color:#55594f;border-top:1px solid #b8bbb2;margin-top:2rem;padding-top:1rem;line-height:1.6}@media(max-width:40rem){body{padding:0}main{padding:1rem}.parties{grid-template-columns:1fr;gap:1rem}table,tbody,tr,td{display:block}thead{display:none}tr{padding:1rem 0;border-bottom:1px solid #b8bbb2}td{border:0;padding:.25rem 0;display:flex;justify-content:space-between;gap:1rem}td:first-child{display:block;width:auto;margin-bottom:.5rem}td[data-label]::before{content:attr(data-label);text-align:left;color:#55594f}td:not(:first-child){text-align:right}.summary{max-width:none}.total{font-size:1.25rem}}@media print{body{padding:0;background:#fff}main{max-width:none;padding:0}tr{break-inside:avoid}thead{display:table-header-group}}
</style></head>
<body><main><h1>${label.title}</h1><dl class="parties"><div><dt>${label.from}</dt><dd class="text">${escape(input.parties.from || label.missing)}</dd></div><div><dt>${label.to}</dt><dd class="text">${escape(input.parties.to || label.missing)}</dd></div></dl><p>${label.currency}: ${escape(input.currency)}</p>
<table><thead><tr><th scope="col">${label.item}</th><th scope="col">${label.quantity}</th><th scope="col">${label.price}</th><th scope="col">${label.amount}</th></tr></thead><tbody>${rows}</tbody></table>
<dl class="summary">${row(label.subtotal, money(totals.subtotalMinor))}${row(label.discount, money(totals.discountMinor))}${row(label.after, money(totals.afterDiscountMinor))}${row(label.rate, `${formatMinor(totals.taxRateBasisPoints)}%`)}${row(label.tax, money(totals.taxMinor))}${row(label.total, money(totals.totalMinor), 'total')}</dl>
<h2>${label.note}</h2><p class="text">${escape(input.note || label.noNote)}</p><footer>${label.footer}</footer></main></body></html>\n`;
}

export function makeExportPair(input, totals, { maxBytes = 524288, lang = 'zh-Hant' } = {}) {
  const encoder = new TextEncoder();
  const html = encoder.encode(renderQuoteHtml(input, totals, { lang }));
  const json = encoder.encode(serializeQuoteJson(input));
  const actualBytes = html.byteLength + json.byteLength;
  if (actualBytes > maxBytes) return { ok: false, code: 'EXPORT_LIMIT', actualBytes, maxBytes };
  return { ok: true, html, json };
}
