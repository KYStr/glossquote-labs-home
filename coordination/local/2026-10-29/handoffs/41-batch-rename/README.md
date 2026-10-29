# 批次檔名整理 · Batch Rename

**這是規格，尚未實作。** 本文件定義本工具的用途與範圍；候選網站尚未部署，任何驗收案例都不是已通過的測試結果。

## 工作與 MVP

收據、照片與附件準備交付前，使用者可在本機選取檔案、固定清單順序、預覽新檔名，再下載一份 ZIP 副本。下載前第一屏必須清楚顯示：

> **下載重新命名後的 ZIP 副本。原檔不變；ZIP 不壓縮，下載後需解壓。**
>
> **Download a renamed ZIP copy. Your originals stay unchanged. The ZIP is uncompressed; unzip it after download.**

MVP 只有兩種互斥命名方式：以 `file-001` 開始的序號命名，或對檔名主體做字面、非重疊取代並可加前綴。每次最多 100 個檔案、每檔 16 MiB、合計 64 MiB。工具只在目前瀏覽器記憶體中處理檔案 bytes，輸出不壓縮 ZIP；不寫回、覆蓋或修改來源檔案。

這是個中高難度的靜態瀏覽器工具，難點是 Unicode 檔名驗證、跨平台名稱衝突、ZIP 二進位結構與可取消讀取的競態處理。正式瀏覽器端零 runtime 套件，不需要帳號、伺服器處理或網路服務。Node.js 24+ 僅供開發與測試；Python 標準函式庫只用於獨立 ZIP 驗證，不安裝套件。

## 不做的事

- 不選取或打包資料夾，不支援資料夾拖放或拖放；只使用一般多檔案選擇器。
- 不使用 File System Access API、不寫回來源檔，也不呼叫覆寫 API。下載同名 ZIP 時由瀏覽器/OS 按使用者設定處理；工具不控制儲存位置或同名檔案對話框。
- 不解析、預覽、清理或轉換檔案內容；內容 bytes 與其中的 EXIF、文件屬性等內嵌 metadata 都原樣保留。
- 不執行正則表示式、腳本、解壓縮、加密、壓縮、雲端上傳、遙測、分析或第三方 API。
- 不宣稱所有檔案系統有相同 Unicode 大小寫規則；工具只採用明確、保守的碰撞比較規則。

## 規格導讀

- [產品需求與資料生命週期](PRODUCT.md)
- [技術與 ZIP 契約](TECHNICAL.md)
- [介面、雙語文案與 SEO](UX-SEO.md)
- [未執行的驗收案例](ACCEPTANCE.md)
- [分階段實作與發布閘門](TASKS.md)

實作者也需遵守本工具的[隱私與生命週期](docs/PRIVACY-SECURITY.md)、[工程與發布基線](docs/ENGINEERING.md)及[設計系統](docs/DESIGN-SYSTEM.md)。

建議 slug：`batch-rename`。候選網址：`rename.glossquote.com`；此名稱只是待審候選，不代表已確認 canonical、已公開或已部署。M1 僅可產生本機候選並通過 CLI 驗收。瀏覽器 gate 目前是 `NOT_RUN_USER_FOCUS_INCIDENT`；主代理核准的隔離 browser gate 未通過前，不得進 M2 GitHub 公開。M3 部署與首頁整合由主代理處理，且只能在 M2 之後另行啟動。

