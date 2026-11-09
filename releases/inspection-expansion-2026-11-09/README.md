# Inspection release: 97 tools

This release retains 67 prior inspection tools byte-for-byte and adds 30 fixed candidates. It is a public noindex inspection release, not full product acceptance. The 47 historical formal tools are unchanged except the separately verified file-bundler response security and homepage English locale repairs.

## Sources and rebuilding

manifest.json pins every repository, commit, source root, input and deployed file bytes/SHA-256. Nine candidates use repaired commit 5bd9c9b427c6e87f3d0b13609e672cf9b5c28ec3; the remaining 21 use their original fixed PR commits. Check out each source with its matching docs/specs context, use its package build:preview command, then provide prepare-release.mjs a manifest-verified input array. expand-release.mjs verifies the prior release at ../seo-deploy-2026-11-09, copies its 67 asset sets exactly, and rebuilds the bilingual directory. Adapt only local evidence-root paths when reproducing; never substitute source commits or silently rebuild old retained assets.

The expected deployment is one free Worker glossquote-inspection-tools, 98 exact host routes (97 tools plus review), no wildcard, no paid upgrade, and no changes to 040141.xyz. The sealed deployment contains prebuilt assets and static router only, with no build hook or package script run under the credential environment. Credentials are excluded; local deployments use the exact separately authorized loader.

## Primary checks

All 30 candidate check/test/build/generated gates passed after separating harness fixture/PATH errors from real source bugs. The primary independently reran 315 tests and 36 gates on the nine repaired tools; the independent reviewer separately checked all 248 repaired-source blobs, 75 output files and focused behavior tests. Common routing has seven offline tests including exact host isolation, no query/cookie/auth forwarding, GET/HEAD only, CSP framing denial, HSTS, and HTTP-to-HTTPS upgrade. Prior 67 runtime files retain exact bytes. Live verification is recorded separately after deployment; this preparation document does not claim it has happened.

## Pending scope

All 97 inspection products remain function-review pending. Full browser/network/storage/download/accessibility/real-device checks are not replaced by source, HTTP or mocked tests. The four older blocked candidates (word-frequency documentation/contract, local-only text-to-speech, bilingual fluid typography, SVG external-reference sanitization) and the two media resource/browser-gate blockers are not included. The user removed the requirement to wait for original authors: future repairs use a delegated Sol medium implementer and independent primary checks. Word-frequency is a contract/documentation mismatch; the earlier blanket description of a denominator algorithm defect was inaccurate.

## Formal-site audit fixes

File bundler now denies framing via CSP and X-Frame-Options on successful/error/redirect responses. The exact 39 audited HTTPS hosts have a host-specific one-year HSTS rule, without includeSubDomains/preload; 78 page bodies remain byte-identical and 39 missing-path HTTPS responses carry HSTS. The English homepage uses en_US Open Graph locale. HTTP requests to those old formal hosts did not automatically upgrade in an additional check; that separate pre-existing issue is not relabelled PASS. Missing social preview images and media canonical redirect optimization remain nonblocking follow-ups.
