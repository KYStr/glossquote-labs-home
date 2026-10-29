import { validateProject, fail } from './schema.mjs';

const labels = {
  'zh-Hant': { rooms: '房間搬運清單', boxes: '逐箱內容明細', room: '目的房間', box: '箱號', priority: '優先開箱', ordinary: '一般開箱', notes: '備註', quantity: '數量', empty: '（空箱）', none: '目前沒有箱子。' },
  en: { rooms: 'Room moving list', boxes: 'Box contents', room: 'Destination room', box: 'Box', priority: 'Open first', ordinary: 'Standard unpacking', notes: 'Notes', quantity: 'Quantity', empty: '(Empty box)', none: 'No boxes yet.' }
};
export function renderTextReport(state, mode, language = 'zh-Hant') {
  const project = validateProject(state);
  if (!['rooms', 'boxes'].includes(mode)) fail('INVALID_REPORT_MODE');
  const t = labels[language];
  if (!t) fail('INVALID_LANGUAGE');
  const lines = [t[mode], ''];
  if (!project.boxes.length) lines.push(t.none);
  else if (mode === 'rooms') {
    const rooms = new Map();
    for (const box of project.boxes) {
      if (!rooms.has(box.room)) rooms.set(box.room, []);
      rooms.get(box.room).push(box);
    }
    for (const [room, boxes] of rooms) {
      lines.push(t.room + ': ' + room);
      for (const box of boxes) lines.push('  ' + t.box + ': ' + box.id + ' | ' + (box.priority ? t.priority : t.ordinary));
      lines.push('');
    }
  } else for (const box of project.boxes) {
    lines.push(t.box + ': ' + box.id, t.room + ': ' + box.room, box.priority ? t.priority : t.ordinary);
    if (box.notes) lines.push(t.notes + ': ' + box.notes);
    if (!box.items.length) lines.push(t.empty);
    for (const item of box.items) {
      lines.push('  ' + item.name + ' | ' + t.quantity + ': ' + item.quantity);
      if (item.notes) lines.push('    ' + t.notes + ': ' + item.notes);
    }
    lines.push('');
  }
  return lines.join('\n').replace(/\n*$/, '\n');
}
