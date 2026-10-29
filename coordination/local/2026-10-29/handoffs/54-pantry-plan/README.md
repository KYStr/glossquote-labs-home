# 食材差額採買單
這是規格，實際進度以[HANDOFF](HANDOFF.md)為準。需求是假設，尚未經使用者訪談驗證。

使用情境：煮幾道菜時同一食材分散在不同食譜，家裡也有一些，想一次知道到底還要買多少。

完整成果：輸入各料理材料需求與庫存，按材料名稱與相容單位合併、扣庫存，得到購物清單/足夠項目與來源明細。

難度中；瀏覽器原生ESM、Node24測試、零依賴，不上傳、不需帳戶。M1雙語本地候選；真瀏覽器和發布是後續獨立gate。先讀[AGENTS](AGENTS.md)、[PRODUCT](PRODUCT.md)、[TECHNICAL](TECHNICAL.md)、[UX-SEO](UX-SEO.md)、[ACCEPTANCE](ACCEPTANCE.md)、[TASKS](TASKS.md)。
T00建立命令後執行npm test / npm run check / npm run build。未獲主代理指令不可啟動server/browser或公開。不要以範例資料代替真正操作。
