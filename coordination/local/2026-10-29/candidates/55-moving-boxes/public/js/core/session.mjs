import { emptyProject, validateProject, countItems, fail } from './schema.mjs';
import { addItem, deleteBox, nextItemNumber } from './boxes.mjs';

export function createSession(project = emptyProject()) {
  const normalized = validateProject(project);
  return { project: normalized, nextItemNumber: nextItemNumber(normalized), revision: 0, pendingImport: null, pendingDelete: null };
}
export function commitProject(session, project) {
  const normalized = validateProject(project);
  return { project: normalized, nextItemNumber: Math.max(session.nextItemNumber, nextItemNumber(normalized)), revision: session.revision + 1, pendingImport: null, pendingDelete: null };
}
export function addSessionItem(session, boxId, draft) {
  return commitProject(session, addItem(session.project, boxId, draft, session.nextItemNumber));
}
export function stageImport(session, project) {
  return { ...session, pendingImport: validateProject(project), pendingDelete: null };
}
export function cancelImport(session) { return { ...session, pendingImport: null }; }
export function confirmImport(session) {
  if (!session.pendingImport) fail('NO_PENDING_IMPORT');
  return commitProject(session, session.pendingImport);
}
export function importSummary(session) {
  if (!session.pendingImport) fail('NO_PENDING_IMPORT');
  return { boxes: session.pendingImport.boxes.length, items: countItems(session.pendingImport) };
}
export function requestBoxDeletion(session, id) {
  const box = session.project.boxes.find(value => value.id === id);
  if (!box) fail('BOX_NOT_FOUND');
  if (!box.items.length) return commitProject(session, deleteBox(session.project, id));
  return { ...session, pendingImport: null, pendingDelete: { id: box.id, count: box.items.length } };
}
export function cancelBoxDeletion(session) { return { ...session, pendingDelete: null }; }
export function confirmBoxDeletion(session) {
  if (!session.pendingDelete) fail('NO_PENDING_DELETE');
  return commitProject(session, deleteBox(session.project, session.pendingDelete.id, { confirmed: true }));
}
