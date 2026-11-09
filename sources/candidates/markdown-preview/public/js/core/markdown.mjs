// Markdown Preview core: a closed CommonMark-based subset renderer.
//
// The parser follows docs/specs/markdown-preview/SPEC.md section 4
// exactly, including its deviation list: no setext headings, no raw
// HTML (source markup is escaped text), no collapsed/shortcut
// reference links, no bare-URL autolinking, and entity pass-through
// only for the named set plus numeric character references.
//
// The serialised HTML string produced here is the single source of
// truth: the controller assigns it to the preview container and uses
// the same string for copy and export. All source text reaches the
// output only as escaped text or escaped attribute values, and URL
// schemes are whitelisted after de-obfuscation, so the string is safe
// to assign by construction (the hostile fixtures in the test suite
// pin this property).

export const MAX_SOURCE_CHARS = 200000;

const ASCII_PUNCT = new Set("!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~");
const NAMED_ENTITIES = new Map([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", "\""],
  ["nbsp", " "],
]);
const LINK_SCHEMES = new Set(["http", "https", "mailto"]);
const IMAGE_SCHEMES = new Set(["http", "https"]);
const MAX_BLOCK_DEPTH = 100;
const MAX_LABEL_DEPTH = 10;

export function escapeText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function escapeAttribute(value) {
  return escapeText(value).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function isWhitespaceChar(ch) {
  return ch !== undefined && /\s/.test(ch);
}

function isPunctChar(ch) {
  return ch !== undefined && ASCII_PUNCT.has(ch);
}

// --- URL safety ------------------------------------------------------

// Returns the destination when it passes the scheme whitelist, else
// null. The scheme check runs on a de-obfuscated copy: leading ASCII
// whitespace/control characters are trimmed and tab/newline characters
// inside the scheme candidate are removed before lowercasing, so
// "java\tscript:" or " JaVaScRiPt:" cannot slip through.
export function safeDestination(destination, { image = false } = {}) {
  const trimmed = String(destination).replace(/^[\s\u0000-\u0020]+/, "").replace(/[\s\u0000-\u0020]+$/, "");
  const colon = trimmed.indexOf(":");
  if (colon > 0) {
    const candidate = trimmed.slice(0, colon).replace(/[\t\n\r]/g, "");
    if (/^[A-Za-z][A-Za-z0-9+.-]*$/.test(candidate)) {
      const scheme = candidate.toLowerCase();
      const allowed = image ? IMAGE_SCHEMES : LINK_SCHEMES;
      return allowed.has(scheme) ? trimmed : null;
    }
  }
  // No scheme: relative destination or #fragment (also covers
  // protocol-relative //host/path, which inherits the page scheme).
  return trimmed;
}

// --- Reference definitions -------------------------------------------

function normaliseRefId(id) {
  return id.trim().replace(/\s+/g, " ").toLowerCase();
}

const DEFINITION_RE = /^ {0,3}\[([^\]]+)\]:[ \t]*(<[^>\n]*>|\S+)(?:[ \t]+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?[ \t]*$/;
const QUOTED_DEFINITION_RE = /^ {0,3}>[ \t]?\[([^\]]+)\]:[ \t]*(<[^>\n]*>|\S+)(?:[ \t]+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?[ \t]*$/;

// Harvests reference definitions outside fenced code blocks. Consumed
// lines are replaced with null: they produce no output and do not
// split a surrounding paragraph.
function harvestDefinitions(lines, refs) {
  let fenceChar = null;
  let fenceLength = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line === null) continue;
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fenceChar === null) {
      if (fenceMatch) {
        fenceChar = fenceMatch[1][0];
        fenceLength = fenceMatch[1].length;
        continue;
      }
    } else {
      if (fenceMatch && fenceMatch[1][0] === fenceChar && fenceMatch[1].length >= fenceLength) {
        fenceChar = null;
      }
      continue;
    }
    const match = DEFINITION_RE.exec(line) ?? QUOTED_DEFINITION_RE.exec(line);
    if (match) {
      let dest = match[2];
      if (dest.startsWith("<") && dest.endsWith(">")) dest = dest.slice(1, -1);
      const title = match[3] ?? match[4] ?? match[5] ?? null;
      const id = normaliseRefId(match[1]);
      if (!refs.has(id)) refs.set(id, { dest, title });
      lines[i] = null;
    }
  }
}

