import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import { resolve, join, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateDeploymentConfig } from './deployment-config.mjs';

export const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLIC_FILES = Object.freeze(['index.html', 'en/index.html', 'styles/app.css', 'js/app.js', 'js/core/teams.mjs', 'js/core/circle.mjs', 'js/core/timing.mjs', 'js/core/output.mjs']);
export const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
export const PAGE_EXPECTATIONS = {
  'index.html': {
    lang: 'zh-Hant', title: '循環賽賽程表｜Gloss Tools', description: '輸入 2–32 隊與場地數，產生單循環或雙循環賽程、輪空、分時場地和每隊對手表。', h1: '把每隊對戰排成完整循環賽',
    home: 'https://glossquote.com/index.html', other: 'en/index.html', prefix: '',
    faq: ['奇數隊會怎麼排？', '每一輪有一隊輪空；單循環中每隊恰好輪空一次。', '場地不夠會少掉比賽嗎？', '不會。每輪依固定次序拆成多個時段，完整保留所有對戰。', '雙循環的主場代表真的主場嗎？', '不代表。第二次對戰只交換賽程的主客欄位，工具不知道實際場地或優勢。']
  },
  'en/index.html': {
    lang: 'en', title: 'Round-Robin Schedule | Gloss Tools', description: 'Enter 2–32 teams and the number of courts to create single or double round-robin fixtures, byes, time slots, and team opponent lists.', h1: 'Build a complete round-robin schedule',
    home: 'https://glossquote.com/en/index.html', other: '../index.html', prefix: '../',
    faq: ['What happens when there is an odd number of teams?', 'Each round has one bye; in a single round robin, every team receives one bye.', 'Will limited courts remove any matches?', 'No. Each round is split into additional slots in a fixed order, and all matchups remain in the schedule.', 'Does the home/away label mean a real home venue?', 'No. The second meeting in a double round robin swaps the labels. The tool does not know the actual venue or advantage.']
  }
};

const fail = code => { throw new Error(code); };
export function validRelativePath(path) {
  return typeof path === 'string' && path.length > 0 && !path.includes('\\') && !path.startsWith('/') && !path.includes(':') && path.split('/').every(part => part && part !== '.' && part !== '..');
}

export async function closedTree(root, { allowMissing = false } = {}) {
  const allowedDirectories = new Set(['en', 'styles', 'js', 'js/core']);
  const files = [];
  const directories = [];
  let rootStat;
  try { rootStat = await lstat(root); } catch (error) {
    if (allowMissing && error.code === 'ENOENT') return { exists: false, files, directories };
    throw error;
  }
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) fail('UNSAFE_ROOT');
  const normalized = value => process.platform === 'win32' ? value.toLowerCase() : value;
  if (normalized(await realpath(root)) !== normalized(resolve(root))) fail('LINKED_ROOT');
  const visit = async (directory, prefix = '') => {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (!validRelativePath(relative)) fail('UNSAFE_PATH');
      const info = await lstat(join(root, relative));
      if (info.isSymbolicLink()) fail('LINK_REJECTED');
      if (info.isDirectory()) {
        if (!allowedDirectories.has(relative)) fail('UNKNOWN_DIRECTORY');
        directories.push(relative);
        await visit(join(root, relative), relative);
      } else if (info.isFile()) {
        if (!PUBLIC_FILES.includes(relative)) fail('UNKNOWN_FILE');
        if (info.size > 262144) fail('SOURCE_SIZE');
        files.push(relative);
      } else fail('SPECIAL_FILE');
    }
  };
  await visit(root);
  if (files.sort().join('|') !== [...PUBLIC_FILES].sort().join('|')) fail('MISSING_OR_STALE_FILE');
  if (directories.sort().join('|') !== [...allowedDirectories].sort().join('|')) fail('MISSING_OR_STALE_DIRECTORY');
  return { exists: true, files, directories };
}

