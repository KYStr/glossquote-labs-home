# Transform / Origin — source candidate r2

A buildless, dependency-free, bilingual CSS 2D transform explorer. This candidate implements fixed SPEC `9dad1e10e9158df9d405460b0370cbc45e6679d6`, not a new scope or quality rubric.

## Local author workflow
Node.js >=24. No install is required.

```
npm test
npm run check
npm run build
```

`dist/` is a noindex preview. The official `sites-preview start <checkout>` serves it. `.openai/hosting.json` intentionally has no hosted project identity.

`src/core.mjs` is the shared limits, complete-string validation, matrix math and exact serializer. `src/app.mjs` owns ephemeral raw input, bilingual descriptions, SVG illustration and result views. All DOM insertion uses safe element/text APIs. No user-provided HTML/CSS selector or external assets. CSP blocks connections. Copy runs only from the explicit A/B button; failed copy retains selectable text and does not retry. The author has not exercised clipboard against the real browser.

## State / accessibility
Seven text fields preserve raw strings through blur and language changes. Every invalid field references its error and clears all results. The only aggregate live update is debounced; per-keystroke visual errors do not independently announce. Tables and CSS have labelled horizontal-scroll regions. B may be hidden without losing its selected order. Reset/example restore the defined initial values and orders without changing language. Values do not survive a page reload by design.

## Author tests are not independent acceptance
`tests/expected.json` is copied verbatim semantically from fixed SPEC Appendix A, not generated from this implementation. Unit tests compare 14 cases / 56 vertices at 1e-6 and exact default CSS. Structural source checks are limited checks, not proof of runtime privacy or AT interoperability.

Optional author-only actual CSS fixture:

```
node scripts/browser-fixture.mjs
```

This adds `dist/self-check/geometry.html` and CSS for native browser inspection. It is not product UI or an independent reviewer oracle. Four zero-size corner marker rectangles are measured relative to an untransformed marker. Browser layout precision differs from the mathematical unit-test tolerance, especially far down the long fixture page; keep those measurements and their residuals separate. Singular geometry measurements are not evidence of visibility.

See `AUTHOR-CHECK.md` for observed checks and required NOT_RUN items. No quality score, accepted state, deployment or catalog change is claimed. Another person must independently assess this candidate because this actor is its author.
