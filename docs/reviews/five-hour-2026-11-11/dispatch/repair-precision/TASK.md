# labs-five-hour-precision-repair-20261111

## 目標與已決定範圍
修正固定 PR283 commit 448bd9fc9865fe65f6014b66f4a2e2d54b76f539 的文件缺陷 FH-QC-A-01、02、04。使用者允許新 Sol medium 代理接手修正，不等待原作者；維護任務另立、原spec/task/owner保持。
完賽：保留四標準＋選填目標，不新增已知自訂距離列；把恆等性限定同距離列存在時。健保：刪除457.54499會捨入457的錯誤論證；保留BigInt和half-up、150000半界案例與58級表。料理：保留227g的既定模型，先核實同出版社直接每杯227g來源，或精確寫4oz半杯→8oz→226.796185g→227g的採值依據，承認不同於113g×2；不得假稱全表直接照抄。若無可靠一級來源只能回報，不改常數掩蓋。同步BRIEF/AUTHOR-CHECK必要文案，不任意改數值。

## 來源
repo KYStr/glossquote-labs-home；default codex/initial-publication。原始修正來源 docs/specs/<slug>/ 位於上述fixed commit；Astra固定初審位於 docs/reviews/five-hour-2026-11-11/astra/FINDINGS-INITIAL.md（與本brief同commit發布）。本地同byte來源可讀 .runs/five-hour-2026-11-11/astra-review/candidate/，但先核實GitHub blob及PR head。
指定slugs：race-time-predictor, nhi-premium-calculator, cooking-measurement-converter。

## 授權與範圍
先讀最新遠端AGENTS、START-HERE、AGENT-HANDBOOK、協作規則、registry。使用實際local-codex:<chatID>自己ACK；主統籌授予registry串行slot後，以本brief固定GitHub來源register maintenance task，必要面向spec-corrections / exact-fixtures / provenance-and-scope，CAS claim並讀回operationId/requestHash/claimId/owner；start另做讀回，之後才修改。只讀分析可先做。不可冒簽原cloud owner、revise-spec、mark-ready、改原PR、合併或部署。
本地只允許本brief資料夾內 work/docs/specs/指定slug/** 與 evidence/**、自己的handoff/腳本；先逐byte複製固定來源再改。其他task、工具產品、root、共有registry手改均禁止。新候選在共同repo獨立codex修正分支/PR；主統籌給來源發布slot後由你以reviewed copy提交，排除credential/private data。不得自行擴充數值或產品功能。

## 驗收
1. 每個blocking finding有最小變更、具體前後語意與可反駁重現。
2. 字面expected與狀態契約能由非作者照著獨算；保留全部既有數值、只新增必要控制案例，不把自寫驗算當獨立通過。
3. 固定來源/候選/manifest，變更檔名與diff，命令exit與真實結果、NOT_RUN、風險/決策完整HANDOFF；八節文件完整但不得自標ready。
4. 先交候選PR，Astra/主統籌非作者驗證，不自審、不修改已送審head。

## 測試與停止
使用Node24內建或已有Python，fake data且offline（來源查證可HTTP），沒有新依賴。命令和結果存evidence。不得操作桌面、本機互動browser、焦點/鍵鼠/IME/clipboard/native dialogs；子行程windowsHide true。長automation先後Windows persistent環境guard；GitHub寫入前後git-settings-guard。不得讀credential/環境token、改global/system Git/gh auth/persistent env、安裝/付費/改其他工具。連續兩次同失敗無新證據、來源變動、owner衝突、需新權限或公式/範圍改動就保存回報。
UTC2026-11-11T07:22:08Z開始收尾，07:37:08Z硬截止，不新增工作、不延長；每次新操作先看時鐘。不得再委派。每完成一個修正立即保存，完成回報檔案/測試/未驗/風險，主統籌會回收。
