# Object-fit Geometry Explorer

A bilingual, numeric-only explanation of contain/cover geometry, percentage position, letterboxing and visible source coordinates. No photograph, URL, storage, automatic clipboard or download feature. The SVG is a geometry schematic, not an image or proof of native object-fit rendering.

## Fixed contract and scope

Source baseline: KYStr/glossquote-labs-home `26525d5f6380915ea95dde879dec769442db0d95`, README.md.
SPEC/BRIEF: `ce8b7fcc1dd69de1ae3a53a07c5f20417f9ff2c5`, docs/specs/object-fit-geometry/. Nine original acceptance dimensions remain unchanged; author evidence is not independent acceptance. No deployment or public URL is claimed by this package.

Four integer dimensions1–4096; horizontal/vertical percentages0–100; contain/cover. Raw maximum16 UTF-16 units before ASCII space/tab/CR/LF trim, then1–4 ASCII digits. Source units and CSS content-box px are distinct. Source dimensions assume orientation already corrected. Visible source edges are continuous geometric boundaries, not pixel-cropping commands.

## Local commands

Node24+; no dependencies or install needed.

```
npm test
npm run check
npm run build
npm run preview
```

The preview server binds127.0.0.1:4173, serves only eight declared dist files, enforces Host/method/path/MIME/CSP rules and exposes no write endpoint. In managed Sites environments use the official preview daemon with the static dist configuration rather than independently starting another server. Both routes are noindex; production canonical/hosting metadata and deployment remain separate authorized work.

## Layers and reproducibility

- src/core.mjs: closed raw schema, normalized BigInt fractions, exact alignment/intersection/source geometry, half-away display and fixed CSS serializer. Float conversion is confined to the proportional SVG boundary.
- src/controller.mjs: synchronous immutable generated snapshot, ordered errors, input/IME invalidation, selection feedback, defaults/clear and lifecycle.
- src/messages.mjs: bilingual dynamic labels/status/errors. index.html and en/index.html carry complete static help and same-language homepage links.
- src/app.mjs: semantic controls, textContent/value sinks, fixed SVG names and clip ID. No raw markup/style interpolation.
- src/boot.mjs: capability gate and honest unavailable fallback.
- scripts/build.mjs: fixed eight-file copying build, deterministic SHA manifest. No timestamp or private-file discovery.
- test/: independent literal cases, separate floating reference, controlled state tests, deterministic output and real HTTP negatives. Controlled lifecycle tests do not claim actual background/BFCache coverage.

## Normal use and limitations

Generate validates all fields; first error receives focus. Successful numeric Enter retains input focus; button activation retains browser focus. Editing revokes every old result; returning to old raw text does not restore it. Select CSS selects the readonly textarea only, with manual OS-copy instructions. Clear empties six numeric fields and focuses source width; Defaults restores example values without generating. Language links navigate to a fresh document; values do not transfer. Hidden invalidates results while retaining raw; pagehide and persisted restoration clear raw. Browser history/cache/memory erasure is not promised.

Contain may enlarge. Cover uses negative offsets to represent cropping. Displayed values are rounded; exact reduced fractions remain available for all outputs. Very thin diagrams preserve proportion and direct users to the table. Apply generated CSS to a real img with matching ratio and inspect overriding max-width/min-size/important/container rules. This is not a layout reset or crop-file generator.

## Extension and rollback

A small bilingual FAQ change belongs in both HTML notes sections; do not modify the math or export template for a wording change. Record original hashes, make the same semantic change in both languages, rebuild and observe both routes, then restore exact original bytes and rebuild. Independent reviewers perform their own extension test; the author does not claim that requirement passed.

This is a new isolated tool and changes no existing product. Rollback to a prior fixed tool candidate requires preserving uncommitted user changes first, replacing this tool directory only with the exact prior manifest payload and rebuilding. Do not reset a whole repository, delete user data, alter other owners or deploy as part of rollback. No earlier product release is represented by this first candidate.

## Rights and pending validation

Implementation and CSS are authored for this scoped tool, with Node built-ins and system fonts only. Build/server structure is reused from the same author's Cubic package. Semantic reference is the specification's dated W3C CSS Images3 citation; no third-party implementation or asset is copied. Repository baseline states no software license selected; public availability is not a license grant. AUTHOR-CHECK.md separates observed results from NOT_RUN. Missing required evidence remains a gate for independent acceptance, not an invented PASS.
