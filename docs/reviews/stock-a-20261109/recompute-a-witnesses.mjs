import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const [repository = '.', receiptPath] = process.argv.slice(2);
const receipts = JSON.parse(readFileSync(receiptPath ?? new URL('candidate-readback.json', import.meta.url), 'utf8'));
assert.equal(receipts.head, 'aab724b71589664b26c8d92735a637ac37f0c4b2');
const read = path => execFileSync('git', ['-C', repository, 'cat-file', 'blob', receipts.head + ':' + path], { maxBuffer: 1_048_576 });
const manifest = JSON.parse(read('docs/consolidation/2026-11-09/spec-stock-a-manifest.json'));
const slugs = manifest.specs.map(s => s.slug);
const files = new Map(slugs.map(s => [s, JSON.parse(read('docs/specs/' + s + '/fixtures.json'))]));
const all = (slug, kind) => files.get(slug).cases.filter(c => c.kind === kind);
const positive = slug => all(slug, 'core').filter(c => c.expected.ok);
const take = (slug, id) => {
  const c = files.get(slug).cases.find(c => c.id === id);
  assert.ok(c, slug + '/' + id);
  return c;
};
const value = (slug, id) => take(slug, id).expected.result;
const sum = (numbers, zero = 0) => numbers.reduce((s, n) => s + n, zero);
const split = s => s === '' ? [] : s.replace(/\n$/, '').split('\n');
const scale = s => {
  const [whole, tail = ''] = s.replace(/^-/, '').split('.');
  const v = 1000n * BigInt(whole) + BigInt(tail.padEnd(3, '0'));
  return s.startsWith('-') ? -v : v;
};
const min = (a, b) => a < b ? a : b;

for (const entry of receipts.files) {
  assert.equal(createHash('sha256').update(read(entry.path)).digest('hex'), entry.sha256, entry.path);
}

