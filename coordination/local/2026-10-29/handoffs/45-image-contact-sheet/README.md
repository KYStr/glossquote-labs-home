# 照片聯絡表

**English:** Photo contact sheet  
**狀態：** 產品規格，尚未實作。

## 你要完成的工作

設計師或賣家有一組 JPEG/PNG 圖片，想讓對方用編號挑選，不想逐張傳送或猜一串檔名。這個工具把最多 30 張照片排成一張完整縮圖聯絡表，附編號、可選檔名及文字對照清單。

MVP 一句話：在本機依使用者排序和欄數將照片完整縮放入格、不裁切，匯出一張 PNG 和編號對照 TXT。

## 為什麼有用

輸出是可以直接交給他人選圖的完整工作成果：一張可視化索引加一份同號文字清單。它不是相簿、批次壓縮或拼貼編輯器；不加濾鏡、修圖或雲端分享。

## 環境與難度

需有支援 JPEG/PNG 解碼及 Canvas 匯出的現代瀏覽器；Node.js 24+ 僅用於純函式測試和 build。原生 HTML/CSS/ESM、零 runtime 套件，無帳號/API/上傳。難度高：解碼器差異、大圖記憶體、EXIF 方向與 Canvas 輸出需安全退出。

## 不包含

- 不讀 GIF、APNG、SVG、HEIC 或不明格式；不修復損壞圖檔。
- 不裁切、去背、修圖、重採樣原圖供下載或儲存 metadata。
- 不上傳、分享連結、分析照片內容或讀取地理位置欄位。
- 不保證所有瀏覽器都可解碼大型圖片；能力不足時清楚拒絕。

## 閱讀順序

[產品需求](PRODUCT.md) → [技術契約](TECHNICAL.md) → [介面與搜尋資料](UX-SEO.md) → [驗收 oracle](ACCEPTANCE.md) → [實作順序](TASKS.md)。共用規則見 `docs/BRAND.md`、`docs/ENGINEERING.md`、`docs/PRIVACY-SECURITY.md`、`docs/DESIGN-SYSTEM.md`。

English summary: Arrange up to 30 local JPEG or PNG files into a numbered, uncropped contact sheet. Export one PNG and a matching text index. Files stay in the page; unsupported or oversized inputs are rejected before decoding.
