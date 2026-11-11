# Nine-spec mapping independent preflight

[Read the substantive eight-section assessment](INDEPENDENT-PREFLIGHT.md). This is preflight evidence for PR304 at `4bc6d4e300d315597a4b1ea5feb86f6f2d6fc1c0`, pending lawful task registration, submission and independent formal review. It performs no registry writes and does not mark any specification ready.

With Node.js 24, run from this directory:

```sh
node reproduce-preflight.mjs ./new-output
```

The output directory must not exist. The entry point downloads 101 fixed public inputs, verifies every Git blob, then independently checks 40 identical specification files, 81 exact product-criteria labels, 159 relative links, historical r1588 registry state, accepted maintenance sources and inherited maker identities. Public HTTP GETs are used only to obtain evidence; no authentication is read, no service is installed, and no product code is run. Windows child processes use `windowsHide: true`.

[Results](portable-result.json) and [per-target evidence](preflight-results.json) record the actual execution. [Input pins](input-manifest.json) include 45 candidate files, 41 prior source files, 14 shared link targets and one full historical registry blob. [The excerpt](registry-excerpt.json) is checked against that full pinned registry rather than trusted alone. This is a reproducible historical check, not a current-registry acceptance operation.

The content assessment uses the reviewer's own earlier same-byte work. [Five unchanged specs](UNCHANGED-FIVE-SECTION-EVIDENCE.md) and their [93 prior numeric rows](unchanged-five-fixture-evidence.json) are reused without rerunning arithmetic. Separate fixed precision and calories reviews are linked in the assessment. Heading checks in the portable script establish structure only; the report separately records substantive evidence for all 72 sections.

Document completeness and available production stock are different. Six specs are legacy candidate continuations and race is an existing-tool upgrade; all seven stay draft under the fixed primary amendment. NHI and calories still need a duplicate-product check and lawful review/apply/ready before they could count. Product GUI, runtime implementation, deployment and new ready inventory are not claimed here.
