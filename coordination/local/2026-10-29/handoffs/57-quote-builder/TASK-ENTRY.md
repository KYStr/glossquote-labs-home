# B20-57-M1 任務入口

2026-10-23（Asia/Taipei）。原實作對話依 14 份只讀規格執行 T00–T08；requested `gpt-6.1-sol/max`，不自稱已獨立驗證 backend。

可觀察交付：雙語編輯工作區、BigInt 精確報價、真實靜態 HTML / schema 1 JSON 產物、可取消確認的 JSON 恢復草稿；全部 Node/check/build 證據及來源凍結清單。僅 M1 候選，主代理另驗 browser / M2。

允許路徑：本工具 package.json、.gitignore、public、scripts、test、dist 生成、HANDOFF、TASK-ENTRY、evidence/m1。保留原 14 規格文件。無 browser、server 啟動、原生 UI、下載對話、自動化焦點測試、套件安裝、Git publication、部署或持久系統設定改動。

使用 frontend-design 作排版參考，產品契約為準。Product App 模式；常用欄位可見、品項行就地新增刪除、真預覽作主要畫布，資料不持久化。

Desktop: `compact top bar → editor (40%) | actual quote canvas (60%)`。
Standard/Compact: `[Edit quote] [Preview quote] → full-width selected workspace`；提早於 75rem 收合以滿足 Standard 主畫布空間與 320px 欄位可用性。

草稿保存指使用者下載 JSON 再明確匯入，不是背景儲存。文字保留前後空白，名稱空字串合法，純空白品項拒絕。金額輸出固定兩位，不經浮點數。

本輪結果：T00–T08 的 M1 實作／離線驗證與交接完成；最終 npm test 31/31、check（8 public、21 ESM）、build（8 preview files）exit 0。實際雙語 HTML/JSON 證據已寫檔並 reopen 檢查。完整清單與未驗項見 [HANDOFF](HANDOFF.md)；固定 sources/dist bytes 和 SHA-256 見 [manifest](evidence/m1/source-manifest.json)。

Browser B01–B05 保持 NOT_RUN_USER_FOCUS_INCIDENT；真 HTTP/server 保持 NOT_RUN_BY_TASK_NO_SERVER（僅 offline handler tests）。不宣稱完整驗收。Windows 前後完整 Snapshots 相同；未發布 GitHub／部署／改共享首頁。原 source commit、reviewed commit、released commit 皆未建立。候選交主代理獨立檢查並整合單一 ZIP；未獲 M2 前本對話停止於此 milestone。


## M1B 追加入口 — B20-RP-57

2026-10-23。最新範圍依 batch20-release-prep TASK；只做離線發布準備，M1 原文與 evidence 不覆寫。已完成固定 quote.glossquote.com / quote-builder、build:release/check:release、獨立 11 檔 site 與 sibling manifest、source lock 和 tamper 防護。最終 npm test 43/43、check 24 ESM、build:release/check:release 全 exit 0；Environment 完整 Snapshots 相同。原 public/dist 與舊 M1 證據逐檔保持原 bytes。

重現與 browser 驗收入口見 [M1B-RELEASE](M1B-RELEASE.md)；實際差異、十項契約、完整命令／hash／未驗項見 [HANDOFF M1B 追加](HANDOFF.md) 與 [來源清單](evidence/m1b/source-manifest.json)。browser 仍 NOT_RUN_USER_FOCUS_INCIDENT，真 HTTP 仍 NOT_RUN_BY_TASK_NO_SERVER，GitHub/hosting/首頁未開始；本輪不是 M2 放行。沒有新 chat 或子代理；requested gpt-6.1-sol/max，backend 身分未以自述確認。


## M2A 追加 — B20-57-M2A

2026-10-27 Asia/Taipei。root 真 browser b20-57-r1 = 32 PASS / 8 NOT_RUN / 0 FAIL（prohibited 0），isolation/parent cleanup 由root回報PASS。本輪依指令只完成 assets-only 正式發布準備：新增固定 wrangler.jsonc、精確三條301 _redirects、release-only 精確候選前綴移除，以及 config/allowlist/tamper tests。原 public/dist、6份 runtime、CSP與原M1/M1B evidence不變；舊release輸出完整封存到owner任務目錄。

最終 npm test 49/49、check（8 public / 26 ESM）、preview build、build:release、check:release 均exit0；site12檔69416bytes，完整環境Snapshots相同。最新重現／平台邊界見 [M2A-RELEASE](M2A-RELEASE.md) 與 [HANDOFF](HANDOFF.md) 的M2A追加段。來源／產物／diff／hash證據位於 .runs/batch20-completion-2026-10-27/owner-57-release/。沒有本輪UI、Wrangler、GitHub、Cloudflare部署或首頁修改；8個NOT_RUN仍保留，本輪不宣稱完整人工／真機驗收。
