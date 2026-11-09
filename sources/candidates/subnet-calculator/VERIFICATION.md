# Verification — IPv4 Subnet Calculator (build-first candidate)

Spec: `spec-subnet-calculator-v1`, KYStr/glossquote-labs-home commit
`7f597e20d163bb42c5eee7ab713083016c95ccc2` (PR #31 head), path
`docs/specs/subnet-calculator/SPEC.md` (14,159 bytes, verified
byte-identical to the author's draft before building; the wave brief's
hash `7f597e20be648b57a06fe2202122fd700a54fad` does not resolve on
GitHub — the same truncated-hash typo waves 3 and 4 found).

## Evidence RUN (this environment, Node v24.22.1)

- **Tests: 20/20 pass** (`npm test`). Core suite (14): every SPEC
  section 4 worked fixture verbatim — 192.168.1.64/26 in full
  (netmask, wildcard, network, broadcast, total 64, usable 62, first
  .65, last .126, classification private); 192.0.2.5/31 RFC 3021
  (usable 2, note branch); 203.0.113.9/32 host route; 0.0.0.0/0 exact
  totals 4,294,967,296 / 4,294,967,294 as integers; the /30 minus-two
  branch. Parser sweep: every octet error class with positions,
  leading zeros, `0x`/exponent forms refused, IPv6 refused by name,
  prefix -1/33/non-integer, CIDR paste forms incl. malformed suffixes,
  all 33 valid masks contiguous plus five named non-contiguous masks.
  Arithmetic cross-check against an independent bit-string
  implementation written separately inside the test (300 seeded
  address/prefix pairs). Classification: one address per table row
  plus both boundaries of 172.16.0.0/12 and 100.64.0.0/10, and
  255.255.255.255 named LIMITED_BROADCAST. Historical class sweep.
  Binary-view boundary counts. Mode-pipeline suite (6): the split
  fixture (/24 at /26, four children with exact broadcasts and usable
  ranges); counts at the cap (256 exactly, not capped), one over, and
  q−p = 20 (1,048,576, capped, 256 listed); the /0 → /32 count
  (4,294,967,296) computed without enumeration; child usable rules at
  /31 and /32; child-prefix-not-longer errors; split starting at the
  parent network address rather than the typed host; membership
  fixtures inside/outside plus boundary addresses.
- **Project check: PASS** (`npm run check`) — required paths, package
  identity, CSP and head parity, identical id sets, forbidden-
  capability scan (clipboard read forbidden; the one write is the
  copy button's user gesture), core DOM-freedom, and the check's own
  re-assertion of the SPEC section 4 fixtures (analysis ×4, leading
  zero, non-contiguous mask, 12-row classification table, split,
  membership).
- **Build: byte-identical across two builds** (combined listing
  SHA-256 in CANDIDATE-MANIFEST.json).
- **HTTP probes** against the local preview server: zh and en pages
  200 byte-equal to sources; house CSP / nosniff / no-referrer /
  no-store headers; missing 404; traversal 403; POST 405; HEAD 200.

## Interpretation rulings (for the bulk review)

- **255.255.255.255** sits inside the reserved row (240.0.0.0/4),
  which the SPEC says includes it, "named when the address is exactly
  that": the core returns the distinct code LIMITED_BROADCAST for
  exactly that address, rendered as the reserved label plus the
  limited-broadcast naming; all other 240/4 addresses return RESERVED.
- **CIDR paste timing.** The fields fill from a pasted CIDR string on
  the field's change (commit) event; during typing, a CIDR in the
  address field already drives the computation with its parsed values,
  so results are never stale mid-paste.
- **Counts display.** Exact integers are shown with en-US thousands
  grouping (4,294,967,296 — the form the SPEC itself uses); the
  underlying values are exact integers either way, and the copy
  summary uses the same formatting as the screen, as section 3
  requires the copy to match.

## Evidence NOT_RUN (honest — no browser binary in this environment)

- All real-browser GUI items from SPEC section 7: fixtures through
  the real UI in both languages, prefix/netmask sync behaviour in a
  live page, error replacement of stale results observed in a browser,
  keyboard-only completion.
- Real clipboard behaviour (permission prompts, file:// contexts) —
  the copy path is gesture-gated and failure falls back to an on-page
  message, but it was not exercised in a browser.
- Deployment: none. Nothing is merged, deployed, published or
  catalogued; the preview build is the only build this candidate ships
  (production builds are refused until an origin is approved).
