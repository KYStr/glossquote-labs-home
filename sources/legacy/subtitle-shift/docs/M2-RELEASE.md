# M2 production candidate

This is the static production candidate for `https://subtitles.glossquote.com`. Source publication and hosting are separate: M2 does not deploy or update the family homepage. The primary must independently review the fixed source and authorize the M3 release.

## Reproduce locally

Use Node.js 24 and the existing npm command; no install or external runtime/dev dependency is needed.

```text
npm test
npm run check
npm run build
npm run build:production
npm run check:production
npm run release:check
npm run preview:production -- --smoke
```

`npm run dev` serves the noindex preview at `127.0.0.1:4216`. `npm run preview:production` serves only the production candidate at `127.0.0.1:5216`. The `--smoke` variant verifies HTTP and closes its own server; a busy port fails without terminating another process. No browser is launched.

## Fixed assets and transformation

[m1-public.json](../config/m1-public.json) pins the 13 M1 public files. Every production build verifies both that record and the independent constant fingerprint. App/core/Worker/CSS bytes remain unchanged.

Only the two language HTML heads receive canonical/hreflang/x-default, indexable robots metadata and WebApplication/FAQPage JSON-LD derived from the five visible FAQ answers. The only authorized body change is the exact footer environment label: Chinese preview label to `Gloss Tools by GlossQuote · 字幕時間平移`, English preview label to `Gloss Tools by GlossQuote · Subtitle Time Shift`. No interaction or other body byte changes are permitted. [release-manifest.json](../release-manifest.json) records both before/after body hashes, the exact replacements, JSON-LD hashes and all 15 deployment files. The manifest is outside `dist-production/`.

The single global CSP includes only self and the two exact reviewed JSON-LD content hashes for scripts; worker-src is self and connect-src is none. The global noindex response header is detached only for the two indexable language pages. Unknown/404 paths retain noindex, and 404 HTML is unchanged. Header matching/merging is explicitly tested under the documented [Cloudflare header rules](https://developers.cloudflare.com/workers/static-assets/headers/).

The sitemap contains exactly the two canonical language URLs. Robots uses longest-match Allow rules for those pages, aliases and necessary static assets against a default Disallow. `_redirects` explicitly maps `/`, `/en` and `/en/` to same-origin index routes with 302; custom redirects run before custom headers, as documented by [Cloudflare redirects](https://developers.cloudflare.com/workers/static-assets/redirects/). These are local model checks; live edge behavior remains an M3 verification.

## Configuration and dry-run

[wrangler.jsonc](../wrangler.jsonc) is exact static-assets-only configuration: `glossquote-subtitle-shift`, compatibility date 2026-10-19, one `subtitles.glossquote.com` custom domain, `./dist-production`, html_handling none, 404-page and run_worker_first false. workers.dev, preview URLs, metrics, logs, invocation logs and traces are disabled. No main Worker, build hook, binding, account ID or secret is present.

The publishing workflow uses only the already available official Wrangler 4.147.0 after a complete runtime-manifest verification, with isolated process home/config/temp and no Cloudflare credentials. `deploy --dry-run --autoconfig=false --install-skills=false` checks packaging only, and does not establish a deployed service. No CLI installation or new credential permission is authorized.

## Source snapshot and remaining checks

The source allowlist includes executable public/scripts/test/package/config and documentation. Generated dist directories, `.git`, `.runs`, node_modules, tool caches, credentials and private workspace evidence are not source archive content. Portable publication status documents are separately identified from the workspace's full historical handoff; the archive file manifest describes the exact committed snapshot, not subsequently updated workspace receipts.

The source ZIP is made directly from a verified Git commit and checked entry-by-entry against Git blobs, sizes and SHA-256. Final repository visibility, branch/commit, archive bytes/hash and source manifest are recorded in the publication receipt outside the source archive to avoid self-referential commit/archive hashes.

The [primary M1 acceptance summary](M1-ACCEPTANCE-SUMMARY.md) preserves all PARTIAL/manual exclusions, including native large paste. This M2 task does not execute browser/UI automation. M3 deployment, live verification and external-review completion remain pending.
