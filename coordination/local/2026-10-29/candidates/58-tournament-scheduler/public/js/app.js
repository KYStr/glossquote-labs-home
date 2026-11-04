import { parseTeams, InputError } from './core/teams.mjs';
import { generateRounds, validateOptions, validateSchedule, buildOpponentIndex } from './core/circle.mjs';
import { parseTiming, scheduleRounds, formatMoment, formatRange } from './core/timing.mjs';
import { serializeSchedule, DOWNLOAD_NAMES } from './core/output.mjs';

// Synchronous generation, with a generation token also guarding resource creation.
// The injected resource boundary lets offline tests observe real lifecycle decisions.
export function createScheduleState({ urlApi = globalThis.URL, makeBlob = (parts, options) => new Blob(parts, options), defer = setTimeout, cancelDefer = clearTimeout } = {}) {
  let generation = 0;
  let result = null;
  const urls = new Map();
  const release = url => {
    if (!urls.has(url)) return;
    const timer = urls.get(url);
    urls.delete(url);
    if (timer !== null) cancelDefer(timer);
    urlApi.revokeObjectURL(url);
  };
  const invalidate = () => {
    generation++;
    result = null;
    for (const url of urls.keys()) release(url);
    return generation;
  };
  return {
    invalidate,
    commit(token, value) {
      if (token !== generation || !value?.output?.ok || !(value.output.txtBytes instanceof Uint8Array) || !(value.output.jsonBytes instanceof Uint8Array)) return false;
      result = value;
      return true;
    },
    getResult: () => result,
    snapshot: () => ({ generation, ready: result !== null, activeUrls: urls.size }),
    download(kind, save) {
      if (!result || !Object.hasOwn(DOWNLOAD_NAMES, kind)) return false;
      const token = generation;
      let url = null;
      try {
        const bytes = result.output[kind === 'txt' ? 'txtBytes' : 'jsonBytes'];
        const blob = makeBlob([bytes], { type: kind === 'txt' ? 'text/plain;charset=utf-8' : 'application/json;charset=utf-8' });
        if (token !== generation || !result) return false;
        url = urlApi.createObjectURL(blob);
        urls.set(url, null);
        if (token !== generation || !result) { release(url); return false; }
        save(url, DOWNLOAD_NAMES[kind]);
        if (token === generation && urls.has(url)) urls.set(url, defer(() => release(url), 1000));
        return true;
      } catch {
        if (url !== null) release(url);
        return false;
      }
    }
  };
}

