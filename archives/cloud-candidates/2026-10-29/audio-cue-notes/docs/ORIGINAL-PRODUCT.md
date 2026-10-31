# Preserved specification

Original file: `PRODUCT.md`; original SHA-256: `16efa5938ab08594f13adcad0c6b9a6ecf38cdc8d90b6e8fb1bba62dc06c6b62`.
This is historical specification evidence, not a new completeness review or acceptance.

---

# 錄音時間戳筆記 — M0 短規格

雲端隔離、未發布候選。僅依 GitHub 已確認來源，不聲稱讀過使用者本機 Codex 未推內容。

## 來源與去重

2026-10-28：KYStr/glossquote-labs-home 的 catalog.json（blob aee12124696bbf216fdd3bbdca1e447fa7f423e8）之 audio-cue-notes 仍 draft，publishedAt / urls 皆 null。GitHub 搜尋 `user:KYStr audio-cue-notes` repo 與 `user:KYStr is:pr "audio-cue-notes"` 沒有命中；補充搜尋 `user:KYStr audio` 僅找到用途不同的 web-media-saver；`user:KYStr is:pr "錄音時間戳"` 無命中。搜尋結果不是未公開工作不存在的證明。
- 繁中名稱：錄音時間戳筆記；description：聽本機錄音時加入時間戳筆記，方便回到重要片段。
- 繁中 useCase：整理訪談或課程重點；此工具尚未發布。
- English: Timestamped Audio Notes; description: Add timestamped notes while listening to a local recording.
- English useCase: Mark interview or lecture highlights. This tool is not released yet.
- 手寫筆記，不是自動逐字稿。Manual notes, not automatic transcription.
- 架構參考：glossquote-labs-subtitle-shift（codex/subtitle-shift-m2）、glossquote-labs-event-timeline（codex/m2-source）；README、package、純核心/DOM 分層、preview 白名單和隱私/品牌規則。

## M1 行為

1. 使用者明確選擇一個本機音檔（非空，≤ 200 MiB；audio MIME 或 MIME 空白且副檔名屬 mp3/wav/ogg/m4a/aac/flac/opus/webm）。只建立 blob URL 讓原生 audio controls 播放，不讀入完整檔案、不上傳、不錄音、不轉錄、不使用 AI。
2. 音檔 metadata 必須回傳有限正時長，最多 24 小時。格式支援由瀏覽器決定；讀不到時長或逾時 15 秒則顯示雙語錯誤並釋放資源。替換音檔前有資料時確認；取消保留原檔/筆記/未儲存編輯。切換成功則開啟空白筆記集。每次載入建立獨立 audio 元素和 generation，舊事件不得污染新檔。
3. 點「標記目前時間」會暫停播放，鎖定毫秒時間到編輯區，讓使用者手寫文字並儲存；亦可直接填入 HH:MM:SS.mmm。每則 1–2000 UTF-16 字元，可多行；最多 300 則，拒絕控制字元、不完整 Unicode。每個時間須介於 0 與音檔長度（含）之間。新增/編輯/刪除都有明確控制；列表依時間、穩定新增序排列，時間按鈕只定位，不自動播放。
4. 每次文字/時間變更立即使舊匯出不可用。使用者儲存或取消編輯後可點「產生匯出」，取得已儲存筆記的唯讀 TXT 與 JSON；下載各為固定安全檔名、UTF-8 無 BOM。JSON 只有 format/version/durationMs/notes(timeMs,text)，不包含音檔 bytes、blob URL、檔名/路徑。TXT 依語言顯示標題，每則格式 `[HH:MM:SS.mmm] 文字`；換行為 LF，末尾無額外 LF。
5. 清除全部、替換音檔、語言切換（有資料時）需 confirm；取消不改變狀態。清除釋放 audio/blob URLs/下載 timers。新的無效選檔會取消較舊 pending 載入並撤銷匯出，但保留目前音檔與筆記；取消更換確認則完全保留原狀。編輯撤銷尚未使用的匯出；已明確開始的下載仍維持個別 60 秒 URL 壽命，不聲稱能撤回瀏覽器下載。pagehide 全清，persisted pageshow 再清；不保存到 storage、URL/history、cookie、Service Worker；不 console 輸出私有內容。
6. 繁中 /index.html、英文 /en/index.html、同語言首頁連結、切換語言明說清除資料。鍵盤可達、label/status/alert、320 CSS px、可縮放、prefers-reduced-motion。初始化完成前欄位 disabled；form 先註冊 preventDefault 才啟用。

## 非目標與驗收

無帳號、依賴、CDN/字型、後端、AI、分享、剪貼簿 API、JSON 匯入、波形、下載原音檔、production/deploy。preview noindex/nofollow，無 canonical/sitemap。

Node 24 內建 node:test：驗證 schema/getter/額外欄位/稀疏陣列、時間解析/上界/排序/immutable、TXT/JSON bytes、檔案/時長界線、race/resource lifecycle；tooling 驗 source/dist allowlist、symlink/hardlink、CSP/media blob、HTTP GET/HEAD/405/404。瀏覽器測試須與受控測試分列；未跑原生下載、真 BFCache、實手機、輔助技術、完整 Network/Storage 不得冒稱通過。