const sections = ['goal', 'scope', 'userFlow', 'inputsOutputs', 'implementation', 'acceptance', 'tests', 'handoff'];
let controllerCases = 0;
for (const spec of manifest.specs) {
  const doc = read(spec.documentPath).toString('utf8');
  assert.deepEqual([...doc.matchAll(/^## (\w+)$/gm)].map(x => x[1]), sections, spec.slug);
  assert.equal(spec.acceptanceCriteria.length, 9);
  const core = all(spec.slug, 'core');
  const byInput = v => core.find(c => JSON.stringify(c.input) === JSON.stringify(v))?.expected;
  const reset = JSON.parse(doc.match(/復原預設 .(\{.*?\}). 並聚焦/u)[1]);
  for (const c of all(spec.slug, 'controller')) {
    const x = c.input;
    const y = c.expected;
    const no = state => ({ state, reportAvailable: false });
    const bad = expected => ({ ...no('error'), error: expected.error });
    if (c.id === 'state-dirty-error') {
      assert.equal(byInput(x.initial)?.ok, true, spec.slug);
      assert.equal(byInput(x.edit)?.ok, false, spec.slug);
      assert.deepEqual(y, { afterRun: { state: 'success', reportAvailable: true }, afterEdit: no('dirty'), afterRerun: bad(byInput(x.edit)) });
    } else if (c.id === 'state-cancel-late') {
      assert.deepEqual(x.lateResult, byInput(x.draft)?.result);
      assert.deepEqual(y, { whilePending: no('busy'), afterCancel: { ...no('cancelled'), draft: x.draft }, afterLateResult: no('cancelled'), afterReset: { ...no('empty'), draft: reset } });
    } else {
      assert.equal(c.id, 'state-replace-late');
      assert.deepEqual(x.olderLateResult, byInput(x.olderDraft)?.result);
      assert.deepEqual(y, { afterNewerResult: bad(byInput(x.newerDraft)), afterOlderLateResult: bad(byInput(x.newerDraft)) });
    }
    controllerCases++;
  }
}

const checks = {
  'unicode-key-collisions'() {
    for (const { input: x, expected: { result: y } } of positive('unicode-key-collisions')) {
      const rows = split(x.keys);
      const memberships = rows.map((raw, i) => ({ line: i + 1, raw, codePoints: [...raw].map(p => 'U+' + p.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')) }));
      const canonical = rows.map(raw => raw.normalize(x.form));
      const groups = [...new Set(canonical)].map(key => {
        const members = memberships.filter((_, i) => canonical[i] === key);
        return { canonical: key, members, kind: new Set(members.map(row => row.raw)).size > 1 ? 'alias' : 'exact' };
      }).filter(group => group.members.length > 1);
      assert.deepEqual(y, { form: x.form, rowCount: rows.length, groups });
    }
    assert.equal(take('unicode-key-collisions', 'surrogate').input.keys.isWellFormed(), false);
  },
  'text-offset-map'() {
    for (const { input: x, expected: { result: y } } of positive('text-offset-map')) {
      const prefix = Array.from(x.text).slice(0, y.scalar).join('');
      assert.deepEqual(y, { utf8: Buffer.byteLength(prefix), utf16: prefix.length, scalar: [...prefix].length, line: prefix.split('\n').length, column: [...prefix.split('\n').at(-1)].length + 1 });
      assert.equal(y[x.unit], Number(x.offset));
    }
    const c = take('text-offset-map', 'mid-byte');
    assert.ok(Number(c.input.offset) > 1 && Number(c.input.offset) < 1 + Buffer.byteLength('😀'));
    assert.equal(c.expected.error.code, 'SPLIT_SCALAR');
  },
  'text-file-line-endings'() {
    function runBytes(x) {
      const bytes = Buffer.from(x.bytes);
      const bom = bytes.subarray(0, 3).toString('hex') === 'efbbbf';
      const offset = bom ? 3 : 0;
      const tokens = new Map([['\r\n', 'crlf'], ['\r', 'cr'], ['\n', 'lf']]);
      const body = bytes.subarray(offset).toString('latin1');
      const rows = [...body.matchAll(/\r\n|\r|\n/g)];
      const stats = [...tokens].map(([symbol, name]) => {
        const found = rows.filter(m => m[0] === symbol);
        return [name, { count: found.length, offsets: found.slice(0, 8).map(m => m.index + offset) }];
      });
      const hex = Buffer.from(body.replace(/\r\n|\r|\n/g, x.target === 'lf' ? '\n' : '\r\n'), 'latin1').toString('hex');
      const last = rows.at(-1);
      return { bom, ...Object.fromEntries(stats), last: last && last.index + last[0].length === body.length ? tokens.get(last[0]) : 'none', outputHex: (bom && x.bomMode === 'keep' ? 'efbbbf' : '') + hex };
    }
    for (const { input: x, expected: { result: y } } of positive('text-file-line-endings')) assert.deepEqual(runBytes(x), y);
    const c = take('text-file-line-endings', 'double-bom');
    const second = runBytes({ ...c.input, bytes: [...Buffer.from(c.expected.result.outputHex, 'hex')] });
    assert.equal(second.outputHex, '0a');
    assert.notEqual(second.outputHex, c.expected.result.outputHex);
    const maxInput = Buffer.alloc(65_536, 10);
    assert.equal(Buffer.byteLength(maxInput.toString('latin1').replace(/\n/g, '\r\n'), 'latin1'), 131_072);
    assert.throws(() => new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(take('text-file-line-endings', 'bad-utf8').input.bytes)));
  },
  'decimal-column-parser'() {
    assert.deepEqual(value('decimal-column-parser', 'dot-round').cleanValues, ['1234.50', '1.00', '1.02']);
    assert.deepEqual(value('decimal-column-parser', 'ties-negative').cleanValues, ['-2', '-4', '0']);
    assert.deepEqual(value('decimal-column-parser', 'comma-preserve').cleanValues, ['-1000.25', '0', '1']);
    const { rows, cleanValues } = value('decimal-column-parser', 'digit-boundary');
    assert.equal(rows[0].value.length, 18);
    assert.equal(rows[1].error, 'DIGIT_LIMIT');
    assert.equal(cleanValues, null);
  },
  'weighted-percentile'() {
    for (const { input: x, expected: { result: y } } of positive('weighted-percentile')) {
      const rows = split(x.samples).map(s => s.split('\t')).map(([v, n]) => ({ v: scale(v), n: BigInt(n) }));
      const total = sum(rows.map(r => r.n), 0n);
      const p = scale(x.percentile);
      const floor = p * total / 100000n;
      const ceil = floor + (p * total % 100000n === 0n ? 0n : 1n);
      const rank = ceil < 1n ? 1n : ceil;
      const chosen = scale(y.quantile);
      const before = sum(rows.filter(r => r.v < chosen).map(r => r.n), 0n);
      const through = sum(rows.filter(r => r.v <= chosen).map(r => r.n), 0n);
      assert.ok(before < rank && rank <= through);
      assert.deepEqual([y.weightTotal, y.rank, y.cumulativeBefore, y.cumulativeThrough], [total, rank, before, through].map(String));
      assert.deepEqual(y.contributors, rows.flatMap((r, i) => r.v === chosen ? [i + 1] : []));
    }
  },
  'candidate-key-audit'() {
    for (const { input: x, expected: { result: y } } of positive('candidate-key-audit')) {
      const [columns, ...rows] = split(x.table).map(s => s.split('\t'));
      const groups = split(x.candidates).map(s => s.split('+'));
      assert.equal(y.rowCount, rows.length);
      const witnesses = groups.map(names => {
        const tuples = rows.map(row => names.map(name => row[columns.indexOf(name)]));
        const missingRows = tuples.flatMap((row, i) => row.includes('') ? [i + 2] : []);
        const duplicateGroups = [];
        const used = new Set();
        for (let i = 0; i < tuples.length; i++) {
          if (missingRows.includes(i + 2) || used.has(i)) continue;
          const group = tuples.flatMap((r, j) => r.every((v, k) => v === tuples[i][k]) ? [j + 2] : []);
          if (group.length > 1) { duplicateGroups.push(group); for (const n of group) used.add(n - 2); }
        }
        return { columns: names, missingRows, duplicateGroups, valid: !missingRows.length && !duplicateGroups.length };
      });
      for (const r of witnesses) r.minimal = r.valid && !witnesses.some(s => s.valid && s.columns.length < r.columns.length && s.columns.every(n => r.columns.includes(n)));
      assert.deepEqual(y.candidates, witnesses);
    }
  },
  'json-patch-preflight'() {
    const insert = take('json-patch-preflight', 'insert-and-remove');
    const old = JSON.parse(insert.input.document).rows;
    assert.deepEqual(insert.expected.result.document.rows, ['b', ...old.slice(1)]);
    const escaped = take('json-patch-preflight', 'pointer-escapes');
    const tokens = JSON.parse(escaped.input.patch)[0].path.slice(1).split('/').map(t => t.replace(/~1/g, '/').replace(/~0/g, '~'));
    assert.deepEqual(tokens, ['~1', 'a/b']);
    assert.equal(escaped.expected.result.document[tokens[0]][tokens[1]], 2);
    assert.equal(take('json-patch-preflight', 'late-failure').expected.error.row, 2);
    assert.equal(value('json-patch-preflight', 'maximum-integer').document.v, Number.MAX_SAFE_INTEGER);
  },
  'markdown-anchor-audit'() {
    const forward = value('markdown-anchor-audit', 'forward-reference');
    assert.deepEqual(forward.links.map(l => [l.id, l.targets]), [['setup', [2]], ['build-notes', [3]]]);
    assert.deepEqual(value('markdown-anchor-audit', 'case-collision').collisions, [{ id: 'build-notes', lines: [1, 2] }]);
    assert.deepEqual(value('markdown-anchor-audit', 'ignore-fence'), { headings: [], links: [{ line: 4, id: 'fake', status: 'missing', targets: [] }], collisions: [], unsupportedHeadings: [5] });
    assert.equal(take('markdown-anchor-audit', 'open-fence').expected.error.row, 2);
  },
  'unified-patch-check'() {
    for (const { input: x, expected: { result: y } } of positive('unified-patch-check')) {
      const lines = split(x.patch).slice(2);
      assert.equal(y.added, lines.filter(l => l.startsWith('+')).length);
      assert.equal(y.removed, lines.filter(l => l.startsWith('-')).length);
      assert.equal(split(y.text).length, split(x.base).length + y.added - y.removed);
    }
    const y = value('unified-patch-check', 'two-hunks');
    assert.equal(y.text, 'a\nx\nb\nC\n');
    assert.deepEqual(y.hunks.map(h => [h.oldIndex, h.newIndex]), [[1, 1], [2, 3]]);
    assert.equal(take('unified-patch-check', 'mismatch-space').expected.error.row, 4);
  },
  'fixed-width-slicer'() {
    const utf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
    for (const { input: x, expected: { result: y } } of positive('fixed-width-slicer')) {
      const widths = x.widths.split(',').map(Number);
      assert.deepEqual(y.widths, widths);
      assert.equal(y.byteWidth, sum(widths));
      for (const [i, row] of split(x.records).entries()) {
        const bytes = Buffer.from(row, 'utf8');
        const wanted = y.rows[i];
        assert.equal(wanted.line, i + 1);
        if (bytes.length !== y.byteWidth) {
          assert.deepEqual(wanted, { line: i + 1, error: 'LENGTH', actualBytes: bytes.length });
          continue;
        }
        const fields = [];
        let at = 0;
        let splitAt = null;
        for (const w of widths) {
          try { fields.push(utf8.decode(bytes.subarray(at, at + w))); }
          catch { splitAt = at + w; break; }
          at += w;
        }
        if (splitAt === null) assert.deepEqual(wanted.fields, fields);
        else assert.deepEqual(wanted, { line: i + 1, error: 'SPLIT_UTF8', actualBytes: bytes.length, boundary: splitAt });
      }
    }
  },
  'binary-record-inspector'() {
    for (const { input: x, expected: { result: y } } of positive('binary-record-inspector')) {
      const bytes = Uint8Array.from(Buffer.from(x.hex.replace(/[ \t\n]/g, ''), 'hex'));
      const dv = new DataView(bytes.buffer);
      assert.equal(y.byteCount, bytes.length);
      for (const [i, row] of split(x.layout).entries()) {
        const [label, offsetText, type] = row.split('\t');
        const offset = Number(offsetText);
        const bits = Number(type.match(/\d+/)[0]);
        const read = 'get' + (bits === 64 ? 'Big' : '') + (type[0] === 'u' ? 'Uint' : 'Int') + bits;
        const hex = Buffer.from(bytes.slice(offset, offset + bits / 8)).toString('hex');
        assert.deepEqual(y.fields[i], { label, offset, type, hex, value: String(dv[read](offset, type.endsWith('le'))) });
      }
    }
  },
  'log-gap-audit'() {
    for (const { input: x, expected: { result: y } } of positive('log-gap-audit')) {
      const rows = split(x.records).map(s => s.split('\t').map(BigInt));
      const findings = [];
      for (let i = 1; i < rows.length; i++) {
        const [a, b] = rows[i - 1];
        const [c, d] = rows[i];
        const issues = [];
        if (a > c) issues.push({ code: 'SEQ_REVERSE' });
        else if (a === c) issues.push({ code: 'SEQ_REPEAT' });
        else if (a + 1n < c) issues.push({ code: 'SEQ_GAP', from: String(a + 1n), to: String(c - 1n), count: String(c - a - 1n) });
        if (b > d) issues.push({ code: 'TIME_REVERSE' });
        else if (b + BigInt(x.threshold) < d) issues.push({ code: 'TIME_GAP' });
        if (issues.length) findings.push({ line: i + 1, prevLine: i, sequenceDelta: String(c - a), timeDelta: String(d - b), issues });
      }
      assert.deepEqual(y, { rowCount: rows.length, findings });
    }
  },
  'retry-budget'() {
    for (const { input: x, expected: { result: y } } of positive('retry-budget')) {
      const { budget, timeout, attemptLimit, initialDelay, factor, maxDelay } = Object.fromEntries(Object.entries(x).map(([k, v]) => [k, BigInt(v)]));
      const delay = n => n === 1 ? 0n : min(maxDelay, initialDelay * factor ** BigInt(n - 2));
      const attempts = [];
      let end = 0n;
      let nextRejected = null;
      for (let n = 1; n <= Number(attemptLimit); n++) {
        const start = end + delay(n);
        if (start + timeout > budget) { nextRejected = { number: n, startMs: Number(start), endMs: Number(start + timeout) }; break; }
        end = start + timeout;
        attempts.push({ number: n, delayMs: Number(delay(n)), startMs: Number(start), endMs: Number(end) });
      }
      assert.deepEqual(y, { attempts, unspentMs: Number(budget - end), nextRejected });
    }
  },
  'dependency-reduction'() {
    for (const { input: x, expected: { result: y } } of positive('dependency-reduction')) {
      const edges = split(x.edges);
      const nodes = split(x.modules);
      if (y.status === 'cycle') {
        assert.equal(y.cycle[0], y.cycle.at(-1));
        assert.ok(y.cycle.slice(1).every((n, i) => edges.includes(y.cycle[i] + '>' + n)));
        assert.deepEqual(y.stages, []);
        continue;
      }
      assert.deepEqual(y.stages.flat().toSorted(), nodes.toSorted());
      for (const [i, stage] of y.stages.entries()) {
        assert.deepEqual(stage, stage.toSorted());
        for (const v of stage) {
          const deps = edges.filter(e => e.split('>')[1] === v).map(e => y.stages.findIndex(s => s.includes(e.split('>')[0])));
          assert.equal(i, deps.length ? 1 + Math.max(...deps) : 0);
        }
      }
      for (const e of edges) {
        const [start, end] = e.split('>');
        const matrix = new Map(nodes.map(u => [u, new Set(nodes.filter(v => u + '>' + v !== e && edges.includes(u + '>' + v)))]));
        for (const k of nodes) for (const i of nodes) if (matrix.get(i).has(k)) for (const j of matrix.get(k)) matrix.get(i).add(j);
        const witness = y.redundant.find(w => w.from === start && w.to === end);
        assert.equal(Boolean(witness), matrix.get(start).has(end));
        if (witness) {
          assert.equal(witness.via[0], start);
          assert.equal(witness.via.at(-1), end);
          assert.ok(witness.via.slice(1).every((v, i) => witness.via[i] + '>' + v !== e && edges.includes(witness.via[i] + '>' + v)));
        }
      }
    }
    assert.deepEqual(value('dependency-reduction', 'alternate-witness').redundant[0].via, ['A', 'B', 'D']);
  },
  'pairwise-test-matrix'() {
    for (const { input: x, expected: { result: y } } of positive('pairwise-test-matrix')) {
      const dims = split(x.dimensions).map(row => row.split(':')).map(([key, opts]) => [key, opts.split('|')]);
      const universe = dims.reduce((acc, [, opts]) => acc.flatMap(tuple => opts.map(o => [...tuple, o])), [[]]);
      const pairs = tuple => tuple.flatMap((a, i) => tuple.slice(i + 1).map((b, j) => JSON.stringify([i, a, i + 1 + j, b])));
      const missing = new Set(universe.flatMap(pairs));
      assert.equal(y.spaceSize, universe.length);
      assert.equal(y.pairCount, missing.size);
      for (const row of y.cases) {
        const gain = tuple => pairs(tuple).filter(p => missing.has(p)).length;
        const chosen = universe.reduce((best, candidate) => gain(candidate) > gain(best) ? candidate : best, universe[0]);
        assert.deepEqual(row.values, chosen);
        assert.equal(row.gain, gain(chosen));
        for (const p of pairs(chosen)) missing.delete(p);
      }
      assert.equal(missing.size, 0);
    }
  },
  'range-coverage-audit'() {
    for (const { input: x, expected: { result: y } } of positive('range-coverage-audit')) {
      const start = scale(x.start), end = scale(x.end);
      const intervals = split(x.intervals).map(r => r.split('\t').map(scale));
      const tally = [0n, 0n, 0n];
      for (let i = start; i < end; i++) {
        const [span, ...extra] = y.spans.filter(s => scale(s.from) <= i && i < scale(s.to));
        assert.ok(span && !extra.length);
        const lines = intervals.flatMap(([lo, hi], j) => lo <= i && i < hi ? [j + 1] : []);
        assert.deepEqual(span.lines, lines);
        assert.equal(span.depth, lines.length);
        tally[lines.length ? 0 : 1]++;
        if (lines.length > 1) tally[2]++;
      }
      assert.deepEqual([y.covered, y.uncovered, y.overlapped].map(scale), tally);
    }
  },
  'semver-precedence'() {
    const checks = [['numeric-prerelease', 'gt', 'prerelease-number', 2], ['normal-after-pre', 'gt', 'release', null],
      ['build-tie', 'eq', 'equal', null], ['numeric-before-text', 'lt', 'prerelease-type', 1], ['ascii-case', 'lt', 'prerelease-text', 1],
      ['shorter-list', 'lt', 'prerelease-length', null], ['large-exact', 'lt', 'major', null]];
    for (const [id, relation, kind, index] of checks) assert.deepEqual(value('semver-precedence', id), { relation, reason: { kind, index } });
    const { input: { left, right } } = take('semver-precedence', 'large-exact');
    assert.ok(BigInt(left.split('.')[0]) < BigInt(right.split('.')[0]));
  },
  'spacing-token-audit'() {
    for (const { input: x, expected: { result: y } } of positive('spacing-token-audit')) {
      const tokens = split(x.tokens).map(line => line.split('\t')).map(([name, px]) => ({ name, px: scale(px) }));
      const abs = n => n < 0n ? -n : n;
      for (const [i, [label, px]] of split(x.measurements).map(r => r.split('\t')).entries()) {
        const row = y.rows[i];
        const measured = scale(px);
        const chosen = tokens.reduce((best, t) => {
          const old = abs(best.px - measured);
          const next = abs(t.px - measured);
          return next < old || next === old && t.px < best.px ? t : best;
        });
        const delta = measured - chosen.px;
        const status = !delta ? 'exact' : abs(delta) <= scale(x.tolerance) ? 'within' : 'outside';
        assert.deepEqual([row.label, scale(row.px), row.token, scale(row.tokenPx), scale(row.delta), row.status], [label, measured, chosen.name, chosen.px, delta, status]);
      }
      assert.equal(y.outsideCount, y.rows.filter(row => row.status === 'outside').length);
    }
  },
  'archive-path-preflight'() {
    const alias = value('archive-path-preflight', 'implicit-alias');
    assert.deepEqual(alias.conflicts, [{ kind: 'CASE_ALIAS', key: 'data', lines: [1, 2] }]);
    const both = value('archive-path-preflight', 'file-parent-and-duplicate');
    assert.deepEqual(both.conflicts, [{ kind: 'SAME_MEMBER', key: 'a', lines: [1, 3] }, { kind: 'PARENT_FILE', key: 'a', lines: [1, 2] }]);
    const y = value('archive-path-preflight', 'traversal-and-reserved');
    assert.deepEqual(y.unsafe.map(o => [o.line, o.code, o.segment]), [[1, 'DOT_SEGMENT', 1], [2, 'DEVICE_NAME', 2], [3, 'TRAILING_DOT', 1], [4, 'EMPTY_SEGMENT', 2]]);
  },
  'route-overlap-audit'() {
    for (const { input: x, expected: { result: y } } of positive('route-overlap-audit')) {
      const routes = split(x.routes).map(r => r.split('\t')).map(([method, route]) => ({ method, parts: route === '/' ? [] : route.slice(1).split('/') }));
      const literal = s => !s.startsWith(':') && !s.startsWith('*');
      const matches = (parts, path) => {
        const tail = parts.at(-1)?.startsWith('*');
        return (tail ? path.length >= parts.length : path.length === parts.length)
          && parts.every((p, i) => !literal(p) || p === path[i]);
      };
      const alphabet = [...new Set(['x', ...routes.flatMap(r => r.parts.filter(literal))])];
      let count = 0;
      for (const [i, first] of routes.entries()) for (const [j, second] of routes.entries()) {
        if (i >= j || first.method !== second.method) continue;
        const witness = y.overlaps.find(o => o.first === i + 1 && o.second === j + 1);
        let possible;
        const bound = witness ? (witness.witness === '/' ? 0 : witness.witness.slice(1).split('/').length) : 8;
        for (let length = 0; length <= bound; length++) {
          const n = alphabet.length ** length;
          for (let code = 0; code < n; code++) {
            let current = code;
            const path = Array.from({ length }, () => {
              const item = alphabet[current % alphabet.length];
              current = Math.floor(current / alphabet.length);
              return item;
            });
            if (matches(first.parts, path) && matches(second.parts, path)) { possible = path; break; }
          }
          if (possible) break;
        }
        assert.equal(Boolean(witness), Boolean(possible));
        if (witness) {
          const path = witness.witness === '/' ? [] : witness.witness.slice(1).split('/');
          assert.equal(path.length, possible.length);
          assert.ok(matches(first.parts, path) && matches(second.parts, path));
          count++;
        }
      }
      assert.equal(y.overlaps.length, count);
    }
  },
};

for (const slug of slugs) {
  try { checks[slug](); }
  catch (error) { throw new Error(slug + ': ' + error.message, { cause: error }); }
  console.log('CHECKED ' + slug);
}
console.log(JSON.stringify({
  head: receipts.head, documents: slugs.length, reviewedCoreCases: slugs.reduce((n, slug) => n + all(slug, 'core').length, 0),
  controllerWitnesses: controllerCases, blockedDocument: 'text-file-line-endings', productChecks: 'NOT_RUN',
}));

