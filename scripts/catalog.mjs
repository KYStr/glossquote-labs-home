const MAX_CATALOG_BYTES = 128 * 1024;
const MAX_TOOLS = 100;
const LANGUAGES = ["zh-Hant", "en"];

const LIMITS = {
  slug: 48,
  name: 80,
  description: 260,
  useCase: 240,
  exampleLabel: 48,
  exampleValue: 160,
  exampleDetail: 220
};

function fail(reason) {
  throw new Error(`Invalid catalog: ${reason}`);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, keys, location) {
  if (!isRecord(value)) fail(`${location} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail(`${location} has missing or unknown fields`);
  }
}

function boundedText(value, maximum, location) {
  if (typeof value !== "string" || value.length < 1 || value.length > maximum) {
    fail(`${location} must be a non-empty string of at most ${maximum} characters`);
  }
  if (value !== value.trim() || /[\u0000-\u001f\u007f]/u.test(value)) {
    fail(`${location} contains invalid whitespace or control characters`);
  }
  return value;
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function validIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const monthLengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= monthLengths[month - 1];
}

function validateUrlPair(value, slug, hosts) {
  exactKeys(value, LANGUAGES, `${slug}.urls`);
  const urls = {};
  let commonHostname = null;

  for (const language of LANGUAGES) {
    const raw = value[language];
    if (typeof raw !== "string" || raw.length > 256) fail(`${slug}.urls.${language} is invalid`);

    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      fail(`${slug}.urls.${language} is invalid`);
    }

    const expectedPath = language === "en" ? "/en/index.html" : "/index.html";
    const hostnamePattern = /^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\.glossquote\.com$/u;
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port ||
        parsed.search || parsed.hash || parsed.pathname !== expectedPath ||
        !hostnamePattern.test(parsed.hostname) || raw !== `https://${parsed.hostname}${expectedPath}`) {
      fail(`${slug}.urls.${language} must be the exact hosted HTTPS page URL`);
    }

    if (commonHostname !== null && parsed.hostname !== commonHostname) {
      fail(`${slug} language URLs must use the same tool subdomain`);
    }
    commonHostname = parsed.hostname;
    urls[language] = raw;
  }

  if (hosts.has(commonHostname)) fail(`${slug} reuses a published tool subdomain`);
  hosts.add(commonHostname);
  return urls;
}

function validateLanguage(value, slug, language) {
  const location = `${slug}.${language}`;
  exactKeys(value, ["name", "description", "useCase", "example"], location);
  exactKeys(value.example, ["label", "value", "detail"], `${location}.example`);
  return {
    name: boundedText(value.name, LIMITS.name, `${location}.name`),
    description: boundedText(value.description, LIMITS.description, `${location}.description`),
    useCase: boundedText(value.useCase, LIMITS.useCase, `${location}.useCase`),
    example: {
      label: boundedText(value.example.label, LIMITS.exampleLabel, `${location}.example.label`),
      value: boundedText(value.example.value, LIMITS.exampleValue, `${location}.example.value`),
      detail: boundedText(value.example.detail, LIMITS.exampleDetail, `${location}.example.detail`)
    }
  };
}

function parseInput(input) {
  let raw = input;
  if (Buffer.isBuffer(input)) raw = input.toString("utf8");

  if (typeof raw === "string") {
    if (Buffer.byteLength(raw, "utf8") > MAX_CATALOG_BYTES) fail("input exceeds the size limit");
    try {
      raw = JSON.parse(raw);
    } catch {
      fail("input is not valid JSON");
    }
  } else {
    let serialized;
    try {
      serialized = JSON.stringify(raw);
    } catch {
      fail("input cannot be serialized");
    }
    if (typeof serialized !== "string" || Buffer.byteLength(serialized, "utf8") > MAX_CATALOG_BYTES) {
      fail("input exceeds the size limit");
    }
  }
  return raw;
}

export function validateCatalog(input) {
  const raw = parseInput(input);
  exactKeys(raw, ["schemaVersion", "tools"], "catalog");
  if (raw.schemaVersion !== 1) fail("schemaVersion must be 1");
  if (!Array.isArray(raw.tools) || raw.tools.length > MAX_TOOLS) fail(`tools must contain at most ${MAX_TOOLS} entries`);

  const slugs = new Set();
  const hosts = new Set();
  const tools = raw.tools.map((tool, index) => {
    const location = `tools[${index}]`;
    exactKeys(tool, ["slug", "status", "publishedAt", "urls", "zh", "en"], location);
    const slug = boundedText(tool.slug, LIMITS.slug, `${location}.slug`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) fail(`${location}.slug has an invalid format`);
    if (slugs.has(slug)) fail(`duplicate slug ${slug}`);
    slugs.add(slug);
    if (tool.status !== "published" && tool.status !== "draft") fail(`${slug}.status must be published or draft`);

    let publishedAt = null;
    let urls = null;
    if (tool.status === "published") {
      if (!validIsoDate(tool.publishedAt)) fail(`${slug}.publishedAt must be a real YYYY-MM-DD date`);
      publishedAt = tool.publishedAt;
      urls = validateUrlPair(tool.urls, slug, hosts);
    } else if (tool.publishedAt !== null || tool.urls !== null) {
      fail(`${slug} drafts must use null for publishedAt and urls`);
    }

    return {
      slug,
      status: tool.status,
      publishedAt,
      urls,
      zh: validateLanguage(tool.zh, slug, "zh"),
      en: validateLanguage(tool.en, slug, "en")
    };
  });

  return { schemaVersion: 1, tools };
}

export const catalogLimits = Object.freeze({ maxBytes: MAX_CATALOG_BYTES, maxTools: MAX_TOOLS });
