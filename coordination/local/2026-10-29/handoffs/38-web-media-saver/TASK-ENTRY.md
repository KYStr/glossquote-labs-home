> 最新狀態（主代理，2026-10-22）：已公開 GitHub、部署並更新雙語首頁與看板；限定範圍主驗通過，等待外部驗收。詳見 [正式發布驗收](RELEASE-ACCEPTANCE.md)。下方保留各階段歷史狀態，不代表目前仍未部署。

# MD22-38-RELEASE — 任務 B / SOURCE PUBLIC / FROZEN

2026-10-22：已依主代理固定GO完成[公開來源](https://github.com/KYStr/glossquote-labs-web-media-saver)，完整commit `8716a264c6d6866d2343a0b7ec7b2a163dc797c7`，branch/default `codex/web-media-saver-release`，PUBLIC。遠端43檔tree與乾淨reviewed copy一致、核准35檔bytes不變；copy14發布測試／check及保留產物副本release皆exit0。Git與持久環境guards前後一致。Hosting未部署、首頁看板未改，交主代理接續；詳見[HANDOFF](HANDOFF.md)。原對話停止編輯，不開始P1/P2/P3。

# MD22-38-RELEASE — 任務 A / FROZEN（歷史）

2026-10-22：依[WEB-RELEASE](docs/WEB-RELEASE.md)完成 wrangler 固定 assets-only target、`node scripts/release.mjs` 固定正式建置及14項離線發布測試；check/release與完整環境guard比較均exit0。public／M0／既有實作測試及package不變。正式release dist的index/follow只是候選，不是已部署。完整source/diff/hash與NOT_RUN見[HANDOFF](HANDOFF.md)。

等待主代理固定版本 GO 才執行 B 公開來源；原對話目前不push、不部署、不碰首頁／看板、不操作任何browser/native UI、不再編輯。先前249＋57＋50主驗可沿用未變程式，未冒稱本輪重新執行。

# 主代理結果 2026-10-22（歷史）

WEB-M1 / R03–R04 已完成主驗，詳見 [PRIMARY-ACCEPTANCE](PRIMARY-ACCEPTANCE.md)。下一里程碑為來源公開與正式發布；尚未執行，沒有外部驗收通過聲明。原對話停止編輯，等待下一個明確範圍。

# MD22-38-WEB-M1

最新修正 MD22-38-WEB-M1-R03／R04：**FROZEN**。僅 media.mjs 的有界 EBML Header／DocType 解析與 ftyp 四byte對齊、對應測試、重建 dist 及交接 metadata。受影響測試45 PASS、完整249 PASS，check/build與環境guard比較均exit0。舊13份owner證據與M0凍結檔保留；新增證據使用 `-r03` 後綴。修正前主代理Chrome155雙語30案例／10次protocol downloads的PASS保留為歷史，當前新來源待複核；原生保存仍NOT_RUN_MANUAL。詳見[HANDOFF](HANDOFF.md)。以下221項為修正前交接歷史。

2026-10-22 owner 結果：**FROZEN**。已交付雙語純網頁 public/dist；`npm test` 最終 221 PASS（原139＋新增82）、check/build exit0，9個M0凍結檔未變、環境guard完整Snapshots一致。WEB-M1 R01假MP3／R02 QuickTime誤標已修正並回歸。主代理另回報42項獨立測試通過；瀏覽器／原生保存尚待主代理如實驗收。本功能對話不啟動瀏覽器、不push/deploy、不再編輯，詳見[HANDOFF](HANDOFF.md)。

當前任務：依 [WEB-M1](docs/WEB-M1.md) 實作可操作的雙語純網頁版：可讀媒體直鏈／本機檔案 → 保存原檔或取出 WAV。零 runtime 依賴。原碼／check／build／offline tests 一併完成，再 FROZEN 交主代理驗收。不能只回計畫。證據放 `.runs/media-web-m1-2026-10-22/owner/`。requested gpt-6.1-sol/max；backend identity 未獨立確認。

以下是歷史 M0 交接，不是目前工作範圍。

# MD22-38-M0

執行[任務清單](TASKS.md)的M0/T00–T03，交付可測純核心及test/check/build；不要只回計畫。具體契約[TECHNICAL](TECHNICAL.md)，行為驗收[ACCEPTANCE](ACCEPTANCE.md)。

所有38產品實作由本原功能對話完成；主代理不與你同編src/test/scripts。允許路徑只有本資料夾src/、test/、scripts/、package.json、.gitignore、dist-core/、HANDOFF.md、TASK-ENTRY.md、project.json。證據唯一目錄由dispatch指定。規格/docs/AGENTS與所有共享及兄弟專案不得改。

使用者提出臨時下載後刪除，已選便攜ZIP→解壓→手動啟動→關閉→手動刪助手。這不是允許安裝服務或自動執行下載檔。M0依賴零、不做UI、不呼叫平台或引擎，不推GitHub／部署。原有11/12仍受阻，不改或沿用其PASS。

收尾需FROZEN與實際hash、完整命令/exit/限制。requested gpt-6.1-sol/max，backend實際identity未獨立確認。禁止遞迴委派。若Goal工具可用，為本次M0背景核心設定有限目標；不可用則回報，不虛稱設定。

## 2026-10-22 M0 owner 交接

**FROZEN — 核心背景候選，主代理獨立驗收通過。** 原功能對話 `01a16218-cb6e-7721-b83f-f34241b8c08c`，create_thread 接受 requested gpt-6.1-sol/max，backend identity 未獨立確認。

已實作 T00–T03 的 URL／exact plan／可取消 controller／fake adapter／check／dist-core，AC01–24 對應離線測試 **139 PASS**，含 R01 reflection 重入修正的 31 項回歸。`npm test`、`npm run check`、`npm run build` 均 exit 0；環境 guard 完整前後 Snapshots 相同。命令、一次比較包裝誤判的保留紀錄、source/dist hash、API 選擇及 NOT_RUN 詳見 [HANDOFF](HANDOFF.md)。

主代理已回覆 55 項獨立測試與 R01 補核通過。M0 背景核心通過不等於完整產品或任何平台實際下載相容。保持 M1 未開始，禁止新增依賴／引擎／網路／UI／公開發佈／部署；主代理回傳新里程碑前不再編輯。未另打 ZIP。


# WMA22 — 任務 A / F01 / FROZEN（2026-10-22 最新追加）

依 `.runs/web-media-external-2026-10-22/TASK.md` 修正發布 HTML head 驗收缺口。只改 scripts/release.mjs、test/release.test.mjs，HANDOFF/TASK-ENTRY 只追加；其他來源、M0、public、build/package/wrangler 與全部16份正式release產物 bytes不變。

實際 Node24.14.0 完整 test 279 PASS／0 fail／0 skipped、check與release皆exit0。新增兩語16例明確驗證head變異、body不變、重算manifest自洽，且全部因RELEASE_HTML_CHANGED拒絕；原產物仍通過。完整環境guard Snapshots一致。新35檔 executable manifest SHA256 `2674d19a66249996a3d05a6a8edb53df80b30aa5f1df1eb4b05d7055844d24fa`，release manifest仍 `667c4f23fd7ffe9857742bd1c2223eabf762e723f9acf92d36ff869e6b73be04`。

完整stdout/stderr/argv/exit/runtime、前後guard、限制內diff及凍結清單只在 `.runs/web-media-external-2026-10-22/owner/`，詳見 [HANDOFF](HANDOFF.md) 最新追加。原對話不push/deploy、不browser/native/桌面/鍵鼠/IME/clipboard、不讀憑證、不改持久環境或Git、不委派。任務A已FROZEN，交主代理親驗；未開始B，需其固定來源GO才更新公開repo。

維持外驗partial：完整Network/Storage、獨立browser E2E、Edge／真機／原生操作／讀屏仍NOT_RUN，不能標整體外驗完成。前端assets未改版，現站未因本輪重新部署。
