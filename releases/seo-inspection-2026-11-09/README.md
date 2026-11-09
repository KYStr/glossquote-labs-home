# Public SEO inspection release

User authorized deployment of existing runnable candidates on 2026-11-09 to inspect SEO. This batch contains 67 tools plus https://review.glossquote.com/index.html and its /en/index.html directory. This source candidate records preparation; actual deployment is recorded separately in LIVE-RESULTS.md after HTTPS verification.

All new candidates remain **noindex, follow** with visible inspection notices. Canonical, reciprocal hreflang including x-default, robots and sitemap are built against real hosts. A sitemap does not override noindex. No new product has been marked accepted or externally passed by this maintenance release. Existing 47 live tools are preserved.

## Source and reproducibility

manifest.json pins each original public repository/commit/path, exact input file bytes/SHA256, generated files, and the whole deployment file manifest. Existing immutable sources/archives are untouched. Build the fixed source using its recorded original builder (old audit receipt details exceptions), put each output in a separate directory, then provide prepare-release.mjs an array with slug, repository, commit, sourceRoot, pullRequest, host, outputPath and expectedFiles(path/bytes/sha256). It refuses drift, duplicate slugs/hosts, reserved review namespace and unsafe file paths. It creates a fresh release/ directory only. Run node --test worker.test.mjs and the deployment dry-run.

The common static Worker maps exact approved hosts to isolated asset prefixes. It allows GET/HEAD only, rejects unknown assets and strips query/cookie/authorization from internal asset requests. It never reads input bodies and has no database, analytics, remote fonts, logs or outbound fetch. New exact Worker routes and proxied originless AAAA records avoid the 100 Workers and 100 custom-domain limits; no wildcard route or existing host is changed. Routing uses the account's free Worker request allowance; no paid plan is enabled.

Use the existing reviewed local credential loader for deployments. No credential or local account configuration is included here. Preserve Git settings and Windows persistent environment fingerprints. Do not run local interactive browser tests on the user's desktop.

## Known exclusions

Video-to-audio and transcription lack required packaged execution resources; word frequency has a confirmed denominator defect; text-to-speech may select remote voices despite local-only copy; fluid typography lacks a separate static English page. SVG to PNG also remains excluded because its sanitizer preserves three demonstrated external-reference forms. These six tools are not deployed as working tools. CSS Grid uses a byte-verified standalone packaging adapter because the author's Windows pathname handling fails; original build/check is not relabelled PASS.

## Acceptance scope

Static packaging, routing and actual HTTP/SEO checks are maintenance evidence. Product calculations, full browser/network/storage/download/accessibility/device checks retain their original pending or NOT_RUN status. Source publication, deployment, indexing and product acceptance are distinct.
