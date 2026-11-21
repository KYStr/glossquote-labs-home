# Savings Goal Calculator — Verification

Candidate: `tools/savings-goal-calculator/` on branch
`muse/savings-goal-calculator-production-20261109`, base
`c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
(`codex/initial-publication`).

Spec source: `spec-savings-goal-calculator-20261109`, PR #245,
candidate commit `9828c5d10ff75720333491cfc21f190b7cd7ed16`,
fixtures SHA-256
`b4115210a148532133b2ec728ed87772b59ca3af98a76adc28cccaa014405979`.

Environment: Node v24.22.1, no dependencies installed (zero runtime
dependencies; `npm test` uses the Node built-in test runner only).

## Commands run (all inside `tools/savings-goal-calculator/`)

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` | 0 | 62/62 tests pass (18 literal core fixtures, 10 independently recomputed boundary cases, validation/schema/order cases, property checks, 3 controller fixtures + 10 controller cases, 5 report cases) |
| `npm run check` | 0 | Pass: files, package contract, core fields/limits/defaults/bounds/status/sentences/disclosure/example, fixtures hash and counts, pinned strings, pages, syntax, worker concatenation, capability scan, core purity |
| `npm run build:preview` (run 1) | 0 | Preview build written to `dist-preview/` with `BUILD-MANIFEST.json` |
| `npm run build:preview` (run 2) | 0 | Byte-identical to run 1: recursive diff of `dist-preview/` clean, `BUILD-MANIFEST.json` identical |
| `npm run check:generated:preview` | 0 | Generated preview verified: files, hashes exact, bilingual metadata present, worker source matches fixed bytes |
| Loopback probe (`node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` + curl) | 0 | 200 for `/`, `/en/`, `/styles/savings-goal.css`, `/js/app.js`, `/js/controller.mjs`, `/js/core/savings-goal.mjs`, `/js/worker-source.js`, `/en/index.html`; 404 for a missing path; traversal attempt rejected |

Independent re-derivation (not a shipped command): a Python
`Fraction` implementation written directly from the SPEC rules
recomputed all 14 success fixtures — 14/14 match — and produced the
expected values for the 10 extra boundary cases in the core tests.

## NOT_RUN

- Real-browser checks (Chrome / Edge, both languages, keyboard,
  320 px, 200% zoom, reduced motion, touch targets, Network/Storage
  observation, Blob download, Worker under the pinned CSP):
  NOT_RUN — no isolated-browser mechanism is available to this
  builder. Node/DOM-substitute checks must not be presented as
  browser evidence.
- Real-device checks: NOT_RUN.
- Formal HTTPS / SEO checks (production canonical, hreflang,
  sitemap, robots.txt, security headers on the planned origin):
  NOT_RUN — the planned origin `https://savings-goal.glossquote.com`
  is not configured; the preview carries noindex and no canonical
  by design.
- Independent nine-aspect review of this candidate: NOT_RUN —
  belongs to the independent reviewer.

## Known limitations

- The blob-URL module Worker under the pinned CSP (`worker-src
  blob:`) is only exercised by construction (the generated worker
  source is byte-checked against the fixed core + handler); a real
  browser is the only place the interaction can be settled.
- The mode-B correction loop cap (1300 iterations, SPEC) returns
  INTERNAL if ever exceeded; it never fired in any test.
