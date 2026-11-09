# 2026-10-12 候選驗收紀錄

## U14 v2 最新驗收狀態（2026-10-13）

目前為本機程式通過、文件／新版來源發布處理中的候選；舊88f2036公開／正式版外部通過不套用到新版。兩模式都由已付自動加總，快速平均、進階可選份數；沒有total或paid-toggle UI，報告先列轉帳。舊手填總額及paid mismatch操作只屬歷史／calculateBill內部相容。

製作證據與primary證據分開：

| 層／擁有者 | 實際命令或範圍 | 結果 |
|---|---|---|
| 原owner focused | node --test test/quick.test.mjs test/controller.test.mjs test/ui-contract.test.mjs | 14/14 PASS，exit0；含加權Share語意、轉帳優先、race/Blob/群組focus adapter |
| 原owner最初全套 | npm test | 31中30PASS、1FAIL；Windows fixture rename EPERM發生在junction斷言前，不算安全gate通過 |
| 原owner fixture修復 | node --test test/scaffold.test.mjs | 3/3 PASS、exit0；直接建outside＋junction，unlink後copy實體目錄，所有拒絕／sentinel斷言保留 |
| Primary固定副本 | node --test --test-concurrency=1 test/*.test.mjs | 31/31 PASS、exit0；這是primary獨立最終程式驗收 |
| Primary固定副本 | node scripts/check.mjs；build.mjs；build.mjs --production；check.mjs --production | 各exit0；12public、14preview、14production、exact產物 |
| Primary獨立核心 | 8固定例、5000份數性質、5000平均／快速一致、19邊界 | PASS，與製作expected及400舊core／300快速／300份數案例不同 |
| Primary修正後報告 | 14雙語案例 | PASS；Share與Equal share有語意區別，兩模式結算先列 |
| Primary真Chrome | 兩語快速900/300/0、進階2/1/1與0/1/1、全0paid、全0weights拒絕及focus、隱藏非法份數返回、方向鍵、舊結果失效 | PASS，限列明案例；不是adapter或舊v1操作 |
| Primary responsive | 兩語320px | innerWidth320/documentWidth305、無水平溢出，viewport已reset；不是200%或真機 |
| Primary原生output | 英文進階clipboard／TXT | clipboard=DOM report；新512bytes原生檔逐byte一致、UTF8無BOM/LF；事件APItimeout未當PASS，以獨特假名及前後檔單辨識 |

權威摘要 PRIMARY-REVIEW-2026-10-12-U14.md。primary證據在 `.runs/outcome-upgrade-2026-10-12/`：code-candidate-sources.json、primary-checks.json與五份logs、paid-final-results.json、report-final-results.json、native-output-results.json、兩份preview observations及environment前後檔。原owner證據在 `.runs/bill-outcome-2026-10-12/run-ed28ee449e274f4a830093939a8f5385/`，包括focused／初始失敗／fixture修復log。只有固定來源hash相符才能沿用，不把較早v1的18,648案例或total操作紀錄算入v2。

仍NOT_RUN：真200% zoom、AT／讀屏、真行動裝置、完整Network request/payload與Storage/hidden-return、真clipboard denial／late promise、完整live／瀏覽器邊界矩陣。Node adapter不冒充這些觀察。新GitHub固定commit、ZIP、正式部署／同語首頁及新版外驗是另外的里程碑，完成後在HANDOFF追加。

## 舊版本及早期候選紀錄（保留歷史）

範圍 THREAD-14-bill-splitter；只合成資料。Node v24.14.0。瀏覽器為已連線 Chrome/Edge extension，工具未提供可核實的瀏覽器完整版本號；不得虛構。以下以實際工具輸出為據，正式站尚未部署。自動測試與瀏覽器观察分開。

| 案例 | 自動 | 真瀏覽器 | 觀察 |
|---|---|---|---|
| S01–S06 | PASS | Chrome 繁中/Edge 英文 S01/03/04/06 PASS；S02/05只N | 33.34/33.33/33.33；34/33/33；33.34/66.67/0；0001.2顯示1.20 |
| S07–S08 | PASS | S07 兩瀏覽器 PASS；S08 N及Chrome最大額50人 | 0/-1/+1/1e2/1,000/.5/1./NaN/1.001拒絕，copy停用 |
| S09 | PASS | Chrome 2/50人 PASS；Edge完整上下限 NOT_RUN | Chrome 2人全部移除停用且理由可見，50人新增停用，50列結果 |
| S10–S11 | PASS | S10兩瀏覽器 PASS；S11 N | __proto__與同名保留序號；img字串只作文字，實際結果img數0 |
| S12 | PASS | 兩瀏覽器 -1/1.5/1e2/1001/空 PASS；全零及0/1000 B待補 | 欄位錯誤可見，無舊結果 |
| S13–S17 | PASS | S13/15/16兩瀏覽器 PASS；S14/17只N | 固定兩筆33.33，無需補付，短/超0.01拒絕 |
| S18–S19 | PASS（核心） | 兩瀏覽器 PASS | hidden paid=bad關閉成功，重開拒絕；1.25改0未改數字且拒絕 |
| S20 | PASS（控制器adapter） | 兩瀏覽器 PASS | total/name/weight/paid/precision/mode/toggle/add/remove各自清空report並停用copy/download |
| S21 | PASS（report/Blob及controller adapter） | 真copy兩瀏覽器 PASS；原生下載/拒絕fallback/晚到race NOT_RUN | Chrome copy文字、Edge copy与report相同；Chrome download事件timeout，內部下載管理頁被tool protocol policy拒絕，未繞過。按鈕可見回應不算原生檔案PASS |
| S22 | PASS（adapter） | 兩瀏覽器 PASS | 3人/equal/2/off/空總額，焦點total |
| S23 | source gate PASS；adapter pagehide資源清除 PASS | 真Network/Storage/hidden-return NOT_RUN | 可用browser能力只有DOM/console/clipboard/pageAssets/viewport；沒有完整request/payload或Storage觀測，不以CSP/ResourceTiming冒充 |
| S24 | static parity PASS | 部分鍵盤Enter新增/移除/清除PASS；320px/200%/完整鍵盤/50人雙語版面 NOT_RUN | Chrome viewport.set(320×800)後實際clientWidth/scrollWidth皆1665，因此未實際測到320；已reset覆寫。未聲稱200%PASS。原始桌面截图不替代responsive |
| S25 | static link PASS | Edge英文→中文 PASS；Chrome中文→英文待補 | 切語後total空、無query/hash、返回中文homepage href精確；可見切語清除提示 |
| S26 | T00/T04 PASS | L NOT_RUN | preview/production精確SEO/headers/manifest/固定origin，14資產；strict本機404/MIME，build拒絕rootjunction/remote script/CSS import/commented robots；Cloudflare實際部署仍未驗 |
| S27 | PASS | 兩瀏覽器 PASS | 平均report份數1/1/1，切回shares仍保留1/2/0，舊結果立即失效 |

必要安全FAIL已回T00修正：主對話2026-10-12獨立固定snapshot驗收scaffold 3/3，core12/12及獨立7,905配額情境 PASS。此證據不是UI/Network放行。所有上述人工缺口須由主對話/外驗補驗後才能稱完整MVP驗收。

本工具同步最多50人，沒有Worker/網路工作/長任務；取消功能N/A，不加假等待。剪貼簿非同步及Blob生命週期有獨立controller測試，並清楚標示adapter範圍。

T04最終自動全套 npm test：20/20、exit0（14.33秒），包含400組core性質、controller2項、release2項與T00 audit。後续只把audit假資料根改為本工具.gitignore內.test-tmp，讓独立clone測試不依賴父資料夾；受影響scaffold再次檢查，其他未變通過證據沿用。check/build/build:production/check:production命令及manifest在RELEASE-CANDIDATE記錄。

## 恢復任務 AUDIT-14-HARNESS-TAGS

GROUP-ERROR修正後，曾出現focused adapter 3PASS/1FAIL（含ui-contract）：report靜態替身仍是div，新的真focus guard令舊clipboard fallback不能取得activeElement。2026-10-12只修 test/controller.test.mjs 靜態標籤對照，保留focus guard及原斷言，產品未改。

`node --test test/controller.test.mjs` 3/3 PASS、exit0；`node --test test/ui-contract.test.mjs` 1/1 PASS、exit0，Node v24.14.0。群組錯誤案例兩語全零份數、已付不足/超額、aria關聯恢復仍PASS（adapter）。這次不開browser、不build/publish；真焦點由primary接手。

證據 `.runs/bill-splitter/harness-tags-20261012-9e4ad281f48446ac91e8685a272b3ad1/results.json`；controller SHA256 760619a2fd0ca9e29e82c4aaea12d0d40fddb2b0220c241c8461ff48d5031ce4。Environment前後完整snapshots一致，public app hash未變。owner已釋放。

另由primary提供的獨立證據 `.runs/wave02-ui-review/native-download-results.json`：Chrome/Edge兩語原生下載537/526 bytes逐byte符合可見literal報告、UTF8無BOM/LF/單一末尾LF PASS。這是主代理驗收結果，不把原功能對話先前的download事件timeout改稱自測成功。

## Primary closure 與 T05 證據沿用

主代理有界關閉 AUDIT-14-HARNESS-TAGS：独立 controller3+ui1=4/4、exit0，public全部bytes對修後固定snapshot不變；Chrome中文/Edge英文群組錯誤真焦點及aria恢復已由primary親驗，產品未變，沿用其結果。證據 `.runs/wave03-checksum-start/bill-snapshot-manifest.json`、`bill-primary-tests.log`、`bill-primary-result.json` 及 wave02-ui-review。原功能對話製作測試與primary驗收分開紀錄，未把adapter稱為browser。

Primary另親跑固定T04 snapshot release tests2/2與production check PASS，沒有blocker。T05仍須在reviewed publication copy與實際ZIP解壓副本跑check/build/production gate；不重啟未變核心/UI案例。完整Network/Storage、320px、200%、完整鍵盤及assistive technology仍NOT_RUN，發布source不等於解除正式交付gate。
