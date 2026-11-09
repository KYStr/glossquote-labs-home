export const LIMITS = Object.freeze({ sessions: 200, rooms: 20, speakers: 100, speakersPerSession: 5 });
export const VALIDATION_CODES = Object.freeze([
  'SCHEMA', 'UNKNOWN_FIELD', 'SESSION_COUNT', 'ROOM_COUNT', 'SPEAKER_COUNT',
  'ID_FORMAT', 'DUPLICATE_ID', 'TITLE', 'NAME', 'DUPLICATE_NAME',
  'ROOM_REFERENCE', 'SPEAKER_REFERENCES', 'SPEAKER_REFERENCE', 'DUPLICATE_SPEAKER',
  'TIME_FORMAT', 'END_AFTER_START', 'TRANSITION'
]);
const forbidden = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u;
const own = (object, key) => Object.hasOwn(object, key);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));

function isText(value, max) {
  if (typeof value !== 'string' || value.length === 0 || value.length > max * 2 || forbidden.test(value)) return false;
  let scalars = 0;
  for (const scalar of value) {
    const cp = scalar.codePointAt(0);
    if ((cp >= 0xd800 && cp <= 0xdfff) || ++scalars > max) return false;
  }
  return scalars > 0 && value.trim().length > 0;
}

export class TimeError extends Error {
  constructor() { super('TIME_FORMAT'); this.name = 'TimeError'; this.code = 'TIME_FORMAT'; }
}

export function toMinuteOfDay(hhmm) {
  if (typeof hhmm !== 'string' || hhmm.length !== 5 || !/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(hhmm)) throw new TimeError();
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
}

export function validateAgenda(raw) {
  const errors = [];
  const issue = (field, code, row = null, sessionId = null, index = null) => {
    errors.push({ row, sessionId, field, code, index });
  };
  const reject = () => ({ ok: false, agenda: null, errors });
  if (!record(raw)) { issue('agenda', 'SCHEMA'); return reject(); }
  const rootKeys = new Set(['rooms', 'speakers', 'sessions', 'transitionMinutes']);
  if (Object.keys(raw).some(key => !rootKeys.has(key))) issue('agenda', 'UNKNOWN_FIELD');
  const bounds = [['rooms', 0, LIMITS.rooms, 'ROOM_COUNT'], ['speakers', 0, LIMITS.speakers, 'SPEAKER_COUNT'], ['sessions', 1, LIMITS.sessions, 'SESSION_COUNT']];
  for (const [field, min, max, code] of bounds) {
    if (!Array.isArray(raw[field]) || raw[field].length < min || raw[field].length > max) issue(field, code);
  }
  const transitionMinutes = own(raw, 'transitionMinutes') ? raw.transitionMinutes : 10;
  if (!Number.isInteger(transitionMinutes) || transitionMinutes < 0 || transitionMinutes > 120) issue('transitionMinutes', 'TRANSITION');
  // Preflight all counts before reading any potentially oversized member.
  if (errors.length) return reject();

  const canonicalRegistry = field => {
    const seen = new Set();
    return Array.from(raw[field], (value, index) => {
      // Bound raw length and reject controls before trim/normalization can conceal them.
      if (typeof value !== 'string' || value.length > 320 || forbidden.test(value)) {
        issue(field, 'NAME', null, null, index); return '';
      }
      const name = value.normalize('NFC').trim();
      if (!isText(name, 80)) issue(field, 'NAME', null, null, index);
      else if (seen.has(name)) issue(field, 'DUPLICATE_NAME', null, null, index);
      seen.add(name);
      return name;
    });
  };
  const rooms = canonicalRegistry('rooms');
  const speakers = canonicalRegistry('speakers');
  const seenIds = new Set();
  const sessionKeys = ['id', 'title', 'roomIndex', 'speakerIndexes', 'start', 'end'];
  const sessions = Array.from(raw.sessions, (session, index) => {
    const row = index + 1;
    if (!record(session)) { issue('session', 'SCHEMA', row); return null; }
    const id = isText(session.id, 32) && /^[A-Za-z0-9._-]{1,32}$/.test(session.id) ? session.id : null;
    const add = (field, code) => issue(field, code, row, id);
    if (Object.keys(session).some(key => !sessionKeys.includes(key))) add('session', 'UNKNOWN_FIELD');
    if (sessionKeys.some(key => !own(session, key))) add('session', 'SCHEMA');
    if (id === null) add('id', 'ID_FORMAT');
    else if (seenIds.has(id)) add('id', 'DUPLICATE_ID');
    seenIds.add(id);
    if (!isText(session.title, 160)) add('title', 'TITLE');
    const { roomIndex, speakerIndexes } = session;
    if (roomIndex !== null && (!Number.isInteger(roomIndex) || roomIndex < 0 || roomIndex >= rooms.length)) add('roomIndex', 'ROOM_REFERENCE');
    if (!Array.isArray(speakerIndexes) || speakerIndexes.length > LIMITS.speakersPerSession) add('speakerIndexes', 'SPEAKER_REFERENCES');
    else {
      const assigned = new Set();
      for (const speakerIndex of speakerIndexes) {
        if (!Number.isInteger(speakerIndex) || speakerIndex < 0 || speakerIndex >= speakers.length) add('speakerIndexes', 'SPEAKER_REFERENCE');
        else if (assigned.has(speakerIndex)) add('speakerIndexes', 'DUPLICATE_SPEAKER');
        assigned.add(speakerIndex);
      }
    }
    let startMinute = null;
    let endMinute = null;
    try { startMinute = toMinuteOfDay(session.start); } catch { add('start', 'TIME_FORMAT'); }
    try { endMinute = toMinuteOfDay(session.end); } catch { add('end', 'TIME_FORMAT'); }
    if (startMinute !== null && endMinute !== null && endMinute <= startMinute) add('end', 'END_AFTER_START');
    return { id, title: session.title, roomIndex, speakerIndexes: Array.isArray(speakerIndexes) ? [...speakerIndexes] : [], startMinute, endMinute };
  });
  if (errors.length) return reject();
  return { ok: true, agenda: { rooms, speakers, sessions, transitionMinutes }, errors: [] };
}
