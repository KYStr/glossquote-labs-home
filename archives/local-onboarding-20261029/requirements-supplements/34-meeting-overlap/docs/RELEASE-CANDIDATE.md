# 發布候選
2026-10-19：主代理必要 M1 瀏覽器 gate 後 GO M2。正式候選在獨立 `dist-production/`，12檔白名單；manifest在旁邊，不在部署assets內。原預覽7檔、所有功能/樣式與HTML body bytes保持M1一致。
M2來源已在 PUBLIC `https://github.com/KYStr/glossquote-labs-meeting-overlap` 驗證，commit `7726e7ded76e472eda93bf0024302b49f6216e4d`，31檔固定source ZIP bytes/hash見HANDOFF。原專案及reviewed copy均323 tests、check/build/build:production/check:production/release:check通過。待主代理獨立驗收，不代表M3或外部完成。
hosting/首頁/live headers與live UI未執行。真IME/AT/手機/低階機/虛擬鍵盤/原生200%zoom保留未驗；CSS放大、合成composition與protocol keyboard不冒充原生。原功能作者仍不得操作任何browser/desktop；隔離wrapper僅由主代理使用。
歷史M0與M1原始記錄保留在HANDOFF；當時NOT_RUN不回寫成PASS，後續主驗證據另列。
