import { LIMITS, failure } from './lexer.mjs';
export const ERROR_CODES = Object.freeze(['EMPTY_INPUT','INPUT_TOO_LARGE','TOKEN_LIMIT','TOKEN_TOO_LONG','DEPTH_LIMIT','INVALID_UNICODE','INVALID_JSON','DUPLICATE_KEY','OUTPUT_TOO_LARGE','INVALID_MODE','TIMEOUT','UNSUPPORTED','WORKER_FAILED']);
export const initialSession = () => ({ status:'idle', jobId:0, source:'', mode:'pretty', text:'', error:null, reason:null });
const exact = (object, keys) => object && typeof object === 'object' && !Array.isArray(object) && Object.keys(object).length === keys.length && keys.every(key => Object.hasOwn(object,key));
export function validateResult(result, sourceLength) {
  if (!exact(result, result?.ok === true ? ['ok','value'] : ['ok','error'])) return false;
  if (result.ok === true) return exact(result.value,['text']) && typeof result.value.text === 'string' && result.value.text.length <= LIMITS.outputBytes && new TextEncoder().encode(result.value.text).byteLength <= LIMITS.outputBytes;
  return result.ok === false && exact(result.error,['code','offset']) && ERROR_CODES.includes(result.error.code) && (result.error.offset === null || (Number.isInteger(result.error.offset) && result.error.offset >= 0 && result.error.offset <= sourceLength));
}
export function transition(session, event) {
  switch (event.type) {
    case 'SOURCE': return { ...session, status:'dirty', source:event.source, jobId:session.jobId+1, text:'', error:null, reason:null };
    case 'MODE': return { ...session, status:'dirty', mode:event.mode, jobId:session.jobId+1, text:'', error:null, reason:null };
    case 'START': return { ...session, status:'running', jobId:session.jobId+1, text:'', error:null, reason:null };
    case 'CANCEL':
      if (session.status !== 'running') return session;
      return { ...session, status:'dirty', jobId:session.jobId+1, text:'', error:null, reason:'cancelled' };
    case 'CLEAR': return { ...initialSession(), jobId:session.jobId+1 };
    case 'RESULT': {
      if (session.status !== 'running' || event.jobId !== session.jobId) return session;
      const result = validateResult(event.result,session.source.length) ? event.result : failure('WORKER_FAILED');
      return result.ok ? { ...session, status:'success', text:result.value.text, error:null } : { ...session, status:'error', text:'', error:result.error };
    }
    default: return session;
  }
}
