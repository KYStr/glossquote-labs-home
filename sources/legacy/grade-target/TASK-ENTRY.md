# Task record / 任務紀錄

## 2026-10-17 — M1

Bilingual memory-only calculator, exact core, fixed reports and bounded lifecycle implemented. Primary acceptance passed with 57 tests, 257 independent integer fixtures, bilingual browser flows and native report downloads. Manual capability limits remain documented.

## 2026-10-17 — M2

Explicit M2 approval received. Added separate production tooling, static-assets-only configuration and six production tests, totaling 63 passing tests. Production check/release check and local HTTP model passed. Source publication uses a reviewed allowlist, clean copy, environment/Git settings guards and a flat commit archive.

M1 passed primary acceptance with documented manual items not run. M2 production tooling and 63 offline tests pass. Source candidate prepared for public review; Cloudflare deployment, homepage inclusion and external review are separate milestones and have not been performed by this source-publication task.

Not run: physical phone, screen reader, native IME/virtual keyboard, true 200% browser zoom, low-end-device timing, actual offline mode, complete live Network/Storage inspection, BFCache restoration, full native clipboard-rejection and download-URL lifecycle. Mock tests only establish the isolated lifecycle logic. A loopback HTTP model is not a live Cloudflare verification.
