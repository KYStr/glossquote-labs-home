# Text-to-speech reader specification errata

The 2026-11-09 [maintenance decision](../../docs/repairs/blocked-four-2026-11-09/SPEC-ERRATA.md)
supersedes the [frozen specification](https://github.com/KYStr/glossquote-labs-home/blob/1b8dac4bb3369cec073ff2b7d637ed47e54f86f4/docs/specs/text-to-speech-reader/SPEC.md)'s
network and implicit voice fallback rules.

- Only voices currently enumerated by the browser with `localService === true`
  can be selected or used for playback. Choose an initial local voice that
  matches the interface language when available.
- Before each chunk, use the fresh local voice object for the selected URI.
  Before resume, verify that both the selected voice and the already queued
  utterance's voice still qualify. A voice-list update that invalidates playback
  stops the reader. After a selection disappears, choose another available local
  voice or wait for the same voice to return.
- The local label reflects the browser's report. Device speech and network
  behavior require separate observation.
