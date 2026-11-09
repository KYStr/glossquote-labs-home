# 檔案 SHA-256 校驗

已實作的繁中／英文靜態校驗工具：選擇單一本機檔案，在瀏覽器的原生Worker／Web Crypto計算SHA-256，並與來源提供的校驗碼比對。檔案不上傳、不解壓、不預覽內容、不請求下載網址。單檔最多128 MiB，包含空檔；可複製64個小寫hex字元或下載65-byte TXT。

這是供審查的公開來源候選；網站部署、首頁整合與外部複驗仍待主代理。正式候選網址為https://checksum.glossquote.com/index.html及/en/index.html，不代表已上線。T02／T03只有scoped GO，已記錄的PARTIAL／NOT_RUN仍保留，不能宣稱完整MVP驗收完成。最新狀態見[HANDOFF](HANDOFF.md)與[發布候選](docs/RELEASE-CANDIDATE.md)；START-HERE／TASKS中較早的規格與里程碑文字保留為歷史。

## 本機驗收

使用Node24+及npm；零runtime／dev依賴，不需npm install。從乾淨來源根目錄依序執行：

1. npm test
2. npm run check
3. npm run build
4. npm run build:production
5. npm run check:production
6. npm run release:check

預設build生成dist-preview與相容dist；production生成dist-production十七個固定資產。Wrangler只使用dist-production，不部署整個來源資料夾。npm run dev僅啟動loopback預覽；既有port有人使用時會另選隨機port。來源HTML維持noindex預覽；正式建置才加入固定canonical／alternates／JSON-LD／robots／sitemap與本地SVG favicon，並移除預覽未發布片語。

最新產品自動驗收142/142 PASS；主代理另在凍結source執行release測試12/12及check PASS。真128MiB／+1、原生Worker與65-byte managed download已有主代理隔離瀏覽器證據；本地Blob terminal、舊document pagehide及人工／focus incident項目仍依交接保留。HTTP model與Node測試不代替瀏覽器或Cloudflare實測。

## Public source / English

Choose one local file, calculate its SHA-256 in a native browser Worker, and compare an optional expected checksum. Files up to 128 MiB are processed locally. A match confirms content consistency; it does not establish publisher identity or file safety. No account, upload, telemetry, remote font or runtime dependency is used.

This repository is a review candidate. Source publication and a live website are separate milestones. Hosting, homepage integration, remaining browser/manual checks and external review are pending; see the bilingual product and release documents below. No license grant is added by this publication.

## 使用情境與價值假設

下載文件或小型安裝包後核對是否完整；寄送素材前算出校驗碼讓收件人比對；同事在不同系統上驗證手中副本。這些是合理工作情境，尚無搜尋量、用戶數或訪談驗證，不以人氣作事實。SHA-256相同是內容一致性的檢查，不能證明檔案安全或發行者身份；校驗碼本身應來自使用者信任的來源。

既有替代方案為 PowerShell Get-FileHash 或系統命令列；本工具的理由是免安裝、兩語步驟清楚、直接顯示匹配/不匹配，不宣稱比命令列更安全。文件、一般圖片/壓縮包適合首版；單檔上限128 MiB，對大型映像檔不適用。

難度中低：原生 Web Crypto 計算，Worker隔離與取消、精確二進位資料、舊工作防護與原生輸出是主要風險。零runtime依賴，不自行實作密碼學雜湊。

非目標：批次/資料夾、MD5/SHA-1、密碼雜湊、簽章或病毒掃描、文字輸入、遠端URL下載、流式大檔、雲端/登入/保存紀錄。讀[START-HERE](START-HERE.md)，再依[PRODUCT](PRODUCT.md)、[TECHNICAL](TECHNICAL.md)、[UX-SEO](UX-SEO.md)、[ACCEPTANCE](ACCEPTANCE.md)、[TASKS](TASKS.md)實作。
