import { exactKeys, validateProject } from './schema.mjs';
import { InputError, parseQuantity, formatQuantity, unitInfo, itemKey, MAX_TOTAL } from './quantities.mjs';

export function calculateShopping(input) {
  // Accept the calculation interface without a schema field as well as a validated project.
  let project;
  if (input && Object.hasOwn(input, 'schema')) project = validateProject(input);
  else { exactKeys(input, ['meals', 'stock']); project = validateProject({ schema: 1, meals: input.meals, stock: input.stock }); }
  const groups = new Map();
  const variants = new Map();
  function groupFor(item) {
    const info = unitInfo(item.unit, item.unitLabel);
    const key = itemKey(item.ingredient, info);
    if (!groups.has(key)) groups.set(key, { key, ingredient: item.ingredient, dimension: info.dimension, unit: info.outputUnit, required: 0n, available: 0n, sources: [], stockSources: [] });
    if (!variants.has(item.ingredient)) variants.set(item.ingredient, new Set());
    variants.get(item.ingredient).add(key);
    return [groups.get(key), parseQuantity(item.quantity) * info.factor];
  }
  for (let m = 0; m < project.meals.length; m++) {
    const meal = project.meals[m];
    for (let i = 0; i < meal.items.length; i++) {
      const item = meal.items[i];
      const [group, amount] = groupFor(item);
      group.required += amount;
      if (group.required > MAX_TOTAL) throw new InputError('TOTAL_LIMIT', `meals.${m}.items.${i}.quantity`);
      group.sources.push({ mealId: meal.id, mealName: meal.name, quantity: item.quantity, unit: item.unit, unitLabel: item.unitLabel, amount });
    }
  }
  for (let i = 0; i < project.stock.length; i++) {
    const item = project.stock[i];
    const [group, amount] = groupFor(item);
    group.available += amount;
    if (group.available > MAX_TOTAL) throw new InputError('TOTAL_LIMIT', `stock.${i}.quantity`);
    group.stockSources.push({ row: i + 1, quantity: item.quantity, unit: item.unit, unitLabel: item.unitLabel, amount });
  }
  const buy = [], enough = [], unmatchedStock = [];
  for (const group of groups.values()) {
    const used = group.required < group.available ? group.required : group.available;
    const row = { ...group, used, buy: group.required - used, surplus: group.available - used, unitConflict: variants.get(group.ingredient).size > 1 };
    if (group.sources.length === 0) unmatchedStock.push(row);
    else if (row.buy > 0n) buy.push(row);
    else enough.push(row);
  }
  return { buy, enough, unmatchedStock, warnings: [...variants].filter(([, keys]) => keys.size > 1).map(([ingredient]) => ({ code: 'INCOMPATIBLE_UNITS', ingredient })) };
}

export function reportObject(result, checked = new Set(), words = null) {
  function row(value) {
    return {
      ingredient: value.ingredient, dimension: value.dimension, unit: value.unit,
      required: formatQuantity(value.required), available: formatQuantity(value.available),
      deductedStock: formatQuantity(value.used), toBuy: formatQuantity(value.buy), surplus: formatQuantity(value.surplus),
      unitConflict: value.unitConflict, purchased: checked.has(value.key),
      sources: value.sources.map(source => ({ ...source, amount: formatQuantity(source.amount) })),
      stockSources: value.stockSources.map(source => ({ ...source, amount: formatQuantity(source.amount) })),
    };
  }
  return {
    schema: 1, type: 'pantry-shopping-report',
    quantityConvention: 'Exact decimal strings in g/ml/piece or the custom count label. Purchased marks are progress only; inventory is deducted once.',
    unitNote: words?.unitNote ?? 'Names match after NFC and trim, preserving case and internal spaces. Only g/kg and ml/L convert. Mass, volume, piece and distinct custom count labels stay separate; no density or synonyms are inferred.',
    buy: result.buy.map(row), enough: result.enough.map(row), unmatchedStock: result.unmatchedStock.map(row),
    warnings: result.warnings,
  };
}

export function serializeReport(result, checked, words) { return JSON.stringify(reportObject(result, checked, words), null, 2) + '\n'; }

export function shoppingText(result, words, checked = new Set()) {
  const lines = [words.reportTitle, words.unitNote, words.progressNote, ''];
  for (const [title, rows] of [[words.buyHeading, result.buy], [words.enoughHeading, result.enough], [words.unmatchedHeading, result.unmatchedStock]]) {
    lines.push(title);
    if (!rows.length) lines.push(words.none);
    for (const row of rows) {
      const dimension = words.dimensions?.[row.dimension] ?? row.dimension;
      lines.push(`${checked.has(row.key) ? '[x]' : '[ ]'} ${row.ingredient}: ${formatQuantity(row.buy)} ${row.unit} (${dimension})`);
      lines.push(`  ${words.required}: ${formatQuantity(row.required)} ${row.unit}; ${words.available}: ${formatQuantity(row.available)} ${row.unit}; ${words.deducted}: ${formatQuantity(row.used)} ${row.unit}; ${words.surplus}: ${formatQuantity(row.surplus)} ${row.unit}`);
      if (row.unitConflict) lines.push(`  ${words.conflict}`);
      for (const source of row.sources) lines.push(`  ${words.fromMeal} ${source.mealName}: ${source.quantity} ${source.unit === 'customCount' ? source.unitLabel : source.unit} = ${formatQuantity(source.amount)} ${row.unit}`);
      for (const source of row.stockSources) lines.push(`  ${words.stockRow} ${source.row}: ${source.quantity} ${source.unit === 'customCount' ? source.unitLabel : source.unit} = ${formatQuantity(source.amount)} ${row.unit}`);
    }
    lines.push('');
  }
  if (!result.buy.length) lines.push(words.noPurchase);
  return lines.join('\n') + '\n';
}
