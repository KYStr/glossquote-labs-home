# Box Shadow PR10 — independent clean check/build evidence

## Scope and conclusion

**PASS for clean check/build reproducibility only**, observed 2026-10-30 UTC. This non-author review fills the clean-build sub-gap in the [fixed quality report](https://github.com/KYStr/glossquote-labs-home/blob/cc88f35742c61961707539a2eb2f3c15d1b74c13/coordination/reviews/2026-10-30/box-shadow-pr10-ca2a5e-quality.md). It is not a product score, acceptance, or a reassessment of that report's other gaps.

Fixed candidate: [PR10](https://github.com/KYStr/glossquote-labs-home/pull/10), commit `ca2a5e194f538b50aca9f22b9d6c03367ebfb1bc`, `tools/box-shadow-builder/`. Requirements: [SPEC at ee9683cb](https://github.com/KYStr/glossquote-labs-home/blob/ee9683cb60a4823e14768a26e24b782f59c6acac/docs/specs/box-shadow-builder/SPEC.md). The product owner, submission, PR head and existing review are unchanged by this evidence file.

## Source and method

- Read the fixed specification, full quality report, README, PROVENANCE, VERIFICATION, runtime manifest and the actual check/build scripts. The existing quality report explicitly had no independent clean build; older author clean-build evidence was not reused as this result.
- In a new isolated directory, reconstructed all **23 tool-source/evidence files** and checked each Git blob hash against the fixed public candidate. Existing cloud source bytes were used only after this comparison; the fixed public runtime manifest was obtained from GitHub. This is an exact file-tree reconstruction, not a claim of a fresh Git clone.
- The initial directory had neither `dist/` nor `node_modules/`. This tool's fixed file tree contains no package.json or package-lock: the documented commands use Node built-ins and local source only. No dependencies were installed and no package manager or package lifecycle scripts were run.
- Used Node **v24.22.1** with a minimal environment. The inspected command paths contain no network requests; no network download was needed for execution. This is not an OS-level network-isolation audit.
- Ran each documented check/build command **once**, then compared the seven built runtime files and generated manifest byte-for-byte with the fixed public runtime source/manifest. Verified all 23 input files stayed unchanged and `dist/` contained only the seven regular, single-link runtime files plus manifest.

## New command observations

| Command | UTC start | UTC finish | Exit |
| --- | --- | --- | --- |
| `node scripts/check.mjs` | 12:50:57.808175 | 12:50:57.979069 | 0 |
| `node scripts/build.mjs` | 12:51:10.169692 | 12:51:10.226442 | 0 |

Check stdout:

```text
Static syntax, translation keys, comments and declared safety checks PASS
```

Build stdout:

```json
{"files":7,"manifestSha256":"c3a51ecc1dca9dbdfaf1b0fbacd390e4dfc441fbf2a5c7ab52c72acadd3d0bbf"}
```

The check script exercises syntax, translation-key parity and declared static safety checks; its successful exit is not proof of complete browser security, accessibility or privacy.

## Exact runtime result

The generated `dist/MANIFEST.json` is byte-identical to the candidate's `RUNTIME-MANIFEST.json`: **948 bytes**, SHA-256 `c3a51ecc1dca9dbdfaf1b0fbacd390e4dfc441fbf2a5c7ab52c72acadd3d0bbf`, Git blob `52c1e8963040e55fe64d86451190035816b41599`.

| Runtime path | Bytes | SHA-256 |
| --- | ---: | --- |
| `index.html` | 3125 | `0609a6c8195da20fb103e642b496d236c1a0b17a0ff92cc21797be8c6ac02a13` |
| `en/index.html` | 3130 | `9769765da2fa39d52c8f1eeb29be33cade07785bc1153d295d259a53f97f1b87` |
| `styles.css` | 5344 | `27e87dddc97ea58f7b0532a347d3c61ee3285fa3d55f386a0e8d06b8ef98e3c8` |
| `core.mjs` | 4809 | `3197da7eda67c6a02f14f0e727858636636d04abbc4859f2e004ce733d65bc28` |
| `controller.mjs` | 5414 | `e25d07adee9591f4ab4dc383e83fdd2376d7ca79f5c5640eefff3eb3dc7adea1` |
| `app.mjs` | 8902 | `f25ce9bf1037ddd293cc34e8bd6862645cad435647eb511cd13341437181ad89` |
| `i18n.mjs` | 6774 | `116b7170502308049754b5c673065b55366c4e75949709763931beab91d1c302` |

## Remaining boundaries

- Did not rerun the author's or previous reviewers' unit suites, controlled-DOM cases or browser journeys; no old counts are presented as new tests.
- Did not start a server or browser, use the shared preview, alter source, change registry ownership/readiness, approve/merge a PR or deploy anything.
- Did not perform the separate documented modification/recovery experiment, malicious-tree toolchain tests, FAQ expansion, or the outstanding browser/accessibility/privacy evidence from the quality report.
- Therefore the **toolchain-provenance aspect is not assigned a score here**. The quality reviewer can use this narrowly scoped reproducibility evidence alongside the still-required evidence; no existing null or score is overwritten by this document.
