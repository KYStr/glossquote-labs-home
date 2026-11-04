# 附件大小分包 / Attachment size bundler

**候選 slug：** file-bundler  
**候選 domain：** file-bundles（僅供主代理評估；M1 不發布、不假設網域已存在）  
**M1 狀態：** 本目錄目前是規格交付。實作、Node checks/build 與瀏覽器驗收均尚未執行；不得把規格視為完成產品。

## 產品說明

這是供需要把一批附件放進郵件或上傳表單的人使用的本機工具。使用者選取檔案、輸入單一 ZIP 的大小上限，工具以穩定的 first-fit-decreasing 規則分組，並在瀏覽器記憶體中真正建立可下載的 ZIP。每張結果卡顯示 ZIP 的實際位元組數、內容檔名和 CRC32；另可下載一份總索引。

這款工具解決的是按 ZIP 實際位元組大小分包的完整工作，不只列出哪些檔案應放一起，也不嘗試上傳檔案。工具採 ZIP STORE，不壓縮內容；每包大小精確包含 ZIP header、UTF-8 檔名、central directory 和 EOCD。分組採穩定近似演算法，不宣稱包數最少。

## 目標使用者與價值

目標使用者是手上有多個本機檔案、知道收件端單檔附件上限，想避免反覆嘗試上傳的人。工具不需要帳號、網路服務或安裝程式，輸入內容留在目前分頁記憶體中。難度為中等，主要風險是 ZIP 二進位格式、大小邊界、檔名安全和取消後清理。

M1 依照 TASKS.md 交付可操作的中英雙語本機候選版本、離線 Node 測試、check 與 build。M1 不部署或公開來源；主代理另行決定 M2 放行。瀏覽器操作、檔案選擇器、下載、鍵盤與版面驗收目前都是 NOT_RUN。

## MVP 範圍

- 最多選 100 個檔案，合計最多 64 MiB。
- 可用整數位元組或整數 MiB 設定單包 ZIP 上限，允許範圍 1 byte 至 64 MiB，預設 20 MiB。
- 驗證檔名、大小與正規化後的大小寫不敏感碰撞；有任何錯誤就不產生部分 ZIP。
- 以檔案內容大小遞減、原始選取順序破同分，按 ZIP 實際 serialized size 做 first-fit-decreasing。
- 真正建立 ZIP STORE 檔，逐包顯示精確 ZIP 位元組數並提供每包下載。
- 另外提供 schemaVersion 1 的 JSON 總索引，保留原始選取索引、檔名、大小、CRC32 與包名。
- 可取消工作；重新選檔、重設或離開頁面會令舊工作失效並釋放 worker 和 object URL。

## 非目標

不支援壓縮、分卷 ZIP、目錄樹匯入、拖放整個資料夾、密碼、雲端上傳、伺服器端工作、來源檔刪除或覆寫。工具不讀寫其他路徑，也不保證在任何郵件服務的額外 MIME 編碼後仍符合該服務上限；使用者輸入的是 ZIP 檔本身的位元組上限。這不是最少包數最佳化器。

## 閱讀順序

先看 PRODUCT.md 的功能與錯誤契約，再看 TECHNICAL.md 的 ZIP 格式及介面，UX-SEO.md 定義中英雙語介面，ACCEPTANCE.md 是精確測試 oracle，TASKS.md 是實作順序。共同安全、工程及設計契約見本工具目錄的 AGENTS.md、docs/PRIVACY-SECURITY.md、docs/ENGINEERING.md 和 docs/DESIGN-SYSTEM.md。

本規格作者未執行產品程式，也沒有執行任何瀏覽器驗收。
