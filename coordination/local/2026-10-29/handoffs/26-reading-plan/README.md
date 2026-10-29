# 閱讀進度規劃 / Reading plan

A bilingual, static single-book reading planner by Gloss Tools / GlossQuote. Enter total and completed pages, an inclusive date range, and the weekdays you can read. Earlier reading dates receive the remainder pages first; later zero-page dates remain flexible/rest dates.

這是一份安排，不會追蹤實際閱讀。更新已讀頁數與開始日期，即可重排。每日上限不足時只顯示容量與缺口，不建立部分計畫。

## Status

Release candidate `0.1.0-rc1`. The local M1 implementation passed its owner and primary acceptance. M2 prepares production assets and public source; a source publication is separate from a live website. Cloudflare deployment, shared-homepage integration, and external review are owned by the primary release workflow. Do not infer that hosting is live from this repository.

The M0 PRODUCT / TECHNICAL / UX-SEO / ACCEPTANCE / TASKS documents retain their original specification-stage labels as history. Current runnable commands and release behavior are described here and in docs/RELEASE.md.

## Run locally

Node.js 24+; ESM and built-in modules only. No dependency installation is needed. On Windows, invoke the installed Node/npm by their full paths if they are not already available; never add temporary directories to persistent PATH.

```sh
npm test
npm run check
npm run build
npm run dev
```

Preview: `http://127.0.0.1:4206/index.html` and `/en/index.html`. The preview and `dist/` are always noindex/nofollow. A port collision preserves the existing service; the development server may announce an OS-assigned loopback port.

```sh
npm run build:production
npm run check:production
npm run release:check
npm run preview:production
```

The production HTTP model listens only at `127.0.0.1:5206`. It is a local model, not Cloudflare or a deployment. Canonical URLs are `https://reading.glossquote.com/index.html` and `https://reading.glossquote.com/en/index.html`. HTML handling is disabled: the explicit `.html` paths are the public entries; `/`, `/en/`, and other unknown paths are modeled as genuine 404s. A later live release must verify the actual host behavior independently.

`dist-production/` contains exactly 12 assets. Both canonical pages have index/follow metadata, reciprocal zh-Hant/en/x-default links, matching Open Graph metadata, and a truthful WebApplication JSON-LD block. All non-HTML app assets are byte-identical to the independently accepted M1 files. Build scripts enforce all nine M1 public-file hashes and never modify `public/`.

## Data and controls

- All inputs and reports stay in the current page's memory. No storage, tracking, analytics, remote fonts, APIs, accounts, notifications, or calendar integrations.
- Initial site files still need to download. Copy and TXT export happen only after an explicit action; the browser manages copied/downloaded content.
- Any input edit immediately invalidates the old result and report. Language changes, reloads and page departures clear drafts. A BFCache restore resets again.
- Invalid dates stay raw in text mode. No automatic date parsing, timezone conversions, or defaulting to today.
- Before the app initializes successfully, all form inputs and submit remain disabled. Raw book fields have no form submission names.
- Clipboard failure offers manual selection. Old callbacks cannot alter a newer result; this does not undo a native write already started.

## Verification and boundaries

Core cases cover strict schemas, Gregorian arithmetic, allocation, caps, zero remaining pages, null flex ranges and exact report bytes. Production tests use independent literal metadata/configuration/status/header oracles. Check/build/release tools reject unknown source/output files and unsafe links, and verify source/output hashes. No test requires an external service.

Limited manual evidence remains documented: real IME, actual persisted BFCache, browser zoom at 200%, physical mobile devices, low-end CPU measurements, assistive technology, and full DevTools Network/Storage are not inferred from unit tests or desktop emulation.

The public source allowlist includes code, tests, this README and product/release reference documents. It excludes chat dispatch, project/chat identifiers, mutable handoffs, local evidence, generated output, caches and account data. Release publication does not deploy Cloudflare, change credentials, expand permissions or modify persistent Windows/Git settings.
