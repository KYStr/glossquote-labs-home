# 兩張圖片疊合校稿
這是規格，實際進度以[HANDOFF](HANDOFF.md)為準。需求是假設，尚未經使用者訪談驗證。

使用情境：設計改稿前後要看標誌是否位移、排版是否被改動，並排看容易漏細節。

完整成果：兩張同像素尺寸JPEG/PNG，以透明度疊合或差異高亮比較，提供逐像素差異統計與可下載的PNG比較圖。

難度中；瀏覽器原生ESM、Node24測試、零依賴，不上傳、不需帳戶。M1雙語本地候選；真瀏覽器和發布是後續獨立gate。先讀[AGENTS](AGENTS.md)、[PRODUCT](PRODUCT.md)、[TECHNICAL](TECHNICAL.md)、[UX-SEO](UX-SEO.md)、[ACCEPTANCE](ACCEPTANCE.md)、[TASKS](TASKS.md)。
T00建立命令後執行npm test / npm run check / npm run build。未獲主代理指令不可啟動server/browser或公開。不要以範例資料代替真正操作。
