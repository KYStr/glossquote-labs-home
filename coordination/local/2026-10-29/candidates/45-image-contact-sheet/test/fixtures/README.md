# 合成 fixture 範圍

`images.mjs` 完全以 Node builtins 建構資料，沒有真實照片或下載素材。

- `makePng()` 預設為 3×2 RGBA PNG，使用 zlib 與自行計算 CRC。`headerOnly:true` 的大尺寸案例只有一像素壓縮資料，**僅供 parser 測試**，不得代表可解碼。
- `makeJpeg()` 是含 SOF/SOS/EOI 的 **parser-only** bytes，沒有完整影像表格，不能作為 decoder PASS。
- `asymmetricJpeg(1..8)` 是原創小型 baseline JPEG encoder：16×24、六個固定灰階 8×8 區塊，供未來瀏覽器方向 gate 使用。Node 只驗其結構，不宣稱實際解碼成功。
- 延後的 browser oracle：raw 區塊列 `[32,220] / [96,160] / [64,192]`；orientation 1 保持原位、2 左右鏡像、3 旋轉180°、4 上下鏡像、5 主對角線轉置、6 順時針90°、7 反對角線轉置、8 逆時針90°。1–4 輸出16×24，5–8輸出24×16；必須比較區塊位置，不能只比維度。
- 透明 oracle：`makePng({rgba:[[255,0,0,0],[0,255,0,128],[0,0,255,255],[0,0,0,255],[255,255,255,255],[255,0,255,255]]})`。合成白底後左上為白、上中約 `[127,255,127]`、右上藍；需由真 Canvas PNG 再解碼取樣。

此輪不寫出／檢視圖片、不啟動 browser/server；browser gates 為 `NOT_RUN_USER_FOCUS_INCIDENT`。
