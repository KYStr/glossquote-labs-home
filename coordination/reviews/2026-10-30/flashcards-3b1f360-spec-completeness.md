# Flashcards r3 規格完整度獨立審查

審查日期：2026-10-30。結論：**REVISE，尚不能將八節全部標為 true。** 這是既有規格的文件完整度審查，不是產品品質評分或產品失敗判定；沒有執行新的產品測試。

## 固定範圍與來源

- 規格：`cloud-spec-flashcards-r3-existing`；既有工作：`cloud-flashcards-r3-existing`。審查者不同於登記的規格作者，未製作本候選。
- 固定文件 [SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/3b1f36083d08eb3a780c3d6cccc31e1ff1d63fcf/archives/cloud-candidates/2026-10-29/flashcards/source/docs/SPEC.md)：5,694 UTF-8 bytes；SHA-256 `80a7c8eb09f806695c9e53d115e083d24ae18ff35256d8b9ae082348386dc94e`；Git blob `f5c23238c0fffdd8fc93e5412c761935cffbc84a`。
- 同一固定 commit 的 [README](https://github.com/KYStr/glossquote-labs-home/blob/3b1f36083d08eb3a780c3d6cccc31e1ff1d63fcf/archives/cloud-candidates/2026-10-29/flashcards/source/README.md)、[BROWSER-QA](https://github.com/KYStr/glossquote-labs-home/blob/3b1f36083d08eb3a780c3d6cccc31e1ff1d63fcf/archives/cloud-candidates/2026-10-29/flashcards/source/docs/BROWSER-QA.md)、兩份 VERIFICATION、CHECKPOINT 與 MANIFEST 均已全文核對。已讀的規格、瀏覽器查核與驗證文件未提供具體的原生可及性驗收步驟表。
- 審查時 registry revision 366：此 spec 為 reserved、readiness=null；既有工作 blocked、submission=null。既有九面向與全部 owner/claim 不變。

## 八節逐項結果

| 節 | 本輪判定 | 固定證據 |
| --- | --- | --- |
| goal | true | README L5–7：貼上 CSV、翻面自評、洗牌、JSON 進度與可列印 TXT；不是自動判分或間隔重複。 |
| scope | true | SPEC L7–16、20–28：兩語、貼上而非檔案匯入、容量與狀態、兩種匯出、記憶體處理、preview-only 非目標。 |
| userFlow | true | SPEC L7、12–16、20–22：空白初始、驗證、開始、揭答、自評、不環繞前後卡、重啟、清除確認、語言退出與匯出。 |
| inputsOutputs | true | SPEC L8–12、20–22、34：CSV 文法/碼點/位元組、重複獨立 ID、錯誤記錄號、JSON 欄位與 TXT 縮排/編碼、普通資料 schema。 |
| implementation | true | SPEC L13、26、28、34、38 與 README L11–16：rejection-sampled shuffle、限制 sink、零依賴、原始資產/腳本/測試、同 snapshot fail-closed 建置與預覽邊界。 |
| acceptance | **false** | 大部分功能、安全與生命週期已有可判定契約；但原 accessibility 面向的主要練習流程及縮放/AT 通過預期不完整，見 R1。 |
| tests | **false** | SPEC L30 指定自動測試類別，README L13 提供命令；原生可及性部分只有項目名稱與 NOT_RUN，沒有足以對同一流程重現判斷的操作/預期，見 R1。 |
| handoff | true | README L3、11–24；固定 VERIFICATION/CHECKPOINT/MANIFEST：候選身分、建置入口、preview 根、歷史證據與不可沿用到原生驗收的限制清楚。 |

這些布林是**文件內容的核對結果**，不是產品分數，也不是將六節換算成通過率。沒有以是否恰好存在八個同名標題判定完整度。

## R1 原可及性驗收的操作與通過預期缺口

原登記 `accessibility` 面向要求「鍵盤、焦點、縮放、行動尺寸、讀屏與原規格可及性」。SPEC L30 只列真 320px、200%、鍵盤、AT 等項目；固定 BROWSER-QA L3 再列相同 NOT_RUN 類別。SPEC L16 有清除 dialog 的取消/確認焦點契約，**此部分並不缺，也不需要重寫**。但文件沒有把下列原有範圍連成可重現的驗收方法：

1. 主要練習旅程：從輸入/驗證、開始、揭答、自評、前後卡到唯讀匯出預覽，應如何以鍵盤完成；哪些焦點、卡片位置/答案/自評狀態須讓使用者察覺，何種不可達或失去焦點算失敗。
2. 320px 與 200% 的可用性：應檢查哪些輸入、題答、操作與預覽仍可到達/閱讀，以及內容裁切、遮擋或捲動的可接受邊界。文件只寫尺寸與 layout 名稱，不能單憑「有拍到畫面」判通過。
3. 讀屏：至少固定代表性的輸入錯誤、揭答/換卡、自評狀態、確認 dialog 之操作與應可辨識的內容/狀態；現有文件沒有這組可觀察預期。

**最小修訂**是由原責任者為這些既有可及性要求補一張「操作 → 可觀察預期 → 應保留證據」表，並連回原九面向與已寫清楚的 SPEC 狀態契約。可用既有合成 CSV，不需新增功能或現在執行原生測試。測試時再記錄實際瀏覽器、OS、輔助工具版本；未預填版本不是本次阻擋理由。不得藉此新增實體手機、額外引擎或部署門檻，也不得把既有要求移除。

## 明確不是此次缺陷的事項

- GUI、下載、Crypto、IME、BFCache、Network/Storage、列印與 hosting 尚未實測，是**產品證據尚缺**，不單獨構成規格不完整。
- SPEC L15、22、34 的下載 lease 契約一致：工作內容及新匯出權立即失效，已啟動的最多四個 URL 保留原 60 秒，到離頁/語言退出則回收。此處沒有發現先前其他產品的「立即撤銷與不可早撤」矛盾。
- CSV/JSON/TXT 與 fail-closed 建置已有明確契約；不要求重跑歷史 76 個作者測試或舊獨審組數作為規格審查。
- 無新產品碼、GUI、server、CI、部署、PR approve/merge；沒有數值品質分或 accepted 結論。

## 狀態與下一步

保持 spec reserved/readiness=null、既有 task blocked/submission=null；不執行 mark-spec-ready，也不代原 owner resume/submit。原九面向不變：functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility。

目前 core 的 mark-spec-ready 要求八節全 true；本次缺口不能以通過狀態掩蓋。已被 task 引用的 spec 不能直接走 revise-spec 覆蓋（SPEC_ALREADY_ASSIGNED）；應由原責任方在既有協作規則下保存可追溯補充修訂，再由非作者核對其固定證據與合法接線。這不是新增可用庫存，也不授予任何人原製作所有權。
