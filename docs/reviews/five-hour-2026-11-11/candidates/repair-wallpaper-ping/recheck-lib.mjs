import { isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const err = (code, field = null, row = null) => ({ok: false, error: {code, field, row}});
export const own = (o, key) => Object.hasOwn(o, key);
export const plain = o => o != null && typeof o === 'object' &&
  (Object.getPrototypeOf(o) === Object.prototype || Object.getPrototypeOf(o) === null);
export function sortedJSON(x) {
  if (Array.isArray(x)) return '[' + x.map(sortedJSON).join(',') + ']';
  if (x && typeof x === 'object')
    return '{' + Object.keys(x).sort().map(k => JSON.stringify(k) + ':' + sortedJSON(x[k])).join(',') + '}';
  return JSON.stringify(x);
}
export const bytesOf = s => Buffer.byteLength(s, 'utf8');
export const hashOf = s => createHash('sha256').update(s).digest('hex');
export const reportOf = result => {
  const data = sortedJSON(result) + '\n';
  return {bytes: bytesOf(data), sha256: hashOf(data)};
};
export const checkpoint = (state, available, extra = {}) => ({state, reportAvailable: available, ...extra});

export function audit({fixtureSHA, run, runController, additional = () => [], makeReport = reportOf}) {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: node verify.mjs path/to/fixtures.json');
  const source = readFileSync(file);
  if (hashOf(source) !== fixtureSHA) throw new Error('Fixture SHA-256 differs from the reviewed blob.');
  const fixture = JSON.parse(source.toString('utf8'));
  console.log(JSON.stringify({runtime: process.version, fixtureSHA, specId: fixture.specId, note: 'Independent document oracle. No product code or GUI executed.'}));
  let passed = 0;
  const counts = {};
  for (const c of fixture.cases) {
    // Only read input, kind and scenario ID for derivation; read expected after computing.
    const derived = c.kind === 'core' ? run(c.input) : runController(c.id, c.input);
    const match = isDeepStrictEqual(derived, c.expected);
    if (match) passed++;
    const a = counts[c.kind] ??= {total: 0, matched: 0};
    a.total++; a.matched += Number(match);
    console.log(JSON.stringify({id: c.id, kind: c.kind, status: match ? 'PASS' : 'FAIL', input: c.input,
      derived, literalExpected: c.expected, report: c.kind === 'core' && derived.ok ? makeReport(derived.result, c.input) : undefined}));
  }
  for (const x of additional()) console.log(JSON.stringify({additional: x}));
  console.log(JSON.stringify({totals: {cases: fixture.cases.length, matched: passed, mismatched: fixture.cases.length - passed, byKind: counts}}));
  process.exitCode = Number(passed !== fixture.cases.length);
}
