# Box Shadow Builder — source candidate r2

A zero-dependency bilingual desktop CSS tool for 1–4 ordered outer/inset shadows. This is a review candidate, not an accepted or deployed product.

## Reproduce from this directory

Node 24, no installation, network dependency, bundler or hidden generation:

```sh
node --test tests/*.test.mjs
node scripts/check.mjs
node scripts/build.mjs
```

The build copies the seven explicit `public/` runtime files byte-for-byte to `dist/`, plus `dist/MANIFEST.json`. Use a **fresh checkout** for a clean build; the builder does not delete unrelated retained files from an existing output directory. Serve `dist/` with the existing approved static preview facility. Entry `/` is Traditional Chinese; `/en/` is English. Do not open as `file://`, invent a public origin or deploy as part of review.

The specification's seven top-level runtime names are under `public/` here (and become the corresponding `dist/` names); this is a path layout alias, not omitted runtime responsibility. `public/core.mjs` validates bounded plain input and creates an immutable result. `controller.mjs` owns generation, pending copy and the independent 30-second download lease. `app.mjs` binds visible DOM controls and lifecycle cleanup. `i18n.mjs` holds both dictionaries; `styles.css` holds the fixed CSSOM rule and layout; two HTML entries declare language, metadata and CSP. Tests cover core/controller contracts; scripts check/build; evidence records finite author observations. No third-party code is vendored.

## Normal journey

Enter six-digit HEX, adjust integer text fields, explicitly Generate. Add up to four layers, reorder with normal buttons, or remove down to one. The first layer is in front only **within its CSS drawing plane**. Inset and outer cannot be reordered across their respective planes. Input edits revoke the displayed result; generate again before taking output. Error text names the first invalid layer/field and focuses it.

Copy is an explicit Clipboard API write, never a read. API success is not a claim that the OS destination was independently verified. The readonly CSS remains selectable. Download proposes `shadow.css` to the browser; inspect browser downloads. A single fixed 30-second lease survives editing, regeneration and Clear; it is not renewed by them. Backgrounding/leaving purges the lease and may interrupt a handoff not yet received. A download request does not certify disk saving.

Clear and language navigation ask before discarding noninitial content. Cancel preserves it and returns focus. Backgrounding clears results but keeps input; reload/leave-return resets inputs. No app persistence, accounts or uploaded inputs. This does not promise OS/browser secure erasure.

## Scope and review

See `PROVENANCE.md`, `VERIFICATION.md`, and `evidence/browser-observations.md`. All nine independent quality scores are **null**, not author-generated scores. In particular screen-reader, native clipboard rejection/receiver verification, confirmed BFCache, network/storage effects, 200%/320px, formal origin/SEO and broader compatibility are still NOT_RUN. The `Labs home` links are same-origin integration hooks, not evidence that this standalone preview contains the formal home page; navigation must be checked in the authorized assembled site. No canonical or absolute hreflang is invented.

## Small future extension / rollback

If a separately approved future version adds named presets, first revise the fixed spec/initial-state contract, add independent expected core fixtures and both-language wording, then add an explicit visible action that invalidates old generation before applying a preset. Do not silently auto-load a valid default in this version. Keep the schema and output contract tests, lease guards and lifecycle invalidation. Revert a candidate by returning to its pinned source commit and rebuilding in a fresh directory; do not mutate a frozen review candidate or carry old quality scores to a new one.
