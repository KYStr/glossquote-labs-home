// Bundled default Chinese stopword characters for the Characters
// table (SPEC sections 2 and 4): common particles, pronouns and
// function characters, shipped as auditable data, printed in the
// product's help, and editable in the session UI. Matching is exact
// per character; a bigram is filtered when either of its characters
// is in this set.

export const STOPWORDS_CJK = Object.freeze([
  "的", "了", "是", "在", "和", "也", "不", "這", "我", "你",
  "他", "她", "它", "們", "就", "都", "而", "及", "與", "或",
  "個", "中", "有", "被", "把", "從", "到", "對", "為", "以",
  "於", "其", "之", "者", "嗎", "呢", "吧", "啊", "所", "將",
  "但", "若", "如", "因", "由", "向", "跟", "給", "讓", "只",
]);