// --- Inline parsing ----------------------------------------------------

function leftFlanking(source, start, end) {
  const next = source[end];
  if (next === undefined || isWhitespaceChar(next)) return false;
  if (isPunctChar(next)) {
    const prev = start > 0 ? source[start - 1] : undefined;
    return prev === undefined || isWhitespaceChar(prev) || isPunctChar(prev);
  }
  return true;
}

function rightFlanking(source, start, end) {
  const prev = start > 0 ? source[start - 1] : undefined;
  if (prev === undefined || isWhitespaceChar(prev)) return false;
  if (isPunctChar(prev)) {
    const next = source[end];
    return next === undefined || isWhitespaceChar(next) || isPunctChar(next);
  }
  return true;
}

function findLabelEnd(source, start, state) {
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (ch === "[") {
      depth += 1;
      if (depth > MAX_LABEL_DEPTH) return -1;
    } else if (ch === "]") {
      if (depth === 0) return i;
      depth -= 1;
    }
  }
  state.bracketDead = true;
  return -1;
}

// Parses "(destination "title")" starting at the "(" index.
function parseInlineTarget(source, openIndex) {
  let i = openIndex + 1;
  const skipWs = () => {
    while (i < source.length && (source[i] === " " || source[i] === "\t" || source[i] === "\n")) i += 1;
  };
  skipWs();
  let dest = "";
  if (source[i] === "<") {
    const close = source.indexOf(">", i + 1);
    if (close < 0 || source.slice(i + 1, close).includes("\n")) return null;
    dest = source.slice(i + 1, close);
    i = close + 1;
  } else {
    let depth = 0;
    const start = i;
    while (i < source.length) {
      const ch = source[i];
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === "(") depth += 1;
      if (ch === ")") {
        if (depth === 0) break;
        depth -= 1;
      }
      // Only a space or newline ends a bare destination. Tab and
      // other control characters stay inside the token so the scheme
      // check in safeDestination sees obfuscated schemes such as
      // "java\tscript:" and blocks them (SPEC section 4) instead of
      // the construct silently degrading to literal text.
      if ((ch === " " || ch === "\n") && depth === 0) break;
      i += 1;
    }
    dest = source.slice(start, i);
    dest = dest.replace(/\\([!\"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~])/g, "$1");
  }
  skipWs();
  let title = null;
  const quote = source[i];
  if (quote === "\"" || quote === "'" || quote === "(") {
    const closer = quote === "(" ? ")" : quote;
    const close = source.indexOf(closer, i + 1);
    if (close < 0) return null;
    title = source.slice(i + 1, close);
    i = close + 1;
    skipWs();
  }
  if (source[i] !== ")") return null;
  return { dest, title, end: i + 1 };
}

// Attempts a link (image=false) or image (image=true) at index i.
// Returns { end, html, plain } or null when the construct is not a
// valid link/image (caller then emits the opener as literal text).
function parseLinkLike(source, i, image, ctx, state) {
  if (state.bracketDead) return null;
  const labelStart = i + (image ? 2 : 1);
  const labelEnd = findLabelEnd(source, labelStart, state);
  if (labelEnd < 0) return null;
  const label = source.slice(labelStart, labelEnd);
  const after = labelEnd + 1;
  let dest = null;
  let title = null;
  let end = -1;
  if (source[after] === "(") {
    const target = parseInlineTarget(source, after);
    if (!target) return null;
    dest = target.dest;
    title = target.title;
    end = target.end;
  } else if (source[after] === "[" && !image) {
    const idEnd = source.indexOf("]", after + 1);
    if (idEnd < 0) return null;
    const id = source.slice(after + 1, idEnd);
    if (id === "") return null; // collapsed reference links unsupported
    const ref = ctx.refs.get(normaliseRefId(id));
    if (!ref) {
      // Undefined reference: the whole construct is literal source.
      const literal = source.slice(i, idEnd + 1);
      return { end: idEnd + 1, html: escapeText(literal), plain: literal };
    }
    dest = ref.dest;
    title = ref.title;
    end = idEnd + 1;
  } else {
    return null;
  }
  const labelParsed = parseInline(label, ctx, state);
  if (image) {
    const safe = safeDestination(dest, { image: true });
    if (safe === null) {
      return { end, html: escapeText(labelParsed.plain), plain: labelParsed.plain };
    }
    const titleAttr = title !== null ? ` title="${escapeAttribute(title)}"` : "";
    return {
      end,
      html: `<img src="${escapeAttribute(safe)}" alt="${escapeAttribute(labelParsed.plain)}"${titleAttr} referrerpolicy="no-referrer">`,
      plain: labelParsed.plain,
    };
  }
  const safe = safeDestination(dest, { image: false });
  if (safe === null) {
    // Blocked scheme: the text only, with no <a> element.
    return { end, html: labelParsed.html, plain: labelParsed.plain };
  }
  const titleAttr = title !== null ? ` title="${escapeAttribute(title)}"` : "";
  return {
    end,
    html: `<a href="${escapeAttribute(safe)}"${titleAttr}>${labelParsed.html}</a>`,
    plain: labelParsed.plain,
  };
}

function processDelimiters(items) {
  const delims = items.filter((item) => item.kind === "delim" && item.len > 0);
  for (let ci = 0; ci < delims.length; ci += 1) {
    const closer = delims[ci];
    if (!closer.canClose) continue;
    while (closer.len > 0) {
      let opener = null;
      for (let oi = ci - 1; oi >= 0; oi -= 1) {
        const candidate = delims[oi];
        if (candidate.ch !== closer.ch || !candidate.canOpen || candidate.len <= 0) continue;
        if (candidate.ch === "~") {
          opener = candidate;
          break;
        }
        const bothOddRule =
          (candidate.origLen + closer.origLen) % 3 === 0 &&
          !(candidate.origLen % 3 === 0 && closer.origLen % 3 === 0);
        // CommonMark odd-match rule: when either delimiter can both
        // open and close, a length sum that is a multiple of three
        // does not match (unless both runs are multiples of three);
        // the search then continues to earlier openers.
        if (bothOddRule && (candidate.canClose || closer.canOpen)) continue;
        opener = candidate;
        break;
      }
      if (!opener) break;
      const use = closer.ch === "~" ? 2 : opener.len >= 2 && closer.len >= 2 ? 2 : 1;
      opener.len -= use;
      closer.len -= use;
      const openTag = closer.ch === "~" ? "<del>" : use === 2 ? "<strong>" : "<em>";
      const closeTag = closer.ch === "~" ? "</del>" : use === 2 ? "</strong>" : "</em>";
      opener.pre.unshift(openTag);
      closer.post.push(closeTag);
    }
  }
}

const SPECIALS = new Set(["\\", "`", "!", "[", "<", "&", "*", "_", "~", "\n"]);

export function parseInline(source, ctx, state = { bracketDead: false }) {
  const items = [];
  let buffer = "";
  const flush = () => {
    if (buffer !== "") {
      items.push({ kind: "text", text: buffer });
      buffer = "";
    }
  };
  const pushRaw = (html, plain) => {
    flush();
    items.push({ kind: "raw", html, plain });
  };
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\\") {
      const next = source[i + 1];
      if (next === "\n") {
        pushRaw("<br>", "\n");
        i += 2;
        continue;
      }
      if (next !== undefined && ASCII_PUNCT.has(next)) {
        buffer += next;
        i += 2;
        continue;
      }
      buffer += ch;
      i += 1;
      continue;
    }
    if (ch === "`") {
      let run = 0;
      while (source[i + run] === "`") run += 1;
      let close = -1;
      let j = i + run;
      while (j < source.length) {
        if (source[j] === "`") {
          let r = 0;
          while (source[j + r] === "`") r += 1;
          if (r === run) {
            close = j;
            break;
          }
          j += r;
        } else {
          j += 1;
        }
      }
      if (close < 0) {
        buffer += "`".repeat(run);
        i += run;
        continue;
      }
      let content = source.slice(i + run, close).replace(/\n/g, " ");
      if (
        content.length >= 2 &&
        content.startsWith(" ") &&
        content.endsWith(" ") &&
        content.trim() !== ""
      ) {
        content = content.slice(1, -1);
      }
      pushRaw(`<code>${escapeText(content)}</code>`, content);
      i = close + run;
      continue;
    }
    if (ch === "!" && source[i + 1] === "[") {
      const parsed = parseLinkLike(source, i, true, ctx, state);
      if (parsed) {
        pushRaw(parsed.html, parsed.plain);
        i = parsed.end;
        continue;
      }
      buffer += ch;
      i += 1;
      continue;
    }
    if (ch === "[") {
      const parsed = parseLinkLike(source, i, false, ctx, state);
      if (parsed) {
        pushRaw(parsed.html, parsed.plain);
        i = parsed.end;
        continue;
      }
      buffer += ch;
      i += 1;
      continue;
    }
    if (ch === "<") {
      const rest = source.slice(i);
      const urlMatch = /^<([A-Za-z][A-Za-z0-9+.-]{1,31}:[^<>\s]*)>/.exec(rest);
      const mailMatch = /^<([A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+)>/.exec(rest);
      if (urlMatch) {
        const safe = safeDestination(urlMatch[1]);
        if (safe !== null && /^https?$/i.test(urlMatch[1].split(":")[0])) {
          pushRaw(
            `<a href="${escapeAttribute(safe)}">${escapeText(urlMatch[1])}</a>`,
            urlMatch[1],
          );
          i += urlMatch[0].length;
          continue;
        }
      }
      if (mailMatch) {
        pushRaw(
          `<a href="mailto:${escapeAttribute(mailMatch[1])}">${escapeText(mailMatch[1])}</a>`,
          mailMatch[1],
        );
        i += mailMatch[0].length;
        continue;
      }
      buffer += ch;
      i += 1;
      continue;
    }
    if (ch === "&") {
      const entityMatch = /^&(#(?:[0-9]{1,7}|[xX][0-9A-Fa-f]{1,6})|[A-Za-z][A-Za-z0-9]+);/.exec(source.slice(i));
      if (entityMatch) {
        const body = entityMatch[1];
        if (body.startsWith("#")) {
          const isHex = body[1] === "x" || body[1] === "X";
          const cp = parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
          if (cp >= 1 && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff)) {
            pushRaw(entityMatch[0], String.fromCodePoint(cp));
            i += entityMatch[0].length;
            continue;
          }
        } else if (NAMED_ENTITIES.has(body)) {
          pushRaw(entityMatch[0], NAMED_ENTITIES.get(body));
          i += entityMatch[0].length;
          continue;
        }
      }
      buffer += ch;
      i += 1;
      continue;
    }
    if (ch === "*" || ch === "_") {
      let run = 0;
      while (source[i + run] === ch) run += 1;
      const lf = leftFlanking(source, i, i + run);
      const rf = rightFlanking(source, i, i + run);
      let canOpen;
      let canClose;
      if (ch === "*") {
        canOpen = lf;
        canClose = rf;
      } else {
        const prev = i > 0 ? source[i - 1] : undefined;
        const next = source[i + run];
        canOpen = lf && (!rf || isPunctChar(prev));
        canClose = rf && (!lf || isPunctChar(next));
      }
      flush();
      items.push({
        kind: "delim", ch, len: run, origLen: run, canOpen, canClose, pre: [], post: [],
      });
      i += run;
      continue;
    }
    if (ch === "~") {
      let run = 0;
      while (source[i + run] === "~") run += 1;
      if (run === 2) {
        flush();
        items.push({
          kind: "delim", ch: "~", len: 2, origLen: 2,
          canOpen: leftFlanking(source, i, i + run),
          canClose: rightFlanking(source, i, i + run),
          pre: [], post: [],
        });
      } else {
        buffer += "~".repeat(run);
      }
      i += run;
      continue;
    }
    if (ch === "\n") {
      if (/ {2,}$/.test(buffer)) {
        buffer = buffer.replace(/ +$/, "");
        pushRaw("<br>", "\n");
      } else {
        buffer += "\n";
      }
      i += 1;
      continue;
    }
    let j = i;
    while (j < source.length && !SPECIALS.has(source[j])) j += 1;
    buffer += source.slice(i, j);
    i = j;
  }
  flush();
  processDelimiters(items);
  let html = "";
  let plain = "";
  for (const item of items) {
    if (item.kind === "text") {
      html += escapeText(item.text);
      plain += item.text;
    } else if (item.kind === "raw") {
      html += item.html;
      plain += item.plain;
    } else {
      html += item.pre.join("") + escapeText(item.ch.repeat(item.len)) + item.post.join("");
      plain += item.ch.repeat(item.len);
    }
  }
  return { html, plain };
}

// --- Block parsing -----------------------------------------------------

// SPEC section 4: tabs in indentation expand to 4-column stops for
// block structure decisions. Only the leading indentation run is
// expanded; tabs inside content stay literal (a tab inside a link
// destination must still reach the scheme check, and a tab inside a
// code block is content).
function expandTabs(line) {
  let out = "";
  let column = 0;
  let i = 0;
  while (i < line.length && (line[i] === " " || line[i] === "\t")) {
    if (line[i] === "\t") {
      const spaces = 4 - (column % 4);
      out += " ".repeat(spaces);
      column += spaces;
    } else {
      out += " ";
      column += 1;
    }
    i += 1;
  }
  return out + line.slice(i);
}

const FENCE_RE = /^ {0,3}(`{3,}|~{3,})[ \t]*(.*)$/;
const ATX_RE = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
const THEMATIC_RE = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const QUOTE_RE = /^ {0,3}>[ \t]?/;
const LIST_RE = /^(\s*)([-+*]|\d{1,9}[.)])([ \t]+)(.*)$/;

function isBlank(line) {
  return line === null || /^[ \t]*$/.test(line);
}

function startsBlock(line) {
  if (line === null) return false;
  return (
    FENCE_RE.test(line) ||
    ATX_RE.test(line) ||
    THEMATIC_RE.test(line) ||
    QUOTE_RE.test(line) ||
    LIST_RE.test(line)
  );
}

function parseFence(lines, start, ctx) {
  const match = FENCE_RE.exec(lines[start]);
  const fence = match[1];
  const info = match[2].trim();
  if (fence[0] === "`" && info.includes("`")) return null;
  const language = info === "" ? "" : info.split(/\s+/)[0];
  const content = [];
  let i = start + 1;
  while (i < lines.length) {
    const line = lines[i];
    if (line !== null) {
      const close = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(line);
      if (close && close[1][0] === fence[0] && close[1].length >= fence.length) {
        i += 1;
        break;
      }
      content.push(line);
    }
    i += 1;
  }
  const text = content.length === 0 ? "" : content.join("\n") + "\n";
  const classAttr = /^[A-Za-z0-9_+-]+$/.test(language)
    ? ` class="language-${escapeAttribute(language)}"`
    : "";
  return {
    next: i,
    fragment: {
      html: `<pre><code${classAttr}>${escapeText(text)}</code></pre>`,
      plain: text,
      isParagraph: false,
    },
  };
}

function parseList(lines, start, ctx, depth) {
  const first = LIST_RE.exec(lines[start]);
  const baseIndent = first[1].length;
  const ordered = /\d/.test(first[2]);
  const bulletChar = ordered ? null : first[2];
  const delimChar = ordered ? first[2].slice(-1) : null;
  const startNumber = ordered ? parseInt(first[2], 10) : null;
  const items = [];
  let loose = false;
  let i = start;

  const markerOf = (line) => {
    if (line === null) return null;
    const m = LIST_RE.exec(line);
    if (!m) return null;
    if (Math.abs(m[1].length - baseIndent) > 0 && m[1].length > baseIndent) return null;
    return m;
  };
  const sameList = (m) => {
    if (ordered) return /\d/.test(m[2]) && m[2].slice(-1) === delimChar;
    return m[2] === bulletChar;
  };

  while (i < lines.length) {
    const m = markerOf(lines[i]);
    if (!m || !sameList(m) || m[1].length !== baseIndent) break;
    const markerWidth = m[2].length;
    const spaces = m[3].length;
    const contentIndent = baseIndent + markerWidth + (spaces >= 1 && spaces <= 4 ? spaces : 1);
    const contentLines = [m[4]];
    i += 1;
    let itemDone = false;
    while (i < lines.length && !itemDone) {
      const line = lines[i];
      if (line === null) {
        i += 1;
        continue;
      }
      if (isBlank(line)) {
        // Blank line: item continues only if a following line is
        // indented content or another item; blanks inside an item
        // (followed by content) make the list loose.
        let j = i;
        while (j < lines.length && (lines[j] === null || isBlank(lines[j]))) j += 1;
        const nextLine = j < lines.length ? lines[j] : null;
        if (nextLine === null) {
          i = j;
          itemDone = true;
          break;
        }
        const nextMarker = markerOf(nextLine);
        if (nextMarker && sameList(nextMarker) && nextMarker[1].length === baseIndent) {
          loose = true;
          i = j;
          itemDone = true;
          break;
        }
        const indent = /^ */.exec(nextLine)[0].length;
        if (indent >= contentIndent) {
          loose = true;
          contentLines.push("");
          i = j;
          continue;
        }
        i = j;
        itemDone = true;
        break;
      }
      const indent = /^ */.exec(line)[0].length;
      const lineMarker = markerOf(line);
      if (lineMarker && sameList(lineMarker) && lineMarker[1].length === baseIndent) {
        itemDone = true;
        break;
      }
      if (indent >= contentIndent) {
        contentLines.push(line.slice(contentIndent));
        i += 1;
        continue;
      }
      // Lazy continuation: a plain text line directly after item text
      // belongs to the item's current paragraph.
      const last = contentLines[contentLines.length - 1];
      if (
        last !== undefined &&
        last !== "" &&
        !startsBlock(line) &&
        !startsBlock(last)
      ) {
        contentLines.push(line.replace(/^ {0,3}/, ""));
        i += 1;
        continue;
      }
      itemDone = true;
    }
    items.push(contentLines);
  }

  const renderedItems = items.map((contentLines) => {
    let checked = null;
    if (contentLines.length > 0) {
      const task = /^\[( |x|X)\] (.*)$/.exec(contentLines[0]);
      if (task && !ordered) {
        checked = task[1] !== " ";
        contentLines = [task[2], ...contentLines.slice(1)];
      }
    }
    const fragments = parseBlocks(contentLines, ctx, depth + 1);
    const inner = fragments
      .map((f) => (loose || !f.isParagraph ? f.html : f.innerHtml))
      .join("\n");
    const prefix = checked === null
      ? ""
      : `<input type="checkbox" disabled${checked ? " checked" : ""}> `;
    return {
      html: `<li>${prefix}${inner}</li>`,
      plain: fragments.map((f) => f.plain).join("\n"),
    };
  });

  const tag = ordered ? "ol" : "ul";
  const startAttr = ordered && startNumber !== 1 ? ` start="${startNumber}"` : "";
  return {
    next: i,
    fragment: {
      html: `<${tag}${startAttr}>\n${renderedItems.map((item) => item.html).join("\n")}\n</${tag}>`,
      plain: renderedItems.map((item) => item.plain).join("\n"),
      isParagraph: false,
    },
  };
}

function splitTableRow(line) {
  const trimmed = line.trim();
  const cells = [];
  let current = "";
  let body = trimmed;
  if (body.startsWith("|")) body = body.slice(1);
  if (body.endsWith("|") && !body.endsWith("\\|")) body = body.slice(0, -1);
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === "\\" && body[i + 1] === "|") {
      current += "\\|";
      i += 1;
      continue;
    }
    if (ch === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function tryParseTable(lines, start, ctx) {
  const headerLine = lines[start];
  const delimLine = lines[start + 1];
  if (delimLine === null || delimLine === undefined) return null;
  if (!headerLine.includes("|")) return null;
  const delimCells = splitTableRow(delimLine);
  if (!delimCells.every((cell) => /^:?-+:?$/.test(cell))) return null;
  const headerCells = splitTableRow(headerLine);
  if (headerCells.length !== delimCells.length) return null;
  const aligns = delimCells.map((cell) => {
    const left = cell.startsWith(":");
    const right = cell.endsWith(":");
    if (left && right) return "center";
    if (left) return "left";
    if (right) return "right";
    return null;
  });
  const rows = [];
  let i = start + 2;
  while (i < lines.length) {
    const line = lines[i];
    if (line === null) {
      i += 1;
      continue;
    }
    if (isBlank(line) || startsBlock(line)) break;
    rows.push(splitTableRow(line));
    i += 1;
  }
  const cellHtml = (tag, source, align) => {
    const parsed = parseInline(source, ctx);
    const alignAttr = align ? ` align="${align}"` : "";
    return `<${tag}${alignAttr}>${parsed.html}</${tag}>`;
  };
  const head = headerCells.map((cell, k) => cellHtml("th", cell, aligns[k])).join("");
  const bodyRows = rows.map((row) => {
    const cells = [];
    for (let k = 0; k < headerCells.length; k += 1) {
      cells.push(cellHtml("td", row[k] ?? "", aligns[k]));
    }
    return `<tr>${cells.join("")}</tr>`;
  });
  const plainParts = [
    headerCells.map((cell) => parseInline(cell, ctx).plain).join(" "),
    ...rows.map((row) => row.map((cell) => parseInline(cell, ctx).plain).join(" ")),
  ];
  return {
    next: i,
    fragment: {
      html: `<table>\n<thead>\n<tr>${head}</tr>\n</thead>\n<tbody>\n${bodyRows.join("\n")}\n</tbody>\n</table>`,
      plain: plainParts.join("\n"),
      isParagraph: false,
    },
  };
}

// Parses a list of source lines (null = consumed definition line) into
// block fragments: { html, plain, isParagraph, innerHtml? }.
export function parseBlocks(rawLines, ctx, depth = 0) {
  const lines = rawLines.map((line) => (line === null ? null : expandTabs(line)));
  const fragments = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) {
      i += 1;
      continue;
    }
    const fenceMatch = FENCE_RE.test(line);
    if (fenceMatch) {
      const parsed = parseFence(lines, i, ctx);
      if (parsed) {
        fragments.push(parsed.fragment);
        i = parsed.next;
        continue;
      }
    }
    const atx = ATX_RE.exec(line);
    if (atx) {
      let content = atx[2] ?? "";
      if (/^#+$/.test(content)) content = "";
      else content = content.replace(/[ \t]+#+$/, "");
      const parsed = parseInline(content, ctx);
      if (ctx.firstHeading === null && parsed.plain !== "") {
        ctx.firstHeading = parsed.plain;
      }
      const level = atx[1].length;
      fragments.push({
        html: `<h${level}>${parsed.html}</h${level}>`,
        plain: parsed.plain,
        isParagraph: false,
      });
      i += 1;
      continue;
    }
    if (THEMATIC_RE.test(line)) {
      fragments.push({ html: "<hr>", plain: "", isParagraph: false });
      i += 1;
      continue;
    }
    if (QUOTE_RE.test(line) && depth < MAX_BLOCK_DEPTH) {
      const inner = [];
      while (i < lines.length) {
        const current = lines[i];
        if (current === null) {
          i += 1;
          continue;
        }
        if (QUOTE_RE.test(current)) {
          inner.push(current.replace(QUOTE_RE, ""));
          i += 1;
          continue;
        }
        if (isBlank(current)) break;
        // Lazy continuation of the quote's current paragraph.
        const lastInner = inner[inner.length - 1];
        if (
          lastInner !== undefined &&
          lastInner !== "" &&
          !startsBlock(current) &&
          !startsBlock(lastInner)
        ) {
          inner.push(current);
          i += 1;
          continue;
        }
        break;
      }
      const innerFragments = parseBlocks(inner, ctx, depth + 1);
      fragments.push({
        html: `<blockquote>\n${innerFragments.map((f) => f.html).join("\n")}\n</blockquote>`,
        plain: innerFragments.map((f) => f.plain).join("\n"),
        isParagraph: false,
      });
      continue;
    }
    if (LIST_RE.test(line)) {
      const parsed = parseList(lines, i, ctx, depth);
      fragments.push(parsed.fragment);
      i = parsed.next;
      continue;
    }
    const table = tryParseTable(lines, i, ctx);
    if (table) {
      fragments.push(table.fragment);
      i = table.next;
      continue;
    }
    // Paragraph: consecutive lines until a blank line or an
    // interrupting block. Tables do not interrupt paragraphs.
    const paraLines = [line];
    i += 1;
    while (i < lines.length) {
      const current = lines[i];
      if (current === null) {
        i += 1;
        continue;
      }
      if (isBlank(current) || startsBlock(current)) break;
      paraLines.push(current);
      i += 1;
    }
    const parsed = parseInline(paraLines.join("\n"), ctx);
    fragments.push({
      html: `<p>${parsed.html}</p>`,
      innerHtml: parsed.html,
      plain: parsed.plain,
      isParagraph: true,
    });
  }
  return fragments;
}

// --- Document assembly, counts, export ---------------------------------

const CJK_RE = /[㐀-䶿一-鿿豈-﫿぀-ヿ가-힯]/;

export function countRenderedWords(plainText) {
  let cjk = 0;
  for (const ch of plainText) {
    if (CJK_RE.test(ch)) cjk += 1;
  }
  let latinRuns = 0;
  for (const run of plainText.split(/\s+/)) {
    if (run === "") continue;
    let hasNonCjk = false;
    for (const ch of run) {
      if (!CJK_RE.test(ch)) {
        hasNonCjk = true;
        break;
      }
    }
    if (hasNonCjk) latinRuns += 1;
  }
  return cjk + latinRuns;
}

export function renderDocument(source) {
  const text = String(source ?? "").replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  const ctx = { refs: new Map(), firstHeading: null };
  harvestDefinitions(lines, ctx.refs);
  const fragments = parseBlocks(lines, ctx, 0);
  const html = fragments.map((f) => f.html).join("\n");
  const plainText = fragments.map((f) => f.plain).join("\n");
  return {
    html,
    plainText,
    title: ctx.firstHeading,
    sourceChars: [...text].length,
    renderedWords: countRenderedWords(plainText),
  };
}

export const EXPORT_CSS = [
  "body { font-family: system-ui, sans-serif; line-height: 1.6; max-width: 44rem; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }",
  "pre { background: #f4f4f4; padding: 0.75rem; overflow-x: auto; }",
  "code { font-family: ui-monospace, monospace; }",
  "table { border-collapse: collapse; }",
  "th, td { border: 1px solid #bbb; padding: 0.3rem 0.6rem; }",
  "blockquote { border-left: 3px solid #bbb; margin-left: 0; padding-left: 1rem; color: #444; }",
  "img { max-width: 100%; }",
].join("\n");

export function buildExportDocument({ bodyHtml, title, lang }) {
  return [
    "<!DOCTYPE html>",
    `<html lang="${escapeAttribute(lang)}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeText(title)}</title>`,
    "<style>",
    EXPORT_CSS,
    "</style>",
    "</head>",
    "<body>",
    bodyHtml,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

export function formatExportFilename(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `markdown-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.html`
  );
}
