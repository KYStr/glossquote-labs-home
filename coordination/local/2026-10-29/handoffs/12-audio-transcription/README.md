> 2026-10-12：已修正未用attention輸出，完整Chrome三輪品質／時間及全零子項符合，Private峰值增量仍1.681110GiB>1.5GiB，T02阻塞。35tests／check90／build28通過；未公開來源或部署。見[根因與實測](docs/MEMORY-ROOTCAUSE.md)。以下歷史敘述以本行和最新HANDOFF為準。

# 短音檔轉文字

品牌：GlossQuote-Labs。識別：`audio-transcription`。2026-10-11實際狀態：T00及核准替代候選的T01 PASS；固定19項資產已stage，中英Chrome/Edge smoke已跑，本次Chrome原生記憶體峰值超過1.5GiB增量門檻，T02 BLOCKED_T02_MEMORY_PEAK；尚未提供產品音訊辨識或完成MVP。

Node24+可在本工具目錄執行`npm.cmd test`、`npm.cmd run check`、`npm.cmd run build`；`npm.cmd run dev`預覽在`http://127.0.0.1:4192/`（占用自選空閒loopback埠）。產品預覽不接受音檔。模型為Xenova/whisper-base固定revision64da57285918e20ea79ea5c88eed7197933abaa8；manifest具有19項實際bytes/SHA256，runtime使用Transformers3.8.1與單執行緒WASM。真正spike入口為`node scripts/serve-spike.mjs`，127.0.0.1:5192/spike/index.html；只用固定本機合成語音，不接受私人錄音。

本次21個離線測試、77檔check及27個public檔build退出0；兩browser拒絕案例PASS。使用者PID核實後已取得自有鎖，Chrome240筆每秒OS採樣的Private峰值增量1.931442GiB超過1.5GiB，必要gateFAIL。Chrome完成兩輪CER3.33%／WER0%，剩餘必要項NOT_RUN；已停止自有程序並釋放鎖，不進T03。舊候選授權缺口已解除；詳細證據、未驗項及當前判定見[技術實測](docs/SPIKE-RESULTS.md)、[依賴研究](docs/DEPENDENCIES.md)、[整合交接](docs/RELEASE-CANDIDATE.md)及[HANDOFF](HANDOFF.md)。來源GitHub公開與網站hosting均NOT_RUN；原有發布授權仍有效，尚未達完整必要gate。

給需要把一段短中文普通話或英文語音整理成可複製文字的人。MVP：選取最多 30 秒的限定 PCM WAV，在瀏覽器內辨識，核對後複製或下載純文字。

使用固定Transformers3.8.1與核准的Xenova/whisper-base多語q8候選，模型／runtime已取得並驗實際bytes/SHA256；完整速度、記憶體與品質仍需T02實測，沒有任意裝置相容性承諾。

不做麥克風錄音、影片、MP3、長音檔、字幕時間軸、說話者分離、翻譯、會議摘要或聊天。普通話是本案中文範圍，不宣稱台語／粵語／各種口音支援；模型可能輸出繁體或簡體，第一版不自動轉換。

瀏覽器會下載較大的模型資源，音檔內容由本機處理。沒有雲端備援，辨識文字可能錯誤，需自行核對。若速度、記憶體、中文／英文辨識或完整性驗證未過 T02，就停在本案，不把模型 demo 當工具完成。

依序讀 [START-HERE](START-HERE.md)、[AGENTS](AGENTS.md)、[品牌](docs/BRAND.md)、[工程](docs/ENGINEERING.md)、[隱私與安全](docs/PRIVACY-SECURITY.md)、[設計](docs/DESIGN-SYSTEM.md)、[產品](PRODUCT.md)、[技術](TECHNICAL.md)、[介面與 SEO](UX-SEO.md)、[驗收](ACCEPTANCE.md)、[任務](TASKS.md)、[HANDOFF](HANDOFF.md)。可獨立複製，先做簡單工具再做本案。
