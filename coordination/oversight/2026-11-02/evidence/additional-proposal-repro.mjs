import assert from 'node:assert/strict';
const codes={A:'.-',R:'.-.',S:'...',K:'-.-',N:'-.'};
const punct={'+':'.-.-.','&':'.-...','(':'-.--.'};
const collisions=['AR','AS','KN'].map(sign=>({prosign:'<'+sign+'>',code:[...sign].map(x=>codes[x]).join(''),punctuation:Object.entries(punct).find(([,v])=>v===[...sign].map(x=>codes[x]).join(''))?.[0]}));
assert.deepEqual(collisions.map(x=>x.punctuation),['+','&','(']);
const fold={uppercaseExpansion:'ß'.toUpperCase(),lowercaseNotSimpleCaseFold:['Σ'.toLowerCase(),'ς'.toLowerCase()]};
console.log(JSON.stringify({scope:'document contract counterexamples only; no product implementation executed',collisions,fold},null,2));
