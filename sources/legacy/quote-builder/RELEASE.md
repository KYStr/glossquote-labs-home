# Static release

The preview public/dist pages remain noindex. npm run build:release creates12 allowlisted site files in release-artifacts/site and a sibling schema-1 release-candidate manifest with8 public source hashes. npm run check:release independently rebuilds expected bytes; coordinated manifest/asset tampering, changed sources, unknown/missing files/directories and links are refused. Existing valid output is verified without rewriting. Do not delete or overwrite unknown output to force success.

The reviewed release manifest SHA-256 is093b67039932ddc0f5c82bd3bb5f4e6642d88dcfbdd1a2193878955c85b5f71e. Generated assets and manifests are excluded from Git and rebuilt locally.

wrangler.jsonc declares assets-only quote.glossquote.com, compatibility_date2026-10-24, no executable Worker, no workers.dev/preview URLs/metrics/logs/traces. Assets use explicit .html paths, HTML handling none and not-found handling none. _redirects is exactly65UTF-8bytes including finalLF:

```text
/ /index.html 301
/en /en/index.html 301
/en/ /en/index.html 301
```

Canonical URLs are https://quote.glossquote.com/index.html and https://quote.glossquote.com/en/index.html, with reciprocal zh-Hant/en/x-default (Chinese default). Home links preserve the matching language. These are prepared rules, not live HTTP proof. Source publication does not authorize an automatic deploy; native/device and external review remain as documented in VALIDATION.
