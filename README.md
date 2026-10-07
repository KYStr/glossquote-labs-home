# GlossQuote homepage

The bilingual static homepage at `https://glossquote.com/index.html` and `https://glossquote.com/en/index.html` helps visitors choose a published Gloss Tools calculator. The tool list and recent additions are generated from [`catalog.json`](catalog.json); drafts never render as live links.

## Local work

Use Node.js 24 or later. The project uses only Node's built-in modules and has no package dependencies.

```powershell
npm.cmd test
npm.cmd run check
npm.cmd run build:preview
npm.cmd run check:generated:preview
npm.cmd run build:production
npm.cmd run check:generated:production
npm.cmd run prepare:production
npm.cmd run dev
```

The default `build` command creates a noindex preview in `dist/`. Production files go to `dist-production/`, the directory configured for Cloudflare Static Assets. Wrangler runs `node scripts/release.mjs` before deployment to create and verify that production tree. The preview server binds only to `127.0.0.1:4180` and serves an already-built preview.

## Publishing another tool

First publish the completed tool's independent public source repository, deploy its website, and verify HTTPS, both language pages, SEO metadata, and a link back to the matching-language homepage. Then add a published catalog record with its actual first publication date, bilingual copy, example, and exact hosted page URLs (`/index.html` and `/en/index.html` on one new `*.glossquote.com` subdomain). Keep unfinished or unverified tools as drafts with `publishedAt` and `urls` set to `null`. Rebuild and verify this homepage in both languages, publish the updated homepage source repository, and redeploy the production homepage through the approved release workflow. Verify the new links on both live homepage pages. Record the public source repositories and verified commits in HANDOFF and record live verification separately. A GitHub push does not trigger deployment automatically.

2026-10-07 已正式上線：[繁體中文](https://glossquote.com/index.html) · [English](https://glossquote.com/en/index.html)。首頁與兩個工具均使用免費 Cloudflare Static Assets；雙語目錄、最近上架與同語言互連已驗證。後續新工具完成正式發布後，更新此目錄並重新部署首頁。

Live release verified on 2026-10-07: 20 HTTPS GET/HEAD checks cover the homepage, metadata, sitemap, robots, redirects, missing paths, MIME types and security headers; all 5 public assets match the reviewed production build byte for byte. Both languages link through the unit and date tools and back to their matching-language homepage. The implementation passed 12 offline tests. Desktop, 320 CSS px, keyboard focus and FAQ controls were checked in the in-app browser. Physical devices, assistive technology, real 200% zoom and search-engine indexing remain unverified. A source push does not automatically update the live site.

M13 source preparation (2026-10-07): the catalog now contains hidden drafts for Focus Timer and Color Palette. The bilingual title and introduction describe the growing collection of everyday tools. These source changes passed the 12 offline tests, source check and exact production-output check, but have not yet replaced the live homepage. A draft has no live URL or release date and stays out of both rendered catalogs. It becomes published only after the corresponding tool passes its real HTTPS release checks, followed by a verified homepage deployment.

No software license has been selected; public source access is not a license grant.

The production build includes canonical and language links, `robots.txt`, a sitemap, explicit root redirects, and static security headers. It has no client-side JavaScript, telemetry, external assets, storage, or server-side calculator logic.
