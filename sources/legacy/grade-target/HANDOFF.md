# Grade Target Calculator handoff

M1 passed primary acceptance with documented manual items not run. M2 production tooling and 63 offline tests pass. Source candidate prepared for public review; Cloudflare deployment, homepage inclusion and external review are separate milestones and have not been performed by this source-publication task.

M1: 57 offline tests and 257 independent integer fixtures passed primary acceptance. M2: 63 offline tests, check, production build/check and release:check passed. A clean publishing copy is independently rebuilt before source publication.

Production output contains two canonical pages (/index.html and /en/index.html), reciprocal zh-Hant/en/x-default alternates, matching visible FAQ JSON-LD, exact CSP script hashes, crawlable CSS/ESM, sitemap, security headers and a distinct noindex 404. The local model tests ordered header attachment/detachment and strict routing; it is not the deployed Cloudflare service.

M1 public sources and preview output are frozen and unchanged. All product inputs remain memory-only. No credential, user data, local evidence, environment fingerprints or account configuration is included here.

Not run: physical phone, screen reader, native IME/virtual keyboard, true 200% browser zoom, low-end-device timing, actual offline mode, complete live Network/Storage inspection, BFCache restoration, full native clipboard-rejection and download-URL lifecycle. Mock tests only establish the isolated lifecycle logic. A loopback HTTP model is not a live Cloudflare verification.

GitHub source publication and free Cloudflare hosting are separate. The primary coordinator owns deployment and bilingual-homepage integration. Do not mark a version complete before external review.
