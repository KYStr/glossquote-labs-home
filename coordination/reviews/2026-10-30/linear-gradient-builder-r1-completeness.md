# Linear Gradient Builder r1：非作者文件完整度審查

候選：`aaa8ff63e8673efccc0c21ff2d32632a510f7f42`，PR #6（open draft）。
SPEC：30,674 UTF-8 bytes，SHA-256 `dc165b81145cf881c1b5e0ade66763a87287a9b8d3271c27b01388f802566129`。
審查範圍：固定規格文件可實作性與可驗證性；不是產品品質、GUI、部署或產品 accepted。

## 判準與逐節證據

下表使用協議原有八節完整性布林，不從測試數量推導分數。每列列出可反駁條件；若後續發現正文與此核對不符，應沿同 ID 修訂並重審。

| 節點 | 完整性 | 實際核對及可反駁判準 |
| --- | --- | --- |
| goal | true | §1 指定已有色彩的網站維護者、方向/停止點與輸出不同步的問題；成功旅程需非作者鍵盤完成並將下載CSS套入隔離頁。需求明示假設，未捏造訪談；透明色/圖片/帳戶等非目標具體。若必須另一產品完成基本輸出，或把假設當需求實證則不完整。 |
| scope | true | §2 F01–F08 對應角度、有序2–8停止點與CSS；親核固定be197ea的Color Palette、Image Resizer、Image Overlay、Print Size用途/輸入輸出。色票FAQ排除漸層，另三者為點陣/尺寸，非此流程；registry317保留原owner。本節不代表所有未來工作永遠不重複。 |
| userFlow | true | §3 初始空HEX、正常兩色、增刪移列、錯誤修復、確認取消/Escape、語言導航及hidden/pagehide/BFCache均有結果與焦點規則；composition與generation明示。移列後聚焦同列HEX避免disabled移動鈕；取消未修改結果。若正常流程只能靠隱藏handler則違規。 |
| inputsOutputs | true | §4 descriptor/schema→列數→有界結構→angle→逐列→順序的優先序一致；六位HEX/整數界/不trim、不排序均可固定oracle。下載MIME/名稱/UTF-8/LF/末LF和四行模板明確。本人抽取例子224bytes，最長合法token模板311bytes，小於512；這只是文件算術核對，不是產品serializer測試。 |
| implementation | true | §5 純core、controller、DOM分層與零依賴Node24命令路線清楚；專用同源CSSStyleRule只接驗證後值，CSP下真預覽列必要實測，不以regex或mock認證。對話框、雙語錯誤及固定server根/方法/headers具體，無須以unsafe-inline繞過規格。 |
| acceptance | true | §6 九個既定產品面向全部有方法、預期、證據及未測阻擋規則；桌面Chromium真正常操作、下載、CSP、Network/Storage、keyboard/zoom/reflow皆保留。手機/其他引擎未測分列；未把無設備擴成額外硬gate，也未把pure tests充GUI。 |
| tests | true | §7 T01–T12覆蓋確定輸出/四方向/同位置/非端點、schema與格式、倒序、修改失效、copy晚到、URLcleanup及life-cycle；B01–B06明確原生。本人核angle360與錯HEX時先ANGLE_RANGE、9列先STOP_COUNT、同位置保序，未見與§4矛盾。四方向依固定CSS Images3向量定義核對；未實際渲染。 |
| handoff | true | §8 要求同候選SPEC/AUTHOR-CHECK、open draft PR、非作者審查、同ID修訂和另production task/claim；源碼/命令/產物/未測/回復基線齊列，accepted、ready、merge、deploy/catalog各自分開。此審查不替新產品承接或發布。 |

## 對九項產品要求的可測性判斷

- functionality/boundaries：有固定合成輸入、精確CSS與錯誤順序，可用獨立expected；真UI/下載必須另證。
- privacy/security：要求完整旅程Network/Storage與同候選實際headers/CSSOM；純資料流與regex只作補充，不代真觀察。
- usability/accessibility：非作者正常旅程、鍵盤焦點、320 CSS px、真200%zoom、文字/控制對比觀察有明確產物；未獲讀屏設備不得報讀屏PASS。
- localization-seo：兩語相同CSS bytes、靜態metadata及真導航；preview與正式URL不混淆。
- toolchain-provenance/compatibility：Node24零套件可重建與精確產物manifest；至少一個真桌面Chromium與版本/OS/date，未知範圍誠實列出。

## 必須保留的限制

1. 本輪沒有產品程式、產品tests、browser、Clipboard、下載檔、CSSOM/CSP實跑或品質評分；以上未來要求全未執行。
2. copy的3秒timeout只失效應用回條，不能撤回OS寫入；新應用操作不代表前次OS工作已取消。規格已明示，不增加虛假保證。
3. 下載URL最多一個及30秒cleanup可用替身核生命週期，但真正檔案由瀏覽器接管仍需原生檢查；UI不能說已保存。
4. CSSOM同源規則變更的實際CSP相容性是產品必要gate，不在此文件審查預先放行。
5. 八節有文字驗收條件與>=90門檻，但沒有固定數值錨點/權重；本報告不自行把完整=true換算90。task review accepted的數值事件尚未提交。原協議mark-spec-ready本身使用八節布林，與task accepted分開。
6. 本報告是本人的非作者判斷，不改原作者、claim、產品九項分數、PR head或deployment。

## 參考

- [候選 SPEC](https://github.com/KYStr/glossquote-labs-home/blob/aaa8ff63e8673efccc0c21ff2d32632a510f7f42/docs/specs/linear-gradient-builder/SPEC.md)
- [固定 brief](https://github.com/KYStr/glossquote-labs-home/blob/1c96bc9d84642d751f246feceaa20cdfc25a25b2/docs/specs/linear-gradient-builder/BRIEF.md)
- [CSS Images 3：方向與停止點](https://www.w3.org/TR/2023/CRD-css-images-3-20231218/#linear-gradients)
- [CSS Color 4：HEX](https://www.w3.org/TR/2026/CRD-css-color-4-20261029/#hex-notation)
