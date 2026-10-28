import assert from 'node:assert/strict';
import { validateAgenda } from '../public/js/core/validate.mjs';

export const session = (id, overrides = {}) => ({ id, title: `Session ${id}`, roomIndex: 0, speakerIndexes: [0], start: '09:00', end: '10:00', ...overrides });
export const rawAgenda = (sessions = [session('A')], overrides = {}) => ({ rooms: ['R1', 'R2'], speakers: ['S', 'T', 'U'], transitionMinutes: 10, sessions, ...overrides });
export function validated(raw) {
  const checked = validateAgenda(raw);
  assert.equal(checked.ok, true, JSON.stringify(checked.errors));
  return checked.agenda;
}
export const clock = minute => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
