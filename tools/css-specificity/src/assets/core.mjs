// CSS Selector Specificity Comparator — pure core (SPEC §3/§4).
// Schema validation, bounded hand-written recursive-descent parser, scorer.
// No DOM, no network, no storage. Deterministic; spans are UTF-16 unit offsets
// into the original raw string.

export const MAX_LENGTH = 1024;
export const MAX_DEPTH = 4;
export const MAX_BRANCHES = 8;

const WS_CHARS = new Set(['\t', '\n', '\f', '\r', ' ']);
const GRAPHIC_CHARS = new Set('#.*[]:(),>+~'.split(''));
const ORDINARY_PSEUDOS = new Set([
  'hover', 'focus', 'focus-visible', 'focus-within', 'active', 'checked',
  'disabled', 'enabled', 'root', 'empty', 'first-child', 'last-child',
  'only-child',
]);
const FUNCTION_NAMES = new Set(['is', 'not', 'where']);
const PSEUDO_ELEMENTS = new Set(['before', 'after', 'first-line', 'first-letter']);

function isWs(ch) { return WS_CHARS.has(ch); }
function isDigit(ch) { return ch >= '0' && ch <= '9'; }
function isAsciiLetter(ch) {
  return (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z');
}
function isIdentStart(ch) { return isAsciiLetter(ch) || ch === '_'; }
function isIdentChar(ch) { return isIdentStart(ch) || isDigit(ch) || ch === '-'; }
function isAllowedChar(ch) {
  return isWs(ch) || isIdentChar(ch) || GRAPHIC_CHARS.has(ch);
}

class ParseError extends Error {
  constructor(code, offset) {
    super(code + '@' + offset);
    this.code = code;
    this.offset = offset;
  }
}

function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function lexCompare(a, b) {
  for (let k = 0; k < 3; k++) {
    if (a[k] !== b[k]) return a[k] > b[k] ? 1 : -1;
  }
  return 0;
}
function lexMax(list) {
  let best = list[0];
  for (const v of list) if (lexCompare(v, best) > 0) best = v;
  return [best[0], best[1], best[2]];
}

class Parser {
  constructor(raw) {
    this.s = raw;
    this.i = 0;
    this.depth = 0;
  }
  eof() { return this.i >= this.s.length; }
  peek() { return this.s[this.i]; }
  skipWs() { while (!this.eof() && isWs(this.peek())) this.i++; }
  fail(code, offset) { throw new ParseError(code, offset); }

  readIdent() {
    // Caller guarantees isIdentStart(peek()).
    const start = this.i;
    this.i++;
    while (!this.eof() && isIdentChar(this.peek())) this.i++;
    return { start, end: this.i, text: this.s.slice(start, this.i) };
  }
  readName() {
    const start = this.i;
    while (!this.eof() && isIdentChar(this.peek())) this.i++;
    return { start, end: this.i, text: this.s.slice(start, this.i) };
  }

  // Parse one field (top level). Returns the root selector node.
  parseField() {
    this.skipWs();
    const tree = this.parseComplex(false);
    this.skipWs();
    if (!this.eof()) {
      const ch = this.peek();
      if (ch === ',') this.fail('UNSUPPORTED_CONTEXT', this.i);
      this.fail('SYNTAX', this.i);
    }
    return tree;
  }

  parseComplex(inFunc) {
    const first = this.parseCompound(inFunc);
    const compounds = [first.node];
    let pseudoEnded = first.pseudo;
    while (true) {
      let j = this.i;
      while (j < this.s.length && isWs(this.s[j])) j++;
      if (j >= this.s.length) { this.i = j; break; }
      const ch = this.s[j];
      if (pseudoEnded) this.fail('UNSUPPORTED_CONTEXT', j);
      if (ch === ')' || ch === ',') break; // terminator for caller (ws unconsumed)
      if (ch === '>' || ch === '+' || ch === '~') {
        this.i = j + 1;
        this.skipWs();
        if (this.eof()) this.fail('SYNTAX', this.s.length);
        const next = this.parseCompound(inFunc);
        compounds.push(next.node);
        pseudoEnded = next.pseudo;
        continue;
      }
      if (j > this.i) {
        // descendant combinator
        this.i = j;
        const next = this.parseCompound(inFunc);
        compounds.push(next.node);
        pseudoEnded = next.pseudo;
        continue;
      }
      this.fail('SYNTAX', this.i);
    }
    let specificity = [0, 0, 0];
    for (const c of compounds) specificity = add(specificity, c.specificity);
    return {
      kind: 'selector',
      start: compounds[0].start,
      end: compounds[compounds.length - 1].end,
      specificity,
      children: compounds,
    };
  }

  // Returns { node, pseudo } where pseudo is true when the compound ends with
  // a pseudo-element.
  parseCompound(inFunc) {
    const start = this.i;
    const children = [];
    let pseudo = false;
    if (this.eof()) this.fail('SYNTAX', this.s.length);
    const ch0 = this.peek();
    if (isIdentStart(ch0)) {
      const id = this.readIdent();
      children.push({ kind: 'type', start: id.start, end: id.end, specificity: [0, 0, 1], children: [] });
    } else if (ch0 === '*') {
      children.push({ kind: 'universal', start: this.i, end: this.i + 1, specificity: [0, 0, 0], children: [] });
      this.i++;
    }
    while (!this.eof()) {
      const ch = this.peek();
      if (ch === '#' || ch === '.') {
        const sigil = this.i;
        this.i++;
        if (this.eof()) this.fail('SYNTAX', this.s.length);
        if (!isIdentStart(this.peek())) this.fail('SYNTAX', this.i);
        const id = this.readIdent();
        children.push({
          kind: ch === '#' ? 'id' : 'class',
          start: sigil, end: id.end,
          specificity: ch === '#' ? [1, 0, 0] : [0, 1, 0],
          children: [],
        });
      } else if (ch === '[') {
        children.push(this.parseAttribute());
      } else if (ch === ':') {
        const node = this.parseColon(inFunc, children.length > 0);
        children.push(node);
        if (node.kind === 'pseudo-element') { pseudo = true; break; }
      } else {
        break;
      }
    }
    if (children.length === 0) this.fail('SYNTAX', start);
    if (pseudo && children.length === 1) {
      // A compound consisting solely of a pseudo-element is a bare
      // pseudo-element: unsupported context at its colon.
      this.fail('UNSUPPORTED_CONTEXT', children[0].start);
    }
    let specificity = [0, 0, 0];
    for (const c of children) specificity = add(specificity, c.specificity);
    return {
      node: {
        kind: 'compound',
        start,
        end: children[children.length - 1].end,
        specificity,
        children,
      },
      pseudo,
    };
  }

  parseAttribute() {
    const start = this.i; // '['
    this.i++;
    this.skipWs();
    if (this.eof()) this.fail('SYNTAX', this.s.length);
    if (!isIdentStart(this.peek())) this.fail('SYNTAX', this.i);
    this.readIdent();
    this.skipWs();
    if (this.eof()) this.fail('SYNTAX', this.s.length);
    if (this.peek() !== ']') this.fail('SYNTAX', this.i);
    this.i++;
    return { kind: 'attribute', start, end: this.i, specificity: [0, 1, 0], children: [] };
  }

  // Parses ':' ordinary pseudo, ':' function, or '::' pseudo-element.
  // hasPreceding is informational only (bare pseudo-element is decided by the
  // compound caller, which knows the total child count).
  parseColon(inFunc, hasPreceding) {
    const colon = this.i;
    if (this.s[this.i + 1] === ':') {
      // pseudo-element
      this.i += 2;
      const name = this.readName();
      if (name.text.length === 0) this.fail('SYNTAX', this.i);
      const lower = name.text.toLowerCase();
      if (!PSEUDO_ELEMENTS.has(lower)) this.fail('UNSUPPORTED_NAME', colon);
      if (inFunc) this.fail('UNSUPPORTED_CONTEXT', colon);
      return { kind: 'pseudo-element', start: colon, end: name.end, specificity: [0, 0, 1], children: [] };
    }
    this.i++;
    const name = this.readName();
    if (name.text.length === 0) this.fail('SYNTAX', this.i);
    const lower = name.text.toLowerCase();
    if (PSEUDO_ELEMENTS.has(lower)) this.fail('UNSUPPORTED_NAME', colon);
    if (ORDINARY_PSEUDOS.has(lower)) {
      if (!this.eof() && this.peek() === '(') this.fail('UNSUPPORTED_NAME', colon);
      return { kind: 'pseudo-class', start: colon, end: name.end, specificity: [0, 1, 0], children: [] };
    }
    if (FUNCTION_NAMES.has(lower)) {
      if (this.eof() || this.peek() !== '(') this.fail('SYNTAX', this.i);
      if (this.depth >= MAX_DEPTH) this.fail('DEPTH', colon);
      this.i++; // consume '('
      this.depth++;
      let branches;
      try {
        branches = this.parseBranchList();
      } finally {
        this.depth--;
      }
      // parseBranchList leaves this.i just past the closing ')'.
      const specificity = lower === 'where' ? [0, 0, 0] : lexMax(branches.map((b) => b.specificity));
      return { kind: lower, start: colon, end: this.i, specificity, children: branches };
    }
    this.fail('UNSUPPORTED_NAME', colon);
  }

  parseBranchList() {
    const branches = [];
    this.skipWs();
    while (true) {
      const branch = this.parseComplex(true);
      branches.push(branch);
      this.skipWs();
      if (this.eof()) this.fail('SYNTAX', this.s.length);
      const ch = this.peek();
      if (ch === ',') {
        if (branches.length >= MAX_BRANCHES) this.fail('BRANCH_LIMIT', this.i);
        this.i++;
        this.skipWs();
        if (this.eof()) this.fail('SYNTAX', this.s.length);
        if (this.peek() === ')') this.fail('SYNTAX', this.i);
        continue;
      }
      if (ch === ')') { this.i++; return branches; }
      this.fail('SYNTAX', this.i);
    }
  }
}

function analyzeField(raw) {
  for (let i = 0; i < raw.length; i++) {
    if (!isAllowedChar(raw[i])) throw new ParseError('UNSUPPORTED_CHAR', i);
  }
  let allWs = true;
  for (let i = 0; i < raw.length; i++) {
    if (!isWs(raw[i])) { allWs = false; break; }
  }
  if (allWs) throw new ParseError('EMPTY', 0);
  const parser = new Parser(raw);
  const tree = parser.parseField();
  return { raw, specificity: tree.specificity, tree };
}

function validateSchema(record) {
  if (typeof record !== 'object' || record === null || Array.isArray(record)) return false;
  const proto = Object.getPrototypeOf(record);
  if (proto !== Object.prototype && proto !== null) return false;
  if (Object.getOwnPropertySymbols(record).length !== 0) return false;
  const names = Object.getOwnPropertyNames(record);
  if (names.length !== 2 || !names.includes('left') || !names.includes('right')) return false;
  for (const key of ['left', 'right']) {
    const desc = Object.getOwnPropertyDescriptor(record, key);
    if (!desc || !('value' in desc)) return false;
    if (typeof desc.value !== 'string') return false;
  }
  return true;
}

export function compareSelectors(record) {
  if (!validateSchema(record)) {
    return { ok: false, errors: [{ field: null, code: 'SCHEMA', offset: null }] };
  }
  const left = record.left;
  const right = record.right;
  if (left.length > MAX_LENGTH) {
    return { ok: false, errors: [{ field: 'left', code: 'LENGTH', offset: MAX_LENGTH }] };
  }
  if (right.length > MAX_LENGTH) {
    return { ok: false, errors: [{ field: 'right', code: 'LENGTH', offset: MAX_LENGTH }] };
  }
  const errors = [];
  let la = null;
  let ra = null;
  try { la = analyzeField(left); } catch (e) {
    if (e instanceof ParseError) errors.push({ field: 'left', code: e.code, offset: e.offset });
    else throw e;
  }
  try { ra = analyzeField(right); } catch (e) {
    if (e instanceof ParseError) errors.push({ field: 'right', code: e.code, offset: e.offset });
    else throw e;
  }
  if (errors.length > 0) return { ok: false, errors };
  let comparison = 'equal';
  let firstDifference = null;
  for (let k = 0; k < 3; k++) {
    if (la.specificity[k] !== ra.specificity[k]) {
      comparison = la.specificity[k] > ra.specificity[k] ? 'left' : 'right';
      firstDifference = 'ABC'[k];
      break;
    }
  }
  return { ok: true, left: la, right: ra, comparison, firstDifference };
}

export function formatSummary(result) {
  if (!result || result.ok !== true) return null;
  const f = (v) => '(' + v[0] + ',' + v[1] + ',' + v[2] + ')';
  return [
    'L: ' + f(result.left.specificity),
    'R: ' + f(result.right.specificity),
    'comparison: ' + result.comparison,
    'firstDifference: ' + (result.firstDifference === null ? 'none' : result.firstDifference),
  ].join('\n');
}
