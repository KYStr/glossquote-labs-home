# R3 maintenance release

Source 069bd37af1a6100f366afaebe5afb26aa953c5a3. Rebuild from frozen e9eb54813a55bd9f0a04b703ecbccee8c2510f4d 140-site release. Two affected preview builds use existing canonical/noindex/notice policy, retaining other138 sites and TTS/Fluid repairs. Shared worker and141host routes/CSP unchanged; sites.json gains one exact QA asset path for each affected host.

Fixed fake-data browser probes are static assets, never imported/linked by product HTML. Cloudflare remote Chromium explicitly loads their same-origin URLs via addScriptTag.url during verification. No CSP inline permission, telemetry, storage, clipboard, native download or desktop input added. Actual page+real Blob Worker checks remain distinct from full device/network/domain acceptance.

Local helper paths are execution-record locations; adapt layout only for reproduction. Node24, pinnedWrangler4.147.0, no new dependencies. Primary56 percentage+46 overtime tests,8command gates,307 independent overtime cases and7router tests pass. Final live/browser/ZIP evidence linked from PR275 before maintenance acceptance. Three new defects await external retest; previous TTS/Fluid repairs have scoped external confirmation.
