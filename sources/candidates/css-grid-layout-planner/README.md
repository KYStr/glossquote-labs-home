# CSS Grid Layout Planner

Self-contained preview candidate, not deployed or independently accepted. Two language entries: `dist/index.html` and `dist/en/index.html`. No npm install or external dependency.

## Build and run

Use Node 24, a fresh copy of the source directory, and these commands:

```
node --test tests/*.test.mjs
node scripts/check.mjs
node scripts/build.mjs --mode preview
node scripts/serve.mjs --dir dist --port 4180
```

The last command is a loopback-only optional local preview, not a deployment. Do not run it beside a managed preview daemon. Managed QA uses the environment's existing official Sites preview with a checkout-local `.openai/hosting.json` pointing at `dist`; that file is deliberately not part of this public source. No Site ID is needed for local-only QA. Build rejects an existing `dist`; use a separate fresh source copy rather than deleting a retained candidate. `dist/MANIFEST.json` records the exact seven runtime files.

## Normal use

Choose 1–6 columns/rows, 24–160 px row height and 0–32 px gap. Each of 1–12 blocks has explicit start and end grid lines. End lines must exceed start lines. Rectangles may touch but not overlap. Press Generate; nothing generates on load or after editing. Load example A fills three blocks, then Generate shows one spanning top row and two bottom rectangles. Source move changes exported numbering, not coordinates. Add always starts at lines 1/1/2/2; it does not search for an empty cell.

CSS is fixed-class, no-BOM UTF-8 with LF and Chinese comments in both languages. Copy only calls writeText; a success message is an API acknowledgement, not proof of paste. The five-second deadline cannot be extended by late callbacks. Download is always `grid.css`, one 30-second URL lease. Edits, clear and regeneration preserve the old lease but invalidate the displayed result. Hidden/pagehide purges it early and resets raw values. OS downloads/copies may already complete; no secure erasure or recall is promised.

The illustration is safe text, not HTML export. The 600 CSS px preview is a real CSS Grid; decorative colors and width are not exported. External host CSS can affect appearance. No free-form CSS, data import, persistent storage, clipboard reading, accounts, telemetry or network API is implemented.

## Files and state

- `public/core.mjs`: strict shape/value order, half-open overlap, deterministic bounded CSS.
- `public/controller.mjs`: immutable snapshot, generation and copy tokens, original copy deadline, independent download lease, modal and lifecycle authority.
- `public/app.mjs`: normal DOM listeners, stable block IDs, transactional fixed-rule CSSOM, focus and real lifecycle reset.
- `public/i18n.mjs`, HTML and CSS: complete dictionary, labels, messages, static preview noindex and CSP.
- `tests/core.test.mjs`, `example-a.css`: independent literal/area/boundary oracles.
- `tests/controller.test.mjs`: explicitly injected timer/URL/clipboard contract tests; not browser evidence.
- `scripts/check.mjs`, `build.mjs`, `serve.mjs`: limited checks, explicit runtime allowlist, loopback server and fixed MIME/header rules.

Lifecycle: initial → explicit generate → ready; input/composition/structure edit → no result; error → no result and first error focus; modal keeps result but invalidates pending copy; confirmed clear → initial, old download lease retained; hidden/pagehide → reset raw/result/modal and purge lease; visible/pageshow does not regenerate. `dispose()` also removes registered global listeners. DOM row listeners disappear with removed rows.

## 可見 FAQ 擴充與精確回復指南 / Visible FAQ extension and restoration

1. Record the SHA256 of `public/i18n.mjs` and all existing runtime files; preserve a byte-exact copy outside the new build.
2. In a separate candidate copy change only both `faqBody` language strings, adding a visible sentence such as “Test FAQ extension / 測試 FAQ 擴充”. Keep every other key and the core unchanged.
3. Run test/check/build in that fresh copy. In the actual supported browser open each language normally and inspect the visible FAQ text. Save observed timestamp, exact candidate hash and screenshot/AX evidence. Source inspection or CPU tests alone do not prove the visible change.
4. Restore the byte-exact original dictionary. Use another fresh build directory, verify the dictionary SHA256 equals the original and compare the full runtime manifest. Open the restored page normally and verify the sentence is gone in both languages.
5. This author candidate has not claimed that independent extension/restoration experiment is done; the non-author performs it and records their own evidence.

## Status and limitations

See `VERIFICATION.md`. Author checks and limited desktop browser observations are not independent product scores. All nine fixed acceptance aspects remain unscored/null. No formal public origin, deployment, SEO acceptance, mobile/other-engine guarantee, native BFCache verification, screen-reader or comprehensive security/privacy certification is claimed.
