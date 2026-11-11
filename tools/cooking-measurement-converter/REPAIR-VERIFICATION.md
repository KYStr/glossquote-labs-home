# Maintenance verification

2026-11-10. Maintenance task labs-run5-legacy-repair-20261110. Original build head a4ba7abbf50fb3dffa0a93e2a2165cd47be502f8. This record applies to the maintained working copy tested on Windows with Node v24.14.0 and npm 11.9.0.

| Command | Exit | Result |
| --- | ---: | --- |
| npm test | 0 | 59/59 passed, 0 failed, 0 skipped |
| npm run check | 0 | Static contract passed |
| npm run build:preview, first and second runs | 0, 0 | SHA-256 maps matched for nine generated files and the manifest |
| npm run check:generated:preview | 0 | Manifest and generated preview verified |

Manifest SHA-256 da04a588dcdc49d8f57b4e7558dcf7c7468dba75ac4b16b6fb1dbc96b0c07db9. The maintained specification and vendored fixture files are byte-identical, SHA-256 7c169215f6b31c44c196cd7eca08c26fcf1168cf63455a67be3a1d4d88edacff.

All 20 literal core cases are directly deep-compared. The fixture for oz reaches ENUM and the fixture for liter reaches INPUT_LIMIT. The suite also exercised its task-owned loopback server and verified that the production build command refuses to produce release output. Child processes invoked by maintained checks use windowsHide on Windows.

NOT_RUN for this maintenance scope. Real browser interaction and layout, physical devices, screen readers, isolated browser Network/Storage and offline observations, native file dialogs, live HTTPS/SEO, deployment, and independent acceptance.
