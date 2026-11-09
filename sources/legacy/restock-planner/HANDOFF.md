# Restock Quantity Planner — M2 source candidate

This repository contains a bilingual static restock planner and reproducible Node 24+ build/test tools with no external runtime or development dependencies. README and the six original specification documents retain their historical M0 wording; this file records the current source-candidate status.

Inputs remain in page memory. The planner uses exact integer arithmetic, accepts 1–30 items, clears stale results on edits, and provides a complete readonly report. It has no clipboard, download, storage, account, forecast, incoming-order or price feature.

## Reproduce

Run these commands from this directory with an existing Node 24+ installation; no npm install is needed:

```text
npm test
npm run check
npm run build
npm run check:http
npm run build:production
npm run check:production
npm run release:check
```

M1 preview: `npm run dev` at 127.0.0.1:4217, exact /index.html and /en/index.html, noindex. Production model: `npm run preview:production` at 127.0.0.1:5217. Both are loopback only; occupied ports are preserved. The previous 94-test/M1-HTTP evidence is retained. R1 reran 7 affected configuration/production tests, 32 syntax checks and 97 production HTTP requests; unchanged M1 gates were not blindly repeated.

Production output is independent in dist-production/: 15 deployment files, 14 served asset routes, bilingual self-canonical/hreflang/x-default, visible FAQ matching FAQPage/WebApplication JSON-LD, two exact inert JSON-LD CSP hashes, merged/detached static headers, longest-prefix robots decisions, two-page sitemap and noindex 404. _headers is metadata and is not served. M1 public/dist bytes are unchanged; production JS/CSS are identical. Inventory files and wrangler.jsonc stay outside deployment assets. Both production pages select a local script-free favicon.svg, with img-src self and a robots allow rule. M1 public/runtime bytes stay unchanged.

## Acceptance scope

The original M1 HTTP/runtime has 49 scoped browser PASS cases. Full browser acceptance is not claimed. Three native-observation cases remain NOT_RUN: B14-zh-Hant (true BFCache was not established under the unchanged no-store response), B15-zh-Hant and B15-en (native hidden/pagehide observation transport did not establish that phase). Storage snapshots/capabilities and request terminal evidence passed their observed scope; absence of the phase is not reported as a product defect. Observation retries have stopped.

Eight manual items remain NOT_RUN: B11-native-zoom-zh-Hant, B11-native-zoom-en, B12-zh-Hant, B12-en, B13-zh-Hant, B13-en, B17-zh-Hant and B17-en. These mean native 200% zoom, real IME, assistive technology and a real low-end device in both languages. A desktop viewport, pure-state test or synthetic event does not replace them. Production browser/live acceptance has not been run.

This is public source/production preparation, not a live deployment. Planned URLs are https://restock.glossquote.com/index.html and https://restock.glossquote.com/en/index.html. Cloudflare hosting, homepage integration and final external acceptance are pending. No Worker runtime, telemetry or observability was added. The root wrangler.jsonc now pins the exact static-assets configuration, custom domain, compatibility date, disabled workers.dev/previews/metrics/logs/traces, and no runtime/build/bindings. Configuration is part of the fixed Git source; deployment remains outside this source-publication step.

Static header merge/removal rules follow [Cloudflare documentation](https://developers.cloudflare.com/workers/static-assets/headers/). The local model checks strict routes and security; live edge behavior must be verified by the release owner. See [acceptance specification](ACCEPTANCE.md) and [release contract](docs/RELEASE.md).
