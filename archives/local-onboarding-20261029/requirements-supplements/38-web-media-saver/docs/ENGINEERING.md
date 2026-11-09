# 工程

M0 Node24+ ESM與builtins，核心不import fs/http/child_process、不fetch或讀process環境。scripts僅本工具syntax/check/build，測試只fake data與注入adapter；只背景CLI。package private=true/type=module，無runtime或dev套件依賴。測試expected不可從受測函式產生。

build使用明列src/core檔案allowlist，拒symlink/junction/未知輸出，dist-core不包含個資、logs、node_modules、原始使用者輸入、憑證。輸出有bytes/SHAmanifest。M0無dev server或production site；不得為通過check添加永久true的替身。

讀前後Windows環境guard完整Snapshots。安全規則見[AGENTS](../AGENTS.md)、[PRIVACY-SECURITY](PRIVACY-SECURITY.md)。源碼凍結後必要gates各跑一次；變動只重跑受影響gate。不擅自下載、啟動native引擎或瀏覽器。
