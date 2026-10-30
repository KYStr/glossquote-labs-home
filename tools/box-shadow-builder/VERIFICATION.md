# Author verification and independent handoff

Historical r2 runtime manifest: `55b6571c528e5d849ab4f2d8ab793a279b6056f47510ac57b612e79cbc110b02`. Candidate is source-only, not merged/deployed/accepted.

At 2026-10-30 07:56 UTC, Node built-in test command exited 0: 15 test groups pass, zero fail/skip/cancel. `node scripts/check.mjs` and `node scripts/build.mjs` exited 0. See evidence/tests.tap, check.txt, build.txt. Groups contain multiple bounded fixtures, not 15 quality points. Core expected CSS is handwritten from the pinned spec. Controller tests use substitute clock/URL/clipboard/failures and are explicitly not native browser evidence. T06 uses independently composed maximum legal CSS and UTF-8 bytes; unreachable E_OUTPUT_LIMIT is not made reachable by changing the contract. Initial static check falsely matched `content=` as an inline event due to an unanchored `on` regex; corrected the test to require attribute whitespace. This was a test-harness false positive, not a product defect.

| Original required quality dimension | Independent score | Present author evidence / remaining requirement |
|---|---|---|
| functionality | null | bounded core and finite native journeys; independent full required UI/geometry journey pending |
| boundaries | null | numeric neighbors/schema/raw/first-error and controller timing; independent complete matrix pending |
| privacy | null | no persistence/network source intent; actual native network/storage/lifecycle audit pending |
| security | null | closed CSS/schema/CSP source checks; actual policy/sink-negative effects audit pending |
| usability | null | author visible flow only; nonauthor use and difficulty observation pending |
| accessibility | null | finite keyboard/focus/dialog cases; full keyboard/reader/zoom/320px/forced-colors pending |
| localization-seo | null | two dictionaries/pages and finite transitions; exhaustive states and formal origin integration pending |
| toolchain-provenance | null | explicit source/build/manifest and pinned provenance; nonauthor clean extension/recovery verification pending |
| compatibility | null | managed Chrome finite native CSS/download; permission/clipboard receiver/BFCache/complete environment checks pending |

Independent reviewer must pin the published commit and compare the runtime manifest before testing. Do not count spec completeness, static strings, mock clock passes or author observations as a numerical quality score. Changes require a new fixed candidate and affected recheck. Original nine dimensions remain required; incomplete dimensions stay null.

07:59 UTC clean-copy verification (only public/tests/scripts, initially no dist) repeated all 15 test groups/check/build with exit0; resulting runtime manifest compared byte-for-byte equal to r2. See evidence/clean-tests.tap. This is author clean-source reproducibility, not nonauthor acceptance.

## r3 affected copy-deadline correction

Final r3 runtime manifest: `c3a51ecc1dca9dbdfaf1b0fbacd390e4dfc441fbf2a5c7ab52c72acadd3d0bbf`. Only runtime controller.mjs changed. A nonauthor controlled-clock regression against public r2 found promise completion after 3000ms could report success when the timer had not yet run (2999 positive control passed, 3001 failed). r3 captures the original deadline at acceptance, checks it again at completion and consumes the completion token. Author 2999/3000/3001 cases pass; full 18 groups, check and build pass. This is controlled logic evidence, not native clipboard deadline or cancellation evidence. Historical r1/r2 browser observations stay attributed to those versions and are not a fresh r3 native PASS. Nine independent scores remain null.

## Isolated r4 guidance layout revision

This revision responds to the independent r3 usability report's concrete friction: long geometry prose repeated at every layer. The full unchanged bilingual explanation now appears once visibly before the layer form. Each mode retains a short outer/inset hint, its label and options, and aria-describedby references both the local hint and shared geometry-help. Mode first-error descriptions keep the shared reference plus error. Only app.mjs and the two HTML files change among seven runtime files; core/controller/i18n/styles remain exact. No scalar range, serializer/output, control ordering or focus behavior is intentionally changed. Original r3 usability92 is historical and is not assigned to this new candidate.

Runtime manifest SHA256 f179a6962c18b0ddea941de8a639d39897164f3c55b843782d6137e6771f34de. Syntax/translation/comment check and build passed. New shared-guidance source-contract case checks one visible shared paragraph and normal/error references; it is static author evidence, not browser or screen-reader verification. Existing copy-deadline tests were not rerun because controller is unchanged. Native affected observation and independent review remain pending for this isolated draft. No deployment or quality acceptance.

Author native affected observation 2026-10-30 13:05:54–13:06:35 UTC: normal Chinese page showed the unchanged complete geometry paragraph once above the form, and one short outer/inset hint per mode. Three normal Add clicks produced four layers, each new layer focused its HEX field and the fourth disabled Add. Read-only actual DOM inspection found exactly one explanation and four mode aria-describedby lists, each resolving its local hint plus geometry-help. Normal Generate with blank colors focused the first HEX field and displayed the existing specific correction message. Normal language link opened the confirmation dialog with Cancel focus; Confirm reached English initial state showing the complete English explanation once and concise local mode hint. These finite observations do not certify full keyboard, screen-reader, layout-size improvement or all quality aspects. No Copy/download or old controller tests were repeated. Preview stopped after observation; r3 evidence/score remains tied to r3.
