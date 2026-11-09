// Pure colour core for the WCAG Contrast Checker.
//
// Implements the REVISED specification at commit
// 1b732fbd92156360b0d6d63d2593359d9a85c34f,
// docs/specs/contrast-checker/SPEC.md, section 4 (normative):
//   - parsing: #RGB / #RRGGBB / #RRGGBBAA hex ('#' optional, case-insensitive)
//     and rgb()/rgba() with integer channels 0-255 and alpha in [0, 1];
//   - compositing in sRGB space in the pinned order: background over opaque
//     white first, then foreground over the effective background;
//   - WCAG 2.1 relative luminance (0.03928 breakpoint) and contrast ratio;
//   - verdicts judged on the UNROUNDED ratio;
//   - the deterministic suggestion search (1% steps, both directions
//     evaluated, three outcome states).
// No DOM, network or storage access. All arithmetic is IEEE-754 doubles in
// exactly the order written in SPEC section 4.

export const THRESHOLDS = [
  { id: 'aaNormal', value: 4.5 },
  { id: 'aaLarge', value: 3.0 },
  { id: 'aaaNormal', value: 7.0 },
  { id: 'aaaLarge', value: 4.5 },
  { id: 'nonText', value: 3.0 },
];

export const TARGETS = [
  { id: 'aaNormal', value: 4.5 },
  { id: 'aaLarge', value: 3.0 },
  { id: 'aaaNormal', value: 7.0 },
  { id: 'aaaLarge', value: 4.5 },
];

const WHITE = { r: 255, g: 255, b: 255 };

function fail(code, params) {
  return { ok: false, error: { code, ...params } };
}

// Parse one colour field. Returns { ok: true, color: {r,g,b,a} } with
// integer channels 0-255 and alpha in [0, 1], or { ok: false, error } where
// the error names exactly what is wrong (SPEC section 3).
export function parseColor(input) {
  if (typeof input !== 'string') return fail('format', {});
  const text = input.trim();
  if (text === '') return fail('empty', {});

  if (text.startsWith('#') || /^[0-9a-fA-F]+$/.test(text)) {
    const digits = text.startsWith('#') ? text.slice(1) : text;
    if (!/^[0-9a-fA-F]*$/.test(digits)) return fail('hex-digit', {});
    if (![3, 6, 8].includes(digits.length)) {
      return fail('hex-length', { expected: [3, 6, 8], actual: digits.length });
    }
    if (digits.length === 3) {
      const [r, g, b] = [...digits].map((d) => parseInt(d + d, 16));
      return { ok: true, color: { r, g, b, a: 1 } };
    }
    const r = parseInt(digits.slice(0, 2), 16);
    const g = parseInt(digits.slice(2, 4), 16);
    const b = parseInt(digits.slice(4, 6), 16);
    const a = digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1;
    return { ok: true, color: { r, g, b, a } };
  }

  const fn = /^rgba?\(\s*(.*?)\s*\)$/i.exec(text);
  if (fn) {
    const isRgba = /^rgba/i.test(text);
    const parts = fn[1].split(',').map((p) => p.trim());
    if (parts.length !== (isRgba ? 4 : 3)) return fail('format', {});
    const names = ['r', 'g', 'b'];
    const channels = [];
    for (let i = 0; i < 3; i += 1) {
      const token = parts[i];
      if (token.includes('%')) return fail('channel-percent', { channel: names[i] });
      if (!/^-?\d+$/.test(token)) return fail('channel-integer', { channel: names[i], token });
      const value = parseInt(token, 10);
      if (value < 0 || value > 255) {
        return fail('channel-range', { channel: names[i], value, min: 0, max: 255 });
      }
      channels.push(value);
    }
    let a = 1;
    if (isRgba) {
      const token = parts[3];
      if (!/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(token)) return fail('alpha-format', { token });
      a = Number(token);
      if (a < 0 || a > 1) return fail('alpha-range', { value: a, min: 0, max: 1 });
    }
    return { ok: true, color: { r: channels[0], g: channels[1], b: channels[2], a } };
  }

  return fail('format', {});
}

// Composite a colour with alpha over an opaque backdrop, channel by channel
// in sRGB space: C = a*Cf + (1 - a)*Cb (SPEC section 4). Unrounded result.
export function compositeOver(color, backdrop) {
  const a = color.a;
  return {
    r: a * color.r + (1 - a) * backdrop.r,
    g: a * color.g + (1 - a) * backdrop.g,
    b: a * color.b + (1 - a) * backdrop.b,
  };
}

