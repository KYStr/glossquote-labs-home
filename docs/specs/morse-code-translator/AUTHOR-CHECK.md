# morse-code-translator — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/morse-code-translator/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no Morse translator exists; neighbours (UTF-8/Base64 codec — machine byte encoding, text-to-speech reader — spoken language, metronome — recurring clicks) differ as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Timing fixtures were re-derived element by element during drafting: letter durations S 5, O 11, P 11, A 5, R 7, I 3; SOS = 27 units = 1.62 s at 20 WPM; PARIS = 43 units standalone and exactly 50 with the trailing word gap, matching the WPM calibration definition the SPEC cites; the run-together prosign `<SOS>` = 23 units (15 on + 8 intra gaps).
- Two decode fixtures were specifically chosen to trap table-lookup shortcuts: `.--.-.` must resolve to `@` (not "unknown"), and `..--` must be the unknown token (it is a prefix of `?`'s code but not itself a code). During drafting an author-side confusion in the word-gap fixture was caught and the fixture rewritten to a single unambiguous form (`HE LLO` from a 3-space gap).
- The decode grammar refuses to invent letter boundaries inside an unspaced run: only single letter codes and listed prosign runs decode, everything else is a listed unknown with a `�` placeholder — tolerance applies to spacing between tokens, never to guessing.
- Product implementation does not exist yet: all product tests, GUI checks, playback measurements and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Fixtures are standard signals (SOS, PARIS, HELLO); no user data is involved.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
