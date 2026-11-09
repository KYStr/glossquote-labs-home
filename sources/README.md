# 固定來源快照

此處為來源保存，不是已放行產品集合。`legacy/` 保存獨立repo預設分支，`candidates/` 保存固定PR候選；兩者可能不同。請先查[來源索引](../coordination/source-index.json)與[來源遷移規則](../docs/SOURCE-LAYOUT.md)。

不要在本目錄改產品或遞迴跑測試。原owner在有效claim下，以可核對的原commit複製到`tools/<slug>/`再修正；這裡保留原bytes供比較。每個來源包含原repo/commit/path與檔案hash，不把快照當新獨立repo。