// A deliberately small static tokenizer for this closed HTML vocabulary, not a browser parser.
export function tokenizeHtml(source) {
  const tags = [];
  const stack = [];
  const allowed = new Set('html head meta title link script body a header span main div h1 h2 h3 h4 p noscript nav button section form label textarea select option input details summary fieldset legend ul ol li dl dt dd footer'.split(' '));
  const voids = new Set(['meta', 'link', 'input']);
  let cursor = 0;
  while (cursor < source.length) {
    const start = source.indexOf('<', cursor);
    if (start < 0) break;
    if (source.startsWith('<!doctype html>', start)) { cursor = start + 15; continue; }
    let quote = null;
    let end = start + 1;
    for (; end < source.length; end++) {
      const char = source[end];
      if (quote) { if (char === quote) quote = null; }
      else if (char === '"' || char === "'") quote = char;
      else if (char === '>') break;
    }
    if (quote || end >= source.length) fail('HTML_TOKEN');
    const token = source.slice(start + 1, end);
    const closing = /^\/([a-z][a-z0-9]*)$/u.exec(token);
    if (closing) {
      if (stack.pop() !== closing[1]) fail('HTML_NESTING');
      cursor = end + 1;
      continue;
    }
    const open = /^([a-z][a-z0-9]*)([\s\S]*)$/u.exec(token);
    if (!open || !allowed.has(open[1])) fail('HTML_TAG');
    const attrs = {};
    let rest = open[2];
    while (rest.trim()) {
      const attribute = /^\s+([a-z][a-z0-9-]*)(?:=(?:"([^"]*)"|'([^']*)'))?/u.exec(rest);
      if (!attribute || Object.hasOwn(attrs, attribute[1])) fail('HTML_ATTRIBUTE');
      attrs[attribute[1]] = attribute[2] ?? attribute[3] ?? '';
      if (/^on/u.test(attribute[1]) || attribute[1] === 'style') fail('INLINE_EXECUTION');
      rest = rest.slice(attribute[0].length);
    }
    const tag = { tag: open[1], attrs, text: source.slice(end + 1, source.indexOf('<', end + 1) < 0 ? source.length : source.indexOf('<', end + 1)) };
    tags.push(tag);
    if (!voids.has(open[1])) stack.push(open[1]);
    cursor = end + 1;
  }
  if (stack.length) fail('HTML_NESTING');
  return tags;
}

export function inspectHtml(html, file) {
  const expected = PAGE_EXPECTATIONS[file];
  const tags = tokenizeHtml(html);
  const one = tag => {
    const matches = tags.filter(item => item.tag === tag);
    if (matches.length !== 1) fail('HTML_SINGLETON');
    return matches[0];
  };
  if (one('html').attrs.lang !== expected.lang || one('title').text !== expected.title || one('h1').text !== expected.h1) fail('PAGE_COPY');
  const meta = name => tags.filter(item => item.tag === 'meta' && item.attrs.name === name);
  if (tags.some(item => item.tag === 'meta' && item.attrs['http-equiv'] && item.attrs['http-equiv'] !== 'Content-Security-Policy')) fail('UNEXPECTED_HTTP_EQUIV');
  if (meta('robots').length !== 1 || meta('robots')[0].attrs.content !== 'noindex,nofollow') fail('PREVIEW_NOINDEX');
  if (meta('description').length !== 1 || meta('description')[0].attrs.content !== expected.description) fail('DESCRIPTION');
  const csp = tags.filter(item => item.tag === 'meta' && item.attrs['http-equiv'] === 'Content-Security-Policy');
  if (csp.length !== 1 || csp[0].attrs.content !== CSP) fail('CSP');
  const script = one('script');
  if (script.attrs.type !== 'module' || script.attrs.src !== `${expected.prefix}js/app.js` || script.text.trim()) fail('SCRIPT_SOURCE');
  const links = tags.filter(item => item.tag === 'link');
  if (links.length !== 1 || links[0].attrs.rel !== 'stylesheet' || links[0].attrs.href !== `${expected.prefix}styles/app.css`) fail('PREVIEW_LINK');
  const anchors = tags.filter(item => item.tag === 'a');
  if (!anchors.some(item => item.attrs.href === expected.home) || !anchors.some(item => item.attrs.href === expected.other)) fail('LANGUAGE_LINK');
  if (anchors.some(item => ![expected.home, expected.other, '#workspace'].includes(item.attrs.href))) fail('ANCHOR_TARGET');
  for (const text of expected.faq) if (!tags.some(item => item.text === text)) fail('FAQ_COPY');
  const ids = new Map();
  for (const tag of tags) if (tag.attrs.id) {
    if (ids.has(tag.attrs.id)) fail('DUPLICATE_ID');
    ids.set(tag.attrs.id, tag);
  }
  const required = 'workspace input-panel result-panel schedule-form teams cycles courts timing-details startDate startTime matchMinutes changeoverMinutes create clear clear-confirm confirm-clear cancel-clear errors error-list status result-heading result-empty result-content result-summary time-summary schedule-list team-select opponent-panel opponent-heading opponent-list download-txt download-json download-status show-input show-results'.split(' ');
  if (required.some(id => !ids.has(id))) fail('REQUIRED_ID');
  for (const tag of tags) {
    for (const attr of ['aria-describedby', 'aria-labelledby', 'aria-controls']) {
      if (tag.attrs[attr]?.split(' ').some(id => !ids.has(id))) fail('ARIA_REFERENCE');
    }
    if (['input', 'textarea', 'select'].includes(tag.tag) && !tags.some(label => label.tag === 'label' && label.attrs.for === tag.attrs.id)) fail('FIELD_LABEL');
    if (tag.tag === 'button' && !['button', 'submit'].includes(tag.attrs.type)) fail('BUTTON_TYPE');
  }
  return tags;
}

