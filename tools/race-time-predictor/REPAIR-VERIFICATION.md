# Maintenance verification

2026-11-10. Maintenance task labs-run5-legacy-repair-20261110. Original build head 2b528170837773a677c10b0c6414d80f1044af6f. This record applies to the maintained working copy tested on Windows with Node v24.14.0 and npm 11.9.0.

| Command | Exit | Result |
| --- | ---: | --- |
| npm test | 0 | 44/44 passed, 0 failed, 0 skipped |
| npm run check | 0 | Static contract passed |
| npm run build:preview, first and second runs | 0, 0 | SHA-256 maps matched for nine generated files and the manifest |
| npm run check:generated:preview | 0 | Manifest and generated preview verified |

Manifest SHA-256 7059877b32cf289595f02d16a29a100209e2ea9d61fd8a83d00354c77ec0d391. The maintained specification and vendored fixture files are byte-identical, SHA-256 ea577f62bcc21bb2453b73566bfd469fa85a4ab8f28ce27d95fdacf996414eed.

The documented overlap now matches the existing Running Pace specification. Current tests still pass for the direct prediction workflow and optional custom target. Child processes invoked by maintained checks use windowsHide on Windows.

NOT_RUN for this maintenance scope. Real browser interaction and layout, physical devices, screen readers, isolated browser Network/Storage and offline observations, native file dialogs, live HTTPS/SEO, deployment, and independent acceptance.
