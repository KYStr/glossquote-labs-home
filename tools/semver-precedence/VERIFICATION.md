# SemVer Precedence Comparison — Verification

Environment: Node v24.22.1, no network access. All commands run in
`tools/semver-precedence/`.

## Commands and results

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` (`node --test`) | 0 | **39 pass / 0 fail** |
| `npm run build:preview` | 0 | 8 files written to `dist-preview/` + `BUILD-MANIFEST.json` |
| `npm run build:preview` (2nd run, hashes compared) | 0 | **Byte-identical** (`find dist-preview -type f \| sort \| xargs sha256sum`, diff clean) |
| `npm run check` | 0 | `check ok: 12 JS files, 2 HTML pages` |
| `npm run check:generated:preview` | 0 | `check:generated:preview ok: 8 files verified in dist-preview/` |
| Loopback HTTP probe (serve on 127.0.0.1:4181) | 0 | See below |

## Test breakdown (39 total)

- `test/core.test.mjs` — 23 tests: all 9 fixtures from `fixtures.json`
  (deep-equal to the printed expected values); the official SemVer 2.0.0
  §11 precedence chain (all 64 pairwise comparisons + sort reproduces
  the chain); antisymmetry/reflexivity; transitivity over a mixed set;
  every reason kind with its index; build metadata ignored (incl.
  leading zeros); exact comparison beyond 2^53 and at the 32-digit
  core-field limit; 29 grammar rejections (v prefix, trim, LF/CRLF,
  leading zeros, empty segments, non-ASCII, `1.0.0-`/`1.0.0+`,
  `1.0.0++1`, `1.0.0+build+more`); left validated before right;
  capacity (256/257 UTF-16 units), surrogate (lone high/low → UNICODE,
  paired → SYNTAX), and identifier limits (33-digit core field, 17
  prerelease/build identifiers, 33-char token, with the 16/32 maxima
  valid); schema errors (unknown/missing/wrong-type/accessor/frozen);
  `parseVersion` components; canonical JSON (recursive key sort, UTF-16
  order, compact, escaping); `serializeReport` (one trailing LF,
  OUTPUT_LIMIT guard on a synthetic oversized value).
- `test/controller.test.mjs` — 11 tests: all 3 controller fixtures from
  `fixtures.json` (state-dirty-error, state-cancel-late,
  state-replace-late) with checkpoint deep-equality; run-while-busy
  replacement; edit-while-busy terminates work; loadExample waits for a
  manual run; worker failure and createWorker throwing both keep the
  draft with WORKER_ERROR; cancel/reset no-ops outside busy; empty
  drafts yield EMPTY on the left field; onChange snapshots and
  unsubscribe.
- `test/html.test.mjs` — 3 tests: both language pages (lang, title,
  description, H1, noindex, canonical/hreflang/x-default, home and
  language links, local script/stylesheet, labels, buttons, no inline
  handlers, no absolute URLs, both SPEC FAQs); both pages share the
  same element ids.
- `test/worker.test.mjs` — 2 tests: the generated worker source, loaded
  as a data: URL module with a `self` shim, answers a compare message
  and a syntax-error message correctly and ignores malformed messages;
  its SHA-256 matches the recorded value and it embeds the core source
  verbatim at its head.

## HTTP probe (loopback)

`node scripts/serve.mjs --host 127.0.0.1 --port 4181 --dir dist-preview`:

- `/` → 200 `text/html`, title `SemVer 版本順位比較｜Gloss Tools`
- `/en/` → 200 `text/html`, title `SemVer Precedence Comparison | Gloss Tools`
- `/js/app.js`, `/js/controller.mjs`, `/js/core/semver.mjs`,
  `/js/worker-source.mjs` → 200 `text/javascript`
- `/styles/app.css` → 200 `text/css`
- `/%2e%2e` traversal → 403; unknown path → 404; POST → 405; HEAD → 200
- Headers on HTML: `Content-Security-Policy` exactly as the SPEC pins
  it, `X-Robots-Tag: noindex, nofollow`, `X-Content-Type-Options:
  nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy:
  camera=(), microphone=(), geolocation=()`.

Note: the first probe attempt used port 4173, which was already occupied
by another process on this machine (it served a different tool's pages);
the probe was re-run on port 4181 and all results above are from 4181.

## Bugs found and fixed during the build

1. Controller `onmessage` compared the reply generation against the
   generation captured in the creating run's closure, so a superseded
   worker's in-flight reply could still be accepted. Fixed to compare
   against the controller's live generation; covered by the
   `deliverRaw` (already-in-flight) cases in the controller tests.
2. Test expectation error (not a product bug): `1.0.0--` was listed as
   invalid, but a lone `-` is a legal prerelease identifier per the
   official grammar. The test now asserts it is valid.
3. Test-harness quirk (not a product bug): deleting `globalThis.self`
   in a `finally` after `await import()` of a data: URL module races
   Node's deferred evaluation of that module. The worker test keeps
   the shim installed until its assertions finish.

## Spec errata

None. Every printed fixture in `fixtures.json` reproduces exactly as
printed, and the official §11 chain checks out.

## NOT_RUN

- Real-browser rendering/interaction (including the actual Worker run,
  cancel, reset, and Blob download in Chrome/Edge).
- Real devices/touch, assistive tech, measured contrast of the tool's
  own UI, 200% zoom, 320 px reflow.
- Network/Storage audit with a clean isolated profile.
- Deployment / production origin, HTTPS headers, sitemap.
- Independent nine-aspect review (pending by design; parent submits
  this candidate to the registry).
