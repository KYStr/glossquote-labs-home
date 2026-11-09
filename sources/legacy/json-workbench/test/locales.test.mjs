import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {locales} from '../public/js/locales.mjs';
import {ERROR_CODES} from '../public/js/core/session.mjs';
test('T07 all states, errors and notices exist in both languages',()=>{
  assert.deepEqual(Object.keys(locales.en).sort(),Object.keys(locales['zh-Hant']).sort());
  for(const dictionary of Object.values(locales)){
    for(const code of ERROR_CODES) assert.ok(dictionary[code]);
    for(const text of Object.values(dictionary)) assert.equal(typeof text,'string');
    for(const slot of ['{line}','{column}','{offset}']) assert.ok(dictionary.position.includes(slot));
  }
});
test('T07 static content, UI structure and matching homepage are present',async()=>{
  const zh=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  const en=await readFile(new URL('../public/en/index.html',import.meta.url),'utf8');
  assert.match(zh,/https:\/\/glossquote\.com\/index\.html/u);assert.match(en,/https:\/\/glossquote\.com\/en\/index\.html/u);
  for(const html of [zh,en]){
    for(const id of ['source','output','run','clear','cancel','copy','download','status']) assert.ok(html.includes(`id="${id}"`));
    assert.equal((html.match(/<details>/gu)||[]).length,5);
    assert.match(html,/noindex,nofollow/u);
  }
  assert.match(en,/<html lang="en">/u);assert.match(en,/<h1>JSON validator and formatter<\/h1>/u);
});
