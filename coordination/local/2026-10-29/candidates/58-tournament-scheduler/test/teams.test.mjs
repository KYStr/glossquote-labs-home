import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTeams, validateTeamList, MAX_TEAMS_TEXT } from '../public/js/core/teams.mjs';

test('A06: 1 and 33 teams fail atomically; 2 and 32 succeed', () => {
  for (const text of ['A', Array.from({ length: 33 }, (_, i) => `Fake${i}`).join('\n')]) {
    assert.deepEqual(parseTeams(text), { ok: false, teams: [], errors: [{ code: 'TEAM_COUNT', field: 'teams' }] });
  }
  assert.deepEqual(parseTeams('A\nB').teams, ['A', 'B']);
  assert.equal(parseTeams(Array.from({ length: 32 }, (_, i) => `Fake${i}`).join('\n')).teams.length, 32);
});

test('A07: NFC + trim detects exact duplicates, preserves case distinctions and canonical display', () => {
  assert.deepEqual(parseTeams(' e\u0301 \né').errors, [{ code: 'TEAM_DUPLICATE', field: 'teams', line: 2, previousLine: 1 }]);
  assert.deepEqual(parseTeams('Team\nteam').teams, ['Team', 'team']);
  assert.deepEqual(parseTeams(' e\u0301 \n B ').teams, ['é', 'B']);
});

test('A08: only one terminal newline is ignored, including CRLF', () => {
  assert.deepEqual(parseTeams('A\nB\n').teams, ['A', 'B']);
  assert.deepEqual(parseTeams('A\r\nB\r\n').teams, ['A', 'B']);
  for (const text of ['A\n\nB', 'A\nB\n\n', 'A\n  \nB']) {
    const result = parseTeams(text);
    assert.equal(result.ok, false);
    assert.deepEqual(result.teams, []);
    assert.equal(result.errors[0].code, 'TEAM_LENGTH');
  }
});

test('A15: controls, embedded team newline, separators and lone surrogates fail before trim', () => {
  for (const value of ['A\u0000', 'A\r', '\tA', 'A\u0085', 'A\u2028', 'A\u2029', 'A\ud800', 'A\nB']) {
    assert.equal(validateTeamList([value, 'C'], { canonicalOnly: false }).errors[0].code, 'TEAM_CHARACTERS');
  }
  assert.equal(parseTeams('A\u0000\nB').ok, false);
  assert.equal(parseTeams('A\u2028\nB').ok, false);
});

test('Unicode scalar length 80/81, raw hard cap and non-string boundaries', () => {
  assert.equal(parseTeams(`${'😀'.repeat(80)}\nB`).ok, true);
  assert.equal(parseTeams(`${'😀'.repeat(81)}\nB`).ok, false);
  assert.equal(parseTeams('x'.repeat(MAX_TEAMS_TEXT + 1)).errors[0].code, 'TEAM_INPUT_LIMIT');
  assert.equal(parseTeams(null).ok, false);
  assert.equal(validateTeamList([' A ', 'B']).errors[0].code, 'TEAM_CANONICAL');
  assert.equal(validateTeamList([1, 'B']).ok, false);
});
