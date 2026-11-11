# 壁紙用量計算：獨立文件審查

**退修；不建議 ready。** 17/17 份字面案例與固定規格一致；額外反例證明「保守購買估算」可少算至物理上不足的捲數。產品九面向均為 NOT_RUN，未更動登記。

- 任務 `labs-wallpaper-calculator-spec-20261109`、規格 `spec-wallpaper-calculator-20261109`；[PR #226](https://github.com/KYStr/glossquote-labs-home/pull/226) 開啟、draft、head `f8939291d2e283f1e6496d3a9cc802a054732200`。
- 2026-11-11T02:50:58Z 留證；遠端 registry revision 1530 / blob `e01da965f28e5248ca13158094ca356254a25c2b`，spec 為 draft、未登記 consumedBy，作者任務 reviewing。owner/claimId 見 [review.json](review.json)。本 chat 非作者，未參與製作，registry contributors/author/owner 均無本 chat。
- BRIEF、SPEC、fixtures、AUTHOR-CHECK 已完整讀取；本地四檔 Git blob 與固定 head 一致，見 [source-identity.json](source-identity.json)。固定派工 [PR #284](https://github.com/KYStr/glossquote-labs-home/pull/284) 的 TASK.md、sources.json 也已對上本地 bytes。
- [既有 Build PR #270](https://github.com/KYStr/glossquote-labs-home/pull/270) 開啟，head `6be517b99651d23d082e7ad9b84a288583068d56`、PR 說明明指此規格。Registry 當時無對應 production task；此證據只供主統籌對帳，保留來源與原責任、不可重派或把未登記等同未製作。比對既有工具：油漆用量為塗覆面積轉公升，瓷磚／地板用覆蓋面積與塊數，壁紙採逐幅寬度、捲長與對花。

| 八節 | 完整 | 分數 | 規格證據 |
|---|---|---:|---|
| goal | true | 95 | SPEC 9–14：裝修前桌面與賣場手機，已量尺寸／捲標，目標幅數、裁切長、購買捲數。 |
| scope | true | 95 | 18–27：MVP 與不做的異形、特殊貼法、價格等，12 牆／20 開口，不與油漆或地板重複。 |
| userFlow | true | 94 | 31–49：兩種量法、明示範例、錯誤復原、dirty 立即作廢、cancel、reset、切語清除。 |
| inputsOutputs | false | 75 | 53–93：公分、列順序、精確面積與下載契約可驗；WALL-01/02 阻斷。 |
| implementation | true | 94 | 97–102、150–151：Node 24 無依賴、靜態雙語頁、固定來源 Worker、世代隔離、CSP、loopback 預覽。 |
| acceptance | true | 95 | 106–118、148–163：九面向有可驗方法、預期與證據；真瀏覽器與正式 SEO 另驗。 |
| tests | false | 84 | 17/17 字面案例重算一致；沒有防住 WALL-01/02 的購買不足／不可能尺寸。 |
| handoff | true | 96 | 167–173：固定版本、交驗命令／證據、同 ID 重審、另取 claim、隔離及發布分流。 |

**WALL-01：部分高度窗戶被當成整條牆寬可省略。** 以周長 3.18 m、高 2.50 m、捲 0.53 × 7.80 m、窗 1.59 × 1.20 m、無對花、0% 損耗輸入。現規格扣除窗寬後算 3 幅、每幅 2.60 m、每捲 3 幅，給 **1 捲**。一捲只有 **4.134 m²**；扣除窗戶後仍有 **6.042 m²** 要覆蓋，未算任何裁切損耗便至少需要 2 捲。這也反駁第 159 行 FAQ 稱只刪「完全覆蓋」的幅。建議 MVP 對部分高度開口只扣淨面積、不扣幅數；本例應為 **6 幅、2 捲、淨面積 6.04 m²**，並加字面案例。同時更新 BRIEF、SPEC、FAQ 及既有 Build 的對應行為，保留原責任。若仍做寬度扣除，須有可驗證的放置／裁切規則保證結果足以覆蓋。供應商 [The Inside 自家估算說明](https://www.theinside.co.nz/blogs/wallpaper/should-i-deduct-doors-and-windows-when-measuring-for-wallpaper) 說明開口常只中斷幅、不消除整幅；[Cole & Son 自家說明](https://cole-and-son.com/pages/frequently-asked-questions) 確認按幅估捲的實務及圖案類型限制。反例不依賴供應商特定算法。

**WALL-02：開口高度可以超過牆高。** 把上例窗戶改成 0.90 × 3.00 m，規格接受並回傳淨面積 5.25 m²。應拒絕牆高 2.50 m 內的 3.00 m 開口，指出第 1 列高度欄；釘定錯誤代碼及多錯首錯次序、補字面案例。

非阻斷建議：釘定無效 mode 和模式相關鍵同時錯的首錯；移除「成功但有待修列」及 File.arrayBuffer 文句（整份失敗、無檔案輸入）。

[verify.mjs](verify.mjs) 只用已核對的 fixtures 和規格規則；整數公分 BigInt、面積最後進位、逐牆計數、控制狀態與晚到結果分別從 input 推導，再與 literal expected 深比。使用 Node v24.14.0、`node verify.mjs fixtures.json`，exit 0（14 core + 3 controller 相符）。[完整輸入、獨立推導、字面預期、成功報告的 canonical SHA-256、反例](verify-output.jsonl)；[命令及檔案雜湊](execution.json)。單次背景執行，無長建置或產品程式、無 GUI。

九個產品驗收面向皆維持 **NOT_RUN**，文件可測性範圍如下：

| ID | 規格所要求的未來證據 |
|---|---|
| functionality | 逐幅與逐牆數值、全報告 bytes；修正後納入 WALL-01。 |
| boundaries | 合法端點、首錯和列號；修正後納入 WALL-02。 |
| privacy | 乾淨 profile 載入後 Network、Storage、URL、log 與離線運算。 |
| security | 惡意字串 inert、CSP、固定檔名、上限與 Worker/Blob 釋放。 |
| usability | 兩語雙裝置、量法切換、列增刪、dirty、取消／恢復及下載。 |
| accessibility | 真鍵盤及焦點／狀態、320 CSS px、200% 縮放、觸控尺寸、對比與減少動畫。 |
| localization-seo | 兩語獨立 HTML/狀態文字與回鏈、候選 noindex；正式才查 canonical/hreflang、robots/sitemap、HTTPS。 |
| toolchain-provenance | Node 版本、重建相同 bytes、來源/PR head、exit、零依賴。 |
| compatibility | 隔離真 Chrome/Edge 的輸入、Worker、取消、重設、Blob 下載與 reflow。 |

主統籌串行 slot 尚未授予；本地證據已完成，沒有 ACK/review/mark-spec-ready 寫入。修正須新固定 head 重審。

另列 ready 阻斷 **REG-RUBRIC-226**（不改原規格任務的八項分數）：在遠端 registry revision 1537、blob `73e05eb696e26d943c8eb1fed2e7f5e2bdc89c50`，`spec-wallpaper-calculator-20261109`.acceptanceCriteria 實填 `goal, scope, userFlow, inputsOutputs, implementation, acceptance, tests, handoff`，和原文件任務八節一致；固定 SPEC 的 `acceptance` 則預宣告 `functionality, boundaries, privacy, security, usability, accessibility, localization-seo, toolchain-provenance, compatibility`。現行 coordination-core（Git blob `4782dd1f249995ceeec00b2d0a89b57d9b9bbb7d`，103、287 行）要求 production 完全繼承已登記 spec 的 criteria，填入正確九項時會被 RUBRIC_MISMATCH，沿用現狀又會用文件八節取代產品驗收。請先依正式權責修正 spec 登記，再以固定版本核對九項和既有 Build；目前不可計入可開工 ready。
