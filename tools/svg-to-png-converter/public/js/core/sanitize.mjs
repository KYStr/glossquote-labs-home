import { SVG_NS, XLINK_NS, XML_NS } from './xml.mjs';

const ELEMENTS = new Set([
  'svg', 'g', 'defs', 'symbol', 'use', 'title', 'desc',
  'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path',
  'text', 'tspan', 'textPath', 'image',
  'linearGradient', 'radialGradient', 'stop', 'pattern', 'clipPath', 'mask', 'marker',
  'filter', 'feGaussianBlur', 'feOffset', 'feFlood', 'feBlend', 'feMerge', 'feMergeNode',
]);
const FRAGMENT_ELEMENTS = new Set(['use', 'textPath', 'linearGradient', 'radialGradient', 'pattern']);
const REFERENCE_PROPERTIES = new Set(['clip-path', 'filter', 'mask', 'marker-start', 'marker-mid', 'marker-end']);
const FRAGMENT = /^#[a-z0-9_.:-]+$/i;
const FRAGMENT_URL = /^url\([ \t\r\n]*(#[a-z0-9_.:-]+|"#[a-z0-9_.:-]+"|'#[a-z0-9_.:-]+')[ \t\r\n]*\)$/i;
const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
const LENGTH = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(?:px|pt|em|rem|cm|mm|in|pc|ex|%)?$/i;
const SIMPLE_COLOR = /^(?:#[a-f0-9]{3,4}|#[a-f0-9]{6}|#[a-f0-9]{8}|[a-z]+|rgba?\([\d.,%+\-/ \t]+\)|hsla?\([\d.,%+\-/ \t]+\))$/i;
const IDENTIFIER = /^[a-z0-9_.:-]+$/i;
const PATH_DATA = /^[mzl hvcsqtae0-9,.+\-\t\r\n]+$/i;
const TRANSFORM = /^(?:[ \t\r\n,]*(?:matrix|translate|scale|rotate|skewX|skewY)\([\d.eE, +\-\t\r\n]+\))+$/;
const SIMPLE_FONT_LIST = /^[a-z0-9_ -]+(?:,[a-z0-9_ -]+)*$/i;
const MAX_DEPTH = 128;

const numberList = value => value.split(/[\s,]+/).every(number);
const lengthList = value => value.split(/[\s,]+/).every(length);
const color = value => SIMPLE_COLOR.test(value);
const length = value => LENGTH.test(value) && Number.isFinite(Number.parseFloat(value));
const number = value => NUMBER.test(value) && Number.isFinite(Number(value));
const identifier = value => IDENTIFIER.test(value);
const keyword = (...choices) => value => choices.includes(value);
const paint = value => color(value) || FRAGMENT_URL.test(value);
const opacity = value => number(value) || (value.endsWith('%') && number(value.slice(0, -1)));
const units = keyword('userSpaceOnUse', 'objectBoundingBox');

const PRESENTATION = new Map(Object.entries({
  fill: paint, stroke: paint, color,
  'stop-color': color, 'flood-color': color,
  opacity, 'fill-opacity': opacity, 'stroke-opacity': opacity, 'stop-opacity': opacity, 'flood-opacity': opacity,
  'fill-rule': keyword('nonzero', 'evenodd'), 'clip-rule': keyword('nonzero', 'evenodd'),
  'stroke-width': length, 'stroke-miterlimit': number, 'stroke-dashoffset': length,
  'stroke-dasharray': value => value === 'none' || lengthList(value),
  'stroke-linecap': keyword('butt', 'round', 'square'),
  'stroke-linejoin': keyword('miter', 'round', 'bevel'),
  'font-family': value => SIMPLE_FONT_LIST.test(value),
  'font-size': length, 'font-weight': value => number(value) || ['normal', 'bold', 'bolder', 'lighter'].includes(value),
  'font-style': keyword('normal', 'italic', 'oblique'),
  'text-anchor': keyword('start', 'middle', 'end'),
  'letter-spacing': length, 'word-spacing': length,
  display: keyword('none', 'inline', 'block'), visibility: keyword('visible', 'hidden', 'collapse'),
  'vector-effect': keyword('none', 'non-scaling-stroke'),
  'mask-type': keyword('alpha', 'luminance'),
}));
for (const name of REFERENCE_PROPERTIES) {
  PRESENTATION.set(name, value => value === 'none' || FRAGMENT_URL.test(value));
}

const ATTRIBUTES = new Map(Object.entries({
  id: identifier, class: value => /^[a-z0-9_ -]+$/i.test(value),
  viewBox: value => numberList(value) && value.split(/[\s,]+/).length === 4,
  preserveAspectRatio: value => /^(?:defer )?(?:none|x(?:Min|Mid|Max)Y(?:Min|Mid|Max)(?: (?:meet|slice))?)$/.test(value),
  version: number,
  d: value => PATH_DATA.test(value), points: numberList, pathLength: number,
  transform: value => TRANSFORM.test(value),
  gradientTransform: value => TRANSFORM.test(value), patternTransform: value => TRANSFORM.test(value),
  gradientUnits: units, patternUnits: units, patternContentUnits: units,
  clipPathUnits: units, maskUnits: units, maskContentUnits: units, filterUnits: units, primitiveUnits: units,
  spreadMethod: keyword('pad', 'reflect', 'repeat'),
  markerUnits: keyword('strokeWidth', 'userSpaceOnUse'),
  orient: value => number(value) || ['auto', 'auto-start-reverse'].includes(value),
  stdDeviation: numberList, in: identifier, in2: identifier, result: identifier,
  mode: keyword('normal', 'multiply', 'screen', 'darken', 'lighten'),
}));
for (const name of ['width', 'height', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
  'fx', 'fy', 'fr', 'offset', 'startOffset', 'refX', 'refY', 'markerWidth', 'markerHeight', 'textLength']) {
  ATTRIBUTES.set(name, length);
}
for (const name of ['x', 'y', 'dx', 'dy']) ATTRIBUTES.set(name, lengthList);

// Only raster payloads with a matching MIME, Base64 grammar and magic bytes may reach <image>.
const RASTER_SIGNATURES = new Map([
  ['png', bytes => bytes.startsWith('\x89PNG\r\n\x1a\n')],
  ['jpeg', bytes => bytes.startsWith('\xff\xd8\xff')],
  ['gif', bytes => bytes.startsWith('GIF87a') || bytes.startsWith('GIF89a')],
  ['webp', bytes => bytes.startsWith('RIFF') && bytes.slice(8, 12) === 'WEBP'],
]);

function isRasterData(value) {
  const match = /^data:image\/(png|jpeg|gif|webp);base64,([a-z0-9+/]+={0,2})$/i.exec(value);
  if (!match || match[2].length % 4 !== 0) return false;
  const bytes = atob(match[2].slice(0, 16));
  return RASTER_SIGNATURES.get(match[1].toLowerCase())(bytes);
}

function splitDeclarations(value) {
  // These constructs are outside the grammar. Do not reinterpret text inside one as declarations.
  if (/\\|\/\*|\*\/|[{}]/.test(value)) return null;
  const declarations = [];
  let start = 0;
  let quote = '';
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      if (char === quote) quote = '';
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (depth < 0) return null;
    } else if (char === ';' && depth === 0) {
      declarations.push(value.slice(start, index));
      start = index + 1;
    }
  }
  if (quote || depth) return null;
  declarations.push(value.slice(start));
  return declarations;
}

// Rebuild from known declaration tokens. The input string is never copied as a CSS block.
function cleanInlineStyle(value) {
  const sources = splitDeclarations(value);
  if (!sources) return { value: '', removed: 1 };
  const declarations = [];
  let removed = 0;
  for (const source of sources) {
    const declaration = source.trim();
    if (!declaration) continue;
    const match = /^([a-z-]+)[ \t\r\n]*:[ \t\r\n]*([\s\S]+)$/i.exec(declaration);
    const name = match?.[1].toLowerCase();
    const token = match?.[2].trim();
    if (PRESENTATION.get(name)?.(token)) declarations.push(`${name}: ${token}`);
    else removed += 1;
  }
  return { value: declarations.join('; '), removed };
}

function attribute(qname, value) {
  const [prefix, localName] = qname.includes(':') ? qname.split(':') : [null, qname];
  return { qname, value, prefix, localName };
}

function allowedHref(element, attr, value) {
  if (attr.ns !== null && attr.ns !== XLINK_NS) return false;
  if (element === 'image') return isRasterData(value);
  return FRAGMENT_ELEMENTS.has(element) && FRAGMENT.test(value);
}

// Only canonical SVG names and vetted values are emitted. Input namespace declarations
// are discarded and the two supported namespaces are rebuilt from constants.
export function sanitizeDocument(root) {
  const elements = new Map();
  const counts = { elements: [], eventAttributes: 0, references: 0, styleItems: 0, unsupportedItems: 0, total: 0 };
  let usesXlink = false;

  function visit(element, depth) {
    element.qname = element.localName;
    const retained = new Map();
    for (const attr of element.attrs) {
      const { qname, localName, ns } = attr;
      const value = attr.value.trim();
      if (qname === 'xmlns' || qname.startsWith('xmlns:')) {
        if (![SVG_NS, XLINK_NS, XML_NS].includes(value)) counts.unsupportedItems += 1;
      } else if (localName.toLowerCase().startsWith('on')) {
        counts.eventAttributes += 1;
      } else if (localName === 'href') {
        const name = ns === XLINK_NS ? 'xlink:href' : 'href';
        if (allowedHref(element.localName, attr, value) && !retained.has(name)) {
          retained.set(name, attribute(name, value));
          if (ns === XLINK_NS) usesXlink = true;
        } else {
          counts.references += 1;
        }
      } else if (ns === null && localName === 'style') {
        const clean = cleanInlineStyle(value);
        counts.styleItems += clean.removed;
        if (clean.value) retained.set(qname, attribute(qname, clean.value));
      } else if (ns === XML_NS && localName === 'space' && ['default', 'preserve'].includes(value)) {
        retained.set('xml:space', attribute('xml:space', value));
      } else if (ns === null && (ATTRIBUTES.get(localName) ?? PRESENTATION.get(localName))?.(value)) {
        retained.set(qname, attribute(qname, value));
      } else if (ns === null && (REFERENCE_PROPERTIES.has(localName) || ['fill', 'stroke', 'cursor'].includes(localName))) {
        counts.references += 1;
      } else {
        counts.unsupportedItems += 1;
      }
    }
    element.attrs = [...retained.values()];

    element.children = element.children.filter(child => {
      if (child.type === 'comment') return false;
      if (child.type === 'pi') {
        counts.unsupportedItems += 1;
        return false;
      }
      if (child.type !== 'element') return true;
      if (child.ns === SVG_NS && child.localName === 'style') {
        counts.styleItems += 1;
        return false;
      }
      if (depth === MAX_DEPTH || child.ns !== SVG_NS || !ELEMENTS.has(child.localName)) {
        elements.set(child.localName, (elements.get(child.localName) ?? 0) + 1);
        return false;
      }
      visit(child, depth + 1);
      return true;
    });
  }

  visit(root, 0);
  root.attrs.unshift(attribute('xmlns', SVG_NS));
  if (usesXlink) root.attrs.push(attribute('xmlns:xlink', XLINK_NS));
  counts.elements = [...elements].map(([name, count]) => ({ name, count }));
  counts.total = counts.elements.reduce((sum, entry) => sum + entry.count, 0)
    + counts.eventAttributes + counts.references + counts.styleItems + counts.unsupportedItems;
  return counts;
}