// Effective (composited) colours in the pinned order: the background over
// opaque white first, then the foreground over the effective background.
// Luminance and ratio are computed from these unrounded values; the ratio
// is symmetric in these effective colours only, never in the raw inputs.
export function effectiveColors(foreground, background) {
  const effBg = background.a < 1 ? compositeOver(background, WHITE) : { r: background.r, g: background.g, b: background.b };
  const effFg = foreground.a < 1 ? compositeOver(foreground, effBg) : { r: foreground.r, g: foreground.g, b: foreground.b };
  return { foreground: effFg, background: effBg, hasAlpha: foreground.a < 1 || background.a < 1 };
}

function linearize(channel) {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

// WCAG 2.1 relative luminance of an (opaque, possibly unrounded) colour.
export function relativeLuminance({ r, g, b }) {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

// Contrast ratio of two opaque colours, in [1, 21].
export function contrastRatio(c1, c2) {
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

// Five verdict rows; every verdict compares the UNROUNDED ratio (SPEC §4).
export function verdicts(ratio) {
  return THRESHOLDS.map((t) => ({ id: t.id, threshold: t.value, pass: ratio >= t.value }));
}

// Round half away from zero (channel values are non-negative here).
export function roundHalfAwayFromZero(x) {
  return Math.sign(x) * Math.round(Math.abs(x));
}

// '#RRGGBB' display form of a possibly unrounded colour: each channel is
// rounded half away from zero. This is a display of the values actually
// used for the computation, and the UI labels it as such (SPEC section 4).
export function toHex({ r, g, b }) {
  const part = (v) => Math.min(255, Math.max(0, roundHalfAwayFromZero(v)))
    .toString(16).toUpperCase().padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

// Display the ratio rounded to two decimals, half away from zero, in
// decimal terms (SPEC section 4): the double is first rendered with 15
// significant digits so a value like 4.545 rounds the way the decimal
// notation reads.
export function formatRatio(ratio) {
  const str = ratio.toPrecision(15);
  const dot = str.indexOf('.');
  const intPart = dot === -1 ? str : str.slice(0, dot);
  const frac = dot === -1 ? '' : str.slice(dot + 1);
  const keep = (frac + '00').slice(0, 2).split('').map(Number);
  const next = Number((frac + '000')[2]);
  let carry = next >= 5 ? 1 : 0;
  for (let i = 1; i >= 0 && carry; i -= 1) {
    keep[i] += carry;
    carry = keep[i] === 10 ? 1 : 0;
    if (carry) keep[i] = 0;
  }
  let intOut = intPart;
  if (carry) intOut = String(Number(intPart) + 1);
  return `${intOut}.${keep.join('')}`;
}

// One direction of the suggestion walk (SPEC section 4): for
// t = 0.01, 0.02, ..., 1.00 in order, blend the effective foreground toward
// black or white with per-channel rounding half away from zero, and return
// the first candidate whose unrounded ratio against B meets the target.
function searchDirection(effFg, effBg, target, direction) {
  for (let i = 1; i <= 100; i += 1) {
    const t = i / 100;
    const blend = (ch) => (direction === 'black'
      ? roundHalfAwayFromZero(ch * (1 - t))
      : roundHalfAwayFromZero(ch + (255 - ch) * t));
    const candidate = { r: blend(effFg.r), g: blend(effFg.g), b: blend(effFg.b) };
    const ratio = contrastRatio(candidate, effBg);
    if (ratio >= target) return { t, color: candidate, hex: toHex(candidate), ratio };
  }
  return null;
}

// The suggestion engine with the normative three-state outcome contract
// (SPEC section 4). Both directions are evaluated at the same target; the
// displayed suggestion always comes from the selected direction.
// States: 'already' | 'found' | 'other-direction' | 'none'. The 'none'
// state is the only one that may say no foreground-only fix exists.
export function suggest(effFg, effBg, target, direction) {
  const current = contrastRatio(effFg, effBg);
  if (current >= target) return { state: 'already', ratio: current };
  const found = searchDirection(effFg, effBg, target, direction);
  if (found) return { state: 'found', direction, ...found };
  const otherDirection = direction === 'black' ? 'white' : 'black';
  const other = searchDirection(effFg, effBg, target, otherDirection);
  if (other) return { state: 'other-direction', direction, otherDirection };
  return { state: 'none', direction };
}
