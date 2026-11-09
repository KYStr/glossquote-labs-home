# 19 款製作候選：本地主統籌覆核與退修單

報告日期（使用者時區）：2026-11-03。包名日期：2026-11-02。這是來源、離線測試與確認缺陷的覆核，不是整批產品驗收或發布放行。

## 結論與證據範圍

- 收到的 ZIP SHA-256：`e5961dbfd77a6005fa26fce94451b39d6867f31f591529de30c07cee5ca464da`，402,007 bytes。61 個安全封存項目；manifest 所列 60 個 payload 全部 bytes/SHA-256 一致。原包只附文件與登記快照，沒有產品原始碼。
- 從 19 個固定 GitHub 候選另取來源；主代理於測試後逐檔重算 **419 個 manifest-listed 檔案 + 19 份自排除 manifest = 438 檔、2,732,655 bytes**，全部一致。19 個 PR 均 open，讀取時 head 與本報告固定 commit 相符；CSS 僅取 home repo 的 `tools/css-specificity/`。
- Windows / Node v24.14.0：**473 項唯一原有案例實跑，471 PASS、2 FAIL；另 2 項 CSS serve 案例 NOT_RUN。** PDF 作者多列的 1 項不算未跑案例，實際宣告只有 24。不能沿用作者「476/476」作為本輪結果。
- 19/19 專案 check 與 preview build 命令成功。B 組十款各兩次 build 的逐檔 bytes/SHA 相同；沒有把這個範圍擴大成 19 款都獨立完成雙次比對。
- 主代理親讀詞頻核心與測試、CSS build/serve 測試及原始失敗 log，獨立重算七組規格勘誤、重現詞頻三張表錯誤分母、核實 PDF 24 個測試宣告，再整合兩位非作者審查者的證據。這些新反例不併入原有 473 項。
- 本批 **0 款獲得本輪 accepted 或發布放行**。本輪沒有 merge、deploy、更新正式首頁或替他人 claim。所有必要瀏覽器／實機項目仍保留 NOT_RUN。

## 總表

下表製作登記為讀取時 registry r792；其後退修操作見同交付包操作收據。所有工具都有 GitHub 候選 PR；「NOT_REGISTERED」指製作承接登記缺少，不是沒有原始碼。

