// 固定錯誤物件只保存代碼與數字位置，不洩漏輸入或堆疊。
export class MatrixError extends Error { constructor(code, details = {}) { super(code); this.code = code; this.details = Object.freeze({...details}); } }
// 驗證失敗以固定代碼立即中止整份運算。
export const fail = (code, details) => { throw new MatrixError(code, details); };
// 所有快照與結果遞迴凍結，防止提交後被改寫。
export function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
