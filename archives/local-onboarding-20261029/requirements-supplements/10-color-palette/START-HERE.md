# 配色與文字對比檢查：從這裡開始

這是一份可獨立開發的完整藍圖，**目前沒有工具程式**。資料夾代號：10-color-palette。規格版本：1.0。規劃日：2026-09-23。

## 給專案擁有者

1. 將**整個本資料夾**複製到你想用的新專案目錄；保留 docs 及所有文件。
2. 在開發工具中開啟那個資料夾作為專案根目錄。不要只複製這一份開工提示。
3. 把下方提示交給負責實作的模型。
4. 模型每完成一步會更新 HANDOFF.md；換模型或續做時，交給新模型讀取即可。
5. 現在先不要執行 npm 命令；package.json 和腳本會在 T00 建立。完成開發也不會自動發布。

預設：繁體中文、GlossQuote-Labs 品牌、原生瀏覽器工具、本機資料處理。一般功能依規格完成即可，不必重新發想框架、版型或整個功能清單。本工具建議開發階段：第一批；實作難度估計：中。難度不是工時保證。

## 可直接貼給另一個 LLM 的開工提示

~~~text
請實作這個資料夾中的工具專案。

先完整讀 AGENTS.md、HANDOFF.md、README.md、PRODUCT.md、TECHNICAL.md、
docs/BRAND.md、docs/ENGINEERING.md、docs/PRIVACY-SECURITY.md、
docs/DESIGN-SYSTEM.md、UX-SEO.md、ACCEPTANCE.md、TASKS.md。

這份資料夾目前是藍圖；尚未存在的程式請在對應任務建立，不要因此判定專案損毀。
先告訴我你理解的 MVP、非目標、目前任務與驗收方式，再直接依 TASKS.md 開發。
一次一個任務，完成其實際驗收才接下一個；不用每個步驟都向我請示。
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
依 TASKS.md 找到第一個尚未通過的任務，補讀那一任務指定的規格後繼續。
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
