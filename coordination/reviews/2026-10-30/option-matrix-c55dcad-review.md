# Option Matrix r3 independent review

## Result and fixed identity

**Revision required, not accepted.** This non-author review concerns only PR5 candidate `c55dcad76a789bfcc317d546d20fc8b7757190da`, under specification `a691bbc5bd984feb032bd450990abf083496d153/docs/specs/option-matrix/SPEC.md`. All nine product dimensions remain present and their scores remain null; missing native evidence is not scored as zero or rounded up to 90.

All 23 public candidate files were fetched at the exact commit and checked against their Git blob identities and the local r3 bytes. An isolated clean build of those public files produced all 13 runtime members, with actual byte sizes/SHA-256 checked. Its manifest is exactly `c05de02930855df9a1f4b512ed904f864469409a3eea6e93b7a0fc6c21e9444c`, matching the managed-preview r3. The actual check command returned CHECK_PASS_STATIC_LIMITED. No dependencies were installed, no product files changed, and no server/browser/CI was launched by this reviewer.

## New defect OM-LIFECYCLE-003

Fixed source: app.mjs lines 33–40 and 64. The pagehide handler clears session, lease, draft and fields but leaves confirmAction, returnFocus and the open dialog. The persisted pageshow handler calls reset without invalidating that pending confirmation.

A new controlled-DOM test imports the actual app and its actual Session/core. It invokes the actual registered handlers rather than reimplementing reset:

1. Normal Load example then Delete first dimension opens confirmation.
2. Ordinary Cancel is the positive control: dialog closes, both dimensions and Login text survive.
3. Open Delete first dimension confirmation again.
4. Invoke pagehide, then pageshow with persisted=true.
5. Two fresh empty dimensions appear, but dialog.open is still true.
6. Activate the retained confirmation. The old callback cannot find its old dimension, so splice(-1,1) deletes the last fresh dimension. The fresh state now has one dimension.

Observed trace: `{"retainedDialog":true,"dimensionsAfterOldAccept":1}`. Two distinct cases: one control PASS and one defect RED. This violates the fixed blank-restoration/lifecycle contract, and does not depend on downloading or changing the five-second generation budget.

This is a true app/controller event-order model, **not a real browser BFCache reproduction**. A separate native attempt was stopped by the execution tool before the Delete dimension click executed; it was not retried by another click/script route. Native reachability of this exact BFCache sequence remains NOT_RUN. The code defect and model evidence remain valid within their stated scope.

Requested narrow correction: invalidate the pending confirmation action and focus reference and close/reset the dialog during lifecycle reset, while preserving normal confirmation cancellation/focus. Keep the original c55 candidate intact and submit a new fixed candidate with affected regressions. Do not weaken the BFCache or fresh-empty-state requirement.

Reproducer SHA-256: `468eac3f1323461c708fe1af9478bd1056fd6dc710313412a9636e3692dced53`.
Raw test log SHA-256: `92d0f77994e09704f2803f6d26c801ffd9a5a757bc8d9b7a1af4d5a9966aae35`.

## Evidence separation

- Historical r2 19 tests and r3 affected 7 tests were read, not rerun or counted as new independent cases.
- Earlier normal four-row downloads and finite r3 ordering-focus checks remain finite evidence. Their original candidate distinctions are preserved.
- The coordinator's new native r3 5×12 journey displayed 51 table rows including header on page one and 11 on page two. Download from page two still contained all 60 rows and matched a literal independent tuple oracle. JSON SHA-256: `f68e6ffd4683b5beba83e64408c3b2b1daf8d6cced2c4c0808bf6a08f52373f8`. This reviewer read that receipt and established the public/runtime identity link; did not claim to personally drive those native actions.
- Both static HTML files' aria-labelledby/aria-describedby references resolve to existing IDs. This limited source check does not establish rendered focus, contrast, screen-reader or zoom accessibility.
- No full product suite was repeated. The fresh build/check are independent provenance observations, not GUI quality.

## All nine product dimensions

