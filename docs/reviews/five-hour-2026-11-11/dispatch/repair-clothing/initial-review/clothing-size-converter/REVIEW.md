> 派工用初審文字快照。原始腳本及完整離線證據保留於本輪交接包；以下非HTTP本地連結以文字保留，並非已發布檔案。原報告 SHA-256：fac283105d891b95527195302e1f5be5e7830ba10e42911517366226a9d454ed。

# 服飾尺寸換算：獨立文件審查

**退修；不建議 ready。** 21/21 字面案例與表內規則一致；但女裝 US 0 的查表與驗證文字相斥，女裝「EU」欄實際取德國欄，且兩個來源宣稱不能逐格重現。這會影響使用者在結帳前解讀尺寸。

- [規格 PR #228](https://github.com/KYStr/glossquote-labs-home/pull/228) open draft，head `ed41923a0c653a92b2602d0ed02deba873a42ec5`；任務 `labs-clothing-size-converter-spec-20261109`、規格 `spec-clothing-size-converter-20261109`。2026-11-11T03:00:07Z 留證。
- 讀完 BRIEF、SPEC、fixtures、AUTHOR-CHECK 與 [固定作者簡報](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)。本地四檔 bytes/遠端 blob 核對（本地證據：source-identity.json）。registry 原 owner/claim 未變；本人未參與作者工作。
- 鞋碼以腳長和鞋碼制查表、戒圍以指圍／直徑查表，均有不同的遠端規格；本案為成人上衣胸圍／胸部圍度。另有 [Build PR #273](https://github.com/KYStr/glossquote-labs-home/pull/273)，head `6371152d930e32aae8a0ef590ca44dd4bf5fe2da`，其描述列出規格 SHA `ed41923a03d27c2c826658f4a27749ea188728a2`，與 #228 固定 head 不同。登記無相符 production task；記給主統籌對帳，保留來源及原責任，不重派、不推論產品 bytes 是否一致。

| 八節 | 完整 | 分數 | 規格證據 |
|---|---|---:|---|
| goal | true | 92 | SPEC 9–16：桌面網購與店內手機、手上標籤／胸圍資料、完整對照與免責。購買結果文字應限於參考。 |
| scope | true | 95 | 16–32：15 列、成人上衣，明示不做鞋／戒／兒童／下身與品牌追蹤。 |
| userFlow | true | 94 | 36–53：量測／尺寸、範例、結果附近免責、dirty、取消、重設和移焦。 |
| inputsOutputs | false | 72 | 59–108：毫米、區間、schema 和報告可驗；CLOTH-01/02/03 影響可用尺寸或來源語義。 |
| implementation | true | 94 | 112–118：可由零依賴原生 ESM、字面表、固定 Worker、靜態雙語及本機隱私實作。 |
| acceptance | true | 94 | 122–134、168–183：九項有實測方法，真 Chrome/Edge、SEO 與本地靜態分流。 |
| tests | false | 82 | 21/21 案例與兩表不變量相符；缺 US 0 尺寸模式及來源/地區標籤的可驗案例。 |
| handoff | true | 95 | 185–193：同 repo、固定版本、另取 claim、測試/證據/停止條件分開。 |

**CLOTH-01（SPEC 69、75、82）：女裝 US 0 有兩種合法讀法。** `{"garment":"women","mode":"size","measurementCm":"","fromSystem":"us","sizeValue":"0"}`。文字稱 0 格式合法但對照表無此碼，應回 UNKNOWN_SIZE；表格和查表規則卻應回第 1 列、matchedBy=numeric、胸圍 [74,79)、UK 4／EU 30／JP 3。建議保留表內 US 0，明寫「合法但是否命中依欄」，加女裝 US 0、另一欄的未知 0，以及前導零 00 的字面檢查。

**CLOTH-02（SPEC 9、75、80–89、178；AUTHOR-CHECK 13）：以泛稱 EU 對照單一德國制。** 女裝輸入 EU 36 時釘版表給 UK 10／US 6，但 [ASOS 自家尺寸表](https://www.asos.com/discover/size-charts/women/) 的 European 36 是 UK 8／US 4。[Mercari 自家上衣參考](https://gl.help.jp.mercari.com/en/guide/articles/gl_0014/) 對同一組 US 4／UK 8 明分 DE 34、FR 36、IT 40；作者所列 [來源表](https://size-charts.com/topics/clothing-size-chart/) 的 34 也標 Germany。品牌免責已存在，仍須把選單、表頭、結果、SEO 的泛稱改成實際採用的「德國制參考」或明確支援的地區版本；沒有對應地區的標籤不得被當成可直接採購的同尺碼。補測 DE 36 的參考值及使用者能在輸入前辨認此限制。

**CLOTH-03（AUTHOR-CHECK 9–20；SPEC 82、95–101）：來源宣稱和釘版格子不一致。** 作者稱男裝逐格取 [Orbitika 自家表](https://orbitika.app/blog/us-uk-eu-clothing-and-shoe-size-converter/)。其 EU 52 列的 JP 是 XXL，並非 2L，US 欄只列字母、數字 42 位於 UK 欄。釘版輸入男裝 JP `XXL` 卻回 UNKNOWN_SIZE；若要用 2L 並支援來源別名，需明定對應，否則應說明規格與來源刻意不同。女裝第 1 列所稱取自 [MiniWebtool](https://miniwebtool.com/clothing-size-converter/) 的 XXS 行，實讀目前為 US 00／UK 2／EU 30／JP 3，非作者宣稱 US 0／UK 4。請保存實際版次／欄位或逐格明列調整依據；沒證據的新增格不稱為來源的等值。Roberin 輔助參考未能透過 web 存取，未用來證實任何等值。

verify.mjs（本地證據：verify.mjs） 手錄 SPEC 表、整數毫米比較、逐來源制查欄與獨立推導控制器狀態。Node v24.14.0、`node verify.mjs <固定 fixtures.json 路徑>`、exit 0；18 core + 3 controller、15 列連續、各制代碼唯一、下界歸列／最高上界排除。全部 literal input/expected、獨立值、反例與 SHA-256（本地證據：verify-output.jsonl） · 命令及雜湊（本地證據：execution.json）。非阻斷建議：量測提示說明是身體胸圍、不是衣物平量寬；移除檔案／列號模板文字。

九個產品面向均 **NOT_RUN**：functionality（兩種模式及實際報告）、boundaries（半開區間與首錯）、privacy（Network/Storage/URL/log）、security（惰性輸入、CSP、上限與資源）、usability（雙語桌面／手機狀態）、accessibility（真鍵盤、320px/200%/對比）、localization-seo（雙頁、候選 noindex、正式另驗）、toolchain-provenance（exit/來源/重建 hash）、compatibility（真 Chrome/Edge、Worker/Blob）。未以資料表重算替代實測。

另列 ready 阻斷 **REG-RUBRIC-228**（不改原規格任務的八項分數）：在遠端 registry revision 1537、blob `73e05eb696e26d943c8eb1fed2e7f5e2bdc89c50`，`spec-clothing-size-converter-20261109`.acceptanceCriteria 實填 `goal, scope, userFlow, inputsOutputs, implementation, acceptance, tests, handoff`，和原文件任務八節一致；固定 SPEC 的 `acceptance` 則預宣告 `functionality, boundaries, privacy, security, usability, accessibility, localization-seo, toolchain-provenance, compatibility`。現行 coordination-core（Git blob `4782dd1f249995ceeec00b2d0a89b57d9b9bbb7d`，103、287 行）要求 production 完全繼承已登記 spec 的 criteria，填入正確九項時會被 RUBRIC_MISMATCH，沿用現狀又會用文件八節取代產品驗收。請先依正式權責修正 spec 登記，再以固定版本核對九項和既有 Build；目前不可計入可開工 ready。

尚未獲串行 slot，未 ACK、寫正式 review 或 mark-ready。
