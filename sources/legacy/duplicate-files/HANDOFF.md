# Source publication handoff / 來源交接

2026-10-27. This source package is authorized for public review under https://github.com/KYStr/glossquote-labs-duplicate-files. Source publication does not deploy hosting.

- Local candidate and release tooling are implemented with Node24 ESM and built-in modules.
- Root independently reviewed the release scripts/tests and byte-identical artifact set.
- Root browser evidence: 24 combined product cases PASS, 14 NOT_RUN retained. No browser or native UI is executed in this publication step.
- The release manifest SHA-256 is a8577a7b29d5b23968bbdf95790231167f523f7d89109122a9d1450529f3d7e1; see [manifest](publication/release-manifest.json).
- Exact Node validation commands and observed outcomes are recorded in [validation](publication/validation.json).
- All test/ contents and nested fixtures are preserved. The only test setup correction creates isolated preview fixtures from public bytes so a clean clone does not require pre-existing dist. Product runtime bytes are unchanged.
- The project uses strict static Wrangler configuration. No credentials, private workspace evidence, account data, scratch, node_modules or browser profiles are included.
- Historical workspace audit runners and their private path-bound evidence are outside this public package; the portable build/check/release commands and all tests are included.

Hosting, actual HTTP redirects on the final site, bilingual homepage integration and external acceptance remain separate steps for the primary reviewer.
