# 常用單位換算：從這裡開始

這個資料夾已有可執行的靜態工具與測試，持續依任務完成驗收。先讀 HANDOFF.md 確認目前進度，不要重新建立骨架。資料夾代號：05-unit-converter。藍圖規格版本：1.0；2026-09-29 新增使用者指定的繁中／英文與 SEO 範圍。

## 給專案擁有者

1. 將**整個本資料夾**複製到你想用的新專案目錄；保留 docs 及所有文件。
2. 在開發工具中開啟那個資料夾作為專案根目錄。不要只複製這一份開工提示。
3. 把下方提示交給負責實作的模型。
4. 模型每完成一步會更新 HANDOFF.md；換模型或續做時，交給新模型讀取即可。
5. package.json 和腳本已存在，Node.js 24+ 下可依 README 執行測試／本機預覽，不需安裝套件。完成開發也不會自動發布。

已選定：繁體中文＋英文獨立靜態網址、GlossQuote-Labs 品牌、原生瀏覽器工具、本機資料處理。一般功能依規格完成即可，不必重新發想框架、版型或整個功能清單。使用者允許保留無法執行的人工 NOT_RUN 後繼續實作，但已知缺陷與可執行必要測試不可跳過。本工具建議開發階段：第一批；實作難度估計：低。難度不是工時保證。

## 可直接貼給另一個 LLM 的開工提示

~~~text
請實作這個資料夾中的工具專案。

先完整讀 AGENTS.md、HANDOFF.md、README.md、PRODUCT.md、TECHNICAL.md、
docs/BRAND.md、docs/ENGINEERING.md、docs/PRIVACY-SECURITY.md、
docs/DESIGN-SYSTEM.md、UX-SEO.md、ACCEPTANCE.md、TASKS.md。

這份資料夾已有程式與測試；實際進度以 HANDOFF 與 docs/VERIFICATION 為準。
先告訴我你理解的 MVP、非目標、目前任務與驗收方式，再直接依 TASKS.md 開發。
一次一個任務；可執行驗收通過並記錄人工待驗後可接下一個，不把待驗當通過；不用每步請示。
只改本專案內該任務 allowed paths，保留其他人的未提交變更。

優先做可測的邏輯再接 UI。不要新增框架、帳號、上傳後端、雲端備援、追蹤或額外功能。
需要媒體依賴／模型的工具，先完成該工具的技術驗證與版本／授權紀錄。
遇到規格明確的設定直接照做；遇到真正矛盾或驗證失敗，寫入 HANDOFF.md 並指出原因，
必要時提出一個具體問題與 2–3 個互斥選項。不能編造通過結果。

每完成一個任務都更新 HANDOFF.md，記錄需求 ID、變更檔、命令及退出碼、
真正瀏覽器測試與尚未驗證項目。最後給我本機啟動方式和驗收紀錄。
此開發要求不包含發布、部署、購買、真實私人資料或外部帳號操作。
~~~

## 接手已有進度的提示

~~~text
請先讀 AGENTS.md 和 HANDOFF.md，核對檔案現況與測試紀錄。
依 HANDOFF 與 TASKS.md 找到下一個尚未實作完成的任務，補讀指定規格後繼續；人工待驗可保留。
不要重新 scaffold 已有成果，不要重寫完成的模組來換框架，不要把 NOT_RUN 當 PASS。
~~~

## 文件用途

| 文件 | 何時讀 |
|---|---|
| [README](README.md) | 快速理解使用者、價值、MVP |
| [PRODUCT](PRODUCT.md) | 精確功能與限制 |
| [TECHNICAL](TECHNICAL.md) | 模組、演算法、資料契約 |
| [UX-SEO](UX-SEO.md) | 桌面／手機布局、狀態文案、搜尋內容 |
| [ACCEPTANCE](ACCEPTANCE.md) | 具體測試輸入與預期結果 |
| [TASKS](TASKS.md) | 每次實作的順序、範圍與完成條件 |
| [HANDOFF](HANDOFF.md) | 保存實作進度，供不同模型接手 |
| [工程基線](docs/ENGINEERING.md) | 命令與靜態專案結構 |
| [隱私安全](docs/PRIVACY-SECURITY.md) | 本機資料生命週期與網路邊界 |
| [品牌](docs/BRAND.md)／[設計](docs/DESIGN-SYSTEM.md) | 家族共通規範 |

所有必要文件都在本資料夾內。官方連結是 API 參考；不需要下載其他 GlossQuote-Labs 專案才能開發。
