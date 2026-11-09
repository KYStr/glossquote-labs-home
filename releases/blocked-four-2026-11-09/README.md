# Four repaired public inspection tools

Adds word-frequency, text-to-speech-reader, fluid-typography and svg-to-png-converter from fixed shared source commit 541a0cd73fd24fc3536501793d551bfa81f63524. The source baseline was preserved before repair in c57af9dd3d974ccdc18f36f1459ab251c1c74358. Original author history/specs are retained, with additive errata under docs/repairs/blocked-four-2026-11-09.

## Rebuild and release

Check out fixed tools/<slug> with matching docs/specs context, Node24. Run package test/check/build (SVG build:preview/check:generated:preview). The manifest pins each input and final overlay asset. Supply these exact outputs to prepare-release.mjs. expand-release.mjs verifies and preserves the prior 97 fixed asset sets at ../publish-remaining-2026-11-09 and adds the four tools and rebuilt bilingual directory. Local paths may be adapted; source commits and bytes may not. No credentials or dependencies are included.

Expected one free existing Worker glossquote-inspection-tools, 102 exact routes (101 tools+directory). No wildcard or unrelated domain. Token isolation accepts only prebuilt assets/router and rejects build hooks. New notices use two language-specific asides, CSS-selected by root lang, to follow Fluid history transitions without resetting user work. Previous 97 sites retain exact bytes.

## Verification scope

Primary executed 98 package tests, 13 package gates, 48 independent offline regression cases, seven router tests and eight actual release markup checks. Independent review identified a wrong count-fold test label and stale notice navigation after Fluid language switching; both corrected before freeze. Live receipts and independently reviewed package evidence are recorded after deployment, not claimed by this preparation. Full product acceptance, complete network/storage, actual device speech, native downloads and cross-browser checks remain pending. These are noindex inspection deployments, not accepted/indexable products. Two media tools remain blocked. Forty further cloud production PRs were found outside registry production submissions; they are source-only/unreviewed, not deployed and not accepted by this release.
