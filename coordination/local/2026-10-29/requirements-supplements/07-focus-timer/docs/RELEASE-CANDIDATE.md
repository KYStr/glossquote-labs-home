# U07-OPT-IN-CHIME-20261013 — 主代理發布候選

## 最新 P2 修正版（2026-10-13）

請審查／部署 **`e64205f5407539fc0451c8052017a6a63f7bd635`**，PUBLIC／remote HEAD 相符、副本 clean。下方 ed7e378 為已被主驗 P2 阻止發布的原候選，歷史紀錄與原 ZIP 保留，不可當修正版發布。

根因：pagehide 停掉音訊 running，但未到期 timer core 仍 running；重新勾選未同步，探測後關閉 context，completedNow 到期卻被音訊 !running guard 略過。修法：啟用 handler 先 reconcile，再傳當前 core running 給 chime；關閉先停音訊再 reconcile；完成即消耗一次訊號，無可用音訊回 unready，手勢不重置 reminded。pageshow 仍不初始化音訊，timer／format／scheduler 位元組不變。

原始版本新增回歸 0/3 FAIL 已保存，修正後音訊 23/23、全測82/82，test／check／preview build／production build／release check 全退出0；4 個新增邊界含未到期復原 off/on、未重新啟用到期、已到期重開、已過 deadline 未取樣先校正。證據為 fake audio／clock＋真正 core／scheduler，**真 BFCache 命中與聽感仍 NOT_RUN**。原正常真 Chrome 一分鐘／兩語證據保留，沒有重跑或改稱新 BFCache 實測。

新固定 ZIP／manifest：`.runs/focus-outcome-2026-10-13/p2-pagehide-2026-10-12T17-59-58-483Z/glossquote-labs-focus-timer-e64205f5407539fc0451c8052017a6a63f7bd635-gitblobs.zip`／`source-manifest.json`；31 成員 bytes／SHA256 與 Git blobs 全同，ZIP SHA256 `b7d081994f940e080dfc77a169b1d0f317f7faa498d418112465999ef3efe066`。同目錄有 before snapshots、reproduced-before-fix、focused／final gates、publication-diff、zip-verification、完整環境 before／after。

P2 實改：public/js/{app,chime}.mjs、test/chime.test.mjs、docs/OUTCOME-VERIFICATION.md，以及本工具 TECHNICAL／TASKS／HANDOFF／THREAD-STATUS／本候選交接。沒有新權限、依賴、政策或正式部署。主驗仍待 primary；**owner 重新釋放本工具及發布副本寫入權**，原本機4187預覽不重啟、不殺其他伺服器。

## 原候選交接（保留歷史）

日期：2026-10-13。狀態：LOCAL_AND_PUBLIC_SOURCE_READY，待主代理獨立審查、正式部署與新版外部覆核；尚未把新版標為 live 或外驗通過。要求 Sol/max，後端路由未獨立確認。

公開來源：https://github.com/KYStr/glossquote-labs-focus-timer ，PUBLIC、remote HEAD `ed7e37876e602db0587893ba3c391a116b8d0b9a`，分支 `codex/initial-publication`；審查副本 clean，31 檔。版本 ZIP 是 `.runs/focus-outcome-2026-10-13/run-2026-10-12T17-14-32-229Z/glossquote-labs-focus-timer-ed7e37876e602db0587893ba3c391a116b8d0b9a-gitblobs.zip`，manifest 為同目錄 `source-manifest-gitblobs.json`。31 成員 bytes／SHA256 全符 Git blobs；ZIP SHA256 `7b7b060184cac9e6b261305d7dead8755fad0b3375cbd125839c08fabc3ddcaf`。不要使用同目錄第一次受 CRLF 轉換的舊 ZIP；失敗紀錄已保留。

必要命令全退出 0：Node 24.14.0，`npm.cmd test` 78/78；`npm.cmd run check` 10 public／14 Node；preview build 10 assets；production Cloudflare build／check 14 files。兩語 production 唯一 x-default 指向 `https://focus.glossquote.com/index.html`，preview noindex／無正式 origin；CSP／headers／404 gate 保留。

真 Chrome：一分鐘新 session 真實等待後 00:00／完成／一次 attempted-sound 狀態；試聽不勾選、鍵盤 opt-in、pause／resume／cancel／restart、語言重設、181／1e2 錯誤、180 復原。兩語 320px 在導航後 client/scroll=305，無溢出；初次瞬間 resize 462 觀察和 full-page 截圖 timeout 都保留，未掩蓋。詳 `docs/OUTCOME-VERIFICATION.md` 與專用 Chrome JSON／viewport screenshots。

聽感／實際裝置音量／OS mute、背景／睡眠／真 BFCache、讀屏／真 200% 等 NOT_RUN；不把 context running 或嘗試播放當耳朵聽見。音訊低音量與清理、unsupported／rejected resume 為控制 factory／fake clock／資源計數測試，不假稱原生故障平台都測過。

本機預覽仍在 `http://127.0.0.1:4187/index.html` 與 `/en/index.html`，task-owned Node exec session 8628；只讀提供 public、不写產品。未停止其他進程／伺服器。功能 owner 完成本地及來源封裝，**釋放本工具與发布副本寫入權給主代理**，不再自行變更。

主代理接續：核對這個固定 commit／ZIP、審查 chime 與精確 AudioContext checker 例外；部署新版前確認正式兩語 metadata／headers／新 chime module。同步雙語首頁文案中與「完全無聲」相衝突的描述（本 owner 不改首頁）。正式發布驗證後交本批外驗，新版不繼承旧版本外部通過。

Hosting 尚未由本 owner 變動；之前正式 version `6074c3aa-d5dd-4dbb-8c89-483f3b3b7a6b` 為歷史版本，這次没有查控制平面或讀憑證。新增手勢聲音沒有新增通知／麥克風等權限或依賴，也不更動 Cloudflare／DNS／根規範／其他工具。
