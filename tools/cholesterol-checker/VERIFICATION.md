# Verification — Cholesterol Checker

Environment: Node v24.22.1 (Linux), zero dependencies, tool directory
`tools/cholesterol-checker/`. All commands run 2026-11-23 by the builder.
Production base `codex/initial-publication` @ `8c265267`; branch
`muse/cholesterol-checker-production-20261121`.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 64/64 tests |
| `npm run check` (`node scripts/check.mjs`) | PASS — all static checks |
| `npm run build:preview` (run twice, two temp dirs) | PASS — byte-identical; combined sorted-SHA-256 list hash `ed886cd2375e3ce2d31baddb7c84fa67b9316da4cb920e4212ff5e75431e91fa` for both runs |
| `npm run build:preview` (into `dist-preview/`) + `npm run check:generated:preview` | PASS — dist-preview matches a fresh build byte for byte (7 files) |
| Loopback HTTP probe of `dist-preview` via `scripts/serve.mjs` (port 4173) + curl | PASS — `GET /` 200 `text/html` with `<title>膽固醇分級｜Gloss Tools</title>`; `GET /en/` 200 with `<title>Cholesterol Checker \| Gloss Tools</title>`; `GET /styles/app.css` 200 `text/css`; missing file 404; CSP includes `worker-src blob:`; `X-Robots-Tag: noindex, nofollow` |

Preview per-file SHA-256 (both builds identical):

| File | SHA-256 |
| --- | --- |
| `en/index.html` | `937c95a028787bd1cf8bb3d7a8973cbacb33365dca189f69b563b10ec909ef98` |
| `index.html` | `4146a39a3210abf7daf4d7dc863c1561d7ef5cbdf8a68fa2fb51f940628f6aec` |
| `js/app.js` | `c826e08a6f6c422e33844d66da1c02b5db51e6529d1e5ea834efd01eba45447c` |
| `js/core/controller.mjs` | `84478e953b8866c5f0d8fc1c5b1035cd74f52da5ebe228cea11ae2e6b58e24d2` |
| `js/core/core.mjs` | `3fb7db04989acd6877b40b739dc38e4f3532451e8a3f29506e1bd742d293cec0` |
| `js/worker-handler.mjs` | `7f08cb311b62adb677b4cd9725666fee0e7430fa05da097c3670e69014b93773` |
| `styles/app.css` | `dbaf7c0328eef184738d51d2232ef15af2898938c827427e79b7460b2a4be8a0` |

## Test breakdown (64)

- Core fixtures: all 14 SPEC core cases deep-equal (bands, severities,
  nonHdl, overall rank/label, error codes/fields, first-error-wins).
- Core rules derived by hand from the SPEC: every NCEP ATP III cut point
  at −1 and at the cut point (11 cut points × 2, with overall-rank check);
  legal bounds 1 and 9999 in every field; nonHdl zero (total == hdl) and
  negative (total 1, hdl 9999 → −9998) shown as-is with no error; overall
  rank is the maximum item severity; grammar accept/reject set (`0` is
  RANGE, not grammar; `180.0`, `+180`, ` 180`, `0180`, `007`, `1e3`,
  `180mg`, full-width digits, trailing LF, `-180` invalid); capacity
  5 chars pass / 6 chars INPUT_LIMIT before grammar and before range;
  first-error-wins field order (total → ldl → hdl → triglycerides);
  EMPTY (not INTEGER_FORMAT) in every field; SCHEMA for wrong types /
  missing field / extra field / accessor property; lone-surrogate UNICODE
  and INPUT_LIMIT-before-UNICODE order.
- Controller fixtures: all 3 SPEC state cases (dirty→error invalidation,
  cancel + late-result rejection + reset, replace + older-late rejection),
  plus edit-during-busy termination and cancel/run-while-busy no-ops.
- Report: byte-exact serialization for the all-desirable and high-risk
  results (sorted keys, trailing LF, no BOM), SHA-256 of the bytes matches
  the hash of the literal expected text, recursive key sorting with array
  order preserved.
- Pages: both languages' lang/title/H1/description, noindex, no canonical
  or hreflang in the candidate, no external assets, same-language
  `../../` home links, pinned disclaimer verbatim twice per page, full
  control set and status semantics, four SPEC FAQ answers in both
  languages.
- Build: two builds byte-identical (sorted SHA-256 lists equal); Worker
  token replaced; the embedded Worker source driven end to end through a
  `self` shim returns the fixture-exact outcome for the default draft.
- Serve: real HTTP on an ephemeral loopback port — both pages 200 with
  titles, JS MIME, CSP includes `worker-src blob:`, `X-Robots-Tag`
  noindex, HEAD empty body, 404, `..%2f` traversal rejected with 404.
- Built app (DOM + fake Worker): default draft renders the all-desirable
  result with per-item lines, non-HDL line and the HDL protective note
  shown; note hidden when HDL is 45 (band normal); validation failure
  associates the field and focuses it once; Worker onerror / construct /
  post failures settle to WORKER_ERROR and the app can run again; Reset /
  Cancel / edit ignore late results and errors (Reset focuses the first
  field per SPEC userFlow); an old Worker cannot disturb a newer job;
  queued construct/post failures after Reset are ignored; the zh page
  renders the same completed result.

## Spec errata candidates

1. SPEC inputsOutputs §3 wording: "nonHdl = total − hdl（整數減法，無捨入，
   結果必為正整數，因 total ≥ 1 且 hdl ≤ 9999 時 total − hdl 可能 ≤ 0——
   若結果 ≤ 0，仍如實顯示該整數，不另報錯；分級表不對 nonHdl 分級）".
   "結果必為正整數" contradicts "可能 ≤ 0" in the same sentence. The
   operative rule is unambiguous (show the integer as-is when ≤ 0, no
   error), and the build implements exactly that (core test:
   total 1 / hdl 9999 → nonHdl −9998, ok). Wording-only; no behaviour
   change needed. Suggested fix: delete "結果必為正整數，因 … 時".
2. No fixture-versus-rule conflict was found: every fixture expectation
   follows from the SPEC's stated rules, and the AUTHOR-CHECK hand
   derivation matches the fixtures case by case (re-checked during the
   build; the 14 core fixtures pass deep-equal).

## NOT_RUN (still open for the independent reviewer)

- Real-browser evidence (isolated Chrome and Edge, both languages):
  example load, typing, error focus, edit-after-success, cancel, reset,
  real Blob download byte check.
- Accessibility in a real browser: keyboard order, visible focus, 200%
  zoom, 320 CSS px reflow, reduced motion, contrast measurement, touch
  target measurement.
- Network/Storage observation in a clean browser profile (zero work
  requests, storage/URL/console inspection) and offline-after-load use.
- Real-device / mobile checks.
- Production HTTPS/SEO gate: self-canonical pair, reciprocal hreflang,
  sitemap, robots.txt and the planned origin
  https://cholesterol-checker.glossquote.com (not yet configured).
