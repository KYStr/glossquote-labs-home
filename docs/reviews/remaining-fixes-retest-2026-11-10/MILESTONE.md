# 第五輪修正包複驗接收

Task ID: labs-remaining-fixes-retest-20261110

固定輸入 glossquote-remaining-fixes-retest-2026-11-10.zip，SHA-256 3d40b076ecfe91dfd69a99ac0360856b0a67e4214023d83e0c381bb6884979b2。範圍只接收外部證據，核對最新 d94d62dc 修正包／069bd37 來源／56e11511候選，更新兩款工具三缺陷的外部限定結案狀態，並交付單一紀錄ZIP。保留190款總表其餘狀態、版本、原始失敗及未執行項。

允許修改 docs/reviews/remaining-fixes-retest-2026-11-10/**、docs/WORK-STATUS.md 的最新報告入口。本機寫入僅本輪 .runs/remaining-fixes-retest-2026-11-10/**。不修改產品、規格、部署、公開目錄、其他owner，不把外部測試宣稱為主代理本輪重跑。

固定驗收面向，由非作者對同一候選逐項至少90分：

- evidence-provenance：外部ZIP 210筆清單、CRC、安全路徑與來源hash核對；比對實際功能結果、GUI觀察、HTTP原始bytes；區分QA換行差異與實際產品變更。
- status-accuracy：三個FUNC-R3限定結案；最新包完整性／目標修復通過，但完整產品／裝置／原生下載／法律等仍未驗；歷史TTS/Fluid只沿用不計本輪新測；SEO01/03及租屋CSP建議保留。更新190表的兩列及共用入口，不新增部署。
- delivery-integrity：單一ZIP包含原始回報、對照表與限制；所有檔案hash、CRC、安全路徑、全部Markdown相對連結核對通過，Git設定指紋不變。

收到矛盾版本、未預期新bug、所有權衝突或不安全附件時，停止相應結案並回報。禁止桌面／IME／clipboard／原生視窗操作；不執行外部附件腳本、不新增套件、權限或費用。受測產品未變，不重跑已通過且不受影響的驗證。
