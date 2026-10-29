# W18-31-M1 browser acceptance — 2026-10-18

Environment: Codex in-app browser (IAB), dedicated tab, real HTTP build at `http://127.0.0.1:4211/index.html` and `/en/index.html`. Engine/backend version not independently exposed. Browser automation used its own tab only. After the user's test restriction arrived, this tab was hidden and all remaining actions used DOM controls. No desktop/native app/OS input, existing-tab edits or clipboard reads/writes were used.

Evidence root: `.runs/print-size/w18-31-m1-20261018-01a14c6b/` in the parent workspace. `browser-observations.json` contains synthetic fixture values and observed DOM output. Final screenshots are `ui-final-zh-desktop.png` and `ui-final-en-320.png`. Earlier screenshots preserve the actual earlier header; the only subsequent product change was showing the tool name in that header. Core/app/CSS bytes stayed unchanged. The final two language main flows and final English 320px layout were then reconfirmed on the rebuilt, restarted preview.

| Case | Status and actual evidence |
|---|---|
| B01 | PASS: both real initial pages have three blank fields, target `300`, no result, then enabled controls. Initial disabled HTML and unnamed inputs additionally checked offline. |
| B02 | PASS for initial static disabled/no-script surface and offline VM initialization failure/cancel-first submit tests. Real JS-disabled browser and browser initialization fault injection: **NOT_RUN**; current browser tools expose no such control. VM evidence is not a real JS-disabled browser test. |
| B03 | PASS: both blank Calculate actions show only the first pixel-width error, focus it and keep the fixed URL. |
| B04 | PASS: both languages produce `254.00 × 169.33 mm`, `300.00` PPI, `3000 × 2000 px`, selected target met. Final rebuilt candidate reconfirmed. |
| B05 | PASS: real browser changes to each of the four fields remove all old results and target text. Offline event tests additionally verify this happens before the input callback returns. |
| B06 | PASS: both languages, C09 displays `300.00`, below target, `100001 × 100001 px`. |
| B07 | PASS: both languages, C10 displays `300.00`, meets target, `100000 × 100000 px`. |
| B08 | PASS: both languages reject `0.001`, `10000.01`, `254,0`, leading and trailing spaces, focus the width field and produce no result. |
| B09 | PASS: both language Clear/Cancel dialogs preserve values, result and target status. |
| B10 | PASS: both languages confirmed Clear returns three empty values and target `300`, with no result. |
| B11 | PASS: both main flows and both language-switch Cancel/Confirm directions; cancel preserves work, confirmation reaches the fixed other-language path with default blank values. Matching-language home URLs checked in DOM. |
| B12 | PASS: both languages complete the main flow with page keyboard controls at a configured 320 CSS px viewport; `scrollWidth` equals `clientWidth` (305px excluding the vertical scrollbar), long English and large results reflow. Final header verified at 320px. Native **200% browser zoom NOT_RUN**: an early IAB browser shortcut did not change rendered dimensions, and available capabilities expose viewport size only. A smaller viewport was not reported as zoom. |
| B13 | PASS for the real desktop browser helper: `2545`, caret 3 → `254.5`, caret 4, focus returned to width. Physical mobile decimal keyboard/virtual-keyboard occlusion: **NOT_RUN**, no physical device access. |
| B14 | **NOT_RUN** for actual loaded-page offline mode and cold offline launch; browser tools expose no network/offline toggle. Synchronous no-network calculation is covered by offline unit/static tests only. UI makes no cold-offline promise. |
| B15 | **NOT_RUN** for complete browser Network/Storage/cache/cookie monitoring; these browser capabilities are unavailable. Source privacy gate PASS, unnamed input/URL checks PASS, sampled tab console logs `[]`. Loopback HTTP probes are separate evidence, not complete network observation. |
| B16 | PASS: both DOM pages have `noindex,nofollow`, no canonical or index JSON-LD; actual final HTTP assets match manifest and have noindex/no-store/CSP headers; robots disallows preview, sitemap is 404. |
| B17 | PASS for actual navigation away from a calculated page and Back returning blank/default without a result. Persisted BFCache-specific browser event: **NOT_RUN**, its occurrence cannot be established by available read-only browser tools. Offline pagehide/persisted-pageshow branch tests PASS. |
| B18 | PASS for real page keyboard workflow, first-error focus, labels/described-by relationships, text+symbol statuses and measured 44px+ visible controls. Actual screen reader speech/order: **NOT_RUN**, no screen reader capability and desktop control forbidden. Static contrast pairs pass minimum ratios. |
| B19 | PASS: both language reloads discard modified inputs. No names, hidden submission fields or query input; clear and language confirmations do not persist values. |
| B20 | PASS: both languages at 320px handle `1 × 100000`, `10000 mm`, `2400 PPI`; `1000000000.00` height, `0.00` PPI, `944882 × 94488188977 px`, below target, ordinary decimal output and no page overflow. |
| B21 | PASS for visible limitation copy in both languages. Actual paper/photograph/print quality: **NOT_RUN / outside MVP**; arithmetic never guarantees quality. |
| B22 | PASS: both default blank pages Clear and language-switch directly, without a confirmation dialog. Offline tests also confirm raw `0300` is changed work and requires confirmation. |

No native print, OS file picker/save dialog, download, image upload or clipboard workflow was attempted. They are **NOT_RUN / outside MVP**. No mock, static scan or DOM observation is represented as a physical device, screen reader, native browser zoom, full Network/Storage or confirmed BFCache run.

M1 is a fixed local candidate awaiting primary review and M2 GO. This checklist does not grant publication, production SEO, deployment, homepage integration or external acceptance.
