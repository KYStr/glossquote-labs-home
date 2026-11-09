# 獨立審查、修正與發布

## 狀態字典

| 狀態 | 意義 | 不能推論 |
| --- | --- | --- |
| draft / reserved spec | 草案或被歷史工作保留 | 可開工庫存 |
| ready spec | 八節完整、非作者文件核對、未消耗 | 產品已寫好 |
| claimed / working task | 唯一owner，或已有實際開工證據 | 可以跳過預案 |
| blocked / revision | 保存owner與checkpoint，待解阻/修正 | 工作釋放 |
| reviewing | 固定candidate+open PR已交驗 | 驗收通過 |
| accepted | 同一候選所有必要面向>=90及必要檢查完成 | 網站已部署 |
| publication / catalog published | 有發布紀錄或歷史目錄宣告 | 這輪全產品重驗、外部測試全過 |
| awaiting external review | 主驗與發布完成、交使用者覆核 | 使用者已接受 |

## Reviewer 照這個順序做

1. 自己ACK最新規則，核對candidate完整40字元commit、PR仍open/head相同、原作者與所有contributors；自己未參與該候選製作才能獨評。
2. 讀固定SPEC與task完整criteria，不用聊天的簡略描述取代；把每一必要要求對到證據與檔案。
3. 閱讀實際diff與關聯程式。測試也要審：expected是否獨立、輸入是否真的成功、是否拿模擬代替指定瀏覽器/裝置。
4. 在可用環境跑必須的檢查；每項記環境、命令/步驟、實際輸入輸出、結果、commit、證據路徑。只讀到作者結果標為provided，不算自己重跑。
5. 九面向逐項評分，必要NOT_RUN則requiredChecksComplete=false；不平均、不把不同commit/語言/狀態的部分成功算全部通過。標出阻止驗收缺陷和非必要改善。
6. 證據先上GitHub，review command精確綁同candidate，由實際reviewer提交；若PR head已變先停止重核。

## 退修單

每個缺陷有ID、固定candidate、最小重現、實際/預期、影響、允許修正路徑、需要重跑的檢查及停止條件。交回原owner/原對話；不要另開相同工具、代換owner或只說「再改善」。作者回報新candidate，受影響範圍重新驗證，已通過且未受影響證據可保留。文件預期值有誤也要修正來源文件，不讓實作/測試一起遵循錯誤。

## 已通過後的正式發布（主統籌）

1. 固定accepted candidate，確認公開source與PR、沒有私人資料/憑證；中央repo作後續來源。merge不等於部署。
2. 使用既有授權的免費Cloudflare工具子網域；不付費、不動040141.xyz/GlossGate、不擴token權限。實際build root必須指向選定tool，不要把sources/archives整包當網站assets。
3. build production、驗產物/headers/HTTPS/雙語canonical/hreflang/x-default、robots/sitemap、同語系首頁連結。隱私觀察含Cloudflare自動注入與NEL/Storage；缺必要證據依SPEC保留gate。
4. 確認工具可用才更新catalog published；重建/發布首頁並驗兩語入口和返回路徑。看板讀回正確版本與狀態。
5. 記錄source/candidate/deployment/首頁commit與時間，與歷史source快照區分。交付一個ZIP，由使用者再外驗；通過或修正重驗且獲使用者/其reviewer確認後才標該版本完成。

本次來源整理只移入固定程式與文件，沒有執行以上產品發布，因此不能藉這份整合文件修改現有工具的驗收/上線狀態。
