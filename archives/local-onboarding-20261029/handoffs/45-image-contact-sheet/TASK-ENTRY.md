# B20-45-M1 — 照片聯絡表

日期：2026-10-23（Asia/Taipei）。原功能對話的 M1 實作；requested model `gpt-6.1-sol` / `max`，實際 backend 身分未獨立驗證，未切換模型、另開對話或委派。

## 本輪範圍與完成條件

在本工具允許路徑內建立雙語、本機原生 Canvas 產品候選：最多 30 張 JPEG/PNG、完整 contain 縮圖、排序／欄數／檔名標籤、PNG 與同序 TXT、取消與資源清理。Node 24 零相依離線測試、靜態檢查、閉合 build 通過後凍結來源清單。瀏覽器 gates 保持 `NOT_RUN_USER_FOCUS_INCIDENT`；M1 不等於完整驗收或 release。

已讀：root AGENTS、SECURITY-BASELINE、PRODUCT-THESIS 的產品／安全範圍、完整 GLOSS-TOOLS-DESIGN-SYSTEM；本工具 AGENTS、START-HERE、README、PRODUCT、TECHNICAL、UX-SEO、ACCEPTANCE、TASKS、HANDOFF 及 docs 五份契約。使用 `frontend-design` 技能協助實作，專案契約優先。

## 介面決策

- 模式 Product App；設計師／賣家要把選圖編號交給對方，主物件是完整聯絡表。
- Always visible：加入照片、順序、欄數、顯示檔名、產生與下載、目前狀態。
- Adjacent：每張照片的上移／下移／移除，預覽的符合寬度／實際尺寸。
- Progressive：格式、cap、記憶體與清理說明，使用 details。
- 寬版左側 15rem 清單 + 可伸展畫布；Standard 14rem 清單 + 畫布；Compact 依序堆疊清單、設定、畫布與操作。單一結果畫布，不產生來源縮圖。
- 使用家族語意色彩與系統字型 fallback；無外部 asset／字型／套件。PNG 標籤的 12/14px 與固定格線來自輸出規格；preview 實際尺寸只變更檢視，不改 PNG/TXT。

## 實作與安全

整批 size/header preflight → ready → serial decode/draw/close → native `canvas.toBlob('image/png')` → result。HTML `File` input 到產品預設 `createImageBitmap(file,{imageOrientation:'from-image'})`，沒有替代影像服務。EXIF 1–8 預檢與視覺尺寸核對；真正鏡像／旋轉像素仍需 browser gate。

selection／排序／欄數／檔名變更會 generation++、同步停用下載並清 Canvas/Blob/URL。新 selection 等舊 native work settle，再做預檢；舊 callback 不能復活。pagehide 清引用；返回快取恢復空工作區，不自動 reload 或恢復來源。clear/reset 可恢復操作。

沒有 browser/server 啟動、CUA、CDP、截圖、native dialog、桌面輸入、clipboard、credential、npm install、Git 寫入／推送或部署。scripts 的 child syntax checks 使用 `shell:false/windowsHide:true`。既有程序、分頁與共享檔案均未操作。環境 guard 前後及命令詳見 HANDOFF 與 evidence。

## 驗證紀錄的解讀

Node 用合成小圖片 bytes、獨立公式 oracle 與明確標示的 fake DOM/Canvas/decoder 檢查接線、caps、順序、取消、生命週期。Node File/Blob 為真正 Node 物件，但 fake canvas 回傳的 Blob **不是 PNG bytes**。不得把測試通過解讀為 browser 解碼、Canvas 出圖、實際像素／下載、記憶體或畫面驗收。

正式狀態、完整命令／exit、初始測試等待逾時與修正、凍結來源及未驗項目見 [HANDOFF](HANDOFF.md)。M2 等主代理親自驗收與另行放行。

## B20-RP-45 / M1B 追加（2026-10-23）

已完整閱讀本輪 `.runs/batch20-release-prep-2026-10-23/TASK.md`。依派送主代理已驗 M1 核心／CLI，這輪只做原生靜態發布準備；沒有更改 public、dist、M1 evidence、規格、AGENTS、docs 或共享檔案。無另開對話／子代理，requested gpt-6.1-sol/max 未以自述確認 backend。

新增固定 origin `https://contact-sheet.glossquote.com`、toolSlug `image-contact-sheet` 的 release build/check，輸出 `release-artifacts/site/` 與外層 manifest。來源使用完整 public allowlist 與 M1 pins，HTML body/runtime 完全保留，僅 release head SEO、robots、sitemap、X-Robots-Tag 作契約指定變化。原 test/check/build/dev 保留；check 更新允許兩個新 script，舊 tooling test 的臨時目錄改到 m1b，避免寫舊 evidence。

47個不可變 M1／契約檔已在動工前記錄 bytes/SHA，13個 public 與原 M1 inventory 對照。新增16項針對性 release tests 已通過；最終完整命令與環境／來源凍結結果見 HANDOFF 追加段及 m1b evidence。full suite 只作相容性檢查，不升格為真 browser／像素驗收。重現與輸出隔離詳 [M1B-RELEASE](M1B-RELEASE.md)。

本輪沒有 GitHub、部署、服務啟動、browser/CUA/IAB/native/CDP、憑證／環境secret讀取、持久設定或 auth 修改。M1B不是M2放行。
