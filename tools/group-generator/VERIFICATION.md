# Group Generator — Verification

Candidate: (filled in after push; see HANDOFF.md for the branch)
Tool: `tools/group-generator/`
Node: v24.22.1
Spec: `spec-group-generator-20261109`, fixtures SHA-256
`51fd1ac04063da885fde5ebf4a287599283cca837de03d3075ca92f60ce976fb`

## Commands run (all in `tools/group-generator/`)

- `npm test` — exit 0
- `npm run check` — exit 0
- `npm run build:preview` — run twice; the two `dist-preview/` trees
  and the two `BUILD-MANIFEST.json` files compared byte-for-byte
  (`diff` on both the manifest and the recursive SHA-256 tree: no
  differences)
- `npm run check:generated:preview` — exit 0
- `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview`
  + curl: `/` 200 text/html, `/en/index.html` 200 text/html,
  `/nope.html` 404, `/%2e%2e` traversal 403; server stopped afterwards

## Results

- Tests: 48/48 passing, 0 failing.
- Check: passed.
- Build: byte-identical across two runs: yes.
- Generated preview check: passed.

## NOT_RUN

- Real-browser run of both pages (Chrome/Edge), including the Worker
  success path, keyboard operation, 320 px reflow, and 200% zoom: no
  isolated-browser mechanism is available to this builder.
- Real-device checks: not run.
- Independent document review and the nine SPEC §6 aspect scores:
  not run (owned by the independent reviewer, not the builder).
- Registry / coordination commands: not run (build-first mode; the
  coordinator owns registration).
- Merge / publish / deploy: not run, not attempted.

## Known limitations

- See HANDOFF.md ("Known limitations"): the blob-Worker/CSP
  interaction is unproven in a real browser; everything else
  verified above is deterministic and passing.
