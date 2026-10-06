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

The current catalog is prepared for the initial three-site launch. Live hosting and source-publication status are recorded in HANDOFF; generated production files alone do not prove deployment. No software license has been selected; public source access is not a license grant.

The production build includes canonical and language links, `robots.txt`, a sitemap, explicit root redirects, and static security headers. It has no client-side JavaScript, telemetry, external assets, storage, or server-side calculator logic.
