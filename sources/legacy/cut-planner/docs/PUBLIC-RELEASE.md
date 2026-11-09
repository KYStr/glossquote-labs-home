# Cut Planner 0.1.0 source candidate

M1 received primary scoped approval on 2026-10-19. Original HTTP browser evidence plus the four focused retests yields **69 PASS, 0 FAIL, 3 PARTIAL, 7 NOT_RUN**. Both no-JavaScript cases passed. English BFCache restoration had real persisted events; Traditional Chinese demonstrated real history return and blank state, with no persisted restore event, so it remains PARTIAL. Both Network/Storage cases retain their documented partial/manual scope. Runner exit 3 is not reported as a full PASS.

Native clipboard writes/permission prompts, native downloads/printing/file/save dialogs, real devices/IME/AT/native zoom and remaining background/BFCache/network scopes are not certified by the source release. Offline adapter checks cover copy promises and URL lifetime only and do not replace native browser/OS evidence.

The source candidate adds production SEO and a strict local HTTP model. All M1 product source asset bytes remain locked; no calculator/UI behavior was changed. Run `npm test`, `npm run check`, `npm run build`, `npm run build:production`, `npm run check:production`, and `npm run release:check` with Node.js >=24. No package installation is needed. Preview uses 4212; the local production model uses 5212 via `npm run preview:production`.

The M2 workspace passed 66 offline tests (47 core, 10 adapter lifecycle, 3 preview/toolchain, 6 production) and all five check/build/release commands with exit 0. Test files run serially because the preview/production acceptance fixtures share output folders. The reviewed source archive is checked again in an independent clean directory before source publication.

Public source publication and a live website are separate milestones. This source candidate does not claim that production hosting, CDN headers, bilingual homepage integration or external review has passed. The primary owns independent M2 acceptance and any deployment; the version remains pending those release gates.

## Production favicon correction

After the primary deployed initial commit 123dc556b5c584e467c3ac2ff4a80de0f2fdced4, its live smoke passed calculation, stale-state, 320px and storage checks in both languages. The Traditional Chinese native console gate failed on an implicit favicon.ico 404 without a corresponding native response record. That failure is preserved rather than ignored. This narrow successor emits a fixed local SVG favicon, links it from both production heads, permits it in robots and verifies SVG MIME/GET/HEAD plus unchanged self-only image CSP. M1/public, all calculator/runtime JS/CSS, page bodies and script/connect policies remain byte-identical. Owner verification is offline only; deployment and the new live console retest remain with the primary.

The favicon correction passed 67 offline tests (the original 66 plus one fixed-SVG/head/self-only-CSP regression case) and all six workspace release gates. Production output now has 16 files. Native live console success for the corrected artifact is not claimed by these checks.
