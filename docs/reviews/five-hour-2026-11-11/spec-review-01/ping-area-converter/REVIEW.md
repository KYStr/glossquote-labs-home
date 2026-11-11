# 坪數換算：獨立文件審查

**窄幅退修；不建議 ready。** 27/27 案例（含 100/100 速查列）、係數和 99-byte 報告都核對一致。規格另要求用 30 坪證明近似係數會讓輸出不同；這個向量在規定的兩位小數下無法區分，會使正確實作無法通過該項驗收。可以沿用現有表格第 100 列修正。

- [規格 PR #227](https://github.com/KYStr/glossquote-labs-home/pull/227) 為 open draft，head `6d7cc4cd18a273b0d386b19b85b883573d097cba`；任務 `labs-ping-area-converter-spec-20261109`、規格 `spec-ping-area-converter-20261109`。
- 2026-11-11T02:55:24Z 留證；遠端 registry revision 1530 / blob `e01da965f28e5248ca13158094ca356254a25c2b`。原作者任務 reviewing，spec draft、未登記 consumedBy；本人非作者、owner 或 contributor，未參與製作。完整 BRIEF/SPEC/fixtures/AUTHOR-CHECK 的本地 bytes 對上遠端四個 Git blob，見 [source-identity.json](source-identity.json)。
- [Build PR #274](https://github.com/KYStr/glossquote-labs-home/pull/274) 已開啟，head `f1bb55845b9e9f1863626f9dc1c24558ba3a4088`，PR 指向同一固定規格；當時 registry 未查到對應 production task。供主統籌盤點，產品未驗，維持原責任，勿重派。
- 區隔：核對 [既有單位換算來源](https://github.com/KYStr/glossquote-labs-unit-converter/blob/aaea80ab9c02a713b3b58cefdfee101c37814f08/public/js/core/units.mjs)，面積只有 cm²/m²/km²/ha，沒有坪、ft²、畳或本案速查表。冷氣 [PR #154](https://github.com/KYStr/glossquote-labs-home/pull/154) 則以面積輸入推冷房能力。建議把既有通用換算工具補進 scope，具體說明為何選房產用途的專用頁。

| 八節 | 完整 | 分數 | 規格證據 |
|---|---|---:|---|
| goal | true | 95 | SPEC 9–14：房源對照、估價、現場手機和既有數據；不作登記／簽約依據。 |
| scope | true | 92 | 18–27：四單位／100 列／報告，排除價金、權狀解析與量測；獨立核對通用工具之差異如上。 |
| userFlow | true | 95 | 31–48：兩欄、範例、畳概略標註、常駐表、dirty 作廢、cancel/reset。 |
| inputsOutputs | true | 96 | 52–91：精確欄位、先量後單位、BigInt 有理數、一次 half-up、固定檔名／bytes。 |
| implementation | true | 94 | 95–101、161–162：固定來源 Worker、CSP 與零依賴靜態本地運算，明確的資源回收。 |
| acceptance | true | 95 | 105–117、159–173：九面向可檢查，隔離真瀏覽器與正式 SEO 另驗。 |
| tests | false | 87 | 27/27 字面資料相符，含全 100 列、兩種 tie 及控制器；155 行的精度迴歸斷言錯，見 PING-01。 |
| handoff | true | 95 | 177–183：固定 commit、另登記、命令與證據規則、獨審及發布分開。 |

**PING-01（SPEC 155；AUTHOR-CHECK 21）：30 坪不是輸出精度下的反例。** 輸入 `{"amount":"30","unit":"ping"}`，用 400/121 算約 1067.49524794 ft²，換成 3.3058 算約 1067.50005167 ft²，兩者最後均為 **1067.50**。改用 `{"amount":"100","unit":"ping"}`：精確 **3558.32**、近似 **3558.33**。在 SPEC 與作者檢查替換「能區分」的例子，用既有第 100 列斷言差異。保留 30 坪字面案例與原報告雜湊，這兩處數值是對的。

係數與用途已核對：[新北市地政局](https://www.land.ntpc.gov.tw/cp.aspx?n=77) 的 0.3025 坪/m² 等於 121/400，倒數為 400/121；[NIST](https://www.nist.gov/pml/us-surveyfoot/revised-unit-conversion-factors) 的國際英尺 0.3048 m 精確平方為 0.09290304 m²；[埼玉縣住宅供給公社](https://www.saijk.or.jp/consultation/case/other/topic03/) 說明廣告每畳面積基準為 1.62 m² 下限，並非實物規格；[台灣地籍測量實施規則第 276 條](https://law.moj.gov.tw/LawClass/LawSingle.aspx?flno=276&pcode=D0060053) 以 m² 記載建物面積。非阻斷建議：「整數」改為「精確有限小數」；以畳作來源時也說明其他單位受同一概略假設影響，尤其是離開介面的報告；刪除合成檔及 File.arrayBuffer 樣板用語。

[verify.mjs](verify.mjs) 以分子／分母的商與餘數獨立進位，按原 input 推導核心、百列速查及控制器結果，再讀 expected 比對。Node v24.14.0、`node verify.mjs fixtures.json`、exit 0；23 core、1 table（100 列）和 3 controller。30 坪報告獨立序列化 99 bytes、SHA-256 `2363e57e7570dae35a9830eaa3d86b003ca73be825cabeebd297d24f3f14dc20` 與固定文件一致。[全部字面輸入／輸出及 PING-01](verify-output.jsonl) · [命令及雜湊](execution.json)。

產品九項均 **NOT_RUN**；此處只核規格有明定方法與預期。

| ID | 規格所要求的未來證據 |
|---|---|
| functionality | 實際轉換兩種 tie、四輸出、100 列表、固定下載 bytes。 |
| boundaries | 0.001、1,000,000、剛好越界、欄位順序及三控制器案例。 |
| privacy | 乾淨 profile 下實際零工作請求、離線、無 storage/URL/console 內容。 |
| security | 惡意字串惰性、CSP、檔名與資源上限、Worker/Blob 回收。 |
| usability | 兩語桌面與手機、概略標示、清除、恢復、取消及下載。 |
| accessibility | 實際鍵盤、焦點與錯誤關聯、320px、200% zoom、對比與 reduced motion。 |
| localization-seo | 雙語獨立頁、同語首頁、候選 noindex，正式 HTTPS/canonical/hreflang 另驗。 |
| toolchain-provenance | Node 版本、離線 exit、固定來源/PR、SHA-256 與重建同 bytes。 |
| compatibility | 隔離真 Chrome/Edge 的兩語輸入、錯誤、Worker、reset、下載與 reflow。 |

未取得串行寫入 slot，未 ACK、提交 review 或改 ready；主統籌可用本地證據協調原責任。

另列 ready 阻斷 **REG-RUBRIC-227**（不改原規格任務的八項分數）：在遠端 registry revision 1537、blob `73e05eb696e26d943c8eb1fed2e7f5e2bdc89c50`，`spec-ping-area-converter-20261109`.acceptanceCriteria 實填 `goal, scope, userFlow, inputsOutputs, implementation, acceptance, tests, handoff`，和原文件任務八節一致；固定 SPEC 的 `acceptance` 則預宣告 `functionality, boundaries, privacy, security, usability, accessibility, localization-seo, toolchain-provenance, compatibility`。現行 coordination-core（Git blob `4782dd1f249995ceeec00b2d0a89b57d9b9bbb7d`，103、287 行）要求 production 完全繼承已登記 spec 的 criteria，填入正確九項時會被 RUBRIC_MISMATCH，沿用現狀又會用文件八節取代產品驗收。請先依正式權責修正 spec 登記，再以固定版本核對九項和既有 Build；目前不可計入可開工 ready。
