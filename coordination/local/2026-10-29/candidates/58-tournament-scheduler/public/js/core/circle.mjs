import { InputError, validateTeamList } from './teams.mjs';

const exactKeys = (object, keys) => object !== null && typeof object === 'object' && !Array.isArray(object)
  && Object.keys(object).sort().join('|') === [...keys].sort().join('|');

export function validateOptions(options) {
  const errors = [];
  if (!exactKeys(options, ['cycles', 'courts'])) return [{ code: 'OPTIONS', field: 'cycles' }];
  if (options.cycles !== 1 && options.cycles !== 2) errors.push({ code: 'CYCLES', field: 'cycles' });
  if (!Number.isInteger(options.courts) || options.courts < 1 || options.courts > 16) errors.push({ code: 'COURTS', field: 'courts' });
  return errors;
}

export function generateRounds(teams, options) {
  const validation = validateTeamList(teams);
  const errors = [...validation.errors, ...validateOptions(options)];
  if (errors.length) throw new InputError(errors);
  const { cycles, courts } = options;
  const ring = teams.length % 2 ? [...teams, null] : [...teams];
  const base = [];
  for (let r = 0; r < ring.length - 1; r++) {
    const pairs = [];
    let bye = null;
    for (let i = 0; i < ring.length / 2; i++) {
      const home = ring[i];
      const away = ring[ring.length - 1 - i];
      if (home === null || away === null) bye = home ?? away;
      else pairs.push({ home, away });
    }
    base.push({ bye, pairs });
    ring.splice(1, 0, ring.pop());
  }
  const rounds = [];
  for (let cycle = 1; cycle <= cycles; cycle++) {
    base.forEach(({ bye, pairs }, index) => {
      const round = (cycle - 1) * base.length + index + 1;
      const matches = pairs.map((pair, matchIndex) => {
        const slot = Math.floor(matchIndex / courts) + 1;
        return {
          id: `C${cycle}-R${round}-S${slot}-M${matchIndex + 1}`,
          home: cycle === 1 ? pair.home : pair.away,
          away: cycle === 1 ? pair.away : pair.home,
          slot,
          court: matchIndex % courts + 1,
          startOffsetMinutes: null,
          endOffsetMinutes: null
        };
      });
      rounds.push({ round, cycle, bye, matches });
    });
  }
  return rounds;
}

export function validateSchedule(schedule, { teams, cycles, courts }) {
  const teamValidation = validateTeamList(teams);
  const optionErrors = validateOptions({ cycles, courts });
  if (!teamValidation.ok || optionErrors.length) return [{ code: 'INPUT' }];
  const perCycle = (teams.length % 2 ? teams.length : teams.length - 1);
  if (!Array.isArray(schedule) || schedule.length !== perCycle * cycles) return [{ code: 'ROUND_COUNT' }];
  const errors = [];
  const pairCounts = new Map();
  const directions = new Set();
  const ids = new Set();
  const byes = new Map();
  const teamIds = new Map(teams.map((team, index) => [team, index]));
  const matchKeys = ['id', 'home', 'away', 'slot', 'court', 'startOffsetMinutes', 'endOffsetMinutes'];
  schedule.forEach((round, roundIndex) => {
    if (!exactKeys(round, ['round', 'cycle', 'bye', 'matches']) || !Array.isArray(round.matches)
      || round.matches.length !== Math.floor(teams.length / 2)) {
      errors.push({ code: 'ROUND_SHAPE', round: roundIndex + 1 });
      return;
    }
    const cycle = Math.floor(roundIndex / perCycle) + 1;
    if (round.round !== roundIndex + 1 || round.cycle !== cycle) errors.push({ code: 'ROUND_ORDER' });
    const seen = new Set();
    if (teams.length % 2) {
      if (!teamIds.has(round.bye)) errors.push({ code: 'BYE' });
      else {
        seen.add(round.bye);
        const byeKey = `${cycle}/${teamIds.get(round.bye)}`;
        byes.set(byeKey, (byes.get(byeKey) ?? 0) + 1);
      }
    } else if (round.bye !== null) errors.push({ code: 'BYE' });
    round.matches.forEach((match, matchIndex) => {
      if (!exactKeys(match, matchKeys)) { errors.push({ code: 'MATCH_SHAPE' }); return; }
      const slot = Math.floor(matchIndex / courts) + 1;
      const court = matchIndex % courts + 1;
      if (match.slot !== slot || match.court !== court) errors.push({ code: 'SLOT_COURT' });
      const id = `C${cycle}-R${roundIndex + 1}-S${slot}-M${matchIndex + 1}`;
      if (match.id !== id || ids.has(match.id)) errors.push({ code: 'MATCH_ID' });
      ids.add(match.id);
      if (!teamIds.has(match.home) || !teamIds.has(match.away) || match.home === match.away) {
        errors.push({ code: 'TEAM' }); return;
      }
      if (seen.has(match.home) || seen.has(match.away)) errors.push({ code: 'ROUND_TEAM_DUPLICATE' });
      seen.add(match.home); seen.add(match.away);
      const a = teamIds.get(match.home);
      const b = teamIds.get(match.away);
      const pair = `${Math.min(a, b)}/${Math.max(a, b)}`;
      pairCounts.set(pair, (pairCounts.get(pair) ?? 0) + 1);
      const direction = `${a}/${b}`;
      if (cycles === 2 && directions.has(direction)) errors.push({ code: 'DIRECTION' });
      directions.add(direction);
      const start = match.startOffsetMinutes;
      const end = match.endOffsetMinutes;
      if (!((start === null && end === null) || (Number.isSafeInteger(start) && start >= 0
        && start <= 1545960 && Number.isSafeInteger(end) && end > start && end <= 1547400))) errors.push({ code: 'OFFSET' });
    });
    if (seen.size !== teams.length) errors.push({ code: 'ROUND_COVERAGE' });
  });
  for (let a = 0; a < teams.length; a++) {
    for (let b = a + 1; b < teams.length; b++) {
      if (pairCounts.get(`${a}/${b}`) !== cycles) errors.push({ code: 'PAIR_COUNT' });
    }
    if (teams.length % 2) for (let c = 1; c <= cycles; c++) {
      if (byes.get(`${c}/${a}`) !== 1) errors.push({ code: 'BYE_COUNT' });
    }
  }
  return errors;
}

export function buildOpponentIndex(schedule, teams) {
  const validation = validateTeamList(teams);
  if (!validation.ok || !Array.isArray(schedule) || schedule.length > 62) throw new InputError([{ code: 'SCHEDULE', field: 'teams' }]);
  const cycles = schedule.at(-1)?.cycle;
  const courts = Math.max(1, ...schedule.flatMap(round => Array.isArray(round.matches) ? round.matches.map(match => match.court) : []));
  if (validateSchedule(schedule, { teams, cycles, courts }).length) throw new InputError([{ code: 'SCHEDULE', field: 'teams' }]);
  return teams.map(team => ({
    team,
    entries: schedule.map(round => {
      if (round.bye === team) return { opponent: null, round: round.round, cycle: round.cycle, status: 'bye' };
      const match = round.matches.find(item => item.home === team || item.away === team);
      return { opponent: match.home === team ? match.away : match.home, round: round.round, cycle: round.cycle, status: 'played' };
    })
  }));
}
