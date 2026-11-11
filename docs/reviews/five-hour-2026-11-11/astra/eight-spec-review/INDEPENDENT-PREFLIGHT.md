# PR324 八份規格映射獨立預審

**PASS_READ_ONLY_PREFLIGHT；尚未綁定實際 MAP8 register/claim/start/submit，不構成正式 accepted、apply 或 ready。**

候選為 [PR324 固定 head](https://github.com/KYStr/glossquote-labs-home/pull/324) `3bc18c8ec3659ad87b3da37b5c7dac59570cb288`，唯一 parent `e654b0057e2a20affed20bfef16f76b23c11f766`。本 reviewer 為 `local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf:/root/five_hour_astra_review`。要求 Astra / ultra；未另外驗證實際模型後端。

## 新核對與沿用範圍

本人完整閱讀固定候選新增的 HANDOFF、mapping、SOURCE-HISTORY、SOURCE-BYTES 及 verify 程式，核 PR 實際檔案範圍與 parent；38 個候選檔（含繼承 README）的公開 Git blob、bytes、SHA-256 實讀相符。實際 diff 是 37 個新增文件：32 個規格檔與5個映射文件；README 未改。沒有產品程式或 registry 變更。

本次 [獨立驗證](verify-mapping.mjs) Node v24.14.0 exit 0，固定下載 86 個輸入：38候選、33原來源、完整r1627 registry、14相對連結目標。32個規格檔與六個 accepted 維護來源逐位元組相等，README1810bytes與parent相等；八個 old author/document/source/criteria hash 與完整 r1627 registry 精確一致、均 draft/unconsumed/unassigned；72個未來產品 criteria 的 ID、順序及 label **逐字等於 SPEC 表格**；134個相對文件連結可解析。六份原維護任務 owner/claim/submission/acceptance 與 SOURCE-HISTORY 全物件相等，分數及必要檢查完整。

作者 `verify.mjs` 已親跑一次 exit 0：33 sources / 8 targets / 72 labels，輸出 `PASS_SOURCE_INTEGRITY_ONLY`。它用文字包含判定 label，單獨不能證明精確表格、歷史接受、製作者隔離或八節實質完整性；上述更窄的 source-only 標記正確，本人另行補足這些必要檢查。

[既有八份內容審查](prior/INDEPENDENT-PREFLIGHT.md) 和 [64格實質理由](prior/semantic-matrix.json) 是本人05:34既有工作，這次核相同32個 blobs後沿用，沒有重做未變算術。258案例中225筆的 peer 輸出曾由本人與字面 expected 深比對，股票33筆只核 provided成功摘要與ID覆蓋；**225與33均不是本人這一輪重新執行的算術 oracle**。[既有資料稽核](prior/input-audit.json) 保留此界線。八節不是只靠標題存在判定，也不是把六來源的三面向維護分數當八節文件分數。

初次本人的新核對腳本誤要求 HANDOFF 重複印出 exact claim；實際 exact claim 位於 HANDOFF 連結的 SOURCE-HISTORY，已與固定 registry 核對。僅修正本人證據所在位置的斷言後 exit 0，未變更候選，這不是產品缺陷。

## 來源及作者隔離

[結果](preflight-results.json) 列出32檔原來源與八個 target。歷史來源為 PR299（wallpaper/ping）、PR298（breakeven/markup）、PR297（tax）、PR305（stock）、PR303（baking）及 PR306（savings），精確 commit 見 [輸入 pins](input-manifest.json)。六維護在固定 r1627 已 accepted，未以 PR 標籤推定。

SOURCE-HISTORY 中八位既有 makers 全部核實：原 cloud 規格作者、六位維護作者、實際 root assembler。原規格 authoring task、來源 owner/contributors/submission、同 commit 維護祖先及來源 lineage 一起核；root assembler 的協調 task 與 exact claim 在 r1627 的確 working。本 reviewer 不在此集合。正式綁定尚須加入實際 mapping owner，不把預計 owner 冒稱已 claim。

**結構化欄位限制：**目前核心不會把外層 root assembler 自動加入 mapping task 的 contributors。SOURCE-HISTORY 與 HANDOFF 已明示其製作，正式提交也必須具名引用 root actor/task/claim；本獨審會在結構化 contributors 之外把 root 納入完整作者排除集合。root 不作本項獨評，本 reviewer 與全部已知 makers 相異，所以本次實際獨立性成立；不宣稱此 schema 自動保證未來任何 reviewer 都遵守 assembler 隔離，也不手填 contributors 或改寫歷史。

## 八節與庫存判斷

八份64格實質內容都可沿用；沒有新增阻止「合法映射後的文件接受」的內容缺陷。八節逐項正式分數須等真實 task 的預宣告 rubric、targets、contributors、owner/claim 和固定 submission 全部綁定後另附，這份預審不提前標 accepted。

| 文件 | 八節文件內容 | 新製作庫存 |
|---|---|---|
| wallpaper-calculator | 可供正式映射審核 | 既有產品續作；保持 draft，不增庫存 |
| ping-area-converter | 可供正式映射審核 | 既有產品續作；保持 draft，不增庫存 |
| savings-goal-calculator | 可供正式映射審核 | compound-interest 既有工具升級；保持 draft |
| breakeven-calculator | 可供正式映射審核 | 潛在新庫存，另需新鮮去重及合法 ready |
| markup-margin-calculator | 可供正式映射審核 | 潛在新庫存，另需新鮮去重及合法 ready |
| tax-included-converter | 可供正式映射審核 | 潛在新庫存，另需新鮮去重及合法 ready |
| stock-profit-calculator | 可供正式映射審核 | 潛在新庫存，另需新鮮去重及合法 ready |
| baking-pan-converter | 可供正式映射審核 | 潛在新庫存，另需新鮮去重及合法 ready |

所有八份在 source snapshot 都是 draft。映射正式接受也不直接代表已 apply 或 ready，更不代表產品九面向、hosting、外部驗收完成。既有候選、原 owner、歷史版本全保留。

## 可重現與未驗

使用 [README](README.md) 的可攜入口下載固定公共依賴，再跑本人 metadata/provenance/byte verifier 及已讀過的候選 verify。輸入固定 commit/blob，不需憑證、安裝套件或全域設定；輸出寫入指定的新資料夾。先前數值結果與64格審讀作歷史證據沿用，不會由此入口重算，亦不聲稱腳本可替代人的內容判斷。

未跑產品、GUI、原生下載、部署、SEO或外驗；維持 NOT_RUN_USER_FOCUS_INCIDENT。無 registry 寫入、apply、ready、產品改動或合併。Windows持久環境前後完整輸出相同，原始指紋只留本地；公開僅 PASS 摘要。Git設定守護在公開前後另讀回。

