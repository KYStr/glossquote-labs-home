import test from 'node:test';
import assert from 'node:assert/strict';
import {generate} from '../src/core.mjs';

// An independently expressed event-count oracle: only generate supplies actual
// results. Expected fractions never use the product rational/evaluate/formatter.
// Unit-domain step events lie at j/N: end j=1..N, start j=0..N-1,
// none j=1..N-1, both j=0..N. Count events strictly before a boundary
// for before=true, inclusive for after; divide by the total number of events.
test('T01 all 101 boundary rows and 100 intervals in four modes, separate event oracle', () => {
  const N = 100;
  for (const [position, first, last] of [
    ['jump-end',1,100], ['jump-start',0,99],
    ['jump-none',1,99], ['jump-both',0,100],
  ]) {
    const events = Array.from({length:last-first+1}, (_,i)=>first+i);
    const J = BigInt(events.length);
    const actual = generate({N:'100',position,progress:'0.25',mode:'decimal',before:false});
    assert.equal(actual.ok,true);
    assert.equal(actual.rows.length,101);
    assert.equal(actual.segments.length,100);
    for(let k=0;k<=N;k++) {
      const row=actual.rows[k];
      assert.equal(row.k,k);
      assert.ok(row.p.d>0n);
      assert.equal(row.p.n*100n,BigInt(k)*row.p.d,`${position} p ${k}`);
      for(const [key,include] of [['before',false],['after',true]]) {
        const count=events.filter(j=>include?j<=k:j<k).length;
        assert.ok(row[key].d>0n);
        assert.equal(row[key].n*J,BigInt(count)*row[key].d,`${position} ${key} ${k}`);
      }
    }
    for(let k=0;k<N;k++) {
      const segment=actual.segments[k];
      const count=events.filter(j=>2*j<2*k+1).length;
      assert.equal(segment.left.n*100n,BigInt(k)*segment.left.d);
      assert.equal(segment.right.n*100n,BigInt(k+1)*segment.right.d);
      assert.ok(segment.y.d>0n);
      assert.equal(segment.y.n*J,BigInt(count)*segment.y.d,`${position} midpoint ${k}`);
    }
  }
});
