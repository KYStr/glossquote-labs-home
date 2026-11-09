# 重複檔案找出來 / Find duplicate files

選取本機檔案，比對大小與 SHA-256 候選，再逐 byte 驗證完全相同的內容。每組可選要保留的副本，下載 JSON/TXT 清單；工具不刪除、搬移或改寫來源。

Compare selected local files by size and SHA-256, then verify matches byte for byte. Choose one keeper per duplicate group and download JSON/TXT reports. Files are processed in the current tab without uploads or persistent storage.

- Limits: 200 files, 32 MiB per file, 128 MiB total. Empty files are valid.
- Source indexes distinguish repeated names. Matching names alone never count as duplicates.
- Cancel or source changes invalidate old results; reset clears the selection.
- Reports include file names, sizes and hashes. Store downloaded reports with care.

## Run from a clean clone

Requires Node.js 24. There are no runtime/dev dependencies and no npm install step. All test/helpers and any nested test fixtures are included; tests create synthetic data locally.

```text
npm test
npm run check
npm run build
npm run build:release
npm run check:release
node scripts/check-publish-config.mjs
```

The tests work before dist exists. Release tests prepare isolated preview fixtures from fixed public bytes. No user data, browser automation, network or server is needed by these commands.

For optional local use, npm run dev serves only 127.0.0.1:4228 and never opens a browser. Chinese entry: /index.html; English entry: /en/index.html. Changing language loses unsaved analysis.

## Outputs and review scope

public/ and generated dist/ retain preview noindex and candidate notices. build:release writes release-artifacts/site/ plus its sibling manifest; the formal HTML only removes the reviewed candidate banners and adds fixed SEO. The fixed _redirects maps /, /en and /en/ to the canonical index.html routes. The generated folders are ignored by Git.

The fixed [release manifest](publication/release-manifest.json) has SHA-256 a8577a7b29d5b23968bbdf95790231167f523f7d89109122a9d1450529f3d7e1. [Validation](publication/validation.json) records actual clean-source CLI results. Source publication and hosting are separate: this repository does not claim a deployed site or successful external review. Planned origin: https://duplicates.glossquote.com.

Root's isolated browser review approved 24 product cases; 14 NOT_RUN items remain, including true 200% zoom, native dialogs, real devices/AT and runtime-injection-only measurements. This publication does not turn those into PASS and adds no browser execution.

[PRODUCT](PRODUCT.md), [TECHNICAL](TECHNICAL.md), [UX-SEO](UX-SEO.md), [ACCEPTANCE](ACCEPTANCE.md) and [TASKS](TASKS.md) preserve the approved historical contracts. Their initial NOT_RUN/spec-only wording is historical; this README and [HANDOFF](HANDOFF.md) state the publication scope. Deployment and homepage integration remain with the primary reviewer.
