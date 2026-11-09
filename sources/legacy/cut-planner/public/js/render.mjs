export function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
export function createRow(id, m) {
  const section = element('fieldset', undefined, 'demand-row'); section.dataset.rowId = id;
  const legend = element('legend'); legend.dataset.rowLegend = ''; section.append(legend);
  const grid = element('div', undefined, 'row-fields');
  for (const [key, label, value, mode] of [['nameRaw',m.name,'',null],['lengthRaw',m.length,'','decimal'],['quantityRaw',m.quantity,'1','numeric']]) {
    const wrap = element('div', undefined, 'field'), controlId = `${id}-${key}`;
    const lab = element('label',label); lab.htmlFor = controlId;
    const input = element('input'); input.id = controlId; input.type = 'text'; input.value = value; input.autocomplete = 'off'; input.spellcheck = false;
    if (mode) input.inputMode = mode;
    input.dataset.key = key; input.setAttribute('aria-describedby', `${controlId}-help ${controlId}-error`);
    const help = element('small', key==='nameRaw'?'1–60':key==='lengthRaw'?'0.01–100000 mm':'1–200'); help.id = `${controlId}-help`;
    const error = element('span',undefined,'field-error'); error.id = `${controlId}-error`;
    wrap.append(lab,input,help,error); grid.append(wrap);
  }
  const remove = element('button',undefined,'remove-row'); remove.type = 'button'; remove.dataset.removeRow = ''; grid.append(remove);
  section.append(grid); return section;
}
function metric(list, label, value) {
  const wrap = element('div'); wrap.append(element('dt',label),element('dd',value,'measurement')); list.append(wrap);
}
export function renderPlan(host, result, m) {
  host.replaceChildren();
  const t = result.totals, summary = element('div',undefined,'summary');
  const counts = element('dl',undefined,'counts'); metric(counts,m.stockCount,String(t.stockCount));metric(counts,m.pieceCount,String(t.pieceCount));summary.append(counts);
  const settings = element('p',`${m.stock}: ${result.settings.stockLengthMm} mm · ${m.trim}: ${result.settings.endTrimMm} mm · ${m.kerf}: ${result.settings.kerfMm} mm · ${m.usable}: ${result.settings.usableLengthMm} mm`,'settings-summary'); summary.append(settings);
  const totals = element('dl',undefined,'totals');
  for(const [label,key] of [[m.totalStock,'totalStockMm'],[m.totalPiece,'totalPieceMm'],[m.totalTrim,'totalTrimLossMm'],[m.totalKerf,'totalKerfLossMm'],[m.totalUsed,'totalUsedMm'],[m.totalRemaining,'totalRemainingMm']])metric(totals,label,`${t[key]} mm`);
  summary.append(totals,element('p',`${m.balance}: ${t.totalStockMm} = ${t.totalPieceMm} + ${t.totalTrimLossMm} + ${t.totalKerfLossMm} + ${t.totalRemainingMm} mm`,'balance'));
  host.append(summary,element('p',m.cutOrder,'placement-help'));
  for(const s of result.sticks){
    const article=element('article',undefined,'stick'); article.append(element('h3',m.stockItem(s.stickIndex)));
    article.append(element('p',`${m.stock}: ${s.stockLengthMm} mm · ${m.trimLoss}: ${s.trimLossMm} mm · ${m.usable}: ${s.usableLengthMm} mm`,'stick-settings'));
    const pieces=element('ol',undefined,'pieces');
    for(const p of s.pieces){const li=element('li'),content=element('div',undefined,'piece-line');content.append(element('strong',p.name),element('span',`${p.lengthMm} mm`,'measurement'));li.append(content,element('small',m.source(p.rowIndex+1,p.pieceIndex)));pieces.append(li);}
    article.append(pieces);
    const stats=element('dl',undefined,'stick-stats');for(const [label,key] of [[m.subtotal,'pieceLengthMm'],[m.kerf,'kerfLossMm'],[m.used,'usedLengthMm'],[m.remaining,'remainingLengthMm']])metric(stats,label,`${s[key]} mm`);
    article.append(stats,element('p',`${m.balance}: ${s.stockLengthMm} = ${s.pieceLengthMm} + ${s.trimLossMm} + ${s.kerfLossMm} + ${s.remainingLengthMm} mm`,'balance'));host.append(article);
  }
}
