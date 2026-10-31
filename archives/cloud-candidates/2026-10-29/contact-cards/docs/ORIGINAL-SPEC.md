# Preserved specification

Original file: `docs/SPEC.md`; original SHA-256: `3e88b885bbce8cb81a5c0ab5554acfd04d3ad82b2757f439f1c37d727a7655ef`.
This is historical specification evidence, not a new completeness review or acceptance.

---

# Contact Cards — paused scratch specification

Catalog source is fixed: `KYStr/glossquote-labs-home@26525d5f6380915ea95dde879dec769442db0d95`, catalog blob `aee12124696bbf216fdd3bbdca1e447fa7f423e8`. Entry remains `draft`, `publishedAt:null`, `urls:null`. Exact bilingual entry and lookup evidence are in `evidence/provenance.json`. Reference conventions: csv-workbench `fbd488d0622d81e175e1d367801e2959232af22e` README/TECHNICAL/ENGINEERING/PRIVACY-SECURITY and input/parser modules. Reference live claims are not inherited.

## Product profile

Pure front-end CSV → positional name/phone/email mapping → explicit review → acknowledged VCF download. Name required; phone/email at least one mapped and at least one nonempty per contact. No name splitting, row skipping, deduplication, address-book access, sending, uploads, CSV export or cloud services. Test contacts are fictional; reserved `example.invalid` emails. Source phone strings keep + and leading zeros.

Strict UTF-8 comma CSV, optional one leading BOM, LF or CRLF record separators, quoted commas/quotes/multiline values. Bare CR outside quotes rejected. Ragged rows rejected. Limits: 256 KiB source, 501 records including optional header, 500 contacts, 20 columns, 4096 UTF-16 units per cell, 512 KiB output. Names max 200 code points, nonblank; no Tab/U+2028/U+2029. Telephone profile max 80 characters, digits/spaces/parentheses/dot/hyphen, optional leading +; no extension or validity inference. Email profile conventional single ASCII dot-atom local part and DNS-style domain, max 254 chars; no internationalized/display-name/multiple-address support; no delivery/ownership verification.

vCard 3.0, UTF-8 without BOM, CRLF and terminal CRLF. Fixed BEGIN/VERSION/FN/N/TEL/EMAIL/END properties only. Full name appears in FN and in the given-name component of N (`N:;full name;;;`), surname empty; disclosed sorting/device differences. Text escapes backslash, comma, semicolon and CRLF/CR/LF as literal `\\n`; no user-controlled property names/parameters/URIs. Lines fold at a conservative 75 UTF-8 octets including the continuation space, never splitting a Unicode code point. References: [RFC 2426](https://www.rfc-editor.org/rfc/rfc2426) and [RFC 2425](https://www.rfc-editor.org/rfc/rfc2425). These are the catalog-requested v3 rules, not a claim to implement newer v4.

Names/phones/email remain data, not executable markup. Because this tool exports VCF rather than CSV, it does not modify formula-looking names with apostrophe prefixes or claim spreadsheet export safety. Telephone profile naturally rejects formulas except allowed leading + numbers.

## Lifecycle and release boundaries

File.size checked before FileReader; fatal UTF-8 check on bytes; selected-file raw content kept separately so textarea normalization does not silently change CRLF until a user edit. Epoch cancels late read callbacks. Input/header/mapping changes, errors, repeat prepare, clear and pagehide revoke old output/URLs/acknowledgment; clear also removes source state. URL created only on explicit acknowledged download, revoked after 1 second, subsequent action or navigation. Preview paginates 25 records and offers full readonly VCF text. No persistence, service worker, external assets, contact connector or network processing APIs.

Two static language pages, matching-language real GlossQuote homepage links. Source and dist are noindex. No canonical/tool URL invented. Candidate build rejects production/release flags; production tree/SEO configuration is deferred until an actual authorized URL and release plan exist. No server was started and no raw CDP was used.

Node 24 built-ins, zero dependencies. Exact nine-file static allowlist and exact directories; source and destination reject symlinks/hardlinks/nonregular/unknown files. Build snapshots, stages, swaps only validated trees; cleanup unlinks known files and uses nonrecursive rmdir, never recursive removal of unknown dist. These code paths still need adversarial build regression tests and independent review.

## 2026-10-28 schema-hardening repair

Core object/array APIs now capture exact own enumerable data descriptors before using values; custom prototypes, accessor descriptors, symbols/hidden extras, sparse/index-getter/extra arrays fail closed with stable error codes. Frozen ordinary data remains supported. Reflection failures are normalized; transparent descriptor-only Proxies may be accepted because browser JavaScript cannot universally identify them. Reflection traps may execute, so this is not an arbitrary-JavaScript sandbox. See current VALIDATION.md for the exact before/after and preserved limitations. Build adversarial regression cases are now run; browser/host checks remain separate.
