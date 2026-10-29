# 日期工具公開原始碼

## T09 正式網址同步 — PASS（2026-10-06 最新）

- commit [9b7dc6dbc00c55628d765533b9db0e983bbaf5ab](https://github.com/KYStr/glossquote-labs-date-calculator/commit/9b7dc6dbc00c55628d765533b9db0e983bbaf5ab)，父4494f0f，只改公開雙語README，記錄正式網址及真主機验收。
- 主代理讀完整diff、git diff --check通過後commit/push，GitHub API確認PUBLIC、remote HEAD等於local HEAD、副本乾淨、has_pages=false；無force push。
- 正式網站由Cloudflare純Static Assets提供，程式與4494f0f相同；24真HTTP案例、10檔位元組比對及雙語IAB計算PASS。未重跑未變產品的50測試，不將README提交稱為新程式部署。Git自動部署未連接。
- 證據：.runs/date-calculator/t09/github-live-verification.json。工作區內部紀錄與憑證不發布。

## 最新 T09 Cloudflare 部署準備 — 公開來源PASS（2026-10-06）

- 同一公開倉庫／codex/initial-publication，commit [4494f0f8a1dfc420104181435def752ec594a552](https://github.com/KYStr/glossquote-labs-date-calculator/commit/4494f0f8a1dfc420104181435def752ec594a552)，父提交f3d73f9，沒有force push。
- 8檔更新：3份build/check/release腳本、cloudflare helper、hosting測試、wrangler config、公開README、.gitignore排除.wrangler。共26 blobs；只公開工具檔，不含內部文檔、CLI套件、環境證據、dist或秘密。
- 主代理在來源親自全套50測試/check22/preview8/production12及check12通過；相容日期修正後受影響4測試及最終dry-run/build/check通過，本機Cloudflare HTTP24項通過。24份來源與發布副本SHA256一致，復用其驗收，不重跑未變輸入的全套測試。
- API確認public、remote commit、26份blob path/hash等於本地commit，發布副本乾淨，has_pages=false。Windows完整Snapshots及原GlossGate diff不變。證據 .runs/date-calculator/t09/{source-copy-verification,github-verification,environment-before,environment-after,host-verification}.json。
- 這是部署准备的原始碼發布。glossquote.com Free zone及DNSSEC已Active、NS切換完成；正式網站部署仍待憑證交接。公開提交仍為上述來源準備版本。

## T08稽核修正 — PASS（2026-09-30，歷史）

- 已推送至同一公開倉庫、同一預設分支codex/initial-publication。
- 最新提交：[f3d73f931dff863ded77100424d35c35b7c1fbdb](https://github.com/KYStr/glossquote-labs-date-calculator/commit/f3d73f931dff863ded77100424d35c35b7c1fbdb)。以前一提交8099d51為父提交，沒有force push。
- 本次7檔變更：README、app、build/check、新release helper及兩份新測試；共23個公開檔（public8、scripts4、test8、package/README/.gitignore）。內部文檔、環境紀錄、.codex、其他工具及dist未公開。
- 主代理於發布副本親自npm test46/46、check20、preview build8，全部退出0；21份來源／腳本／測試／package SHA256與專案一致。兩個core SHA256與本輪開工前一致。
- GitHub API確認public=true、has_pages=false、分支commit正確；遠端23份blob路徑與hash逐一等於本地Git tree，工作樹乾淨。
- evidence：工作區.runs/date-calculator/audit8099-source-verification.json、audit8099-github-verification.json、audit8099-environment-before.json及after.json。完整Snapshots（HKCU/HKLM PATH型別、長度、hash、ephemeral=0、Environment-key、TEMP/TMP）前後一致。原GlossGate未提交diff未變。
- preview仍noindex，沒有實際域名或部署；正式主機與人工NOT_RUN見AUDIT-8099D51及SEO-RELEASE。以下為T07歷史紀錄。

日期：2026-09-30。使用者要求將本工具公開上傳GitHub供檢查，並將「完成功能後上傳」列為之後工具的交付要求，持續規則已記入根AGENTS.md。

- 倉庫：https://github.com/KYStr/glossquote-labs-date-calculator
- 公開性：PUBLIC；private=false。
- 預設分支：codex/initial-publication。
- 提交：8099d51b0417c71ee8d3b99484377ac025ef0bd4。
- 內容：20個檔案，public8、scripts3、test6、package.json、README.md、.gitignore。
- 主代理驗證：發布副本npm test39/39、check17、build8，均退出0；18份來源與本工具相等，8份build檔與public相等；遠端20份路徑及blob hash完全符合本地commit，發布副本無未提交變更。
- 本輪沒有變更日期計算或UI，沒有重跑也沒有宣稱新增真機／無障礙／瀏覽器驗收。原人工待驗完整保留於公開README。
- 未上傳工作區內部文件、環境紀錄、憑證、.codex、其他工具、既有Git歷史或可再生dist。
- 沒有自動指定授權條款，沒有LICENSE；沒有GitHub Pages、正式網域或正式SEO上線。GitHub原始碼公開不代表網站已部署。
- Windows持久User/Machine PATH、型別、長度、ephemeral count、Environment-key及TEMP/TMP指紋前後一致。所有操作使用既有工具，不安裝依賴或改全域設定。
