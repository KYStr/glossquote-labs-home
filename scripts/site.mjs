import { validateCatalog } from "./catalog.mjs";

export const PRODUCTION_ORIGIN = "https://glossquote.com";
export const OUTPUT_DIRECTORY = Object.freeze({ preview: "dist", production: "dist-production" });
export const STYLESHEET_MAX_BYTES = 256 * 1024;

const COPY = Object.freeze({
  zh: {
    lang: "zh-Hant",
    htmlLocale: "zh_TW",
    title: "GlossQuote｜常用單位換算與日期計算",
    description: "快速找到常用單位換算與日期計算，先看清楚範例，再開啟對應工具。",
    headline: "把小事算清楚。",
    introduction: "常用的換算與日期計算，規則清楚、結果明白。",
    findTools: "找工具",
    toolsHeading: "所有工具",
    toolsIntro: "選一項工具，查看範例後直接開始。",
    openTool: "開啟工具",
    recentHeading: "最近上架",
    recentIntro: "依實際發布日期排列。",
    recentEmpty: "目前還沒有公開工具。",
    aboutHeading: "輸入內容如何處理",
    aboutIntro: "本首頁只提供導覽。開啟工具後，計算在該工具頁面的瀏覽器內完成；託管服務仍會處理載入網頁所需的連線資訊。",
    faqHeading: "常見問題",
    privacyQuestion: "我輸入的數值會傳到 GlossQuote 嗎？",
    privacyAnswer: "計算在各工具的瀏覽器頁面內完成。本首頁不收集輸入內容；提供網頁的託管服務仍會處理連線所需的技術資訊。",
    localQuestion: "這個首頁會替我計算嗎？",
    localAnswer: "不會。請開啟對應工具，在工具頁面輸入資料並查看計算規則。",
    backToTools: "回到工具",
    toTop: "回到頁首",
  },
  en: {
    lang: "en",
    htmlLocale: "en",
    title: "GlossQuote | Unit Conversion and Date Calculation",
    description: "Find a practical unit converter or date calculator, review a worked example, and open the tool you need.",
    headline: "Small things, clearly calculated.",
    introduction: "Useful unit and date calculations, with clear rules and readable results.",
    findTools: "Find a tool",
    toolsHeading: "All tools",
    toolsIntro: "Choose a tool, review its example, and open it directly.",
    openTool: "Open tool",
    recentHeading: "Recently added",
    recentIntro: "Sorted by actual publication date.",
    recentEmpty: "There are no published tools yet.",
    aboutHeading: "How input is handled",
    aboutIntro: "This homepage is a directory. Calculations run in the browser on each tool page; the hosting service still processes the connection information needed to serve a page.",
    faqHeading: "Frequently asked questions",
    privacyQuestion: "Are my values sent to GlossQuote?",
    privacyAnswer: "Calculations run in the browser on each tool page. This homepage does not collect your inputs; the website hosting service still processes technical information needed for connections.",
    localQuestion: "Does this homepage calculate anything?",
    localAnswer: "No. Open a tool to enter your values and read the calculation rules on its page.",
    backToTools: "Back to tools",
    toTop: "Back to top",
  }
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/gu, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function sortPublished(tools) {
  return tools
    .filter((tool) => tool.status === "published")
    .sort((left, right) => {
      if (left.publishedAt !== right.publishedAt) return left.publishedAt > right.publishedAt ? -1 : 1;
      return left.slug < right.slug ? -1 : left.slug > right.slug ? 1 : 0;
    });
}

function toolRows(tools, locale, copy) {
  if (tools.length === 0) return `<p class="empty-state">${escapeHtml(copy.recentEmpty)}</p>`;

  return `<ul class="tool-list">${tools.map((tool) => {
    const content = tool[locale];
    const url = tool.urls[copy.lang];
    return `<li class="tool-list-item">
      <article class="tool-row">
        <div class="tool-copy">
          <h3>${escapeHtml(content.name)}</h3>
          <p class="tool-description">${escapeHtml(content.description)}</p>
          <p class="tool-use-case">${escapeHtml(content.useCase)}</p>
          <a class="tool-action" href="${escapeHtml(url)}">${escapeHtml(copy.openTool)}：${escapeHtml(content.name)}</a>
        </div>
        <div class="tool-example">
          <span class="example-label">${escapeHtml(content.example.label)}</span>
          <p class="example-value">${escapeHtml(content.example.value)}</p>
          <p class="example-detail">${escapeHtml(content.example.detail)}</p>
        </div>
      </article>
    </li>`;
  }).join("")}</ul>`;
}

function recentRows(tools, locale, copy) {
  if (tools.length === 0) return `<p class="empty-state">${escapeHtml(copy.recentEmpty)}</p>`;
  return `<ul class="recent-list">${tools.map((tool) => {
    const content = tool[locale];
    return `<li class="recent-row">
      <a href="${escapeHtml(tool.urls[copy.lang])}">${escapeHtml(content.name)}</a>
      <time datetime="${escapeHtml(tool.publishedAt)}">${escapeHtml(tool.publishedAt)}</time>
    </li>`;
  }).join("")}</ul>`;
}

function metadata(locale, mode) {
  const copy = COPY[locale];
  const chineseUrl = `${PRODUCTION_ORIGIN}/index.html`;
  const englishUrl = `${PRODUCTION_ORIGIN}/en/index.html`;
  const selfUrl = locale === "zh" ? chineseUrl : englishUrl;
  const alternateZh = mode === "production" ? chineseUrl : "/index.html";
  const alternateEn = mode === "production" ? englishUrl : "/en/index.html";
  const canonical = mode === "production" ? `<link rel="canonical" href="${selfUrl}">
    <link rel="alternate" hreflang="zh-Hant" href="${alternateZh}">
    <link rel="alternate" hreflang="en" href="${alternateEn}">
    <link rel="alternate" hreflang="x-default" href="${chineseUrl}">` : `<link rel="alternate" hreflang="zh-Hant" href="${alternateZh}">
    <link rel="alternate" hreflang="en" href="${alternateEn}">`;
  const robots = mode === "production" ? "index, follow" : "noindex, nofollow";
  const ogUrl = mode === "production" ? `<meta property="og:url" content="${selfUrl}">` : "";

  return `<meta name="description" content="${escapeHtml(copy.description)}">
    <meta name="robots" content="${robots}">
    <meta name="referrer" content="no-referrer">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="${copy.htmlLocale}">
    <meta property="og:title" content="${escapeHtml(copy.title)}">
    <meta property="og:description" content="${escapeHtml(copy.description)}">
    ${ogUrl}
    ${canonical}`;
}

function renderPage(locale, mode, tools) {
  const copy = COPY[locale];
  const otherLocale = locale === "zh" ? "en" : "zh";
  const currentHref = locale === "zh" ? "/index.html" : "/en/index.html";
  const otherHref = locale === "zh" ? "/en/index.html" : "/index.html";
  const currentName = locale === "zh" ? "繁體中文" : "English";
  const otherName = locale === "zh" ? "English" : "繁體中文";
  const toolList = toolRows(tools, locale, copy);
  const recent = recentRows(tools.slice(0, 3), locale, copy);

  return `<!doctype html>
<html lang="${copy.lang}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(copy.title)}</title>
    ${metadata(locale, mode)}
    <link rel="stylesheet" href="/styles/site.css">
  </head>
  <body id="top">
    <a class="skip-link" href="#main">${locale === "zh" ? "跳至主要內容" : "Skip to main content"}</a>
    <div class="page-shell">
      <header class="site-header">
        <a class="brand" href="${currentHref}" aria-label="GlossQuote — ${currentName}">
          <span class="brand-mark" aria-hidden="true"></span>
          <span>GlossQuote</span>
        </a>
        <nav class="header-nav" aria-label="${locale === "zh" ? "主要導覽" : "Primary navigation"}">
          <div class="primary-nav">
            <a href="#all-tools">${escapeHtml(copy.toolsHeading)}</a>
            <a href="#about">${locale === "zh" ? "資料與隱私" : "Privacy"}</a>
          </div>
          <div class="language-nav" aria-label="${locale === "zh" ? "語言" : "Language"}">
            <a href="${currentHref}" lang="${copy.lang}" hreflang="${copy.lang}" aria-current="page">${currentName}</a>
            <a href="${otherHref}" lang="${COPY[otherLocale].lang}" hreflang="${COPY[otherLocale].lang}">${otherName}</a>
          </div>
        </nav>
      </header>

      <main id="main">
        <section class="hero" aria-labelledby="page-title">
          <h1 id="page-title">${escapeHtml(copy.headline)}</h1>
          <div class="hero-copy">
            <p>${escapeHtml(copy.introduction)}</p>
            <a class="primary-action" href="#all-tools">${escapeHtml(copy.findTools)}</a>
          </div>
        </section>

        <section id="all-tools" aria-labelledby="tools-title">
          <header class="section-heading">
            <div>
              <h2 id="tools-title">${escapeHtml(copy.toolsHeading)}</h2>
              <p>${escapeHtml(copy.toolsIntro)}</p>
            </div>
          </header>
          ${toolList}
        </section>

        <section class="recent" id="recent-tools" aria-labelledby="recent-title">
          <header class="section-heading">
            <div>
              <h2 id="recent-title">${escapeHtml(copy.recentHeading)}</h2>
              <p>${escapeHtml(copy.recentIntro)}</p>
            </div>
          </header>
          ${recent}
        </section>

        <section class="about" id="about" aria-labelledby="about-title">
          <div class="about-intro">
            <h2 id="about-title">${escapeHtml(copy.aboutHeading)}</h2>
            <p>${escapeHtml(copy.aboutIntro)}</p>
          </div>
          <div class="faq" aria-labelledby="faq-title">
            <h3 id="faq-title">${escapeHtml(copy.faqHeading)}</h3>
            <details>
              <summary>${escapeHtml(copy.privacyQuestion)}</summary>
              <p>${escapeHtml(copy.privacyAnswer)}</p>
            </details>
            <details>
              <summary>${escapeHtml(copy.localQuestion)}</summary>
              <p>${escapeHtml(copy.localAnswer)}</p>
            </details>
          </div>
        </section>
      </main>

      <footer class="site-footer">
        <span>GlossQuote</span>
        <a href="#top">${escapeHtml(copy.toTop)}</a>
        <a href="#all-tools">${escapeHtml(copy.backToTools)}</a>
      </footer>
    </div>
  </body>
</html>
`;
}

function headersFile(mode) {
  const lines = [
    "/*",
    "  Content-Security-Policy: default-src 'none'; base-uri 'none'; object-src 'none'; script-src 'none'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; form-action 'none'; frame-ancestors 'none'; media-src 'none'; worker-src 'none'",
    "  Referrer-Policy: no-referrer",
    "  X-Content-Type-Options: nosniff",
    "  X-Frame-Options: DENY",
    "  Permissions-Policy: camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    "  Cross-Origin-Opener-Policy: same-origin"
  ];
  if (mode === "production") lines.push("  Strict-Transport-Security: max-age=31536000");
  return `${lines.join("\n")}\n`;
}

function robotsFile(mode) {
  if (mode === "preview") return "User-agent: *\nDisallow: /\n";
  return `User-agent: *\nAllow: /\nSitemap: ${PRODUCTION_ORIGIN}/sitemap.xml\n`;
}

function sitemapFile() {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${PRODUCTION_ORIGIN}/index.html</loc></url>\n  <url><loc>${PRODUCTION_ORIGIN}/en/index.html</loc></url>\n</urlset>\n`;
}

export function generateSiteFiles({ catalogInput, mode, cssText }) {
  if (mode !== "preview" && mode !== "production") throw new Error("Mode must be preview or production");
  validateStylesheet(cssText);
  const catalog = validateCatalog(catalogInput);
  const tools = sortPublished(catalog.tools);
  const files = new Map([
    ["index.html", Buffer.from(renderPage("zh", mode, tools), "utf8")],
    ["en/index.html", Buffer.from(renderPage("en", mode, tools), "utf8")],
    ["styles/site.css", Buffer.from(cssText, "utf8")],
    ["_headers", Buffer.from(headersFile(mode), "utf8")],
    ["_redirects", Buffer.from("/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n", "utf8")],
    ["robots.txt", Buffer.from(robotsFile(mode), "utf8")]
  ]);
  if (mode === "production") files.set("sitemap.xml", Buffer.from(sitemapFile(), "utf8"));
  return files;
}

export { escapeHtml };

export function validateStylesheet(cssText) {
  if (typeof cssText !== "string" || Buffer.byteLength(cssText, "utf8") > STYLESHEET_MAX_BYTES) {
    throw new Error("Stylesheet input is invalid or exceeds the size limit");
  }
  if (/@import\b|url\s*\(|@font-face\b/iu.test(cssText)) {
    throw new Error("Stylesheet asset references are not allowed");
  }
  return cssText;
}
