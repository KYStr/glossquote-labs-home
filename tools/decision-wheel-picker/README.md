# Decision Wheel Picker

A fair random picker: paste one option per line (2–50), spin the wheel,
and one option is drawn uniformly with `crypto.getRandomValues` and
rejection sampling — the result is drawn before the wheel animates.
Optional elimination mode removes each pick until one final remaining
entry is left. Nothing is stored or sent anywhere.

- Spec: `docs/specs/decision-wheel-picker/SPEC.md` in `KYStr/glossquote-labs-home`
- Develop: `node scripts/serve.mjs` (loopback preview)
- Verify: `npm test`, `npm run check`, `npm run build:preview`, `npm run check:generated:preview`
- Status: build-first production candidate, pending independent review (see HANDOFF.md and VERIFICATION.md).
