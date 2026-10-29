# 購物單價比較發布契約

M1 不發布；主驗通過後 M2 製作正式建置及公開来源，主對話 M3 部署和首頁整合。既有 GitHub/free Cloudflare 授權有效，不需重問。PUBLIC repo 是來源可見性，不是擅自選定開源 license 的授權。

固定 origin https://price.glossquote.com。中文 /index.html、英文 /en/index.html 的 self canonical；兩頁各含 zh-Hant/en/x-default，x-default 中文。title/description/H1/OG locale/url 與可見說明對應，WebApplication JSON-LD 不捏造評分。sitemap 只列兩 canonical，robots 指固定 sitemap。preview 預設 noindex,nofollow、Disallow:/，不能混入可索引正式資料。

M2 建立 build:production/check:production，固定 origin allowlist，不由訪客 Host/query 決定 SEO。靜態 Workers 只部署已審查 dist；404 真正狀態碼且無 SPA fallback；正常 HTML/CSS/JS/XML/TXT MIME，header 配合隱私契約。不在伺服器計算輸入。

PUBLIC https://github.com/KYStr/glossquote-labs-unit-price 使用獨立 reviewed copy、必要 checks 後提交，無 force 或根 repo 操作。只白名單本工具 public/scripts/test/package/config/必要 docs。source 不包含輸入、秘密、測試證據私檔、其他工具或 build/cache。

交接 remote visibility/HEAD、source tree/blob bytes manifest、production manifest、命令/exit/環境/NOT_RUN，並用 git -c core.autocrlf=false archive 或等價方式生成固定 commit ZIP；實際解壓逐 Git blob 核對，從解壓副本 build/check。不能改 Git global/system 設定，也不能只驗 ZIP 雜湊就宣稱來源一致。

主對話驗收候選後序列部署、驗雙語正式操作/HTTP/安全/SEO，再新增首頁 published 項並發布/驗兩語首頁。本工具不得自行修改首頁。已上線仍是 awaiting external review，待使用者或驗收者確認才完成該版本。
