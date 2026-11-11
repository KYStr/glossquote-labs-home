# Maintenance verification

2026-11-10. Maintenance task labs-run5-legacy-repair-20261110. Original build head 717ffe47574b2def25c9ab6f44e8dae6f0e1d080. This record applies to the maintained working copy tested on Windows with Node v24.14.0 and npm 11.9.0.

| Command | Exit | Result |
| --- | ---: | --- |
| npm test | 0 | 54/54 passed, 0 failed, 0 skipped |
| npm run check | 0 | Static contract passed |
| npm run build:preview, first and second runs | 0, 0 | SHA-256 maps matched for nine generated files and the manifest |
| npm run check:generated:preview | 0 | Manifest and generated preview verified |

Manifest SHA-256 03a5b4069aa71f59cce13ff633bbd0e76779f0d7bd41c59997bf023cf83a11d8. The maintained specification and vendored fixture files are byte-identical, SHA-256 671b720d7adfdee7106f3cfad1379fae381c88210aac81e37e962de8103b11f8.

All 18 literal core cases passed, including the four new short-February fixtures. Expected ages were derived by hand from February’s length and January’s 31 days. Python Gregorian dates independently supplied weekday and calendar day differences. Both public FAQ expectations match the maintained borrowing rule. Child processes invoked by maintained checks use windowsHide on Windows.

NOT_RUN for this maintenance scope. Real browser interaction and layout, physical devices, screen readers, isolated browser Network/Storage and offline observations, native file dialogs, live HTTPS/SEO, deployment, and independent acceptance.