| Dimension | Score | Verified scope and remaining requirements |
| --- | --- | --- |
| functionality | null | Source mixed-radix order and immutable output reviewed; historical literal fixtures, real four-row downloads and same-r3 sixty-row full download exist. Complete independent one/six-dimension/2000-row native journey remains incomplete. |
| boundaries | null | Existing raw/codepoint/product/schema/Unicode/timeout/lease evidence read. New OM-LIFECYCLE-003 is RED. Full native lifecycle, composition and controlled late-event coverage must not be inferred from source or models. |
| privacy | null | Source has no intended storage/network APIs and uses only in-memory data. Full native Network/Storage observation across load/input/generate/download/clear/leave/return is missing; source scans are insufficient. |
| security | null | Exact descriptor/schema, literal DOM setters, CSV-risk policy, fixed serializer and build allowlist reviewed. Same-candidate actual hosting headers and full native malicious-input/Network checks are incomplete. No broad security certification. |
| usability | null | Coordinator's finite example/download/clear/order and sixty-row paging evidence retained. Reviewer did not complete the entire independent visible journey; stale confirmation threatens fresh-state recovery. |
| accessibility | null | Static labels/table/confirmation/focus source and resolved ARIA IDREFs reviewed; finite movement-button native focus evidence exists. Both-language full keyboard path, 1280/1024 dimensions, true200% zoom, contrast and narrow-layout observations incomplete. |
| localization-seo | null | Shared algorithms, paired dictionary keys, fixed language/home links and preview-noindex sources reviewed. Complete rendered two-language errors/navigation and same-input output parity not independently completed; no formal deployed SEO claim. |
| toolchain-provenance | null | Exact public23/local23 identity, isolated clean build13, actual member hashes and static check passed with Node24 builtin-only paths. This is concrete provenance evidence, not an automatic numeric score or whole-product acceptance. |
| compatibility | null | Finite managed Chromium normal downloads/order/pagination available. BFCache/background-cancel and necessary fallback coverage incomplete; other engines/mobile untested and not added as new mandatory device gates. |

No task owner, claim, fixed specification, product rubric, candidate source, publication state, permissions or credentials were changed by the review. A revision verdict keeps every original requirement; author repairs must be handed back at a new exact commit.

## Reproduce the controlled new case

Create an isolated input directory containing the 23 unchanged public candidate files below tools/option-matrix, put the following test next to input, and run Node24 `node --test lifecycle-independent.test.mjs`. It creates only in-memory DOM/event surfaces; it does not start a browser or contact a service.


```js
import test from 'node:test'; // 中文：只執行新生命周期反例，不重跑既有套件。
import assert from 'node:assert/strict'; // 中文：固定規格預期，不由受測碼產生答案。
const nodes=new Map(),events=new Map(); // 中文：最小受控DOM紀錄節點與window事件，非真瀏覽器。
function node(tag='div'){return {tag,attrs:{},children:[],handlers:{},value:'',disabled:false,hidden:false,open:false,setAttribute(k,v){this.attrs[k]=v;if(k==='id')nodes.set(v,this);},getAttribute(k){return this.attrs[k]??null;},removeAttribute(k){delete this.attrs[k];},append(...x){this.children.push(...x);},replaceChildren(...x){this.children=x;},addEventListener(k,fn){this.handlers[k]=fn;},focus(){document.activeElement=this;},showModal(){this.open=true;},close(){this.open=false;},remove(){},click(){this.handlers.click?.();this.onclick?.({preventDefault(){}});}};} // 中文：僅提供真app用到的事件與modal表面。
for(const id of ['home','language','fields','add','generate','cancel','dialog','keep','accept','confirm-title','clear','example','table','page','prev','next','json','csv','download-status','status','output','json-preview','risk','validation']){const n=node();n.setAttribute('id',id);} // 中文：固定頁面節點不含隱藏測試入口。
globalThis.document={documentElement:{lang:'en'},body:node('body'),activeElement:null,hidden:false,createElement:node,getElementById:id=>nodes.get(id),querySelectorAll:q=>q==='[aria-invalid]'?[...nodes.values()].filter(n=>n.attrs['aria-invalid']):[],addEventListener(){}}; // 中文：可見表面替身不宣稱真正layout或BFCache。
globalThis.window={addEventListener:(k,fn)=>events.set(k,fn)}; // 中文：只記錄受測app實際安裝的生命周期回呼。
globalThis.location={assign(){throw Error('Unexpected navigation');}}; // 中文：反例不允許網路導航。
await import('./input/app.mjs'); // 中文：真app直接匯入其真Session與核心，沒有重寫controller。
test('control: ordinary cancel preserves two draft dimensions',()=>{nodes.get('example').click();nodes.get('d1-remove').click();assert.equal(nodes.get('dialog').open,true);nodes.get('keep').click();assert.equal(nodes.get('dialog').open,false);assert.equal(nodes.get('fields').children.length,2);assert.equal(nodes.get('d1-name').value,'Login');}); // 中文：正控制證明正常取消不刪草稿。
test('pagehide/persisted reset must discard prior dialog action',()=>{nodes.get('d1-remove').click();assert.equal(nodes.get('dialog').open,true);events.get('pagehide')();events.get('pageshow')({persisted:true});assert.equal(nodes.get('fields').children.length,2);assert.equal(nodes.get('d1-name').value,'');const retainedDialog=nodes.get('dialog').open;nodes.get('accept').click();console.log(JSON.stringify({retainedDialog,dimensionsAfterOldAccept:nodes.get('fields').children.length}));assert.equal(retainedDialog,false,'fresh blank state must not retain confirmation');assert.equal(nodes.get('fields').children.length,2,'old accept must not delete fresh draft');}); // 中文：只模擬事件順序；真BFCache可達性仍需原生觀察。

```
