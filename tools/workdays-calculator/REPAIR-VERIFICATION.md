# Workdays Calculator repair verification

Maintenance task `labs-run5-legacy-repair-20261110` on 2026-11-10. Original source is pinned to spec #225 `eb84069e2726fd311a7df0e733377153dd869a87` and build #269 `0be2e551d603d5c0615c7043534d9def5982ddb7`. Both heads matched before the repair and after the final test run. [HANDOFF.md](HANDOFF.md) and [VERIFICATION.md](VERIFICATION.md) record the original author's candidate. This file records the maintenance implementation checks.

## Confirmed changes

- The core checks the raw UTF-16 size before splitting on LF or CRLF. Both separators allow 400 nonblank date lines. The 401st nonblank line returns `ROW_LIMIT` with the physical row number, including blank rows. A lone CR is invalid. At 8193 raw units, `INPUT_LIMIT` takes precedence. The spec and both pages now describe the 8192-unit cap.
- The spec now agrees with the `days` pattern that rejects `-0`. The forward composition rule requires a business-day end and a count within the shift limit. The reversed case requires both endpoints to be business days for a guaranteed match. Without holidays, counting from Sunday 2026-01-11 to Thursday 2026-01-08 gives −1, and shifting by −1 reaches Friday 2026-01-09. The forward check from that Sunday to Tuesday counts 2 and reaches Tuesday.
- Each run constructs a dedicated module Worker using a Blob containing the built core and fixed handler. The controller transfers the projected draft and generation, and gates replies on both the generation and the active worker. Completion, errors, cancellation, editing, replacement, reset and pagehide terminate the active worker. The factory revokes its Blob URL on termination or constructor failure. The preview header uses the pinned `worker-src blob:` scheme syntax and retains the other directives, including `connect-src 'none'`.
- The spec and test fixture files both retain all 26 original cases (23 core and 3 controller), byte for byte. SHA-256 `9330e407544c8f27d57167fafe9606fd426949fed95294d17d123c1ed3ecdc7e`. Additional scenarios are standalone tests. The generated Worker code is tested in a Node module thread with an adapter for the browser messaging global.

## Offline commands

Windows PowerShell with Node v24.14.0. No packages were installed. Serve tests use a task-owned HTTP listener on `127.0.0.1` and close it on completion.

| Command | Final result |
| --- | --- |
| `npm.cmd test` | Exit 0. 67 passed, 0 failed, 0 skipped. |
| `npm.cmd run check` | Exit 0. Static project and syntax checks passed. |
| `npm.cmd run build:preview` | Exit 0 twice. SHA-256 matched for all 10 relative output paths across builds. |
| `npm.cmd run check:generated:preview` | Exit 0. Generated preview matched a fresh build. |

The initial test run had 66 passes and one failure. The new CSP assertion detected that the old loopback header quoted `blob:`. Correcting the scheme token resolved the failure on the final run.

The Windows persistent environment guard reported `PASS` and identical snapshots before and after the commands.

| Scope | PATH registry type | Raw length | Ephemeral entries | PATH SHA-256 | Environment key SHA-256 |
| --- | --- | ---: | ---: | --- | --- |
| HKCU | ExpandString | 834 | 0 | `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb` | `3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a` |
| HKLM | String | 1255 | 0 | `328294fe5e4b7651fc02e57312458ddcf7e7dbc0e149f5e835b07901871e8ee1` | `574ce42c7e2944222825c635962871249fa21b339683bad7a7877521b7ffbae8` |

## NOT_RUN

Real Chrome and Edge module Worker startup and termination, Blob URLs in browser, keyboard and focus, cancellation timing, layout, zoom, contrast, reduced motion, physical devices, screen reader, Network/Storage and browser offline checks, native download interaction, and production HTTPS/SEO remain NOT_RUN. Independent maintenance review, the full nine-aspect product review, acceptance, merge and deployment are outside these implementation results.
