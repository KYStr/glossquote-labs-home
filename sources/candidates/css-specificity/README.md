# CSS Selector Specificity Comparator

在本機比較兩個 CSS 選擇器（限支援子集）的 specificity (A,B,C)，逐節點拆解貢獻。
Compare the specificity (A,B,C) of two CSS selectors from a bounded supported
subset, locally, with a per-node contribution breakdown. It does **not**
execute selectors, match a DOM, or predict the cascade winner.

Built to the fixed specification
`spec-css-specificity-20261102` (KYStr/glossquote-labs-home,
`docs/specs/css-specificity/SPEC.md` @ `d97c0f4e8cf13fc9a73db9350f20f746d7c3e9ec`).

## Interface (SPEC §5)

| Command | Effect |
|---|---|
| `npm test` | `node --test tests/*.test.mjs` |
| `npm run check` | static checks (forbidden APIs, CSP, i18n parity, core smoke) |
| `npm run build:preview` | deterministic preview build into `dist/` (noindex) |
| `npm run check:generated:preview` | rebuild and byte-compare against `dist/` |
| `npm run build:production` | production build into `dist-production/` — requires an approved https origin |
| `npm run check:generated:production` | rebuild and byte-compare against `dist-production/` |
| `npm run dev` | serve `dist/` at http://127.0.0.1:4180 (bounded `--port=` allowed) |

Production mode refuses to emit artifacts without an explicit validated
approved https origin, supplied as `--origin=https://your-host` via
`node scripts/build.mjs --mode=production --origin=...` or the
`APPROVED_ORIGIN` environment variable. A production build is not a
deployment; merging, deployment, and catalog publication are separate steps.

## Layout

- `src/index.html` — Traditional Chinese page; `src/en/index.html` — English page
- `src/assets/core.mjs` — pure schema/parser/scorer (`compareSelectors`)
- `src/assets/controller.mjs` — DOM-free session state machine
- `src/assets/app.mjs` — DOM rendering (textContent only)
- `src/assets/texts.mjs` — complete bilingual strings
- `src/assets/styles.css`, `src/_headers` — styles and the house CSP header set
- `scripts/` — build / check / check-generated / serve
- `tests/` — core, controller, build, serve, and DOM-shim UI tests

Zero runtime dependencies; Node 24+ built-ins only. No network requests, no
storage, no clipboard or download APIs at runtime.
