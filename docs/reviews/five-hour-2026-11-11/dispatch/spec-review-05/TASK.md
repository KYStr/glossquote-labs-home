# FH-spec-review-05：固定預案獨立文件審查

窗口UTC 2026-11-11T02:37:08Z至07:37:08Z（台北10:37:08至15:37:08）；07:22Z收尾，截止停止並保存。這是同repo預案文件審查，不是新建工具，也不是部署。

## 目標與來源

逐份完整讀BRIEF/SPEC/fixtures/AUTHOR-CHECK，核對八節、獨立重算字面expected、實際使用情境、既有工具區隔、零安裝瀏覽器可行性、限制/取消/雙語SEO/隱私與必要九產品面向是否可驗。文件審查不需要尚未製作的產品GUI，不得拿產品NOT_RUN阻止無問題規格ready，也不能把fixtures自證當推導。

- battery-runtime-calculator: task `labs-battery-runtime-calculator-spec-20261109`，PR https://github.com/KYStr/glossquote-labs-home/pull/253，固定candidate `13ccc1ccb1d24ca1ec70b1912ad25c65521aa2e9`，docs/specs/battery-runtime-calculator/。原owner保持，存在既有build時只審spec，不開重複製作。
- reading-time-estimator: task `labs-reading-time-estimator-spec-20261109`，PR https://github.com/KYStr/glossquote-labs-home/pull/254，固定candidate `131cea60be513f3790bf3327930c6251fd622569`，docs/specs/reading-time-estimator/。原owner保持，存在既有build時只審spec，不開重複製作。
- photo-print-size-calculator: task `labs-photo-print-size-calculator-spec-20261109`，PR https://github.com/KYStr/glossquote-labs-home/pull/255，固定candidate `58edaa0d845256b1eb4cb772d8f7d7d80811e4d8`，docs/specs/photo-print-size-calculator/。原owner保持，存在既有build時只審spec，不開重複製作。
- group-generator: task `labs-group-generator-spec-20261109`，PR https://github.com/KYStr/glossquote-labs-home/pull/256，固定candidate `93c1a8a8b12930270b611850a6b85007da4f5c4d`，docs/specs/group-generator/。原owner保持，存在既有build時只審spec，不開重複製作。
- interval-timer: task `labs-interval-timer-spec-20261109`，PR https://github.com/KYStr/glossquote-labs-home/pull/257，固定candidate `e86816781bc220d184a8c31ad50168730e1b973b`，docs/specs/interval-timer/。原owner保持，存在既有build時只審spec，不開重複製作。

## 權限與介面

先讀GitHub KYStr/glossquote-labs-home default codex/initial-publication最新AGENTS、START-HERE、AGENT-HANDBOOK、協作文件與registry。本人身分為local-codex:<實際chatID>；不能代簽。主統籌安排registry寫入slot，第一階段只讀及本地證據，回報後再自己ACK／review／mark-spec-ready。reviewer不claim原作者任務，不改作者候選，不merge/deploy。若你曾參與此候選立即回報排除。若head/owner改動先保存並回報，不引用舊分數。

允許寫本brief所在子資料夾的review/；可在其中讀取固定source、寫獨立offline驗算腳本及證據。不得改其他task、root、tool-projects、sharedregistry或任意原repo檔案。不得再委派。必要重跑只依fixture輸入，不採用真實私人資料。

產出REVIEW.md與review.json：逐spec固定sha/task/pr，八節布林、必要面向逐項score與證據（以原task契約為準）、命令/exit、字面輸入與獨立預期、來源、blocking缺陷ID、非必要改善、本人參與排除、PASS/FAIL/NOT_RUN、ready建議。產品九面向沒有實跑不能填PASS。維持原作者ownership；缺陷由主代理另派Sol修正，不邊修邊自評。

安全：全程不得桌面/本機瀏覽器互動，不碰焦點/鍵鼠/IME/剪貼簿/native dialogs；只背景CLI與HTTP。所有子行程windowsHide true。無deps install、global/system Git/gh登入設定、persistent env修改、credential搜尋／讀取。使用已連接GitHub或已有gh認證。長build/test先後執行用戶.codex/check-persistent-environment.ps1核對；來源發佈需Git settings guard且等串行slot。被拒/連續兩次無新證據/需要新權限就停該步並回報具體原因，不繞過。

主對話以wait_threads回收；只寫指定報告即可，不需使用者轉貼。每完成一份立即保存，不等整組才留下成果。