export const messages = {
  en: {
    empty: 'Not created yet', editing: 'Edited · create a new schedule', running: 'Creating schedule…', ready: '✓ Schedule created', blocked: '! Correct the highlighted fields',
    create: 'Create schedule', choose: 'Choose a team', round: 'Round', cycle: 'Cycle', slot: 'Slot', court: 'Court', home: 'Home', away: 'Away', time: 'Time', bye: 'Bye',
    noTime: 'No times assigned. Add all four optional timing fields if you need dates and times.',
    finish: 'Last match finishes', civil: 'Civil times; no timezone or daylight-saving conversion.',
    downloadStarted: 'Download requested. Check your browser’s downloads.', downloadFailed: 'The file could not be downloaded. Try the download button again.',
    TEAM_COUNT: 'Teams: enter 2–32 names, one per line.', TEAM_TEXT: 'Teams: paste a text list of names.', TEAM_INPUT_LIMIT: 'Teams: shorten the input to 16,384 text units or fewer.',
    TEAM_LENGTH: 'Teams: each line must contain a name of 1–80 Unicode characters; remove blank lines.', TEAM_CHARACTERS: 'Teams: remove control characters and embedded line separators from this name.',
    TEAM_CANONICAL: 'Teams: use names without surrounding spaces and normalize the text.', TEAM_DUPLICATE: 'Teams: this name duplicates an earlier line after normalization and trimming. Rename one team.',
    OPTIONS: 'Settings: choose a round-robin mode and 1–16 courts.', CYCLES: 'Mode: choose single or double round robin.', COURTS: 'Courts: enter a whole number from 1 to 16.',
    TIMING_GROUP: 'Timing: leave all four fields blank or complete the date, time, match minutes and changeover minutes.',
    START_DATE: 'Start date: enter a real date from 2000 to 2099 in YYYY-MM-DD format.', START_TIME: 'Start time: use 24-hour HH:mm from 00:00 to 23:59.',
    MATCH_MINUTES: 'Match minutes: enter a whole number from 1 to 1440.', CHANGEOVER_MINUTES: 'Changeover minutes: enter a whole number from 0 to 120.',
    SCHEDULE: 'The schedule could not be verified. Check the settings and create it again.', TIMING_OFFSET: 'The timing could not be verified. Check all four time settings and create the schedule again.',
    OUTPUT_OPTIONS: 'The output could not be prepared. Create the schedule again.', OUTPUT_LIMIT: 'The complete TXT and JSON exceed 2 MiB together. Shorten the team names or use a single cycle, then create again. No partial files were kept.',
    GENERATE_FAILED: 'The schedule could not be created. Check your settings and try again; no previous output is available.'
  },
  'zh-Hant': {
    empty: '尚未產生', editing: '已編輯 · 請重新產生', running: '正在產生賽程…', ready: '✓ 賽程已產生', blocked: '！請修正標示的欄位',
    create: '產生賽程', choose: '請選擇隊伍', round: '第', cycle: '循環', slot: '時段', court: '場地', home: '主', away: '客', time: '時間', bye: '輪空',
    noTime: '未排時間。如需日期與時間，請完整填寫四個選配時間欄位。', finish: '最後一場結束', civil: '純民用時間，不換算時區或夏令時間。',
    downloadStarted: '已請求下載，請查看瀏覽器的下載項目。', downloadFailed: '無法下載檔案，請再次按下載按鈕重試。',
    TEAM_COUNT: '隊伍：請輸入 2–32 個隊名，每行一隊。', TEAM_TEXT: '隊伍：請貼上純文字隊名清單。', TEAM_INPUT_LIMIT: '隊伍：請將原始輸入縮短至 16,384 個文字單位以內。',
    TEAM_LENGTH: '隊伍：每行須有 1–80 個 Unicode 字元的隊名，請移除空白列。', TEAM_CHARACTERS: '隊伍：請移除隊名中的控制字元或內嵌換行分隔符。',
    TEAM_CANONICAL: '隊伍：請移除名稱前後空白並正規化文字。', TEAM_DUPLICATE: '隊伍：這個名稱正規化並去除前後空白後與先前某一行重複，請修改其中一隊名稱。',
    OPTIONS: '設定：請選擇循環模式及 1–16 個場地。', CYCLES: '循環模式：請選擇單循環或雙循環。', COURTS: '場地數：請輸入 1–16 的整數。',
    TIMING_GROUP: '時間設定：請四欄全部留白，或完整填寫日期、時間、每場分鐘與換場分鐘。',
    START_DATE: '起始日期：請使用 YYYY-MM-DD 格式，輸入 2000–2099 年內的有效日期。', START_TIME: '起始時間：請使用 24 小時制 HH:mm，範圍 00:00–23:59。',
    MATCH_MINUTES: '每場分鐘：請輸入 1–1440 的整數。', CHANGEOVER_MINUTES: '換場分鐘：請輸入 0–120 的整數。',
    SCHEDULE: '無法驗證賽程，請檢查設定後重新產生。', TIMING_OFFSET: '無法驗證時間，請檢查四個時間欄位後重新產生。',
    OUTPUT_OPTIONS: '無法準備輸出，請重新產生賽程。', OUTPUT_LIMIT: '完整 TXT 與 JSON 合計超過 2 MiB。請縮短隊名或改為單循環後重新產生，未保留部分檔案。',
    GENERATE_FAILED: '無法產生賽程，請檢查設定後重試；目前沒有可用的舊版產物。'
  }
};

