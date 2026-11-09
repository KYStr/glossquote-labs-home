# 成績目標試算 / Grade Target Calculator

Enter a 0–100 target, component percentage weights totaling exactly 100%, and the scores you already have. Leave ungraded scores blank; 0 is a graded score of zero. The result is the weighted average needed across all remaining components, not a minimum score for each one. Check your school's official rules.

輸入目標、百分比權重及已評分成績，試算尚未評分項目合計需達到的加權平均。空白與0分不同；本工具不代表學校官方規則。

## Run locally

Node.js 24+ and npm are required. No packages are installed; runtime and development dependencies are empty.

~~~sh
npm test
npm run check
npm run build
npm run dev -- --port 4208
npm run build:production
npm run check:production
npm run release:check
npm run preview:production -- --port 5208
~~~

Preview: http://127.0.0.1:4208/index.html and /en/index.html. Production HTTP model: http://127.0.0.1:5208/index.html and /en/index.html. Both listeners bind only to 127.0.0.1. Preview remains noindex. Production output is generated separately in dist-production/. Build output and local evidence are not part of this source archive.

## Data and limits

Inputs are processed only in page memory and are not saved. First load still downloads static website files. No account, import, storage, analytics, external fonts or application network requests are used. Copy/download happen only after an explicit button action.

BigInt arithmetic controls target comparisons; rounded display values do not. For example, a final 69.995 displays 70.00 but does not reach a target of 70.

## Release status

M1 passed primary acceptance with documented manual items not run. M2 production tooling and 63 offline tests pass. Source candidate prepared for public review; Cloudflare deployment, homepage inclusion and external review are separate milestones and have not been performed by this source-publication task.

Candidate origin: https://grades.glossquote.com. A configured domain is not a claim that a site has been deployed. The repository is https://github.com/KYStr/glossquote-labs-grade-target.

Not run: physical phone, screen reader, native IME/virtual keyboard, true 200% browser zoom, low-end-device timing, actual offline mode, complete live Network/Storage inspection, BFCache restoration, full native clipboard-rejection and download-URL lifecycle. Mock tests only establish the isolated lifecycle logic. A loopback HTTP model is not a live Cloudflare verification.

The original product contracts are PRODUCT.md, TECHNICAL.md, UX-SEO.md, ACCEPTANCE.md and TASKS.md. Source-publication status documents are curated public editions; machine-local evidence and chat identifiers are intentionally excluded.
