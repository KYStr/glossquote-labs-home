# FH-spec-review-02：固定預案獨立文件審查

窗口UTC 2026-11-11T02:37:08Z至07:37:08Z（台北10:37:08至15:37:08）；07:22Z收尾，截止停止並保存。這是同repo預案文件審查，不是新建工具，也不是部署。

## 目標與來源

逐份完整讀BRIEF/SPEC/fixtures/AUTHOR-CHECK，核對八節、獨立重算字面expected、實際使用情境、既有工具區隔、零安裝瀏覽器可行性、限制/取消/雙語SEO/隱私與必要九產品面向是否可驗。文件審查不需要尚未製作的產品GUI，不得拿產品NOT_RUN阻止無問題規格ready，也不能把fixtures自證當推導。

- steps-converter: task `labs-steps-converter-spec-20261109`，PR https://github.com/KYStr/glossquote-labs-home/pull/234，固定candidate `70dce9d009d060b386f27db533a9097f9bd9c299`，docs/specs/steps-converter/。原owner保持，存在既有build時只審spec，不開重複製作。
- bac-calculator: task `labs-bac-calculator-spec-20261109`，PR https://github.com/KYStr/glossquote-labs-home/pull/235，固定candidate `8029a6d35ca8e3bd61beac4fd31e66be2e94b72d`，docs/specs/bac-calculator/。原owner保持，存在既有build時只審spec，不開重複製作。
- vo2max-calculator: task `labs-vo2max-calculator-spec-20261109`，PR https://github.com/KYStr/glossquote-labs-home/pull/236，固定candidate `30d67be295be66714f292722cea0660631d97176`，docs/specs/vo2max-calculator/。原owner保持，存在既有build時只審spec，不開重複製作。
- child-height-predictor: task `labs-child-height-predictor-spec-20261109`，PR https://github.com/KYStr/glossquote-labs-home/pull/238，固定candidate `9da27fecab8e7716e27e7dec853e3231a99721ba`，docs/specs/child-height-predictor/。原owner保持，存在既有build時只審spec，不開重複製作。
- ideal-weight-calculator: task `labs-ideal-weight-calculator-spec-20261109`，PR https://github.com/KYStr/glossquote-labs-home/pull/239，固定candidate `6728a065fb23e257e518d8e3c40f003022061d62`，docs/specs/ideal-weight-calculator/。原owner保持，存在既有build時只審spec，不開重複製作。

## 權限與介面

先讀GitHub KYStr/glossquote-labs-home default codex/initial-publication最新AGENTS、START-HERE、AGENT-HANDBOOK、協作文件與registry。本人身分為local-codex:<實際chatID>；不能代簽。主統籌安排registry寫入slot，第一階段只讀及本地證據，回報後再自己ACK／review／mark-spec-ready。reviewer不claim原作者任務，不改作者候選，不merge/deploy。若你曾參與此候選立即回報排除。若head/owner改動先保存並回報，不引用舊分數。

允許寫本brief所在子資料夾的review/；可在其中讀取固定source、寫獨立offline驗算腳本及證據。不得改其他task、root、tool-projects、sharedregistry或任意原repo檔案。不得再委派。必要重跑只依fixture輸入，不採用真實私人資料。

產出REVIEW.md與review.json：逐spec固定sha/task/pr，八節布林、必要面向逐項score與證據（以原task契約為準）、命令/exit、字面輸入與獨立預期、來源、blocking缺陷ID、非必要改善、本人參與排除、PASS/FAIL/NOT_RUN、ready建議。產品九面向沒有實跑不能填PASS。維持原作者ownership；缺陷由主代理另派Sol修正，不邊修邊自評。

安全：全程不得桌面/本機瀏覽器互動，不碰焦點/鍵鼠/IME/剪貼簿/native dialogs；只背景CLI與HTTP。所有子行程windowsHide true。無deps install、global/system Git/gh登入設定、persistent env修改、credential搜尋／讀取。使用已連接GitHub或已有gh認證。長build/test先後執行用戶.codex/check-persistent-environment.ps1核對；來源發佈需Git settings guard且等串行slot。被拒/連續兩次無新證據/需要新權限就停該步並回報具體原因，不繞過。

主對話以wait_threads回收；只寫指定報告即可，不需使用者轉貼。每完成一份立即保存，不等整組才留下成果。
