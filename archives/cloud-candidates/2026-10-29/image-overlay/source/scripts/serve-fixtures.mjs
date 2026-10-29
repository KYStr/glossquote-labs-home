// 測試主機仍僅使用 loopback 與 noindex。
import { serve } from './serve.mjs';
await serve(4197, 'test-product');
