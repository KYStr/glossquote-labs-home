// 核心只接受有界文字與固定模式，不依賴 DOM、亂數、時鐘、網路或持久儲存。
export const LIMITS = Object.freeze({ minTeams: 2, maxTeams: 32, namePoints: 64, sourceUnits: 8192 });
// 固定代碼不包含使用者原稿或內部例外。
export class ScheduleError extends Error {
  constructor(code, field = 'roster', line = null) { super(code); this.name = 'ScheduleError'; this.code = code; this.field = field; this.line = line; }
}
const fail = (code, field, line) => { throw new ScheduleError(code, field, line); };
// 名稱不能用控制字元或 bidi 控制碼偽裝其他隊伍、行或報告標題。
const forbidden = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;
export function parseRoster(source) {
  // 先限原始 UTF-16 長度，再分行，避免無限空白或超大輸入。
  if (typeof source !== 'string') fail('SCHEMA');
  if (source.length > LIMITS.sourceUnits) fail('SOURCE_LONG');
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const teams = []; let ignored = 0;
  for (let index = 0; index < lines.length; index += 1) {
    // 明確 trim 僅限邊界；名稱內控制碼不悄悄刪除。
    const name = lines[index].trim();
    if (!name) { ignored += 1; continue; }
    if (!name.isWellFormed() || forbidden.test(name)) fail('NAME_CONTROL', 'roster', index + 1);
    if ([...name].length > LIMITS.namePoints) fail('NAME_LONG', 'roster', index + 1);
    if (teams.length >= LIMITS.maxTeams) fail('TEAM_COUNT', 'roster', index + 1);
    teams.push(Object.freeze({ id: teams.length + 1, name }));
  }
  if (teams.length < LIMITS.minTeams) fail('TEAM_COUNT');
  return Object.freeze({ teams: Object.freeze(teams), ignored });
}
function readInput(input) {
  // 描述符檢查拒絕 accessor/symbol/未知鍵，不呼叫自訂 getter。
  try {
    if (input === null || typeof input !== 'object' || Object.getPrototypeOf(input) !== Object.prototype) fail('SCHEMA');
    const keys = Reflect.ownKeys(input);
    if (keys.length !== 2 || !keys.includes('roster') || !keys.includes('mode')) fail('SCHEMA');
    const values = {};
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) fail('SCHEMA');
      values[key] = descriptor.value;
    }
    return values;
  } catch { fail('SCHEMA'); }
}
export function scheduleTournament(input) {
  const { roster, mode } = readInput(input);
  if (mode !== 'single' && mode !== 'double') fail('MODE', 'mode');
  const { teams, ignored } = parseRoster(roster);
  // null 是內部輪空位置，永遠不作可見的假隊伍。
  let ring = teams.map(team => team.id);
  if (ring.length % 2) ring.push(null);
  const firstLeg = [];
  for (let round = 0; round < ring.length - 1; round += 1) {
    const pairs = []; let bye = null;
    for (let index = 0; index < ring.length / 2; index += 1) {
      const a = ring[index]; const b = ring[ring.length - 1 - index];
      if (a === null || b === null) bye = a ?? b;
      else pairs.push(Object.freeze({ a, b }));
    }
    firstLeg.push(Object.freeze({ number: round + 1, leg: 1, pairs: Object.freeze(pairs), bye }));
    // 固定首隊，其餘環形旋轉；每對隊伍因此恰好遇一次。
    ring = [ring[0], ring.at(-1), ...ring.slice(1, -1)];
  }
  const rounds = [...firstLeg];
  if (mode === 'double') {
    for (const round of firstLeg) {
      // 第二段沿相同輪次順序交換左右；左右不是主客場指派。
      rounds.push(Object.freeze({ number: rounds.length + 1, leg: 2, pairs: Object.freeze(round.pairs.map(({ a, b }) => Object.freeze({ a: b, b: a }))), bye: round.bye }));
    }
  }
  // 每隊賽程直接以固定 ID 取對手，不以可能重複的名稱比對。
  const teamSchedules = teams.map(team => Object.freeze({ id: team.id, fixtures: Object.freeze(rounds.map(round => {
    const pair = round.pairs.find(pair => pair.a === team.id || pair.b === team.id);
    return Object.freeze({ round: round.number, opponent: pair ? (pair.a === team.id ? pair.b : pair.a) : null });
  })) }));
  return Object.freeze({ teams, mode, ignored, rounds: Object.freeze(rounds), teamSchedules: Object.freeze(teamSchedules), matchCount: teams.length * (teams.length - 1) / 2 * (mode === 'double' ? 2 : 1) });
}
