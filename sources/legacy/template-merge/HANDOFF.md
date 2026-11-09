# Source review handoff

M2A code and release bytes were independently accepted by the primary before this M2B public source publication. The implementation remains the same 30-file executable input set. Hosting and external review remain pending.

- Source tree SHA-256: `6d849192668ecd94e06df5259e74d79ab0d65b9b6fdaf2ffbd3336246a966f88` ([per-file source records](evidence/review/source-manifest.json)).
- Release site tree SHA-256: `ebf9af6a161e142c71e34fac3feeb6dce47321bdfc8b9110db41827b632f1e71`.
- Release manifest SHA-256: `1c1235605d57fd66985ff564941cdbff2e67f5a0cb7f1780eb1c831a998e1fb2` ([manifest](evidence/review/release-manifest.json), [all release file hashes](evidence/review/release-files.json)).

The source publication excludes credentials, account configuration, host environment snapshots, private workspace history, scratch/cache folders, node_modules, generated dist/release output and historical migration scripts. All actual test fixtures are committed public inputs or generated from them by the documented preview build. No external fixture download is required.

The release configuration is an assets-only candidate with the approved templates.glossquote.com domain, no runtime Worker entrypoint, bindings or vars, and all metrics/observability flags disabled. It has not been deployed by this publication task. Read [README](README.md) for the fresh-clone command order.

[Acceptance scope](evidence/review/acceptance.json) preserves all five browser NOT_RUN cases, the distinction between offline tests and actual browser checks, and pending hosting/external review. Machine-specific local evidence and the final repository commit receipt are retained by the owning workspace, outside this public source tree.
