# 來源配置與遷移規則

2026-11-09 使用者要求以一個 repo 接續工具家族。共用 repo 為 `KYStr/glossquote-labs-home`。這項指示取代「每個新工具都建立一個獨立 repo」；免費 hosting、原作者責任、GitHub 先交驗與正式部署 gate 照舊。

```text
START-HERE.md                  第一入口
README.md                      repo目的與主要命令
catalog.json                   正式首頁展示，不是工作庫存
public/, scripts/, test/       原首頁程式與專用測試
tools/<slug>/                  已在中央工作的工具；新實作位置
docs/specs/<slug>/             完整規格與字面驗收案例
docs/reviews/                  版本固定的獨立審查
coordination/work-registry.json 唯一所有權與狀態
coordination/source-index.json 來源位置、固定commit、快照的對照
sources/legacy/<slug>/         舊獨立repo預設分支的原樣快照
sources/candidates/<slug>/     尚未放行候選的原樣快照
archives/                     本地與雲端舊盤點、重複來源與證據
```

## 哪個檔案可以直接改

- 新工具：claim 的 brief/SPEC 指向 `tools/<slug>/`；只改 task 允許路徑。
- 已有中央工具：確認 task.source/submission.candidate，再在自己的工作分支改 `tools/<slug>/`。
- `sources/` 和 `archives/`：固定保留副本，不能悄悄修正、刪除或把狀態改成 accepted。修正應回原作者與可寫目錄。
- 舊 repo：保留原 commit/分支/PR。此次沒有封存或刪除它們，也沒有改變 Cloudflare build root、DNS、部署來源與歷史驗收。
- registry：只能經純 core + fresh CAS + readback；source-index/工作總表沒有改 owner 的能力。

## 舊工具切到中央實作的四步

1. 原 owner 讀最新 task；在同一 claim 的 checkpoint 指明遷移，不重新領同一功能。
2. 從 index 指定的固定候選，完整複製到 `tools/<slug>/`；對來源檔案逐一比 bytes/Git blob/SHA256。保持原相依與邏輯；不得把 node_modules、模型快取、秘密或系統設定帶入。
3. 開中央 PR；第一個 commit 僅遷移，後續 commit 才改功能。提供原repo、原commit、原path、中央path、已保留的驗收面向。若已有同名 tools 內容，停止比對，不覆蓋。
4. 主統籌核對差異及原 owner，按協議 submit 新candidate與PR；獨評accepted後才更新部署來源。原候選驗收不自動轉成新版本通過。後續 source publication 在中央 repo 完成，不再建立獨立repo。

來源索引會同時列 legacy default 與 candidate。部分舊 repo 的 default 只有 README／骨架，真正產品在 open PR；這是版本位置差異，不可把 default 快照當成「產品消失」或用骨架覆蓋候選。

## 重複與歷史差異怎麼處理

八項本地/雲端歷史重複已保留為 alternatives：多軌議程、問答卡、通訊錄、錄音筆記、循環賽、期限倒排、照片聯絡表、圖片疊合。它們保有各自固定 source 和原owner；中央整理不選勝者、不合併評分、不把其中一個釋放。

文件也可能有 registry 固定版本與較新的未審 PR head。`docs/specs` 保存登記所指的版本；更新PR另見 open PR 清單。已消耗規格不能靠覆寫文件取消原驗收要求。主統籌先對照差異，再由原責任人以正式修正流程接續。

## 避免 repo 再變大

只追蹤 source、必要自製小fixture、固定spec、review與manifest。不要提交 node_modules、瀏覽器profile、模型weights、下載媒體、完整安裝快取、.runs、部署token或大型錄影。證據若另存已核准 artifact，manifest要保存bytes/hash/固定位置和可取得性，不得只貼會失效的臨時網址。

根目錄 `npm test` 僅執行首頁/協作測試；每個產品在其子目錄執行自己的明確命令。不可從根遞迴發現並執行所有保留快照，也不可在未知來源執行 postinstall。此次搬移不改動產品功能，不對全體快照的可執行性作新保證。
