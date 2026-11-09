# 照片聯絡表：候選規格

模式：Product App。使用者挑照片或交接素材，需要從編號總覽回到原檔。成功狀態是 PNG 縮圖總覽與同序完整檔名文字索引，兩者都由使用者明確下載。

## 固定來源與防撞工

2026-10-28 GitHub read-only 搜尋 `user:KYStr image-contact-sheet`、`user:KYStr contact` 與 author/user PR 搜尋無同名 repo/PR。這不能排除使用者桌面未推送工作，故只做雲端隔離候選，沒有 repo 建立、push、部署或首頁 catalog 修改。

- home/catalog：`KYStr/glossquote-labs-home@26525d5f6380915ea95dde879dec769442db0d95`
- resizer README/package/build：`KYStr/glossquote-labs-image-resizer@4a68c2d8aa99ea66fbb2a904ec50f2fbb760f558`
- images-to-pdf README/AGENTS/TECHNICAL/UX-SEO/docs：`KYStr/glossquote-labs-images-to-pdf@bd0ac474b2b73f11c419df032fcc45488c36c948`
- catalog 原意：「把多張 JPEG／PNG 排成編號縮圖總覽，下載 PNG 與完整檔名文字索引。」「最多 30 張；PNG 的檔名標示可選，原圖留在本機。」status=draft，publishedAt=null，urls=null。

## 階層與版面

- 常用：加入圖片、順序、欄數、縮圖尺寸、建立總覽、清除。
- 相鄰：每張上移/下移/移除；結果旁 PNG 與索引下載。
- 進階一層：圖片間距、頁面邊距、PNG 檔名開關；格式/記憶體限制與說明。
- 桌面：15rem 設定欄 | 剩餘圖片清單＋總覽（主區域）。
- 手機：全寬設定、接續全寬圖片清單＋總覽；DOM與視覺順序相同，不隱藏能力。

## 範圍

30 張上限，單張8MiB、合計原檔64MiB；單圖16MP、8192px邊長。標準靜態PNG、8-bit baseline/progressive JPEG（灰階/RGB）；不支援動畫、SVG、HEIC、WebP輸入或CMYK JPEG。所有檔案先檢查 bytes/header，再串行 decode。PNG framing 與動畫/方向、JPEG SOF/SOS/EXIF 做預檢，實際像素由瀏覽器解碼器驗證；不宣稱自製完整圖片驗證器或安全掃描。

縮圖保留比例且不放大，最大320px邊；取代來源 File 參照以降低常駐記憶體，保留檔名、原尺寸與原檔byte數（後續批次合計額度仍按原檔大小計）。白底PNG、每張編號、可選單行截短檔名。完整索引為 UTF-8 純文字，每行編號＋Tab＋JSON 字串，控制字元跳脫，避免檔名換行假造新列。重複檔名不合併。

1–6欄，縮圖120/180/240/320px，間距0–64px整數，邊距0–96px整數。輸出上限16MP、8192px邊長、64MiB實際PNG bytes；無效設定顯示錯誤，不偷改尺寸。

## 生命周期與限制

- 一次新增採原子提交：任何格式/解碼失敗不加入部分批次，既有圖片保留，但舊匯出同步失效。
- 所有生成受generation fence約束；取消/清除/離頁不接受晚到結果。原生decode不能立即中止，UI解碼期限30秒，未settle的單一原生lease會阻擋新增decode並說明可重試/重新整理；晚到bitmap一律close；沒有假承諾瞬間釋放/安全抹除。
- 清除、首頁與語言導航有頁內捨棄確認，可取消或Esc保留工作。
- 編碼30秒逾時，失敗無下載。URL每種至多一個（PNG/TXT），重複下載重用、最後點擊60秒後回收；編輯/清除/pagehide立即回收。
- 不上傳、不讀寫storage、不遠端字型、不telemetry；不改原檔。下載本身由瀏覽器管理，不聲稱清除已下載檔案。
- 不列印、不PDF、不ZIP、不照片全品質備份、不保證色彩/metadata/DPI保真。可用記憶體與原生解碼成本不由此工具完全控制。
- preview only noindex，沒有production canonical/sitemap，不猜正式網域。
