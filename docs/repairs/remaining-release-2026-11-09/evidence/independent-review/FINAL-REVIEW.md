# 固定候選獨立評分

Task `labs-remaining-release-20261109`，審查人 `local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf:/root/remaining_release_review`，本人 ACK 讀回 r1350。候選為 [PR #232](https://github.com/KYStr/glossquote-labs-home/pull/232) head `6dd878e270a7cb9c926504e147138c1bc0a76e40`，部署 Worker `53f7b254-1bb5-43eb-bb05-2ac63b68ee86`。完整審查涵蓋 maintenance 的五項預定面向；評分不適用個別工具的九項正式產品驗收。

| ID | 分數 | 證據 |
| --- | ---: | --- |
| source-provenance | 98 | 40 個固定原 PR、1,055 個原產品檔與 160 個規格檔對到 Git blobs/位元組；38 個修檔和股票額外修正、R12 九個修檔比對遠端；40 個 commit author 保留為 Muse (cloud-dot for KYStr)，未推論不存在的原 production owner。最終候選只在已審產品來源上增發布和證據。 |
| defect-resolution | 97 | 39 款 156 主要命令關卡、1,566 tests 通過。Windows 四個異常路徑修正獨立重現前失敗後成功；股票後續固定 blob 於含空格及 `#` 路徑三項 build tests 通過、8 預覽檔不變。新站 Blob CSP 語法正確。R12 53,707,539 bytes 三片內容復原、末片竄改拒絕、無完整檔網路 fallback；R11 GPL 與雙瀏覽器門檻、R12 完整 T02、血型截斷 SPEC 明列阻塞。 |
| release-security | 98 | 39 新站 78 頁實際 staged Worker 路由，141 精確主機，無既有正式站衝突；101 既有檢查站 1,174 資產逐檔相同。拒未知主機、非 GET/HEAD、內部 mount 與編碼穿越；合成 Cookie/Authorization/query 不送 ASSETS。逐站嚴格 CSP、noindex、nosniff、frame/referrer 保護；無發布阻塞媒體與血型。Git 設定與持久 Windows 環境前後指紋相同。 |
| bilingual-release | 97 | 主代理 1,631 實際 HTTPS 資產與 423 別名／錯誤回應通過；獨立 8 host／61 個 HTTPS 回應逐項抽核，同語回鏈、canonical/hreflang、noindex/headers、redirect/404、雙語目錄各 140 項。遠端隔離 Chromium 驗英文百分比實站 HTTP 200 和 JS 初始狀態，完整互動與裝置驗收仍 NOT_RUN。 |
| delivery-integrity | 99 | 單一 ZIP 24,381,014 bytes，SHA-256 `56b0b2897903e6be3afe1e491270423c4510e4eaa88e5577b8a0b7fc2807ca4d`。獨立解讀 ZIP 並驗 CRC、9,188 manifest rows、大小寫唯一、安全路徑、26 個入口相對連結、190 個工具狀態、6,191 舊封存檔 bytes、1,631 實站資產 bytes、1,055+160 固定來源／規格及 R12 98 檔；唯一 `00-START-HERE.md`。 |

此 maintenance 候選的必要檢查齊備，可接受 noindex 公開檢查發布與交付。未驗正式產品功能、醫療／金融／法規資料的全面準確性、裝置、下載、真實 Network/Storage、媒體雙瀏覽器／OS RAM，以及外部驗收；這些範圍保持原 NOT_RUN 或阻塞狀態。
