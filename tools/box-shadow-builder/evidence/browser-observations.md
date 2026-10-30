# Finite author browser observations — 2026-10-30 UTC

Automated normal visible controls in managed desktop Chrome, HTTP loopback port 4173. These are author self-tests, not blind-user testing, independent quality scores or deployment evidence. Screenshots were directly inspected in the browser session; they are not provided as fabricated artifact files. Initial viewport screenshot width 1180 CSS px, full-page capture; exact browser version/OS are recorded separately if obtained.

Runtime r1 manifest SHA256 `2292e5c1a20a7be914d7d7512e40ad599a3be693565e3bd905896afa8ef78c2e`:

- 07:51:31 initial Traditional Chinese has one empty HEX layer, no generated result.
- 07:51:49 normal Generate with x12/y8/blur0/spread0/#112233/100/outer: native screenshot visibly shows a hard right/down shadow, CSS/summary match.
- 07:52:06 normal Download emitted a real download; independently read file contents match the three-line CSS for that input. Downloaded bytes SHA256 `fff937e88c83850feb64da5fb4319161701be1add7d32c5aba006cd3aff15ae5`. UI says handed to browser, not disk-save success; download button disabled and lease notice shown.
- 07:52:17 changed x to10 and mode inset, generated again before original lease expired: new download remained disabled. Clear→Cancel preserved x10/inset/result and returned focus to Clear. Internal URL revoke timing was not observed through browser instrumentation; separate controlled-controller tests address it.
- 07:52:30 native screenshot shows inset band inside left/top rather than outer projection. English→Confirm navigated to the English blank initial page, no old result.
- 07:54:43 English initial Generate points the first error at empty HEX and focuses its input. Correcting HEX and adding a layer focuses the new layer's empty HEX.
- 07:54:59 two outer layers x0/y8/blur0/spread0/100, red then blue: screenshot shows red front. Keyboard Move earlier on blue moves the complete layer, focuses its stable HEX field, invalidates output; Generate shows blue front and corresponding ordered CSS/summary. This is a finite same-plane case, not all spec B03 variants.
- 07:55:18 adding to four layers disables Add; removing last layer returns to three and focuses the new last layer HEX.
- 07:55:42 Clear→Confirm yields one initial layer, empty HEX focused, no result.

Final r2 manifest SHA256 `55b6571c528e5d849ab4f2d8ab793a279b6056f47510ac57b612e79cbc110b02`:

Only each HTML source line gained a Chinese explanatory HTML comment; core/controller/app/i18n/styles bytes are identical to r1. Separate frozen r2 served by the same single managed preview.
- 07:56:45 reload English, fill #112233/default numeric values, Generate: correct fixed example CSS and summary. Copy click displayed “Clipboard API reported success. Confirm the content at its destination.” No clipboard read or receiver paste was performed; this is API-success observation only.
- Browser console sample contains extension metadata errors from a chrome-extension source; do not mislabel these as application exceptions or claim the whole console/network environment clean.

NOT_RUN: confirmed BFCache, native permission rejection, clipboard receiver verification, exact native 30s expiry/revoke tracing, all geometry variants, full four-layer repair journey, screen reader, forced colors, 200% zoom/320px, actual network/storage privacy audit, cross-engine/mobile and deployed canonical/hreflang/home integration. Controller substitutes do not fill these native gaps.

07:58 UTC exact environment lookup via chrome://version was denied by browser URL policy (HTTP/HTTPS only). No retry or alternate inspection bypass was used. Exact Chrome version and OS remain **unknown**; a separate CI runner's version must not be substituted. This limits complete compatibility evidence, not the fact that the documented native screenshots/download occurred.
