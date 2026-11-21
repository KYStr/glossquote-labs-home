# Markup & Margin Calculator — Verification

Candidate commit: the head commit of the production PR (full SHA in
the submission report)
Branch: `muse/markup-margin-calculator-production-20261109`
Base: `codex/initial-publication` at `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
Node: v24.22.1 (see commands below)
Spec: `spec-markup-margin-calculator-20261109`, PR #243, candidate
`1d5de750bf4371a81c1c8d8b57bf38fceea19d66`
Fixtures SHA-256:
`ee49cb9fcc1bfe988b9e11ef097e62ddf27e5001c025e45e1b87769e0274c15a`

## Commands run (all inside `tools/markup-margin-calculator/`)

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` | 0 | 65 tests, 65 passing (32 core fixtures + 3 controller fixtures + 30 hand-derived) |
| `npm run check` | 0 | pass |
| `npm run build:preview` (1st) | 0 | preview built, 9 files |
| `npm run build:preview` (2nd) + recursive diff of `dist-preview/` and `BUILD-MANIFEST.json` | 0 | byte-identical (DIST IDENTICAL, MANIFEST IDENTICAL) |
| `npm run check:generated:preview` | 0 | pass |
| Loopback serve probe (`node scripts/serve.mjs`, curl 127.0.0.1:4173) | 0 | 200 for `/`, `/en/`, stylesheet, app/controller/core/worker-source scripts, `/en/index.html`, `/robots.txt`; 404 for `/nonexistent`; 403 for traversal `..%2F..%2Fpackage.json` |

## Test counts

- Core fixtures: 32/32 from `test/fixtures.json`
- Controller fixtures: 3/3 from `test/fixtures.json`
- Additional hand-derived tests: 30/30 (core boundaries/validation/
  identities/formatting, controller state machine, report
  serialization) — total 65/65

## NOT_RUN

- Real-browser checks (Chrome / Edge, both languages, keyboard,
  320 px, 200% zoom, reduced motion, touch targets, Network /
  Storage zero-request audit, Blob download, Worker in a real
  browser, reflow): no isolated-browser mechanism is available to
  this builder. NOT_RUN.
- Real-device checks: NOT_RUN.
- Formal HTTPS / SEO gate (production canonical, hreflang, sitemap,
  robots.txt, security headers on the production origin): the
  production origin is not configured; NOT_RUN.
- Independent review of the nine SPEC §6 aspects: pending, next owner.

## Known limitations

- No draft persistence by design (SPEC forbids persistent storage);
  language switch or page leave discards the draft.
- The blob-URL module Worker under the pinned CSP is only settled by
  a real browser (see HANDOFF.md).