| 工具 | 固定候選／PR | 本輪原有測試 | 製作登記 | 處置 |
|---|---|---:|---|---|
| 長寬比例計算 | [2d21a96c](https://github.com/KYStr/glossquote-labs-aspect-ratio-calculator/pull/1) | 35/35 | reviewing | 未發現新增確認缺陷；仍待必要實機檢查 |
| 羅馬數字轉換 | [e4cb9fef](https://github.com/KYStr/glossquote-labs-roman-numeral-converter/pull/1) | 24/24 | reviewing | 未發現新增確認缺陷；仍待必要實機檢查 |
| CSS 權重比較 | [02edd565](https://github.com/KYStr/glossquote-labs-home/pull/67) | 30/32（2 失敗；另 2 未跑） | reviewing | CSS-WIN-PATH、CSS-SERVE-NOT-RUN |
| QR Code 產生 | [0975130d](https://github.com/KYStr/glossquote-labs-qr-code-maker/pull/1) | 35/35 | ready | 未發現新增確認缺陷；仍待必要實機檢查 |
| 房貸攤還表 | [2c90711a](https://github.com/KYStr/glossquote-labs-mortgage-amortization/pull/1) | 34/34 | NOT_REGISTERED | SPEC-MORTGAGE |
| 統一發票對獎 | [5692d0fc](https://github.com/KYStr/glossquote-labs-taiwan-invoice-prize-check/pull/1) | 24/24 | NOT_REGISTERED | SPEC-INVOICE |
| 密碼產生與強度檢查 | [969acbc1](https://github.com/KYStr/glossquote-labs-password-generator/pull/1) | 21/21 | NOT_REGISTERED | SPEC-PASSWORD-WORDLIST |
| Markdown 預覽 | [f65da95f](https://github.com/KYStr/glossquote-labs-markdown-preview/pull/1) | 18/18 | NOT_REGISTERED | 未發現新增確認缺陷；仍待必要實機檢查 |
| PDF 頁面工具 | [99de9a90](https://github.com/KYStr/glossquote-labs-pdf-page-tools/pull/1) | 24/24 | NOT_REGISTERED | PDF-COUNT |
| 正規表示式測試 | [68d0f4ce](https://github.com/KYStr/glossquote-labs-regex-tester/pull/1) | 35/35 | NOT_REGISTERED | 未發現新增確認缺陷；仍待必要實機檢查 |
| 文字朗讀 | [45164104](https://github.com/KYStr/glossquote-labs-text-to-speech-reader/pull/1) | 23/23 | NOT_REGISTERED | 未發現新增確認缺陷；仍待必要實機檢查 |
| 子網路計算 | [5739aff5](https://github.com/KYStr/glossquote-labs-subnet-calculator/pull/1) | 20/20 | NOT_REGISTERED | 未發現新增確認缺陷；仍待必要實機檢查 |
| Cron 排程解釋 | [769ccfde](https://github.com/KYStr/glossquote-labs-cron-explainer/pull/1) | 22/22 | NOT_REGISTERED | SPEC-CRON |
| JWT 解碼 | [d2f6e1a8](https://github.com/KYStr/glossquote-labs-jwt-decoder/pull/1) | 22/22 | NOT_REGISTERED | 未發現新增確認缺陷；仍待必要實機檢查 |
| 打字速度測試 | [5417cf01](https://github.com/KYStr/glossquote-labs-typing-speed-test/pull/1) | 23/23 | NOT_REGISTERED | SPEC-TYPING |
| 節拍器 | [f875cafe](https://github.com/KYStr/glossquote-labs-metronome/pull/1) | 15/15 | NOT_REGISTERED | 未發現新增確認缺陷；仍待必要實機檢查 |
| UUID 工具 | [18f53598](https://github.com/KYStr/glossquote-labs-uuid-tools/pull/1) | 25/25 | NOT_REGISTERED | 未發現新增確認缺陷；仍待必要實機檢查 |
| HTML 實體轉換 | [5140ef8c](https://github.com/KYStr/glossquote-labs-html-entity-tools/pull/1) | 24/24 | NOT_REGISTERED | SPEC-ENTITIES |
| 文字與字元詞頻 | [180dcb19](https://github.com/KYStr/glossquote-labs-word-frequency/pull/1) | 17/17 | NOT_REGISTERED | WORD-FILTER、SPEC-FOLD |

## 確認需修正的產品與驗證問題

### WORD-FILTER — 詞頻：過濾後百分比仍用舊分母（阻止驗收）

固定產品 `180dcb19d56416da352e26405955aaba69a09acc`；固定 SPEC `6598ac51cddee252a83685d461589537d56fa3e0` §4 明定 filtered table 使用 filtered total。核心 `public/js/core/frequency.mjs` 的 finish 先建立百分比再過濾 rows，保留過濾前 total/unique；原測試也明文要求舊 total，因此原有 17/17 無法發現這個契約錯誤。

| 輸入 / 表 | minCount | 預期 | 實際 |
|---|---:|---|---|
| `A A B` / Words | 2 | A：2 次，100.0%；total 2、unique 1 | 66.7%；total 3、unique 2 |
| `甲甲乙` / Characters | 2 | 甲：2 次，100.0%；total 2、unique 1 | 66.7%；total 3、unique 2 |
| `甲乙甲乙丙` / Bigrams | 2 | 甲乙：2 次，100.0%；total 2、unique 1 | 50.0%；total 4、unique 3 |

CSV 同樣帶錯百分比。請原作者一起修三表、summary/CSV 及錯誤測試期望；保留 stopwords/minLength/numbers 既有語義，top-100 僅控制顯示列數，不得再縮百分比分母。補零列、單列與多列過濾、100/top-all 及 CSV 回歸，更新固定 candidate 與 manifest 後交非作者重審。不要把規格改成錯誤實作來消除反例。

### CSS-WIN-PATH — CSS 測試在 Windows 失敗（阻止完整工具鏈放行）

固定候選 `02edd5657206bda0ff6e1732ba3276d89795e55a`。實跑命令：
`node --test tests/build.test.mjs tests/controller.test.mjs tests/core.test.mjs tests/ui.test.mjs`。

32 項：30 PASS、2 FAIL。失敗在 `tests/build.test.mjs:39` 與 `:83`：collect 使用平台的 path.relative，得到 `assets\\app.mjs`、`en\\index.html`，但 expected keys 為 POSIX slash；後續 fa.get 使用 slash 也須一致。這是測試可攜性缺陷，不應說產品計算器不能運作。請正規化相對檔案索引，保留原有 byte/SEO/拒絕錯誤 origin 的斷言，再回報 Windows 與原雲端環境結果。

`tests/serve.test.mjs` 另有 2 項使用固定 port 44217。本次未執行，避免碰到使用者既有服務。請改為任務自有 loopback 動態 port、確認子程序 ready/address、只關閉自己啟動的 PID；禁止依 port 殺其他程序。29 項安全子集包含在前述 32 項，沒有重複計數。

### PDF-COUNT — PDF 證據數字不一致

固定候選 `99de9a90bd92143ceb48b0e7f98776cead0438c8`：實際 core 10 + engine 7 + controller 7 = **24/24**；manifest/VERIFICATION 的 25（controller 8）不符。請原作者核對原本是否真的漏了一個必要案例：若僅數字錯誤，修文件與 manifest；若必要案例缺少，補該案例再重跑。不要為湊數加無意義測試。

## 七份規格的已確認勘誤

這些項目多已由作者誠實記在候選 VERIFICATION。主代理現在以獨立公式、固定字串或官方原始資料核實；應回原 SPEC 修訂，不要求把正確程式改壞來迎合錯例。

| 規格 / 原 PR | 確認結果與修訂要求 |
|---|---|
| [Mortgage #24](https://github.com/KYStr/glossquote-labs-home/pull/24) | P=120000.00，年率12%，3期；每期40802.65、末期40802.66；三期利息1200.00/803.97/403.99，總2407.96。用 BigInt 分數與分幣 half-up 重算，零餘額。原40803.45與2407.94錯誤。這是凍結公式算例，沒有核實任何現行貸款方案。 |
| [Taiwan Invoice #25](https://github.com/KYStr/glossquote-labs-home/pull/25) | 在預案凍結規則內，99994444 與33334444 共同尾碼4444為4碼，應五獎1000，非六獎。不是以這個算例宣稱已核實現行官方獎項資料。 |
| [Password #26](https://github.com/KYStr/glossquote-labs-home/pull/26) | 原 EFF 7776 詞有 drop-down、felt-tip、t-shirt、yo-yo 四個連字號詞。保留原始名單並修「僅a–z」矛盾；不要刪詞而仍聲稱原7776清單。另外用單 byte 對7776抽樣會得到接受界限0，應明定既有實作的兩 byte 拒絕抽樣（界限62208），而非籠統照搬小字元池公式。 |
| [Cron #32](https://github.com/KYStr/glossquote-labs-home/pull/32) | `*/15 9-17 * * 1-5` 在2026-10-30週五16:59之後，依序17:00、17:15、17:30、17:45，才到週一09:00。原算例漏三次。 |
| [Typing #34](https://github.com/KYStr/glossquote-labs-home/pull/34) | `The quick brown fox jumps over the lazy dog.` 是44字元。30秒 raw WPM17.6→顯示18；20秒26.4→顯示26，非27。T=50例需獨立更長 passage，不能超過44字的輸入上限。 |
| [HTML Entities #37](https://github.com/KYStr/glossquote-labs-home/pull/37) | 官方表2231總項，2125有結尾分號、106 legacy無分號別名；不是2231個有分號項。修計數描述與完整表驗收口徑。 |
| [Word Frequency #38](https://github.com/KYStr/glossquote-labs-home/pull/38) | Unicode simple folding是C+S（1453+31=1484），不是C+F。維持Σ/ς/σ合併與İ不變；實作選C+S正確，應修規格括號及測試名稱/註解。另 WORD-FILTER 是產品錯誤，不能混成這個規格勘誤。 |

官方資料本輪均重新取得，且 bytes/SHA 與作者聲稱的固定資料一致：
[Unicode 16 CaseFolding](https://www.unicode.org/Public/16.0.0/ucd/CaseFolding.txt)、
[WHATWG entities.json](https://html.spec.whatwg.org/entities.json)、
[EFF large word list](https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt)。
原始資料、重算程式與結果在外層交付包 reviews/primary/；本報告沒有作授權條款的法律結論。

## 承接與雲端協作處置

讀取時 r792：Aspect Ratio / Roman / CSS 三個製作 task 正式 reviewing，原 owner/claim 保留；其餘16個 build-first candidate，QR只有ready task但SPEC仍draft且未claim，另外15個製作task尚不存在。16個成品不是可承接預案庫存，亦不能因GitHub已有程式就自動accepted。核實的未消耗ready預案為2份：UTF-8 Base64 Text、Dice Sum Distribution；低於當前40份政策門檻，庫存補充仍為P1，未在本輪另開製作。

附件聲稱其他對話獲得「先製作後審」授權；本輪未取得可讀的原使用者訊息，不能以附件代替權威指令，也不把它直接判成未授權。請原雲端統籌保留16個固定成果，提供可追溯的例外授權/真實製作時間與承接補正方案；按最新共同規則記錄實際保存點，不回填假的開工前claim、不代其他actor簽收、不另開一份重做。若需修改全域協作政策，應由使用者裁決或核實原指令。

本地主代理 actor、當前規則 ACK 及主頁基線未變；本輪只 resume 自己原整合任務。主頁基線仍為 `26525d5f6380915ea95dde879dec769442db0d95:README.md`，規則AGENTS `c1bc544b7993f267675098ecfc92b19ed6a1430c`、workflow `140c61169b4267bc2314f6ad546f3091a5af3174`、commands `e4531f37cc0847f200d7de10f9f21e2cccc1c613`。

原製作者 actor 為共用登記中的 cloud-dot:3d64a845…；App read_thread 在 local/durable 沒有找到對應對話。因此以原候選／SPEC PR 留下具體退修單，並保留登記owner；不能聲稱已喚醒原對話或對方已接單。另一個「設定 glossquote-labs-home」是使用者指定的雲端審核員，不是上述製作者，沒有替換責任歸屬。

## 尚未驗證與後續門檻

全19件：真實瀏覽器操作、完整Network/Storage、鍵盤/AT、真實zoom/reflow與對比、IME、BFCache、原生下載等依各SPEC必要面向保留NOT_RUN。TTS語音與metronome音訊/時序只能證明fake adapter/core行為，沒有播放真音訊、驗證裝置或測量onset。DOM shim不能當瀏覽器PASS。候選preview noindex符合目前未發布階段，不列為SEO故障。

修正由原作者在原候選分支提出新commit/PR與新manifest；主代理重新固定同一candidate，再對必要面向逐項評分。只有全部必要面向至少90、必要檢查完成才accepted；accepted、merge、free Cloudflare部署與雙語首頁/看板更新分別記錄。這次不動正式站。

## 委派與主代理驗收

PROD-NOV2-A交既有nov2_proposal_review，9款；PROD-NOV2-B交既有nov2_registry_review，10款。兩個審查者先看執行閉包再跑背景CLI；要求配置Luna/max，沒有以角色文字冒充模型切換，後端身份未能獨立確認。未讓子代理再委派。主代理修正審查報告中的PDF commit轉置與B組manifest來源誤述，重新核實完整來源與唯一案例數，保留原始命令證據，沒有依子代理一句「通過」批准產品。

本輪主代理新增重算腳本先因拒絕generated JSON尾逗號而停止，修正只接受尾逗號的資料解析後成功；它是審查程式問題，不算產品缺陷。早期source缺manifest與測試暫存位置錯誤也已分開記錄，未混入產品FAIL。
