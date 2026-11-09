# M2B source publication scope — 2026-10-27

This independent repository contains only Bookmark Export Organizer. Runtime, deployment configuration, release generator and all tests are byte-equal to reviewed M2A source. README.md provides current usage/status; .gitignore additionally excludes the scratch directory created by release tests. The original README is preserved separately.

The exact synthetic M1 manifest at evidence/m1/CANDIDATE-MANIFEST.json is intentionally included: release tests verify its SHA-256 and use its public-file inventory as an independent source pin. All test fixtures/helpers are included. Small synthetic import/export samples are included under evidence/m1/outputs/.

review/release-manifest.json pins the expected build output. Build the release and compare the generated manifest SHA-256 to 587ea75bc8ef605a31e538d18d4adc78165775a88caa2d99a5ea64c18ab0c9b6. The generated site has 21 files and 72,340 bytes; its sibling manifest is 5,863 bytes.

The public subset excludes local environment/Git fingerprints, authentication, scratch copies, installed packages, browser/process artifacts, complete historical evidence archives and unrelated projects. Historical freeze.mjs, release-evidence.mjs and m2a-evidence.mjs remain as source history; they require the corresponding complete local evidence and are not checks for this curated public subset. Use the package test/check/build/build:release/check:release commands for this repository.

Source publication is separate from hosting. Hosting, actual HTTP redirects/headers/MIME/404 behavior, homepage integration and external acceptance are pending. Browser and manual NOT_RUN limits remain in review/acceptance-summary.json.
