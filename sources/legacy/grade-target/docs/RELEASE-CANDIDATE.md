# Release candidate

M1 passed primary acceptance with documented manual items not run. M2 production tooling and 63 offline tests pass. Source candidate prepared for public review; Cloudflare deployment, homepage inclusion and external review are separate milestones and have not been performed by this source-publication task.

Rebuild with npm run build and npm run build:production. Each generated manifest records bytes/SHA-256 for every artifact and excludes itself. release:check verifies the exact source allowlist, config, production freshness, canonical metadata, JSON-LD/CSP hashes, header inheritance/detachment and robots access to every CSS/ESM asset.

Production config: grades.glossquote.com; worker glossquote-grade-target; compatibility_date 2026-10-17; static assets only; no workers.dev, preview URLs, metrics, dependency instrumentation, logs or traces. No Cloudflare call was made in M2.

Publication snapshot state predates the final push. The fixed Git commit and archive manifest are supplied separately; do not rewrite that snapshot to insert its own hash.

Not run: physical phone, screen reader, native IME/virtual keyboard, true 200% browser zoom, low-end-device timing, actual offline mode, complete live Network/Storage inspection, BFCache restoration, full native clipboard-rejection and download-URL lifecycle. Mock tests only establish the isolated lifecycle logic. A loopback HTTP model is not a live Cloudflare verification.
