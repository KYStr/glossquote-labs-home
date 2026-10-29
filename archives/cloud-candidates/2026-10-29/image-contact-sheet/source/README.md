# 照片聯絡表 / Photo contact sheet

**雲端隔離候選，未發布、未部署。** 把最多30張JPEG/PNG排成編號縮圖，調整順序/欄數/縮圖/間距/邊距/檔名顯示，下載PNG與完整檔名文字索引。繁中與英文靜態頁；瀏覽器本機運算，不上傳、不儲存使用者輸入。詳見 [規格與來源](docs/SPEC.md)。

## 可重現命令

Node.js 24+；只有內建模組，**不需要 npm install**。

```sh
npm test
npm run check
npm run build
node scripts/snapshot.mjs
# 非managed且獲授權的環境才啟動此傳統loopback預覽：
npm run dev
```

本任務managed雲端只能排共用sites-preview daemon，不直接執行dev；由獨審copy設定static.directory=dist（並清空dev）保持產物bytes不變。

非managed環境預覽 `http://127.0.0.1:4238/index.html` / `http://127.0.0.1:4238/en/index.html`；只服務 `dist/` 靜態白名單，port被占用時失敗，不殺其他程序。`build`只建立noindex preview，沒有發布介面。變更頁面文案在`scripts/pages.mjs`後，需同步重新產生兩份`public/*.html`；check會拒絕不一致。

## 重要界線

每張8MiB、合計64MiB、最多30張；單圖16MP/8192px。輸出16MP/8192px/64MiB；符合上限不代表每種裝置都能配置記憶體。縮圖並非原畫質備份。PNG可帶檔名、文字索引必定含原名，分享前請檢查隱私。

接受標準靜態PNG及8-bit灰階/RGB baseline/progressive JPEG；不接受動畫或其他格式。EXIF方向由預檢與原生解碼共同處理；需真瀏覽器與方向fixture驗收，Node測試不證明原生圖片正確解碼。

安全掃描是靜態輔助，不是完整安全證明。實際瀏覽器下載、Network/Storage、BFCache、320px、200%zoom、物理裝置/AT/其他引擎，須看 `docs/VALIDATION.md` 分別狀態，不得用Node測試冒充。

沒有選定軟體授權；此候選未複製近鄰實作，只參照產品/工程規格。未修改任何既有repo、首頁catalog或使用者本機。
