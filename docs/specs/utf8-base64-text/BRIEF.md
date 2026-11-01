# Strict UTF-8 Base64 Text Codec — preparatory BRIEF v0.1

Specification documentation only; no product claim, readiness event or implementation. Full normative contract is SPEC.md.

 Goal
A developer or learner needs to encode ordinary Unicode text as Base64 and decode a known Base64 string without opening a URL or executing decoded content. Success: roundtrip a multilingual synthetic message, distinguish standard from URL-safe alphabet, identify invalid padding/noncanonical pad bits, and understand that Base64 is NOT encryption or a safety scanner. Never request passwords, tokens or secrets as examples.

## 2. Scope and functional distinction
One textarea source, explicit encode/decode mode and standard/URL-safe alphabet; strict padded canonical encoding of a bounded UTF-8 TEXT subset, no arbitrary binary files. Output raw result plus safely escaped JSON-string representation for exact control/format visibility and byte/character counts. No URL/data-URI parsing, query percentdecoding, JSON formatting, JWT/tokeninspection, compression, encryption, image/file import, binarydownload, batch/history, clipboard API or networkprocessing. Unpaddedbase64url notsupported inthisversion; page explicitly sayspaddingrequired whennecessary. No auto-detect or silentrepair.

Existing Text Workbench cleanslines and counts Unicode/UTF8 but doesnot encodeBase64. URL Inspector parsesHTTPquerypercentescapes and preservesURLparts; itdoesnot providebase64codec. JSONWorkbench validates/formatsJSONtokens; itdoesnot decodearbitraryencodedtext. Integer Representation parsesdigits andencodesbits, notUnicodebytes. These closed input-output workflows are distinct. Closest existing specs01/02/13 at fixedbe197ea30d909b1353e7f77bdf16b1811ac41f71 were read; initialcatalog56/spec82/task88 scope containsnoBase64codec. Freshregistry/path/draft check remainsmandatory beforeadmission.

[RFC4648§§3–5](https://www.rfc-editor.org/rfc/rfc4648.html) supplies the alphabets/padding/zero-pad-bit basis. This tool chooses strictcanonical rejection and a limitedUTF8text domain ratherthan tolerant MIME orarbitrarybinary decoding. Itdoesnot implyall validBase64 mustbeUTF8text.


## Required deliverable and independent documentary gate
Complete eight-section SPEC with exact input/output rules, bounded implementation, independent fixtures, full lifecycle, nine fixed product aspects, tests and handoff. Nonauthor must mark goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff true or false with findings against exact hashes; any missing/contradictory mandatory contract blocks document readiness. No numerical score from document presence.

Product aspects functionality,boundaries,privacy,security,usability,accessibility,localization-seo,toolchain-provenance,compatibility each later require>=90 and all mandatory same-candidate checks complete. Current product checks NOT_RUN and scoresnull. Native GUI/privacy/accessibility/timing cannot be replaced by CPU tests or author claims.

Coordinator arranges authorized batch source preservation; actual independent reviewer later handles readiness. Future production requires explicit allowed executor, fixed source/brief/spec and unique claim/readback. Preserve existing owners, local stop, reconciliation and baseline; no new npm package, public deployment, cost, credential change or game resources. Read latest registry before admission; source baseline26525d5f6380915ea95dde879dec769442db0d95/protocolc13b91598c15b14948d38e60cec9a5fa0616bbd2 are fixed historical references, not fresh stock counts.