export function checkModuleSyntax(source) {
  const child = spawnSync(process.execPath, ['--check', '--input-type=module'], { input: source, encoding: 'utf8', shell: false, windowsHide: true, maxBuffer: 262144 });
  if (child.error || child.status !== 0) fail('ESM_SYNTAX');
}

export async function inspectSite(root) {
  await closedTree(root);
  const contents = new Map();
  for (const file of PUBLIC_FILES) contents.set(file, await readFile(join(root, file)));
  for (const file of Object.keys(PAGE_EXPECTATIONS)) inspectHtml(contents.get(file).toString('utf8'), file);
  const banned = /\b(?:innerHTML|outerHTML|insertAdjacentHTML|eval|XMLHttpRequest|WebSocket|fetch|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|clipboard)\b|\bnew\s+Function\b|\bdocument\s*\.\s*cookie\b|\bconsole\s*\.|\blocation\s*\./u;
  for (const file of PUBLIC_FILES.filter(path => /\.(?:mjs|js)$/u.test(path))) {
    const source = contents.get(file).toString('utf8');
    checkModuleSyntax(source);
    if (banned.test(source) || /\bimport\s*\(/u.test(source)) fail('PROHIBITED_API');
    if (file.startsWith('js/core/') && /\b(?:document|window|Date|Blob|URL)\b|Math\.random/u.test(source)) fail('IMPURE_CORE');
    for (const match of source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/gu)) {
      const dependency = posix.normalize(posix.join(posix.dirname(file), match[1]));
      if (!match[1].startsWith('./') || !PUBLIC_FILES.includes(dependency)) fail('MODULE_DEPENDENCY');
    }
  }
  const css = contents.get('styles/app.css').toString('utf8');
  if (/@import|url\s*\(/iu.test(css)) fail('EXTERNAL_CSS_RESOURCE');
  if (!css.includes('prefers-reduced-motion') || !css.includes(':focus-visible') || !css.includes('47.999rem') || !css.includes('[hidden]')) fail('CSS_FLOOR');
  return contents;
}

export async function checkProject(root = PROJECT_ROOT) {
  if (Number(process.versions.node.split('.')[0]) < 24) fail('NODE_24_REQUIRED');
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  if (manifest.private !== true || manifest.type !== 'module' || manifest.engines?.node !== '>=24' || ['dependencies', 'devDependencies', 'optionalDependencies'].some(key => Object.keys(manifest[key] ?? {}).length)) fail('PACKAGE_CONTRACT');
  const scripts = { test: 'node --test test/*.test.mjs', check: 'node scripts/check.mjs', build: 'node scripts/build.mjs', dev: 'node scripts/serve.mjs', 'build:release': 'node scripts/release.mjs build', 'check:release': 'node scripts/release.mjs check' };
  for (const [key, command] of Object.entries(scripts)) if (manifest.scripts?.[key] !== command) fail('COMMAND_CONTRACT');
  for (const file of ['scripts/check.mjs', 'scripts/build.mjs', 'scripts/serve.mjs', 'scripts/verify.mjs', 'scripts/capture-evidence.mjs', 'scripts/freeze.mjs', 'scripts/release.mjs', 'scripts/verify-release.mjs', 'scripts/deployment-config.mjs']) checkModuleSyntax(await readFile(join(root, file), 'utf8'));
  await validateDeploymentConfig({ root });
  const contents = await inspectSite(join(root, 'public'));
  return { files: contents.size, node: process.version };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const result = await checkProject(); process.stdout.write(`PASS: ${result.files} closed public files; ESM, bilingual preview contracts and fixed assets-only Wrangler configuration; Node ${result.node}\nStatic inspection is not browser/security acceptance.\n`); }
  catch (error) { process.stderr.write(`CHECK FAILED: ${error.message}\n`); process.exitCode = 1; }
}
