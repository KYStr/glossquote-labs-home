import { InputError, parseQuantity, normalizeIngredient, normalizeText, unitInfo } from './quantities.mjs';

export const LIMITS = Object.freeze({ meals: 30, requirements: 300, stock: 300, importBytes: 2 * 1024 * 1024 });
export function emptyProject() { return { schema: 1, meals: [], stock: [] }; }
export function exactKeys(value, expected, path = '') {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new InputError('INVALID_SCHEMA', path);
  const keys = Reflect.ownKeys(value);
  if (keys.length !== expected.length || keys.some(key => typeof key !== 'string' || !expected.includes(key))) throw new InputError('INVALID_SCHEMA', path);
  for (const key of expected) {
    const desc = Object.getOwnPropertyDescriptor(value, key);
    if (!desc || !Object.hasOwn(desc, 'value')) throw new InputError('INVALID_SCHEMA', path);
  }
}
function at(path, fn) {
  try { return fn(); } catch (error) {
    if (error instanceof InputError) throw new InputError(error.code, path);
    throw new InputError('INVALID_SCHEMA', path);
  }
}
function validateItem(item, path) {
  exactKeys(item, ['ingredient', 'quantity', 'unit', 'unitLabel'], path);
  const ingredient = at(`${path}.ingredient`, () => normalizeIngredient(item.ingredient));
  at(`${path}.quantity`, () => parseQuantity(item.quantity));
  if (typeof item.unit !== 'string' || !['g', 'kg', 'ml', 'L', 'piece', 'customCount'].includes(item.unit)) throw new InputError('INVALID_UNIT', `${path}.unit`);
  const info = at(`${path}.${item.unit === 'customCount' ? 'unitLabel' : 'unit'}`, () => unitInfo(item.unit, item.unitLabel));
  return { ingredient, quantity: item.quantity, unit: item.unit, unitLabel: item.unit === 'customCount' ? info.outputUnit : '' };
}
export function validateProject(value) {
  exactKeys(value, ['schema', 'meals', 'stock']);
  if (value.schema !== 1) throw new InputError('INVALID_SCHEMA', 'schema');
  if (!Array.isArray(value.meals) || value.meals.length > LIMITS.meals) throw new InputError('MEAL_LIMIT', 'meals');
  if (!Array.isArray(value.stock) || value.stock.length > LIMITS.stock) throw new InputError('STOCK_LIMIT', 'stock');
  const ids = new Set();
  let rowCount = 0;
  const meals = [];
  for (let i = 0; i < value.meals.length; i++) {
    const meal = value.meals[i];
    const path = `meals.${i}`;
    exactKeys(meal, ['id', 'name', 'items'], path);
    const id = at(`${path}.id`, () => normalizeText(meal.id, 120, 'INVALID_ID'));
    if (ids.has(id)) throw new InputError('DUPLICATE_ID', `${path}.id`);
    ids.add(id);
    const name = at(`${path}.name`, () => normalizeText(meal.name, 120, 'INVALID_MEAL'));
    if (!Array.isArray(meal.items)) throw new InputError('INVALID_SCHEMA', `${path}.items`);
    rowCount += meal.items.length;
    if (rowCount > LIMITS.requirements) throw new InputError('REQUIREMENT_LIMIT', `${path}.items`);
    const items = [];
    for (let j = 0; j < meal.items.length; j++) items.push(validateItem(meal.items[j], `${path}.items.${j}`));
    meals.push({ id, name, items });
  }
  const stock = [];
  for (let i = 0; i < value.stock.length; i++) stock.push(validateItem(value.stock[i], `stock.${i}`));
  return { schema: 1, meals, stock };
}

export function parseProject(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > LIMITS.importBytes) throw new InputError('IMPORT_TOO_LARGE');
  let value;
  try { value = JSON.parse(text); } catch { throw new InputError('INVALID_JSON'); }
  return validateProject(value);
}

export function serializeProject(project) { return JSON.stringify(validateProject(project), null, 2) + '\n'; }
