# Offline QR Code Maker — preparatory BRIEF v0.1

Specification documentation only; no product claim, readiness event or implementation. Full normative contract is SPEC.md.

## 1. Goal
A shop owner, event organizer, teacher or office worker needs to turn a short piece of text — a URL, Wi-Fi credentials, a payment note, contact lines or plain text — into a QR code they can download and print, without uploading their content to an online generator that logs or watermarks it. Success: paste or type content, see the QR update deterministically, choose size and error-correction level, download a byte-exact PNG or SVG whose decoded content equals the input exactly, and understand the capacity limit before printing. All processing is local; nothing is sent anywhere.

## 2. Scope and functional distinction
One content input with plain-text and structured Wi-Fi payload builders; byte-mode QR generation per ISO/IEC 18004 with versions 1–40 auto-selected as the smallest fitting version, error-correction levels L/M/Q/H, a quiet-zone (margin) control, foreground/background colour pickers with a contrast warning, and PNG (canvas raster at chosen pixel size) plus SVG (module-path vector) downloads. No URL shortening, no logo/image embedding, no batch or CSV mode, no scan/decode (camera or image upload), no history, no analytics, no remote QR API, no dynamic/editable-after-print codes, no payment-code validation beyond payload formatting.

Existing Label Printer lays out text labels for printing from list data; it does not encode QR symbols or offer scannable payload builders. Images to PDF and the image tools transform existing images; they do not synthesize a standards-defined 2D barcode. URL Inspector parses and displays URL parts; it does not generate any symbol. Wi-Fi payload follows the widely used `WIFI:` escaping convention (ZXing de facto format); the page must state that scanning behaviour depends on the reader app and OS, and that this tool formats but cannot verify a network join. Initial catalog/spec/task scope contains no QR or barcode generator; fresh registry/path/draft check remains mandatory before admission.

## Required deliverable and independent documentary gate
Complete eight-section SPEC with exact input/output rules, bounded implementation, independent fixtures, full lifecycle, nine fixed product aspects, tests and handoff. Nonauthor must mark goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff true or false with findings against exact hashes; any missing/contradictory mandatory contract blocks document readiness. No numerical score from document presence.

Product aspects functionality,boundaries,privacy,security,usability,accessibility,localization-seo,toolchain-provenance,compatibility each later require >=90 and all mandatory same-candidate checks complete. Current product checks NOT_RUN and scores null. Native GUI/decoding/printing checks cannot be replaced by CPU tests or author claims; decoding verification uses synthetic payloads only, never real credentials.

Coordinator arranges authorized batch source preservation; actual independent reviewer later handles readiness. Future production requires explicit allowed executor, fixed source/brief/spec and unique claim/readback. Preserve existing owners, local stop, reconciliation and baseline; no new npm package, public deployment, cost, credential change or game resources. Read latest registry before admission; source baseline 26525d5f6380915ea95dde879dec769442db0d95 is a fixed historical reference, not a fresh stock count.
