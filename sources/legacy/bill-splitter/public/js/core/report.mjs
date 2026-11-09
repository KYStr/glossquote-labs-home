import { fail, formatAmount } from './money.mjs';
export const reportText = Object.freeze({
  'zh-Hant': Object.freeze({ title: 'GlossQuote 分帳明細', quickTitle: 'GlossQuote 快速結算', people: '參與人數', zero: '目前沒有人付款，不需要轉帳。', quickDue: '應分攤', advancedDue: '應分攤', precision: '小數位數', total: '總額', mode: '分攤方式', equal: '平均', shares: '依份數', weight: '份數', due: '應付', paid: '已付', receive: '需收', owe: '需補付', even: '已平衡', rule: '尾數依餘數大小分配，相同時由較前建立的人員取得。', settlement: '建議結算', none: '已付金額與應付一致，無需補付。', pays: '支付', notice: '所有金額須使用同一幣別。本表只產生建議，不會轉帳。' }),
  en: Object.freeze({ title: 'GlossQuote bill split', quickTitle: 'GlossQuote quick settlement', people: 'People', zero: 'Nobody has paid yet. No transfer is needed.', quickDue: 'Equal share', advancedDue: 'Share', precision: 'Decimal places', total: 'Total', mode: 'Split method', equal: 'Equally', shares: 'By shares', weight: 'Shares', due: 'Owes', paid: 'Paid', receive: 'To receive', owe: 'To pay', even: 'Settled', rule: 'Leftover units go to the largest remainders; ties follow creation order.', settlement: 'Suggested settlement', none: 'Paid amounts match shares. No settlement is needed.', pays: 'pays', notice: 'Use one currency for all amounts. These are suggestions; no money is sent.' })
});
export function buildReport(result, locale) {
  const text = reportText[locale];
  if (!text) fail('LOCALE');
  const amount = n => formatAmount(n, result.precision, locale);
  if (result.workflow === 'quick' || result.workflow === 'advanced') {
    const lines = [result.workflow === 'quick' ? text.quickTitle : text.title, text.settlement];
    if (!result.transfers.length) lines.push(result.total === 0n ? text.zero : text.none);
    for (const transfer of result.transfers) {
      const from = result.people[transfer.fromIndex], to = result.people[transfer.toIndex];
      lines.push(`#${from.id} ${from.name} ${text.pays} #${to.id} ${to.name} ${amount(transfer.amount)}`);
    }
    lines.push('', `${text.total}: ${amount(result.total)}`, `${text.people}: ${result.people.length}`, `${text.precision}: ${result.precision}`, '');
    if (result.workflow === 'advanced') lines.push(`${text.mode}: ${text[result.mode]}`, '');
    result.people.forEach((person, i) => {
      const balance = result.balances[i];
      const weight = result.workflow === 'advanced' ? ` | ${text.weight}: ${person.weight}` : '';
      const shareLabel = result.workflow === 'quick' ? text.quickDue : text.advancedDue;
      lines.push(`#${person.id} ${person.name} | ${text.paid}: ${amount(person.paid)}${weight} | ${shareLabel}: ${amount(person.share)} | ${balance > 0n ? text.receive : balance < 0n ? text.owe : text.even}: ${amount(balance < 0n ? -balance : balance)}`);
    });
    lines.push('', text.rule, '', text.notice);
    return lines.join('\n') + '\n';
  }
  const lines = [text.title, `${text.precision}: ${result.precision}`, `${text.total}: ${amount(result.total)}`, `${text.mode}: ${text[result.mode]}`, ''];
  result.people.forEach((person, i) => {
    let line = `#${person.id} ${person.name} | ${text.weight}: ${person.weight} | ${text.due}: ${amount(person.share)}`;
    if (result.settlement) {
      const balance = result.balances[i];
      line += ` | ${text.paid}: ${amount(person.paid)} | ${balance > 0n ? text.receive : balance < 0n ? text.owe : text.even}: ${amount(balance < 0n ? -balance : balance)}`;
    }
    lines.push(line);
  });
  lines.push('', text.rule);
  if (result.settlement) {
    lines.push('', text.settlement);
    if (!result.transfers.length) lines.push(text.none);
    for (const transfer of result.transfers) {
      const from = result.people[transfer.fromIndex], to = result.people[transfer.toIndex];
      lines.push(`#${from.id} ${from.name} ${text.pays} #${to.id} ${to.name} ${amount(transfer.amount)}`);
    }
  }
  lines.push('', text.notice);
  return lines.join('\n') + '\n';
}
