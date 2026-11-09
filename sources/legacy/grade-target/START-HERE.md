# Start here / 開始

M1 passed primary acceptance with documented manual items not run. M2 production tooling and 63 offline tests pass. Source candidate prepared for public review; Cloudflare deployment, homepage inclusion and external review are separate milestones and have not been performed by this source-publication task.

Read AGENTS.md, PRODUCT.md, TECHNICAL.md, UX-SEO.md, ACCEPTANCE.md, TASKS.md and docs/ before making changes. README.md lists the reproducible offline commands. Keep the exact schemas, error paths and mathematical rules unchanged unless the product contract is explicitly revised.

The public/ tree and dist/ are preview-only; build:production writes only dist-production/. The production local model uses loopback 5208. No deployment command, Cloudflare token loader or package installation is supplied or required by these offline commands.

Not run: physical phone, screen reader, native IME/virtual keyboard, true 200% browser zoom, low-end-device timing, actual offline mode, complete live Network/Storage inspection, BFCache restoration, full native clipboard-rejection and download-URL lifecycle. Mock tests only establish the isolated lifecycle logic. A loopback HTTP model is not a live Cloudflare verification.
