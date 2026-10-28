export const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
export const formatMinute = minute => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

export function toReportObject(result) {
  const { agenda, conflicts, warnings, coverage, resourceSchedules } = result;
  return {
    schema: 'gq.agenda-check', version: 1,
    settings: { transitionMinutes: agenda.transitionMinutes },
    coverage: { checkedPairs: coverage.checkedPairs, roomUnassignedSessionIds: [...coverage.roomUnassignedSessionIds],
      speakerUnassignedSessionIds: [...coverage.speakerUnassignedSessionIds] },
    sessions: agenda.sessions.map(session => ({ id: session.id, title: session.title,
      room: session.roomIndex === null ? null : agenda.rooms[session.roomIndex],
      speakers: session.speakerIndexes.map(index => agenda.speakers[index]), startMinute: session.startMinute, endMinute: session.endMinute })),
    overlapPairs: conflicts, transitionWarnings: warnings,
    roomSchedules: resourceSchedules.rooms, speakerSchedules: resourceSchedules.speakers
  };
}

const copy = {
  'zh-Hant': { heading: '議程修正清單與時間表', rule: '同一天、同一民用時區；區間 [開始,結束)。本工具不會自動改排。',
    coverage: '檢查範圍', checked: '已檢查場次對', roomMissing: '房間未指派', speakerMissing: '講者未指派',
    none: '無', incomplete: '未指派資源的衝突無法判定。請補齊後重新檢查。', clear: '在已填資料中未找到衝突。',
    partial: '已指派資源未找到衝突；未指派資源未能檢查。', overlap: '重疊錯誤', transition: '轉場不足提醒',
    room_overlap: '房間重疊', speaker_overlap: '講者撞期', shared: '共同講者', gap: '間隔', required: '要求', minutes: '分鐘',
    rooms: '房間時間表', speakers: '講者時間表', sessions: '完整場次（原輸入順序）', unassigned: '未指派', noSessions: '沒有場次' },
  en: { heading: 'Agenda correction list and schedules', rule: 'One local civil day and time zone; intervals [start,end). No automatic rescheduling.',
    coverage: 'Coverage', checked: 'Session pairs checked', roomMissing: 'Room unassigned', speakerMissing: 'Speakers unassigned',
    none: 'None', incomplete: 'Conflicts for unassigned resources cannot be determined. Assign them and check again.',
    clear: 'No conflicts found in the supplied data.', partial: 'No conflicts found for assigned resources; unassigned resources could not be checked.',
    overlap: 'Overlap errors', transition: 'Short transition warnings', room_overlap: 'Room overlap', speaker_overlap: 'Speaker clash',
    shared: 'Shared speakers', gap: 'Gap', required: 'Required', minutes: 'min', rooms: 'Room schedules', speakers: 'Speaker schedules',
    sessions: 'All sessions (input order)', unassigned: 'Unassigned', noSessions: 'No sessions' }
};

function reportText(report, language) {
  const c = copy[language] ?? copy['zh-Hant'];
  const { coverage } = report;
  const hasMissing = coverage.roomUnassignedSessionIds.length || coverage.speakerUnassignedSessionIds.length;
  const lines = [c.heading, c.rule, '', c.coverage, `${c.checked}: ${coverage.checkedPairs}`,
    `${c.required}: ${report.settings.transitionMinutes} ${c.minutes}`,
    `${c.roomMissing}: ${coverage.roomUnassignedSessionIds.join(', ') || c.none}`,
    `${c.speakerMissing}: ${coverage.speakerUnassignedSessionIds.join(', ') || c.none}`];
  if (hasMissing) lines.push(c.incomplete);
  if (!report.overlapPairs.length && !report.transitionWarnings.length) lines.push(hasMissing ? c.partial : c.clear);
  const byId = new Map(report.sessions.map(session => [session.id, session]));
  const sessionText = session => `${session.id} ${formatMinute(session.startMinute)}–${formatMinute(session.endMinute)} | ${session.title} | ${session.room ?? c.unassigned} | ${session.speakers.join(', ') || c.unassigned}`;
  lines.push('', `${c.overlap} (${report.overlapPairs.length})`);
  if (!report.overlapPairs.length) lines.push(c.none);
  for (const pair of report.overlapPairs) {
    lines.push(`${pair.sessionIds.join(' ↔ ')} | ${pair.reasons.map(reason => c[reason]).join(' + ')} | ${c.shared}: ${pair.sharedSpeakers.join(', ') || c.none}`);
    for (const id of pair.sessionIds) lines.push(`  ${sessionText(byId.get(id))}`);
  }
  lines.push('', `${c.transition} (${report.transitionWarnings.length})`);
  if (!report.transitionWarnings.length) lines.push(c.none);
  for (const pair of report.transitionWarnings) {
    const sessions = pair.sessionIds.map(id => byId.get(id)).sort((a, b) => a.startMinute - b.startMinute);
    lines.push(`${sessions.map(session => session.id).join(' → ')} | ${pair.fromRoom} → ${pair.toRoom} | ${c.shared}: ${pair.sharedSpeakers.join(', ')} | ${c.gap}: ${pair.gapMinutes} ${c.minutes}; ${c.required}: ${pair.requiredMinutes} ${c.minutes}`);
    for (const session of sessions) lines.push(`  ${sessionText(session)}`);
  }
  lines.push('', c.rooms);
  if (!report.roomSchedules.length) lines.push(c.none);
  for (const resource of report.roomSchedules) {
    lines.push(resource.room);
    if (!resource.sessions.length) lines.push(`  ${c.noSessions}`);
    for (const item of resource.sessions) lines.push(`  ${sessionText(byId.get(item.id))}`);
  }
  lines.push('', c.speakers);
  if (!report.speakerSchedules.length) lines.push(c.none);
  for (const resource of report.speakerSchedules) {
    lines.push(resource.speaker);
    if (!resource.sessions.length) lines.push(`  ${c.noSessions}`);
    for (const item of resource.sessions) lines.push(`  ${sessionText(byId.get(item.id))}`);
  }
  lines.push('', c.sessions);
  for (const session of report.sessions) lines.push(sessionText(session));
  return `${lines.join('\n')}\n`;
}

// A single byte gate owns both artifacts. No partial result escapes on failure.
export function packageReportTexts(jsonText, txtText, { maxBytes = MAX_OUTPUT_BYTES } = {}) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0 || maxBytes > MAX_OUTPUT_BYTES) return { ok: false, code: 'OUTPUT_LIMIT' };
  const encoder = new TextEncoder();
  const jsonBytes = encoder.encode(jsonText).byteLength;
  const txtBytes = encoder.encode(txtText).byteLength;
  const totalBytes = jsonBytes + txtBytes;
  if (totalBytes > maxBytes) return { ok: false, code: 'OUTPUT_LIMIT' };
  return { ok: true, totalBytes, files: {
    json: { name: 'agenda-conflicts.json', type: 'application/json;charset=utf-8', text: jsonText, bytes: jsonBytes },
    txt: { name: 'agenda-conflicts.txt', type: 'text/plain;charset=utf-8', text: txtText, bytes: txtBytes }
  } };
}

export function serializeAgendaReport(result, { maxBytes = MAX_OUTPUT_BYTES, language = 'zh-Hant' } = {}) {
  const report = toReportObject(result);
  return packageReportTexts(`${JSON.stringify(report, null, 2)}\n`, reportText(report, language), { maxBytes });
}
