# GlossQuote homepage

## 本地與雲端共同工作入口 — 2026-10-29

GlossQuote Labs 現在使用 GitHub 作為本地 Codex 與雲端 dots 的共同來源與承接依據。開始、恢復、交接及交驗前先讀 [AGENTS.md](AGENTS.md) 與 [共用工作規則](docs/CLOUD-LOCAL-WORKFLOW.md)，再讀遠端最新 [工作登記](coordination/work-registry.json)。主頁／預案／候選先上 GitHub，唯一承接登記成功並讀回後才開工，最後以固定候選獨立驗收。

首次接入：[貼給本地 Codex 的提示詞](docs/LOCAL-CODEX-HANDOFF.md) · [雲端 dots 接入指令](docs/CLOUD-DOTS-HANDOFF.md) · [協作命令](docs/COORDINATION-COMMANDS.md) · [專案任務板](https://gent-cloud-task-board.agentkystr.chatgpt.site/)。兩端原承接者完成盤點與確認前不開放新領取，原本工作保留 checkpoint；`catalog.json` 的 published／draft 不是可用預案庫存。

預案完整且未被消耗的庫存 <6 時補預案 P1，達6降 P3；工具製作維持 P3，預設本地 Codex。任務明確允許雲端才能由雲端承接。下面的主頁發布證據與既有發布流程繼續有效；這次協作規則更新本身沒有部署主頁或宣稱工具新驗收通過。

## Current live release — 2026-10-11

[繁體中文](https://glossquote.com/index.html) · [English](https://glossquote.com/en/index.html)

Deployed source: [6c6ee2dcad4e](https://github.com/KYStr/glossquote-labs-home/commit/6c6ee2dcad4ed72f1e056974251533c4c694f46c); Cloudflare version `2bc8033e-d346-4e8f-b820-6932319088ab`. This dated status supersedes older candidate-only or NOT_DEPLOYED notes below. Later documentation-only commits do not change the deployed assets.

Release verification passed: 5 public assets matched the reviewed build byte for byte across 17 HTTP response checks, including HTTPS, security headers, MIME, bilingual SEO, robots/sitemap, missing paths and configured redirects. Both language pages received scoped browser checks. Both live catalogs contain ten tools with matching-language links. An English homepage → JSON → English homepage round trip was exercised.

The runtime retains its previously accepted offline test evidence; the updated homepage passed 12 tests in this release. Full Network/Storage inspection, physical devices, assistive technology and all remaining documented manual checks are still NOT_RUN. Live publication is not a claim of exhaustive certification or search-engine indexing.

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

M13 catalog release (2026-10-09): Focus Timer and Color Palette passed their real HTTPS release checks (32 and 36 checks, with 11 and 13 public files byte-identical to the reviewed builds). Their bilingual entries have verified live URLs and their actual first publication date. The updated homepage is now deployed and verified: 20 HTTPS checks passed and all 5 public assets match the reviewed build. Both live catalogs list all four tools, show the new tools in recent additions, and link to the matching language. The primary verified real browser navigation, tool interactions and both homepage languages at 320 CSS px without horizontal overflow. Future drafts retain null URLs and publication dates and stay out of both rendered catalogs until their tool release has been verified.

No software license has been selected; public source access is not a license grant.

The production build includes canonical and language links, `robots.txt`, a sitemap, explicit root redirects, and static security headers. It has no client-side JavaScript, telemetry, external assets, storage, or server-side calculator logic.
