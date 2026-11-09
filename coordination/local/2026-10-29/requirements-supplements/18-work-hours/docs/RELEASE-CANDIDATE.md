# 發布候選狀態

2026-10-13：NOT_RUN。尚無實作、固定 source commit、GitHub public visibility、production 產物、正式部署、首頁入口或外部驗收。

後續每個 gate 分開記錄，候選雙語 URL 不是發布證據。必要自動測試失敗不能交付正式候選；人工範圍與缺口明列，不一概寫全部通過。

## 2026-10-13 M1/T00 固定本機版本

版本 0.1.0，LOCAL_MVP_FROZEN_AWAITING_PRIMARY_ACCEPTANCE。M1 的 npm test（41/41）、check、preview build，以及真瀏覽器兩語 W01/W03/W13/W24 通過。owner 已釋放；完整觀察、未驗項與固定 manifest 見 HANDOFF。

正式來源 repo、Git commit、固定 ZIP、production SEO/build/dry-run、Cloudflare、首頁與外部驗收仍 NOT_RUN，依 M2/M3 放行推進。這是里程碑邊界，並非缺少既有發布授權。

## 2026-10-13 M2/T01 — 公開來源，ZIP 驗證進行中

必要本機候選 test48/48、check、preview build、production build/check、Wrangler4.147.0隔離dry-run皆PASS。兩語production候選實際DOM metadata/W01與404返回流程PASS；完整Network/Storage/native clipboard/真zoom等人工限制保留。

實際 PUBLIC source：[KYStr/glossquote-labs-work-hours](https://github.com/KYStr/glossquote-labs-work-hours)。已驗首次implementation commit `03b1c7bb56237d94b59d3cf94cbea4534d61fb7e`、remote HEAD与43檔Git blob bytes。此commit是實作版本；後續publication documentation commit的完整HEAD與固定ZIP在宿主HANDOFF／append-only證據中獨立記錄，避免文件自身包含其未生成的SHA。

Hosting/首頁/正式外驗仍NOT_RUN，等待主對話M3；固定ZIP与解壓重build/check尚未在本段時點完成，不能當成已通過。

## 2026-10-13 — READY_FOR_INTEGRATION

宿主交接記錄：PUBLIC repo/remote HEAD `774f4b23a0557bdca79526a6ebd4bf3593299aa6` 已核實，actual Git tree `923f84b000b8a070d60042406ffad5839f7b1755`。固定ZIP43檔與Git blob bytes/remote blob OIDs、sizes全部符合；解壓48/48、check、preview/prod build/check、Wrangler4.147.0隔離dry-run皆exit0。ZIP SHA256 `1d02f04fec2e737da28ff545374c8451ddccdd6031665f78c503b85b4f9a4ba5`（99353 bytes）。

產物/remote/ZIP manifests在專用M2 append-only證據，hosting/home/<LOCAL_USER> review仍NOT_RUN。宿主狀態文件於發佈snapshot完成後記錄最終HEAD和ZIP；public ZIP中的文件保持該固定commit bytes，不回寫或再推動該固定版本。owner釋放供主對話M3驗收/部署，不再自行改code。
