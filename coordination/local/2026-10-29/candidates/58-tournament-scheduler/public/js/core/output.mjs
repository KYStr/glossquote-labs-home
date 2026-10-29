import { InputError } from './teams.mjs';
import { validateOptions, validateSchedule, buildOpponentIndex } from './circle.mjs';
import { parseTiming, formatMoment, formatRange } from './timing.mjs';

export const MAX_OUTPUT_BYTES = 2097152;
export const DOWNLOAD_NAMES = Object.freeze({ txt: 'round-robin.txt', json: 'round-robin.json' });
const encoder = new TextEncoder();

export function encodeOutputPair(txt, json, maxBytes = MAX_OUTPUT_BYTES) {
  if (typeof txt !== 'string' || typeof json !== 'string' || !Number.isSafeInteger(maxBytes) || maxBytes < 0 || maxBytes > MAX_OUTPUT_BYTES) {
    throw new InputError([{ code: 'OUTPUT_OPTIONS', field: 'output' }]);
  }
  const txtBytes = encoder.encode(txt);
  const jsonBytes = encoder.encode(json);
  const actualBytes = txtBytes.byteLength + jsonBytes.byteLength;
  if (actualBytes > maxBytes) return { ok: false, code: 'OUTPUT_LIMIT', actualBytes };
  return { ok: true, txtBytes, jsonBytes };
}

const words = {
  en: {
    title: 'Round-robin schedule', teams: 'Teams', cycles: 'Cycles', courts: 'Courts', round: 'Round', cycle: 'Cycle',
    slot: 'Slot', court: 'Court', home: 'Home', away: 'Away', bye: 'Bye', opponents: 'Team opponent lists',
    duration: 'Match minutes', changeover: 'Changeover minutes', start: 'Start', end: 'Finish', noTime: 'No times assigned.',
    notice: 'Home/away are labels only. No rest-time optimization. Civil times only; no timezone or DST conversion.',
    timingNotice: 'One changeover between actual slots, including rounds; none after the final match.'
  },
  'zh-Hant': {
    title: '循環賽賽程表', teams: '隊伍', cycles: '循環', courts: '場地數', round: '輪次', cycle: '循環',
    slot: '時段', court: '場地', home: '主', away: '客', bye: '輪空', opponents: '每隊對手表',
    duration: '每場分鐘', changeover: '換場分鐘', start: '開始', end: '結束', noTime: '未排時間。',
    notice: '主客僅為欄位標籤；不最佳化休息時間。純民用時間，不換算時區或夏令時間。',
    timingNotice: '實際時段間（含輪間）只加一次換場，最後一場後不加換場。'
  }
};

export function serializeSchedule(schedule, options, teams, { maxBytes = MAX_OUTPUT_BYTES, locale = 'en' } = {}) {
  if (!Object.hasOwn(words, locale)) throw new InputError([{ code: 'OUTPUT_OPTIONS', field: 'output' }]);
  if (!options || Object.keys(options).sort().join('|') !== 'courts|cycles|timing') throw new InputError([{ code: 'OPTIONS', field: 'cycles' }]);
  const errors = validateOptions({ cycles: options.cycles, courts: options.courts });
  const timingResult = parseTiming(options.timing);
  if (errors.length || !timingResult.ok) throw new InputError([...errors, ...timingResult.errors]);
  const timing = timingResult.timing;
  if (validateSchedule(schedule, { teams, cycles: options.cycles, courts: options.courts }).length) throw new InputError([{ code: 'SCHEDULE', field: 'teams' }]);
  // Validate semantic timing rather than serializing arbitrary offsets from a caller.
  let cursor = 0;
  for (const round of schedule) {
    for (const match of round.matches) {
      const start = timing ? cursor + (match.slot - 1) * (timing.matchMinutes + timing.changeoverMinutes) : null;
      if (match.startOffsetMinutes !== start || match.endOffsetMinutes !== (timing ? start + timing.matchMinutes : null)) throw new InputError([{ code: 'TIMING_OFFSET', field: 'timing' }]);
    }
    if (timing) cursor += Math.ceil(round.matches.length / options.courts) * (timing.matchMinutes + timing.changeoverMinutes);
  }
  const opponents = buildOpponentIndex(schedule, teams);
  const payload = { schema: 'gq.round-robin', version: 1, options: { cycles: options.cycles, courts: options.courts, timing }, teams: [...teams], rounds: schedule, opponents };
  const w = words[locale];
  const quote = value => JSON.stringify(value);
  const lines = [w.title, `${w.teams}: ${teams.length} | ${w.cycles}: ${options.cycles} | ${w.courts}: ${options.courts}`, w.notice, w.timingNotice];
  if (timing) {
    lines.push(`${w.start}: ${timing.startDate} ${timing.startTime} | ${w.duration}: ${timing.matchMinutes} | ${w.changeover}: ${timing.changeoverMinutes}`);
    lines.push(`${w.end}: ${formatMoment(timing, schedule.at(-1).matches.at(-1).endOffsetMinutes).text}`);
  } else lines.push(w.noTime);
  const matchText = match => `${w.slot} ${match.slot} | ${w.court} ${match.court} | ${w.home}: ${quote(match.home)} | ${w.away}: ${quote(match.away)}${timing ? ` | ${formatRange(timing, match)}` : ''}`;
  for (const round of schedule) {
    lines.push('', `${w.round} ${round.round} (${w.cycle} ${round.cycle})`);
    if (round.bye !== null) lines.push(`${w.bye}: ${quote(round.bye)}`);
    for (const match of round.matches) lines.push(matchText(match));
  }
  lines.push('', w.opponents);
  for (const team of opponents) {
    lines.push('', `${w.teams}: ${quote(team.team)}`);
    for (const entry of team.entries) {
      const round = schedule[entry.round - 1];
      const detail = entry.status === 'bye' ? w.bye : matchText(round.matches.find(match => match.home === team.team || match.away === team.team));
      lines.push(`${w.round} ${entry.round} (${w.cycle} ${entry.cycle}) | ${detail}`);
    }
  }
  return encodeOutputPair(`${lines.join('\n')}\n`, `${JSON.stringify(payload, null, 2)}\n`, maxBytes);
}
