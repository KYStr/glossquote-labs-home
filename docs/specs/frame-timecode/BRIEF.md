# Integer-rate Frame Timecode Calculator — preparatory BRIEF v0.2

Specification documentation only; no product claim, readiness event or implementation. Full normative contract is SPEC.md.

## 1. Goal and outcome
Help a video editor or animation learner count frames and apply a known integer-frame offset at an explicitly selected integer frame rate. Convert between an absolute frame index and HH:MM:SS:FF within one24-hour day, and see exact elapsed seconds as a rational number. Success: at25fps identify00:00:59:24 asframe1499, add1frame and obtain00:01:00:00 without confusing milliseconds with the frame field. No claim to diagnose real media or synchronise playback.

## 2. Scope and de-duplication
Only rates24,25,30,50,60 frames/second, exact integers. Two input modes(timecode/frame index), one signed frame offset, no wrap across day. Output source and shifted index/timecode plus exact elapsed-second fraction. No fractional rates23.976/29.97/59.94, drop-frame numbering, semicolon delimiter, wall clock, timezone, duration range, playback, subtitles, media/file import, export, clipboard, batch jobs or automatic frame-rate conversion. Unsupported formats explicitly rejected, never approximated to nearby integer rate.

Existing Subtitle Shift accepts an entire bounded SRT document and changes all cue milliseconds by a common seconds offset; it does not expose an integer-rate frame numbering calculator. Audio Cue Notes records timestamps against actual audio, while Event Timeline and Work Hours schedule/total human times. This new tool reads no media or SRT and preserves no cue text. Existing Integer Representation and Rational Arithmetic are mathematical domains, not frame/timecode conventions. Functional boundaries checked against initial catalog56/spec82/task88 and the existing fixed Subtitle Shift specification at be197ea30d909b1353e7f77bdf16b1811ac41f71, coordination/local/2026-10-29/specs/36-subtitle-shift/SPEC.md. Current registry/path check remains mandatory before admission.

[Adobe XMP Timecode documentation](https://developer.adobe.com/xmp/docs/xmp-namespaces/xmp-data-types/timecode/) distinguishes formats including integer and fractional/drop variants. This product deliberately supports only its closed integer-rate subset below, not full SMPTE/XMP compliance or media metadata interchange. Rate must be selected by the user; a colon string alone does not identify rate.


## Required deliverable and independent documentary gate
Complete eight-section SPEC with exact input/output rules, bounded implementation, independent fixtures, full lifecycle, nine fixed product aspects, tests and handoff. Nonauthor must mark goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff true or false with findings against exact hashes; any missing/contradictory mandatory contract blocks document readiness. No numerical score from document presence.

Product aspects functionality,boundaries,privacy,security,usability,accessibility,localization-seo,toolchain-provenance,compatibility each later require>=90 and all mandatory same-candidate checks complete. Current product checks NOT_RUN and scoresnull. Native GUI/privacy/accessibility/timing cannot be replaced by CPU tests or author claims.

Coordinator arranges authorized batch source preservation; actual independent reviewer later handles readiness. Future production requires explicit allowed executor, fixed source/brief/spec and unique claim/readback. Preserve existing owners, local stop, reconciliation and baseline; no new npm package, public deployment, cost, credential change or game resources. Read latest registry before admission; source baseline26525d5f6380915ea95dde879dec769442db0d95/protocolc13b91598c15b14948d38e60cec9a5fa0616bbd2 are fixed historical references, not fresh stock counts.
