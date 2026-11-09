# 搬家裝箱與物品定位
這是規格，實際進度以[HANDOFF](HANDOFF.md)為準。需求是假設，尚未經使用者訪談驗證。

使用情境：搬家後急找充電器或鍋子，只知道在某箱；希望裝箱時記一次就能搜尋並給搬運人員房間清單。

完整成果：箱號/目的房間/優先開箱/內容，搜尋物品返回箱號，產生房間搬運清單與箱內容單；JSON可手動保存和恢復。

難度中；瀏覽器原生ESM、Node24測試、零依賴，不上傳、不需帳戶。M1雙語本地候選；真瀏覽器和發布是後續獨立gate。先讀[AGENTS](AGENTS.md)、[PRODUCT](PRODUCT.md)、[TECHNICAL](TECHNICAL.md)、[UX-SEO](UX-SEO.md)、[ACCEPTANCE](ACCEPTANCE.md)、[TASKS](TASKS.md)。
T00建立命令後執行npm test / npm run check / npm run build。未獲主代理指令不可啟動server/browser或公開。不要以範例資料代替真正操作。
