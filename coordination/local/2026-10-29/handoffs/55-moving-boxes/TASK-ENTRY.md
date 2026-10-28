# B20-55-M1 工作記錄

2026-10-23（Asia/Taipei）。本輪僅實作 `55-moving-boxes` 的 M1，未獲 M2 放行。
配置請求：gpt-6.1-sol / max；backend identity 未獨立確認。

已讀本工具 14 份起始 Markdown（含 HANDOFF）、根 AGENTS、安全基線、產品論述、完整家族設計系統。
主要方法：frontend-design skill；專案契約優先。無委派、套件安裝、服務啟動、瀏覽器、截圖、憑證或發布操作。

## 完成條件

真實雙語可操作候選、純函式與 controller 離線精確測試、check/build 及反例通過；固定來源和 dist bytes/SHA。
真瀏覽器、鍵盤/讀屏/視覺、Network/Storage、真機和原生下載留待主代理，不等於產品已發布。

## 操作面

使用者：正裝箱或搬家後找物品；以箱號和物品為工作物件。使用環境：桌機、手機、小螢幕、低性能裝置。
模式：Product App。常用：搜尋、選箱、加物；相鄰：編輯/刪物/跨箱搬移、箱設定；展開：備份/恢復和清單。

```text
桌面  工具 / 語言 / 同語首頁
      全域搜尋 → 直接列出箱號、房間、物品、數量
      箱索引(15rem) | 當前箱與內容（主要畫布）
      新箱         | 加物與相鄰編輯/搬移
      清單與專案備份 / 頁內匯入預覽
手機  工具 → 搜尋 → 有標籤箱選擇器 → 當前箱/物品 → 匯出/恢復
```

例子只有按「載入假例子」才載入；若有現有資料先頁內確認替換。
匯出使用 UTF-8 TXT / JSON，不用使用者內容組檔名。沒有複製功能，改用可選取的唯讀結果。
控制字元採保守界線：所有資料文字拒 C0/C1/DEL（含換行），NFC 後以 Unicode code point 計長；數量嚴格十進位整數。

## 階段與證據

依 T00 → T01 → T02 → T03 → T04 順序實作；實際命令與結果留 `evidence/m1/`。未執行項不標 PASS。

## B20-55-D01（主代理決策，2026-10-23）

原2MiB匯入上限不能恢復部分合法完整專案（2179142 bytes中文例）。主代理已明確授權提高至8MiB（8388608 bytes），更新TECHNICAL/ACCEPTANCE及相關介面文字；其餘限制不變。容量待問已依此決策結案，不需再請使用者選擇。
此次兩份規格修改為額外明確授權；其餘規格/AGENTS/docs仍保持原hash。原衝突及第一次工具鏈失敗證據保留。

## B20-RP-55：M1B 離線發布準備（2026-10-23）

已完整讀 `.runs/batch20-release-prep-2026-10-23/TASK.md` 並對照現有工具鏈。新增固定 origin 的 release generator/checker、專項反例與獨立候選；本輪 public/runtime、preview dist、原 evidence/m1、規格／AGENTS/docs均受保護。
允許 package.json、scripts/test、交接文書、新 evidence/m1b 與 release-artifacts；不進M2，不GitHub、不部署。未委派／另開chat／使用browser或native。test/toolchain 暫存位置改至新 m1b，避免寫進舊 evidence。
最終只執行一次完整 npm test/check/build:release/check:release；preview來源未變，沿用M1 build證據，不重建dist。實際命令與hash另記 evidence/m1b 及HANDOFF追加節。

## B20-55-M2A（2026-10-27）

主控授權只做正式release準備，允許本工具全目錄及唯一 `.runs/batch20-completion-2026-10-27/owner-55-release/`；無push/deploy。依workers-best-practices方法核對，固定日期與停用所有遙測優先於skill一般建議。完整舊版本先封存後安全移出舊release，新增固定assets-only配置、精確三條301及config／redirect／manifest污染反例；public/runtime/CSP/core/output不變。

五命令各一次全exit0、81/81離線測試，保護120份原檔與完整Environment前後相同。只讀主控R4結果替換R3四FAIL，合計48PASS／12NOT_RUN，不重複支持案。沒有啟動server/browser/native、委派、另開chat、Git/auth、安裝或憑證操作。見[M2A說明](M2A-RELEASE.md)與HANDOFF追加節；等待主控M2A review，沒有自行進入M2B。
