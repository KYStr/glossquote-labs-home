# Complete author verification plan

Fixed SPEC 7fac2b9e, §7 T01–T12; this is not an independent quality score.

1. T01–T06: strict own-string schema/raw length before trim, ASCII integer/tenths grammar, four ranges, rejected accessors; P01–P10 independently multiplied 4×4 matrices against scalar XYZ, w, projected coordinates, AABB and strict outside classification; printed default literals; norm safety bound; six-decimal display vs canonical CSS; full fixed CSS structure; repeated reducer snapshots. Automated author coverage completed; native input/IME breadth not inferred from core tests.
2. T07: actual CSS zero-size corner anchors for P01–P08, parent-relative measurements and per-coordinate <=0.5 CSSpx, recorded viewport/scroll/DPR/browser. NOT_RUN: DevTools-based measurement interface restricted; no replacement with CPU oracle or transformed AABB.
3. T08: actual served CSP, safe individual style setters under CSP, network/storage behavior. Source allowlist/header tests and static sink inspection completed; browser-enforced CSP and full privacy observation NOT_RUN.
4. T09: clean deterministic build twice, exact five assets, source HTTP server routes/method/host/MIME/headers; completed. Managed static-preview success is distinct from this HTTP test.
5. T10: normal zh/en page defaults, examples, dirty/error/repair, raw preservation and canonical output, Enter focus, keyboard navigation, read-only manual CSS selection, real native zoom 200% then restore 100%; completed bounded author observations. Required exact 1280×900/320×800, computed contrast, full keyboard/assistive technology and Firefox NOT_RUN.
6. T11: reload/direct language route defaults observed; actual BFCache pageshow.persisted reset NOT_RUN, not inferred from ordinary navigation.
7. T12: required complete 20 native handler→next-rAF timing samples <=100ms NOT_RUN. Node durations are not UI latency.

Regression after any relevant change: run affected checks and build; preserve prior evidence, do not count a repeated check as new coverage. Remaining necessary evidence must be supplied before independent acceptance.
