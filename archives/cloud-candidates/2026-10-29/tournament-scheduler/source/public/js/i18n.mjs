// 介面與報告均使用頁面自己的語言，不將使用者文字當翻譯鍵。
export const messages = Object.freeze({
  'zh-Hant': Object.freeze({
    title: '循環賽賽程表', single: '單循環', double: '雙循環', teams: '隊伍', rounds: '輪次', matches: '總場數',
    round: '第', roundEnd: '輪', leg: '段', bye: '輪空', versus: '對', ignored: '忽略的空白行',
    roundList: '逐輪對戰', teamList: '每隊賽程', team: '隊伍',
    noResult: '尚未產生賽程。', changed: '輸入已變更；舊結果已撤銷，請重新產生。', ready: '賽程已產生。可核對每輪及每隊對手。',
    copy: '複製報告', copying: '正在複製…', copied: '已複製文字報告。', manual: '無法一鍵複製；請選取下方報告再複製。',
    downloadStarted: '已交給瀏覽器下載；60 秒後可再次下載。', downloadFailed: '無法建立下載；仍可選取下方報告。',
    compose: '請完成輸入法組字後再產生賽程。', cleared: '已清除隊伍與結果。', example: '甲隊\n乙隊\n丙隊\n丁隊\n戊隊',
    sampleLoaded: '已載入 5 隊假資料；請按「產生賽程」。', clearPrompt: '清除所有隊伍和賽程？此動作無法復原。',
    disclaimer: '依輸入順序固定排程；左右不是主客場。未排場地或時段，也不保證公平配置。',
    line: '輸入行號', errors: Object.freeze({ SCHEMA: '輸入格式無法處理。請重新輸入隊伍。', SOURCE_LONG: '整份名單不可超過 8192 個 UTF-16 單位。', NAME_CONTROL: '隊名含不支援的控制、方向或無效文字字元。', NAME_LONG: '每隊名稱最多 64 個 Unicode 碼點。', TEAM_COUNT: '請輸入 2 至 32 隊，一行一隊。', MODE: '請選擇單循環或雙循環。', INTERNAL: '無法建立賽程；請檢查輸入後重試。' })
  }),
  en: Object.freeze({
    title: 'Round-Robin Scheduler', single: 'Single round robin', double: 'Double round robin', teams: 'Teams', rounds: 'Rounds', matches: 'Matches',
    round: 'Round ', roundEnd: '', leg: 'Leg', bye: 'Bye', versus: 'vs', ignored: 'Blank lines ignored',
    roundList: 'Fixtures by round', teamList: 'Team schedules', team: 'Team',
    noResult: 'No schedule yet.', changed: 'Inputs changed. The old result was cleared; generate a new schedule.', ready: 'Schedule ready. Review the rounds and each team’s opponents.',
    copy: 'Copy report', copying: 'Copying…', copied: 'Text report copied.', manual: 'One-click copy is unavailable. Select the report below to copy it.',
    downloadStarted: 'Download handed to your browser. You can download again in 60 seconds.', downloadFailed: 'Download could not be created. You can still select the report below.',
    compose: 'Finish composing text before generating the schedule.', cleared: 'Teams and results cleared.', example: 'Team Alpha\nTeam Beta\nTeam Gamma\nTeam Delta\nTeam Epsilon',
    sampleLoaded: 'Loaded 5 fictional teams. Select “Generate schedule”.', clearPrompt: 'Clear all teams and the schedule? This cannot be undone.',
    disclaimer: 'Deterministic input-order schedule. Left/right is not home/away. Venues, time slots and fairness are not optimized.',
    line: 'Input line', errors: Object.freeze({ SCHEMA: 'The input format cannot be processed. Re-enter the teams.', SOURCE_LONG: 'The full roster must not exceed 8192 UTF-16 units.', NAME_CONTROL: 'A team name contains unsupported control, direction or invalid text characters.', NAME_LONG: 'Each team name must contain at most 64 Unicode code points.', TEAM_COUNT: 'Enter 2 to 32 teams, one team per line.', MODE: 'Choose single or double round robin.', INTERNAL: 'The schedule could not be created. Check the inputs and try again.' })
  })
});
export const teamLabel = (schedule, id) => `[#${id}] ${schedule.teams[id - 1].name}`;
export function roundLabel(number, language) {
  const t = messages[language];
  return `${t.round}${number}${t.roundEnd}`;
}
export function formatReport(schedule, language) {
  // 只有應用程式自己產生的凍結結果會到此處；不提供任意 JSON 匯入。
  const t = messages[language];
  if (!t) throw new Error('Unsupported report language');
  const lines = [t.title, t[schedule.mode], `${t.teams}: ${schedule.teams.length} · ${t.rounds}: ${schedule.rounds.length} · ${t.matches}: ${schedule.matchCount}`, `${t.ignored}: ${schedule.ignored}`, t.disclaimer, '', t.roundList];
  for (const round of schedule.rounds) {
    lines.push(roundLabel(round.number, language));
    for (const pair of round.pairs) lines.push(`  ${teamLabel(schedule, pair.a)} ${t.versus} ${teamLabel(schedule, pair.b)}`);
    if (round.bye !== null) lines.push(`  ${t.bye}: ${teamLabel(schedule, round.bye)}`);
  }
  lines.push('', t.teamList);
  for (const team of schedule.teamSchedules) {
    lines.push(teamLabel(schedule, team.id));
    for (const fixture of team.fixtures) lines.push(`  ${roundLabel(fixture.round, language)}: ${fixture.opponent === null ? t.bye : `${t.versus} ${teamLabel(schedule, fixture.opponent)}`}`);
  }
  // 明定 LF、無 BOM、無末尾換行，畫面與 TXT 都用這份 snapshot。
  return lines.join('\n');
}
