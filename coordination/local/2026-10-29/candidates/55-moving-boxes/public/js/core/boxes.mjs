import { LIMITS, validateProject, normalizeBoxDraft, normalizeItemDraft, itemNumber, text, exact, fail } from './schema.mjs';

function boxIndex(state, id) {
  const index = state.boxes.findIndex(box => box.id === id);
  if (index < 0) fail('BOX_NOT_FOUND');
  return index;
}
function itemIndex(box, id) {
  const index = box.items.findIndex(item => item.id === id);
  if (index < 0) fail('ITEM_NOT_FOUND');
  return index;
}
export function nextBoxId(state) {
  const used = new Set(state.boxes.map(box => box.id));
  let sequence = 1;
  while (used.has('BX' + String(sequence).padStart(3, '0'))) sequence++;
  return 'BX' + String(sequence).padStart(3, '0');
}
export function nextItemNumber(state) {
  return state.boxes.reduce((max, box) => box.items.reduce((current, item) => Math.max(current, itemNumber(item.id)), max), 0) + 1;
}
export function createBox(state, draft) {
  const current = validateProject(state);
  if (current.boxes.length >= LIMITS.boxes) fail('BOX_LIMIT');
  exact(draft, ['id', 'room', 'priority', 'notes'], 'box');
  const requestedId = text(draft.id, LIMITS.boxId, { field: 'box.id' });
  const id = requestedId || nextBoxId(current);
  const box = normalizeBoxDraft({ ...draft, id });
  return validateProject({ schemaVersion: 1, boxes: [...current.boxes, { ...box, items: [] }] });
}
export function updateBox(state, id, draft) {
  const current = validateProject(state);
  const index = boxIndex(current, id);
  const box = normalizeBoxDraft(draft);
  current.boxes[index] = { ...box, items: current.boxes[index].items };
  return validateProject(current);
}
export function deleteBox(state, id, { confirmed = false } = {}) {
  const current = validateProject(state);
  const index = boxIndex(current, id);
  if (current.boxes[index].items.length && !confirmed) fail('CONFIRM_DELETE_REQUIRED');
  return { schemaVersion: 1, boxes: current.boxes.filter((_, position) => position !== index) };
}
export function addItem(state, boxId, draft, sequence) {
  const current = validateProject(state);
  const index = boxIndex(current, boxId);
  const start = Math.max(sequence ?? 1, nextItemNumber(current));
  if (!Number.isSafeInteger(start)) fail('ITEM_ID_EXHAUSTED');
  const id = 'I' + String(start).padStart(6, '0');
  current.boxes[index].items.push({ id, ...normalizeItemDraft(draft) });
  return validateProject(current);
}
export function updateItem(state, boxId, id, draft) {
  const current = validateProject(state);
  const box = current.boxes[boxIndex(current, boxId)];
  const index = itemIndex(box, id);
  box.items[index] = { id, ...normalizeItemDraft(draft) };
  return validateProject(current);
}
export function deleteItem(state, boxId, id) {
  const current = validateProject(state);
  const box = current.boxes[boxIndex(current, boxId)];
  const index = itemIndex(box, id);
  box.items.splice(index, 1);
  return current;
}
export function moveItem(state, sourceId, id, targetId) {
  const current = validateProject(state);
  const source = current.boxes[boxIndex(current, sourceId)];
  const target = current.boxes[boxIndex(current, targetId)];
  const index = itemIndex(source, id);
  if (sourceId === targetId) return current;
  const [item] = source.items.splice(index, 1);
  target.items.push(item);
  return current;
}
export function searchItems(state, query) {
  const current = validateProject(state);
  const needle = text(query, 500, { field: 'query' }).toLocaleLowerCase('en');
  const results = [];
  for (const box of current.boxes) for (const item of box.items) {
    const haystacks = [box.id, box.room, box.notes, item.name, item.notes];
    if (!needle || haystacks.some(value => value.toLocaleLowerCase('en').includes(needle))) {
      results.push({ boxId: box.id, room: box.room, priority: box.priority, boxNotes: box.notes, itemId: item.id, name: item.name, quantity: item.quantity, notes: item.notes });
    }
  }
  return results;
}
