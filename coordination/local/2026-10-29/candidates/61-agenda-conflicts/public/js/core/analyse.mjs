export function* createPairJobs(agenda) {
  for (let i = 0; i < agenda.sessions.length - 1; i++) {
    for (let j = i + 1; j < agenda.sessions.length; j++) yield [i, j];
  }
}

export function analysePair(a, b, transitionMinutes) {
  const sharedSpeakerIndexes = a.speakerIndexes.filter(index => b.speakerIndexes.includes(index)).sort((x, y) => x - y);
  const sessionIds = [a.id, b.id];
  const overlaps = Math.max(a.startMinute, b.startMinute) < Math.min(a.endMinute, b.endMinute);
  if (overlaps) {
    const reasons = [];
    if (a.roomIndex !== null && a.roomIndex === b.roomIndex) reasons.push('room_overlap');
    if (sharedSpeakerIndexes.length) reasons.push('speaker_overlap');
    return reasons.length ? { kind: 'overlap', sessionIds, reasons, sharedSpeakerIndexes } : null;
  }
  if (!sharedSpeakerIndexes.length || a.roomIndex === null || b.roomIndex === null || a.roomIndex === b.roomIndex) return null;
  const [earlier, later] = a.startMinute < b.startMinute ? [a, b] : [b, a];
  const gapMinutes = later.startMinute - earlier.endMinute;
  if (gapMinutes >= transitionMinutes) return null;
  return { kind: 'transition_short', sessionIds, sharedSpeakerIndexes, fromRoomIndex: earlier.roomIndex,
    toRoomIndex: later.roomIndex, gapMinutes, requiredMinutes: transitionMinutes };
}

export function aggregateAgenda(agenda, pairResults) {
  const order = new Map(agenda.sessions.map((session, index) => [session.id, index]));
  const sorted = [...pairResults].sort((a, b) => order.get(a.sessionIds[0]) - order.get(b.sessionIds[0])
    || order.get(a.sessionIds[1]) - order.get(b.sessionIds[1]));
  const conflicts = [];
  const warnings = [];
  for (const pair of sorted) {
    const common = { sessionIds: [...pair.sessionIds], sharedSpeakers: pair.sharedSpeakerIndexes.map(index => agenda.speakers[index]) };
    if (pair.kind === 'overlap') conflicts.push({ sessionIds: common.sessionIds, reasons: [...pair.reasons], sharedSpeakers: common.sharedSpeakers });
    else warnings.push({ ...common, fromRoom: agenda.rooms[pair.fromRoomIndex], toRoom: agenda.rooms[pair.toRoomIndex],
      gapMinutes: pair.gapMinutes, requiredMinutes: pair.requiredMinutes });
  }
  const schedule = predicate => agenda.sessions.map((session, index) => ({ session, index }))
    .filter(({ session }) => predicate(session))
    .sort((a, b) => a.session.startMinute - b.session.startMinute || a.session.endMinute - b.session.endMinute || a.index - b.index)
    .map(({ session }) => ({ id: session.id, startMinute: session.startMinute, endMinute: session.endMinute }));
  return {
    agenda, conflicts, warnings,
    resourceSchedules: {
      rooms: agenda.rooms.map((room, index) => ({ room, sessions: schedule(session => session.roomIndex === index) })),
      speakers: agenda.speakers.map((speaker, index) => ({ speaker, sessions: schedule(session => session.speakerIndexes.includes(index)) }))
    },
    coverage: {
      checkedPairs: agenda.sessions.length * (agenda.sessions.length - 1) / 2,
      roomUnassignedSessionIds: agenda.sessions.filter(session => session.roomIndex === null).map(session => session.id),
      speakerUnassignedSessionIds: agenda.sessions.filter(session => !session.speakerIndexes.length).map(session => session.id)
    }
  };
}

export function analyseAgenda(agenda) {
  const pairResults = [];
  for (const [i, j] of createPairJobs(agenda)) {
    const result = analysePair(agenda.sessions[i], agenda.sessions[j], agenda.transitionMinutes);
    if (result) pairResults.push(result);
  }
  return aggregateAgenda(agenda, pairResults);
}