export function mountApp(doc, session = createScheduleState()) {
  const locale = doc.documentElement.lang === 'en' ? 'en' : 'zh-Hant';
  const w = messages[locale];
  const number = value => new Intl.NumberFormat(locale).format(value);
  const get = id => doc.getElementById(id);
  const form = get('schedule-form');
  const timingFields = ['startDate', 'startTime', 'matchMinutes', 'changeoverMinutes'];
  const sourceFields = ['teams', 'cycles', 'courts', ...timingFields];
  const node = (tag, text, className) => {
    const element = doc.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const setView = view => {
    get('workspace').dataset.view = view;
    get('show-input').setAttribute('aria-pressed', String(view === 'input'));
    get('show-results').setAttribute('aria-pressed', String(view === 'results'));
  };
  const status = state => {
    get('status').textContent = w[state];
    get('status').dataset.state = state;
  };
  const clearErrors = () => {
    get('errors').hidden = true;
    get('error-list').replaceChildren();
    for (const field of [...sourceFields, 'timing']) {
      const error = get(`${field}-error`);
      if (error) error.textContent = '';
      if (get(field)) get(field).removeAttribute('aria-invalid');
    }
  };
  const resetResult = () => {
    get('download-txt').disabled = true;
    get('download-json').disabled = true;
    get('result-content').hidden = true;
    get('result-empty').hidden = false;
    for (const id of ['schedule-list', 'opponent-list']) get(id).replaceChildren();
    get('opponent-panel').hidden = true;
    get('team-select').replaceChildren(node('option', w.choose));
    get('team-select').firstElementChild.value = '';
    for (const id of ['result-summary', 'time-summary', 'opponent-heading', 'download-status']) get(id).textContent = '';
  };
  const invalidate = () => {
    session.invalidate(); // Clear references and download capability before touching source-derived DOM.
    resetResult();
    clearErrors();
    get('clear-confirm').hidden = true;
  };
  const showErrors = errors => {
    resetResult();
    clearErrors();
    for (const error of errors) {
      const line = error.line ? (locale === 'en' ? `Line ${error.line}: ` : `第 ${error.line} 行：`) : '';
      const previous = error.previousLine ? (locale === 'en' ? ` (earlier line: ${error.previousLine})` : `（重複來源：第 ${error.previousLine} 行）`) : '';
      const text = `${line}${w[error.code] ?? w.GENERATE_FAILED}${previous}`;
      get('error-list').append(node('li', text));
      const fieldError = get(`${error.field}-error`);
      if (fieldError) fieldError.textContent += `${text} `;
      if (get(error.field)) get(error.field).setAttribute('aria-invalid', 'true');
      if (error.field === 'timing' || timingFields.includes(error.field)) {
        get('timing-details').open = true;
        if (error.field === 'timing') for (const field of timingFields) get(field).setAttribute('aria-invalid', 'true');
      }
    }
    setView('input');
    status('blocked');
    get('errors').hidden = false;
    get('errors').focus();
  };
  const roundLabel = round => locale === 'en' ? `Round ${number(round.round)} · Cycle ${number(round.cycle)}` : `第 ${number(round.round)} 輪 · 循環 ${number(round.cycle)}`;
  const matchNode = (match, timing) => {
    const row = node('li', undefined, 'match');
    const list = node('dl');
    const add = (label, value, className) => {
      const group = node('div', undefined, className);
      group.append(node('dt', label), node('dd', value));
      list.append(group);
    };
    add(`${w.slot} / ${w.court}`, `${number(match.slot)} / ${number(match.court)}`, 'assignment');
    add(w.home, match.home);
    add(w.away, match.away);
    if (timing) add(w.time, formatRange(timing, match), 'time');
    row.append(list);
    return row;
  };
  const render = result => {
    const { rounds, teams, options, opponents } = result;
    const matches = rounds.reduce((sum, round) => sum + round.matches.length, 0);
    get('result-summary').textContent = locale === 'en'
      ? `${number(teams.length)} teams · ${number(rounds.length)} round${rounds.length === 1 ? '' : 's'} · ${number(matches)} match${matches === 1 ? '' : 'es'} · ${number(options.courts)} court${options.courts === 1 ? '' : 's'}`
      : `${number(teams.length)} 隊 · ${number(rounds.length)} 輪 · ${number(matches)} 場比賽 · ${number(options.courts)} 個場地`;
    get('time-summary').textContent = options.timing ? `${w.finish}: ${formatMoment(options.timing, rounds.at(-1).matches.at(-1).endOffsetMinutes).text} · ${w.civil}` : w.noTime;
    const fragment = doc.createDocumentFragment();
    for (const round of rounds) {
      const section = node('section', undefined, 'round');
      const heading = node('div', undefined, 'round-heading');
      const slots = Math.ceil(round.matches.length / options.courts);
      heading.append(node('h3', roundLabel(round)), node('p', locale === 'en' ? `${number(slots)} slot${slots === 1 ? '' : 's'} · ${number(round.matches.length)} match${round.matches.length === 1 ? '' : 'es'}` : `${number(slots)} 個時段 · ${number(round.matches.length)} 場`));
      section.append(heading);
      if (round.bye !== null) section.append(node('p', `${w.bye}: ${round.bye}`, 'bye'));
      const list = node('ol', undefined, 'matches');
      for (const match of round.matches) list.append(matchNode(match, options.timing));
      section.append(list);
      fragment.append(section);
    }
    get('schedule-list').replaceChildren(fragment);
    teams.forEach((team, index) => {
      const option = node('option', team);
      option.value = String(index);
      get('team-select').append(option);
    });
    get('result-empty').hidden = true;
    get('result-content').hidden = false;
    get('download-txt').disabled = false;
    get('download-json').disabled = false;
    status('ready');
    // The full rounds remain in the DOM when the opponent panel changes.
    return opponents;
  };

  form.addEventListener('input', event => {
    if (!sourceFields.includes(event.target.id)) return;
    invalidate();
    status('editing');
  });
  form.addEventListener('change', event => {
    if (!sourceFields.includes(event.target.id)) return;
    invalidate();
    status('editing');
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    invalidate();
    const token = session.snapshot().generation;
    get('create').disabled = true;
    get('create').setAttribute('aria-busy', 'true');
    get('create').textContent = w.running;
    status('running');
    try {
      const parsed = parseTeams(get('teams').value);
      const options = { cycles: /^[12]$/u.test(get('cycles').value) ? Number(get('cycles').value) : NaN, courts: /^\d{1,2}$/u.test(get('courts').value) ? Number(get('courts').value) : NaN };
      const timingResult = parseTiming(Object.fromEntries(timingFields.map(field => [field, get(field).value])));
      const errors = [...parsed.errors, ...validateOptions(options), ...timingResult.errors];
      if (errors.length) { showErrors(errors); return; }
      const rounds = scheduleRounds(generateRounds(parsed.teams, options), timingResult.timing);
      if (validateSchedule(rounds, { teams: parsed.teams, ...options }).length) throw new InputError([{ code: 'SCHEDULE', field: 'teams' }]);
      const completeOptions = { ...options, timing: timingResult.timing };
      const output = serializeSchedule(rounds, completeOptions, parsed.teams, { locale });
      if (!output.ok) { showErrors([{ code: output.code, field: 'output' }]); return; }
      const result = { rounds, options: completeOptions, teams: parsed.teams, opponents: buildOpponentIndex(rounds, parsed.teams), output };
      if (!session.commit(token, result)) return;
      render(result);
      setView('results');
      get('result-heading').focus();
    } catch (error) {
      session.invalidate();
      showErrors(error instanceof InputError ? error.errors : [{ code: 'GENERATE_FAILED', field: 'output' }]);
    } finally {
      get('create').disabled = false;
      get('create').removeAttribute('aria-busy');
      get('create').textContent = w.create;
    }
  });
  get('team-select').addEventListener('change', () => {
    get('opponent-list').replaceChildren();
    get('opponent-panel').hidden = true;
    const result = session.getResult();
    const selection = get('team-select').value;
    if (!result || !/^\d{1,2}$/u.test(selection)) return;
    const team = result.opponents[Number(selection)];
    if (!team) return;
    get('opponent-heading').textContent = team.team;
    for (const entry of team.entries) {
      const round = result.rounds[entry.round - 1];
      if (entry.status === 'bye') get('opponent-list').append(node('li', `${roundLabel(round)} · ${w.bye}`, 'match bye'));
      else {
        const match = round.matches.find(item => item.home === team.team || item.away === team.team);
        const row = matchNode(match, result.options.timing);
        row.prepend(node('h4', roundLabel(round)));
        get('opponent-list').append(row);
      }
    }
    get('opponent-panel').hidden = false;
  });
  for (const kind of ['txt', 'json']) get(`download-${kind}`).addEventListener('click', () => {
    const ok = session.download(kind, (url, name) => {
      const anchor = node('a');
      anchor.href = url;
      anchor.download = name;
      doc.body.append(anchor);
      try { anchor.click(); } finally { anchor.remove(); }
    });
    get('download-status').textContent = ok ? w.downloadStarted : w.downloadFailed;
  });
  const clearAll = (focus = true) => {
    invalidate();
    form.reset();
    get('teams').value = '';
    get('timing-details').open = false;
    status('empty');
    setView('input');
    if (focus) get('teams').focus();
  };
  get('clear').addEventListener('click', () => {
    if (!get('teams').value && !timingFields.some(field => get(field).value) && get('cycles').value === '1' && get('courts').value === '2' && !session.getResult()) { clearAll(); return; }
    get('clear-confirm').hidden = false;
    get('confirm-clear').focus();
  });
  get('confirm-clear').addEventListener('click', () => clearAll());
  get('cancel-clear').addEventListener('click', () => {
    get('clear-confirm').hidden = true;
    get('clear').focus();
  });
  get('show-input').addEventListener('click', () => setView('input'));
  get('show-results').addEventListener('click', () => setView('results'));
  doc.defaultView.addEventListener('pagehide', () => clearAll(false));
  status('empty');
  return session;
}

if (typeof document !== 'undefined') mountApp(document);
