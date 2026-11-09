import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const evidence = readFileSync(new URL(
  './header-matrix.json',
  import.meta.url
));
const payload = JSON.parse(readFileSync(new URL('./create-ruleset.json', import.meta.url), 'utf8'));
const { summary, rows } = JSON.parse(evidence);

test('SEC-02 uses the hash-pinned audit and its complete 78 observed HTTPS URLs', () => {
  assert.equal(createHash('sha256').update(evidence).digest('hex'),
    'cc970eb18d01c868ecb848d9e0dc3b37f54e0c517ec4d72b84c0770b95f25cf3');
  assert.equal(summary.missing_hsts_pages, 78);
  assert.equal(summary.missing_hsts_hosts, 39);
  assert.equal(new Set(summary.missing_hsts_urls).size, 78);
  assert.deepEqual(rows.filter(row => row.kind === 'tool' && row.hsts === null)
    .map(row => row.url).sort(), [...summary.missing_hsts_urls].sort());
  for (const url of summary.missing_hsts_urls) {
    assert.match(url, /^https:\/\/[a-z0-9-]+\.glossquote\.com\/(?:en\/)?index\.html$/);
    const row = rows.find(row => row.url === url);
    assert.equal(row.status, 200);
  }
});

test('SEC-02 expression matches exactly the 39 audited hosts on encrypted client connections', () => {
  assert.equal(payload.rules.length, 1);
  const { expression } = payload.rules[0];
  assert.ok(expression.length <= 4096);
  const match = /^\(ssl and http\.host in \{("[a-z0-9-]+\.glossquote\.com"(?: "[a-z0-9-]+\.glossquote\.com")*)\}\)$/.exec(expression);
  assert.ok(match, 'Expression must be an HTTPS-only list of exact tool hostnames');
  const configured = match[1].split(' ').map(host => JSON.parse(host));
  const expected = [...new Set(summary.missing_hsts_urls.map(url => new URL(url).hostname))].sort();
  assert.equal(configured.length, 39);
  assert.equal(new Set(configured).size, 39);
  assert.deepEqual([...configured].sort(), expected);
  assert.deepEqual(expected, [...summary.missing_hsts_hostnames].sort());
});

test('SEC-02 uses one zone response transform which changes only the HSTS header', () => {
  assert.deepEqual(Object.keys(payload).sort(), ['description', 'kind', 'name', 'phase', 'rules']);
  assert.equal(payload.kind, 'zone');
  assert.equal(payload.phase, 'http_response_headers_transform');
  const { expression, ...rule } = payload.rules[0];
  assert.deepEqual(rule, {
    ref: 'glossquote_labs_sec02_https_hsts',
    description: 'Set host-only HSTS for 39 audited GlossQuote tool hosts',
    action: 'rewrite',
    action_parameters: {
      headers: { 'strict-transport-security': { operation: 'set', value: 'max-age=31536000' } }
    },
    enabled: true
  });
});
