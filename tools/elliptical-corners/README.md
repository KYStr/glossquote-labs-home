# Elliptical Corner Radius Explorer

A dependency-free, bilingual CSS px tool for four independent elliptical corners. Requested radii are exported; exact proportional overlap reduction is explained separately. No import, download, clipboard API, persistence or service.

## Fixed contract
BRIEF and SPEC: KYStr/glossquote-labs-home commit `8a31d00339cc1a4bc5bb05012aa964cc0fbdf0a7`, `docs/specs/elliptical-corners/`. Source baseline `26525d5f6380915ea95dde879dec769442db0d95` README. This implementation does not change the fixed nine-aspect rubric.

## Run / reproduce
Node >=22, no install required. `npm test` runs fixed expected arithmetic and state fixtures; `npm run check` checks syntax, forbidden sinks, fallback markup, dependency absence and two exact clean builds. `npm run build` copies eight declared runtime files to `dist/` with a deterministic build manifest. `npm run preview` serves the built output locally. Chinese `/`, English `/en/`; in-page language toggles preserve raw/errors/result but reload uses the route's language and defaults.

## Source map
`src/core.mjs`: closed decimal parser, integer hundredths, exact BigInt rational comparisons, half-away decimal formatting and original CSS serializer. `controller.mjs`: synchronous explicit state, revoke-on-edit, language preservation, reset/examples/lifecycle. `messages.mjs`: both dictionaries. `app.mjs`: semantic DOM and only fixed named styles; `boot.mjs`: capability boundary. `scripts/html.mjs` generates both static pages from the same dictionaries, including honest unavailable text. No asynchronous calculation, timers or accumulating listeners.

## Acceptance / rollback
This is an author candidate, not independently accepted. See AUTHOR-CHECK for actual coverage and required gaps. Never convert a test count into a quality score. To roll back a private candidate, restore its complete previous manifest-matched tree; do not mix runtime files across versions. This first candidate has no previously released product version. `dist/` is reproducible, never the sole source. No deployment or publication is performed by these scripts.
