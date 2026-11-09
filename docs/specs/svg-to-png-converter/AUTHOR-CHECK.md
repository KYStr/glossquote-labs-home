# svg-to-png-converter — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/svg-to-png-converter/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no SVG rasteriser exists; neighbours (image resizer — raster input only, svg dash cycle — animation learning tool, print size — physical dimensions) differ as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Sizing fixtures were re-derived by script during drafting: F1 (400×200 / 100×50 / 100×50), F2 (96×96), F3 (intrinsic 150×75 → 300×150 at 200%), F5 (height = round(66.67) = 67), and the F7 cap arithmetic (8192×4096 = 33,554,432 exactly at the product cap). The F6 sanitisation count (3 = 1 banned element + 1 event attribute + 1 disallowed reference) follows by hand from the closed counting rules in section 4.
- Sanitisation is specified as a closed contract (named element list, attribute rules, href allowlist, style rules, one counting category per removal) and the raw input is forbidden from every DOM sink; the raster source is only the serialised sanitised document via a blob: image, which is also what makes canvas export untainted by construction.
- Pixel-identical rasterisation across browsers is explicitly NOT required (antialiasing differs); dimensions and removal counts are the cross-browser invariants, stated in the rubric so a reviewer does not demand the impossible.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Fixtures are a plain coloured rectangle, a viewBox-only placeholder and a deliberately hostile sample described by its parts; no real artwork or user data is involved.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
