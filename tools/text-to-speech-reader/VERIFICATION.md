# Verification — Text-to-Speech Reader (build-first candidate)

Spec: `spec-text-to-speech-reader-v1`, KYStr/glossquote-labs-home commit
`1b8dac4bb3369cec073ff2b7d637ed47e54f86f4`, path
`docs/specs/text-to-speech-reader/SPEC.md` (14,352 bytes, verified
byte-identical to the author's draft before building; the wave brief's
hash `1b8dac4b0ecbe467331149bbb343e744fa81cd521` does not resolve on
GitHub — a truncated-hash typo of the same kind wave 3 found).

## Evidence RUN (this environment, Node v24.22.1)

- **Tests: 23/23 pass** (`npm test`, ~0.3 s). Core suite (15): both
  SPEC section 4 normative segmentation fixtures verbatim (zh 3
  sentences; en `Dr. Lee paid 3.14 dollars.` = 2 sentences); every
  bundled abbreviation; decimals vs digit/quote-after-space boundaries;
  CJK closing-quote attachment; newline boundaries; empty/whitespace =
  EMPTY_TEXT; 20,001 chars = TEXT_TOO_LONG and 20,000 accepted; the
  450-character chunking fixture (3 chunks of 150, concatenation
  reproduces the sentence); clause-separator preference over spaces and
  hard cuts; a 5,000-character single sentence (25 chunks); chunk to
  sentence index mapping; the concatenation invariant over 50 seeded
  random CJK inputs; progress arithmetic rounding down. Controller
  suite (8, SPEC section 7 fake-engine suite against the injected
  synthesis interface): exactly one chunk enqueued, advance on end
  only; settings snapshot per enqueue (mid-playback rate/voice change
  applies to the next chunk); pause/resume; stop cancels and resets
  with stale callbacks ignored; utterance error returns to idle with
  the error name and no retry; play-from-sentence; re-play staleness;
  empty playlist refused.
- **Project check: PASS** (`npm run check`) — required paths, package
  identity, CSP and head parity on both pages, identical id sets,
  forbidden-capability scan (no innerHTML/storage/network/clipboard
  path), core + controller DOM-freedom, and the check's own
  re-assertion of the SPEC section 4 fixtures listed above.
- **Build: byte-identical across two builds** (preview dist mirrors
  `public/` exactly; combined listing SHA-256 recorded in
  CANDIDATE-MANIFEST.json).
- **HTTP probes** against the local preview server: zh and en pages
  200 with bytes equal to sources; house CSP / nosniff / no-referrer /
  no-store headers; missing path 404; traversal 403; POST 405;
  HEAD 200.
- A real defect was caught by the fixtures during development and
  fixed: the first segmentation pass treated a decimal point as a
  boundary because "digit after the dot" matched rule (b) without its
  required whitespace — `3.14` split into `3.` + `14`. Rule (b) now
  requires consumed whitespace before the uppercase/digit/quote.

## Interpretation rulings (for the bulk review)

- **Utterance `error` vs the enqueue chain.** SPEC section 3 says
  chunk k + 1 is enqueued on chunk k's `end`/`error` event, and its
  Errors paragraph says an utterance error stops playback and surfaces
  the name. The controller follows the Errors paragraph for a current
  error (stop, idle, surface, never retry); errors from the tool's own
  cancel carry a stale generation and are ignored, which is what the
  enqueue-chain sentence exists to make safe.
- **Network-voice disclosure timing.** Section 3 introduces the
  notice at first selection and section 6 says it appears "exactly
  when a network voice is first selected". The page shows the notice
  whenever the currently selected voice is a network voice, so the
  disclosure is also visible if the browser-default voice (chosen
  without a user gesture) is a network voice — it can never speak
  undisclosed.
- **Space-split chunks.** When a chunk is cut at a space, the space is
  consumed as the spoken join (SPEC section 4 normalises joins to a
  single space); clause-separator and hard cuts partition the sentence
  exactly, which is what the 450-character fixture pins.
- **Progress on play-from-sentence.** Sentence k of N derives from the
  current chunk as specified; the character percentage counts chunks
  actually spoken in the run, so a mid-text start does not claim the
  skipped prefix as read.

## Evidence NOT_RUN (honest — no browser binary in this environment)

- All real-browser items: the SPEC section 7 manual listening checks
  (one per language, with browser and voice named), automated smoke
  for voice-list population / transport enablement / highlight
  movement, keyboard-only completion, both-language screenshots.
- Real platform variances (pause ignored by some local voices,
  background-tab behaviour, late voice lists on real systems) can only
  be observed on real browsers/devices.
- The 50 ms segmentation bound for 20,000 characters is asserted by
  test-suite timing only at Node scale (the 20,000-char test completes
  in ~12 ms here); no browser timing was measured.
- Deployment: none. Nothing is merged, deployed, published or
  catalogued; the preview build is the only build this candidate ships
  (production builds are refused until an origin is approved).
