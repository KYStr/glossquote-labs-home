# GitHub 原始碼公開交付

## 最新更新：T08 稽核修正，2026-09-29

已推送 [29e3d31](https://github.com/KYStr/glossquote-labs-unit-converter/commit/29e3d31d47a2c02e7f8189f7f04d1f8279932ddc) 至既有 `codex/initial-publication` 分支。只變更 convert.mjs、既有換算測試、新增 audit-boundary.test.mjs 與公開README，共4檔；遠端從21檔增加為22檔。修正F-01並補上下界回歸，README保留人工與正式SEO／部署待辦。

主代理驗證原產品與發布副本各58/58測試、check19來源、build9靜態檔；20個產品檔逐檔SHA256一致。審查staged diff與新增檔全文，清單限4檔、diff --check通過、機密樣式／本機使用者路徑掃描無命中；沿用目前GitHub CLI認證及僅本次命令的credential helper，沒有讀出token。

完整HEAD=`29e3d31d47a2c02e7f8189f7f04d1f8279932ddc`。GitHub API遠端ref相同，recursive tree無截斷，22個blob路徑及SHA與本機git tree全部相同，公開屬性仍為public、has_pages=false、工作樹clean。環境前後完整Snapshots相同，詳細模型委派、獨立4543筆數值對照及8組兩語HTTP證據見VERIFICATION的T08。以下T07紀錄保留作為歷史，不將其53測試／21檔視為最新數字。

任務 T07／UC-GH-01，2026-09-29。使用者已明確要求「傳到我的 GitHub，設定公開，我之後再檢查」。這是新的公開原始碼授權；不把先前的本機開發限制當成需要再次詢問的理由。

目前狀態：PASS，原始碼已公開並完成遠端核對。網站託管尚未執行。

## 範圍

- 以 GitHub CLI 目前登入且經 API 確認的 KYStr 帳號，建立 glossquote-labs-unit-converter 公開儲存庫。
- 原專案没有設定 remote，並含其他產品的未提交變更。因此使用獨立發布副本 `.runs/github-publish/glossquote-labs-unit-converter/`，從空 Git 歷史提交，只上傳本工具。
- 精確複製19個檔案：package.json、public的9個檔、scripts的3個檔、test的6個測試。額外新增面向公開讀者的雙語README與.gitignore，共21個待提交檔。
- 不上傳本機交接／規劃／環境紀錄、.codex、舊Git歷史、其他產品、cache或建置結果。dist可由npm run build重新產生。
- 未選擇或新增軟體LICENSE，不將「公開儲存庫」宣稱為特定開源授權。沒有新增GitHub Actions、Pages、網站託管或付費操作，產品noindex保持不變。

## 委派與驗收

實際spawn_agent回覆 `/home/<LOCAL_USER>/uc_gh_docs_luna`，指定model=gpt-6-luna、reasoning_effort=max、fork_turns=none；只准撰寫發布副本README與.gitignore，不准子代理推送或再次委派。工具未回傳底層model/effort，實際路由未確認。主代理負責固定清單複製、讀取最終內容、Git與GitHub動作及遠端核对。

發布副本主代理命令：npm.cmd test 53/53 PASS、0 skip、退出0；npm.cmd run check 18檔PASS、退出0；npm.cmd run build 9個靜態檔、退出0。來源19檔複製時逐檔SHA256一致。主代理掃描發布程式檔未見憑證格式或本機帳號路徑；此掃描不是獨立安全認證，仍會核對實際staged清單與README。

人工待驗沿用VERIFICATION與公開README：真200%縮放、AT、Network/storage、BFCache、其他瀏覽器等未標PASS。這不阻擋使用者已明確要求的原始碼交付，也不宣稱網站已正式發布或搜尋引擎已收錄。

## 遠端交付結果

- 公開儲存庫：[KYStr/glossquote-labs-unit-converter](https://github.com/KYStr/glossquote-labs-unit-converter)。GitHub API確認private=false、visibility=public、has_pages=false。
- 首次提交：`1b188ad4f7b8e60e21d49cf2a5eb02e86de44df1`；預設分支為`codex/initial-publication`。
- 主代理完整閱讀README/.gitignore，補齊英文Node24+說明，移除概括法律效果的句子；逐檔核對staged清單恰好21檔，git diff --cached --check退出0。署名使用GitHub公開帳號與noreply地址，未讀取或公開私人電子郵件。
- 主代理執行git commit、gh repo create --public與git push，全數退出0。push僅以該程序的credential helper呼叫既有GitHub CLI驗證，沒有輸出token或修改global Git／Windows設定。
- 遠端ref SHA與本機HEAD一致，GitHub recursive tree的21個blob路径與SHA逐檔對照本機git tree全部一致；發布副本working tree為clean。
- 原工作區Git remote／index與原先GlossGate dirty檔未納入發布；本輪只新增T07契約／本紀錄、更新HANDOFF，以及ignored的發布副本。原產品程式未改動。

長測試與Git操作前後持續環境檢查皆退出0、PASS，完整Snapshots逐欄相同。User PATH：ExpandString、834字、16項、暫存0、SHA256 `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb`；Machine PATH：String、1227字、30項、暫存0、SHA256 `52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8`。Environment-key指紋User=`3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a`、Machine=`a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82`；TEMP/TMP的型別／長度／hash均未變。

下次更新本工具時，先測原產品並同步明確允許的程式檔到同一發布副本，審查README與實際diff後才提交推送；不要對原孵化器根目錄做git add或推送。若本地發布副本已被清理，可從上述公開儲存庫重新clone，不另建重複遠端。本輪沒有新增套件、PR、Actions、Pages、網域、LICENSE或公開網站收錄設定。
