# UX 與 SEO：重複檔案找出來

候選 slug duplicate-files；候選 domain duplicates 只是提案。M1 noindex,nofollow,noarchive，沒有未驗證 canonical。

| 欄位 | 繁體中文 | English |
|---|---|---|
| Title | 重複檔案找出來｜本機檔案比對 | Find Duplicate Files — Local File Comparison |
| Description | 在瀏覽器本機找出內容完全相同的檔案，確認要保留哪一份，再下載清單。 | Find byte-identical files in your browser, choose which copy to keep, and download a report. |
| H1 | 找出內容相同的檔案 | Find files with identical content |
| 短說明 | 逐 byte 驗證相同檔案；你決定保留項目，工具不會刪檔。 | Byte-verify matches. You choose what to keep; this tool never deletes files. |
| Primary action | 選取檔案 | Choose files |
| Candidate status | 本機候選版；尚未部署 | Local candidate; not deployed |

繁中頁為 /index.html，英文頁為 /en/index.html。語言選項是普通 anchor；切頁後目前 memory-only 的檔案選取、分析結果與未下載報告會遺失。連結旁固定顯示繁中「切換語言會離開此頁；未下載的報告和分析結果會遺失。」英文「Changing language leaves this page. Selected files and undownloaded reports will be lost.」不跨頁保存輸入。每頁各自使用正確 title/description/H1、錯誤、empty/progress/result/FAQ。檔名是 untrusted text；控制與 bidi 字元以可見 escape 顯示。

桌面工作區（>=75rem）：

    ┌ 品牌 | 重複檔案找出來 | 語言連結 ────────────────┐
    │ H1 / 在瀏覽器本機分析，不會刪除來源檔             │
    ├────────────────────────────┬──────────────────────┤
    │ [選取檔案] / drop           │ 上限 200 files       │
    │ 來源清單：順序、名稱、大小  │ 合計 128 MiB/單檔32 │
    │ [移除]                      │ [開始掃描]           │
    ├────────────────────────────┴──────────────────────┤
    │ hashing 12 / 40  [取消]                            │
    │ 群組 1：keeper ○ a.txt | duplicate ○ b.txt         │
    │ 群組 2：唯一內容 c.txt                              │
    │ 3 unique | 1 duplicate | saved 3 bytes              │
    │ [下載 JSON] [下載 TXT] [重新開始]                  │
    └───────────────────────────────────────────────────┘

中版（48–74.999rem）單欄，選檔和限制在結果上方。窄版（<48rem）單欄；結果群組可摺疊，但 keeper radio/input 不可隱藏或只用顏色表示。行動版長檔名可折行，並保留 sourceIndex。

    ┌ 品牌 | 工具 | EN ┐
    │ H1 / 短說明      │
    │ 警語：離頁會失去未下載報告 │
    │ [選取檔案]       │
    │ 已選 3 / 200     │
    │ 0 a.txt 3 B [移除] │
    │ 1 b.txt 3 B [移除] │
    │ [開始掃描]       │
    │ hashing 2 / 3    │
    │ [取消]           │
    │ ○ 保留 a.txt     │
    │ ○ 重複 b.txt     │
    │ [JSON] [TXT]     │
    └──────────────────┘

empty 提供 file input 和拖放提示。selected 顯示檔數和總量。hashing/verifying 顯示階段和逐檔進度，取消明顯。ready 每組顯示 keeper 選項、重複項和 summary。錯誤精確指出檔案/限制；取消後可重試；source change 清除舊分析並提示重跑；reset 回 empty。結果不會因時間自動失效，只於清除/新工作/來源變更/pagehide 清理。只有一個 primary action，progress/error 使用 live region。

無障礙：原生 input/button/radio/fieldset/legend；keeper 用 radio group 且 label 讀出檔名和索引；focus ring 明顯，targets >=44px；320px 無水平捲動，200% zoom 所有動作可用；檔名文字不可引發 HTML；對比依 docs/DESIGN-SYSTEM.md；reduced motion。不以動畫作進度唯一提示。

FAQ：
繁體中文：
1. **工具會刪除重複檔嗎？** 不會，只產生報告；你可自行決定是否處理來源檔。
2. **檔名相同就算重複嗎？** 不會。工具先按大小與 SHA-256 找候選，再逐 byte 比對內容。
3. **不同檔名但內容相同會找到嗎？** 會；名稱不參與判斷，報告用選取順序索引區分。
4. **空檔案會被忽略嗎？** 不會，空檔案可分組；重複空檔不會產生 bytes 節省。
5. **檔案會上傳嗎？** 不會，候選版在目前分頁本機分析。

English:
1. **Does the tool delete duplicates?** No. It creates a report; you decide what to do with the source files.
2. **Do matching names count as duplicates?** No. Candidates are grouped by size and SHA-256, then compared byte for byte.
3. **Can it find identical files with different names?** Yes. Names do not determine matches; the report uses selection indexes to distinguish them.
4. **Are empty files ignored?** No. Empty files can form a duplicate group, though removing one saves zero bytes.
5. **Are files uploaded?** No. The candidate analyzes files locally in the current tab.

Candidate 不加入虛構評價、使用者數或「保證安全」聲明。公開 source、hosting、domain 與首頁連結由 parent 依 M2 gate 決定。
