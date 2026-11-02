// 作者受影響查核：補齊未啟用欄位型別與非單色標記，不替代正常頁實看。
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{validate}from '../src/core.mjs';
const q={N:'3',position:'jump-end',progress:'bad',mode:'boundary',before:false,k:1};
test('inactive decimal lexeme ignored but schema type stays string',()=>{assert.equal(validate(q).ok,true);for(const p of[null,undefined,3,{},[],true])assert.equal(validate({...q,progress:p}).ok,false);});
test('static marker tracks expose distinct circle and diamond constructions',()=>{const s=fs.readFileSync('src/app.mjs','utf8');assert(s.includes("if(name===t('linear'))s.append(svg('circle'"));assert(s.includes("else s.append(svg('polygon',{points:`${cx},15"));});
