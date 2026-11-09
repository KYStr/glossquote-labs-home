export const MAX_TEAMS_TEXT = 16384;
const forbidden = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u;
const loneSurrogate = /[\ud800-\udfff]/u;

export class InputError extends Error {
  constructor(errors) {
    super('INVALID_INPUT');
    this.name = 'InputError';
    this.errors = errors;
  }
}

export function validateTeamList(values, { canonicalOnly = true } = {}) {
  if (!Array.isArray(values) || values.length < 2 || values.length > 32) {
    return { ok: false, teams: [], errors: [{ code: 'TEAM_COUNT', field: 'teams' }] };
  }
  const teams = [];
  const errors = [];
  const seen = new Map();
  values.forEach((raw, index) => {
    const location = { field: 'teams', line: index + 1 };
    if (typeof raw !== 'string' || raw.length > MAX_TEAMS_TEXT) {
      errors.push({ code: 'TEAM_TEXT', ...location });
      return;
    }
    // Check before trim: tabs, CR, embedded newlines and line separators cannot disappear.
    if (forbidden.test(raw) || loneSurrogate.test(raw)) {
      errors.push({ code: 'TEAM_CHARACTERS', ...location });
      return;
    }
    const name = raw.normalize('NFC').trim();
    if (!name || [...name].length > 80) {
      errors.push({ code: 'TEAM_LENGTH', ...location });
      return;
    }
    if (canonicalOnly && name !== raw) {
      errors.push({ code: 'TEAM_CANONICAL', ...location });
      return;
    }
    if (seen.has(name)) {
      errors.push({ code: 'TEAM_DUPLICATE', ...location, previousLine: seen.get(name) });
      return;
    }
    seen.set(name, index + 1);
    teams.push(name);
  });
  return errors.length ? { ok: false, teams: [], errors } : { ok: true, teams, errors: [] };
}

export function parseTeams(multilineText) {
  if (typeof multilineText !== 'string') {
    return { ok: false, teams: [], errors: [{ code: 'TEAM_TEXT', field: 'teams' }] };
  }
  if (multilineText.length > MAX_TEAMS_TEXT) {
    return { ok: false, teams: [], errors: [{ code: 'TEAM_INPUT_LIMIT', field: 'teams' }] };
  }
  const lines = multilineText.split(/\r?\n/u);
  if (lines.at(-1) === '') lines.pop(); // At most one terminal newline, never filter blank lines.
  return validateTeamList(lines, { canonicalOnly: false });
}
