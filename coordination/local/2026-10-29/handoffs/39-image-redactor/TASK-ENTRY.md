# NEW22-39-M1 執行紀錄

2026-10-22（Asia/Taipei）。此原功能對話依 T00–T05 連續實作本地候選。Done：最終 Node test/check/build 通過、來源固定 manifest、交主代理 review。M1 不代表完整驗收或 release。

- 已讀 START-HERE、AGENTS、六規格及 docs。docs/DESIGN-SYSTEM.md 與已完整閱讀的家族設計契約 SHA-256 相同。
- 使用者工作：分享截圖前手動遮住已知區域，檢查扁平 PNG，再下載。Product App；圖片為最大工作區，座標與清單相鄰，手機改單欄。採 UX-SEO 所附 desktop/mobile wireframe。
- 環境：Node 24 路徑 C:/Program Files/nodejs/node.exe；不安裝依賴、不開 dev server、不使用瀏覽器或桌面互動、不讀憑證。
- requested model 為 gpt-6.1-sol/max；不宣稱 backend 身份獲獨立驗證。
- 必要真 browser B01–B20、native、輔助技術及真機均 NOT_RUN_USER_FOCUS_INCIDENT，交由主代理安排核實隔離機制。
- GitHub、hosting、首頁與正式 SEO 不在 M1；未獲 M2 指令不跳階段。

## 進度

T00 已通過：Node v24.14.0，4 tests；test/check/build exit 0。T01 已通過：18 tests，test/check exit 0。T02 已通過：32 tests，test/check exit 0。T03 已通過：38 tests，test/check exit 0。T04 首輪 48 tests/check exit 0；收尾 review 回原 T01/T02 路徑修正錯誤優先序，T04 改以穩定遮罩列保留焦點節點並補未提交欄位編輯失效測試。受影響 gate 重跑 50 tests/check exit 0。T05 最終 54 tests（0 fail/skip）、check、build 全 exit 0，24 個實作檔案 gate 前後 SHA-256 相同，12 個 dist 資產與 public 相同；13 個既有規格／契約相同；Environment guard 前後完整 snapshots 相同。M1 本地候選交主代理 review，沒有 browser/native gate PASS、M2 或部署。實際命令、歷史與固定來源見 evidence/m1 及 HANDOFF。

主代理同輪修正 PRODUCT FR-01：目前存在遮罩即需替換來源確認，不以是否匯出區分；實作遵循此修正。

PNG-3 chunk 順序與 JPEG SOS 欄位曾以規格內官方 W3C PNG-3 Table 7、ITU-T T.81 B.2.3 核對；參考為結構證據，不是 browser 驗收。

## 主審修正 r2

2026-10-22，依主審指定範圍移除 pointermove 的全原圖 paintComposite。draft 改為顯示尺寸 DOM overlay，沿用既有 visual-pixel mapPointerRect；pointerup 才提交／重畫，取消／resize／換圖／清除／生成／pagehide 清 draft，encoder 只畫 committed masks，鍵盤操作不變。未改規格與依賴。

r1 的 manifest／evidence 原 bytes 保留，39 個來源備份於 evidence/m1/r2/baseline-source。r2 固定實作 manifest 24 檔，最終 Node v24.14.0、58／58 tests、check／build 均 exit 0；Environment snapshots 前後相同。25 次 4000×4000 假資源 draft 更新為原圖 resize 0／draw 0，提交 draw 1；這是 call-count regression，不是 native browser 效能或像素驗收。真 browser B01–B20 全維持 NOT_RUN_USER_FOCUS_INCIDENT，M2／hosting 未開始。六份 SPEC_ONLY 文件是歷史規格快照，目前實作狀態依 r2 證據。
