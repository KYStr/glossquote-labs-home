import {isDeepStrictEqual} from 'node:util';
import {audit, checkpoint as p, err, own, plain} from '../recheck-lib.mjs';

// Transcription of SPEC tables, not the fixture outputs or a claim about brand equivalence.
const keys=['cmLow','cmHigh','usLetter','usNumeric','ukNumeric','euNumeric','jpLetter','jpNumeric'];
const pairs={
  women:[
    [74,79,'XXS','0','4','30',null,'3'], [79,84,'XS','2','6','32',null,'5'],
    [84,89,'S','4','8','34','S','7'], [89,94,'M','6','10','36','M','9'],
    [94,99,'L','8','12','38','L','11'], [99,104,'XL','10','14','40','LL','13'],
    [104,110,'XXL','12','16','42',null,'15'], [110,116,'XXXL','14','18','44',null,'17']
  ],
  men:[
    [86,91,'XS','34','34','44','S',null], [91,96,'S','36','36','46','M',null],
    [96,101,'M','38','38','48','L',null], [101,106,'L','40','40','50','XL',null],
    [106,111,'XL','42','42','52','2L',null], [111,116,'XXL','44','44','54','3L',null],
    [116,121,'XXXL','46','46','56','4L',null]
  ]
};
const chart=Object.fromEntries(Object.entries(pairs).map(([g,rs])=>[g,rs.map(
  (r,i)=>({row:i+1,...Object.fromEntries(keys.map((k,j)=>[k,r[j]]))}))]));
const systems={us:['usLetter','usNumeric'],uk:['ukNumeric'],eu:['euNumeric'],jp:['jpLetter','jpNumeric']};
const fields={garment:5,mode:11,measurementCm:5,fromSystem:2,sizeValue:4};
const initial={garment:'women',mode:'measurement',measurementCm:'',fromSystem:'us',sizeValue:''};
const decimal=/^(?:0|[1-9][0-9]{0,2})(?:\.[0-9])?$/;
const code=/^[A-Za-z0-9]{1,4}$/;
function limits(x,k,active) {
  const s=x[k];
  if(s.length>fields[k]) return err('INPUT_LIMIT',k);
  if(!s.isWellFormed()) return err('UNICODE',k);
  if(active&&!s.length) return err('EMPTY',k);
  return null;
}
function run(x) {
  if (!plain(x) || Reflect.ownKeys(x).length!==5 || !Object.keys(fields).every(k=>
    typeof Object.getOwnPropertyDescriptor(x,k)?.value==='string')) return err('SCHEMA');
  for(const key of ['garment','mode']) {
    const e=limits(x,key,true); if(e) return e;
    if(key==='garment'&&!own(chart,x[key])) return err('ENUM',key);
    if(key==='mode'&&!['measurement','size'].includes(x[key])) return err('ENUM',key);
  }
  const {garment,mode,fromSystem}=x, measure=mode==='measurement', tab=chart[garment];
  const len=limits(x,'measurementCm',measure); if(len) return len;
  let mm;
  if(measure) {
    if(!decimal.test(x.measurementCm)) return err('DECIMAL_FORMAT','measurementCm');
    const [w,f='0']=x.measurementCm.split('.');
    mm=10*Number(w)+Number(f);
    if(mm<500||mm>2000) return err('RANGE','measurementCm');
  }
  const sysLimit=limits(x,'fromSystem',!measure); if(sysLimit) return sysLimit;
  if(!measure&&!own(systems,fromSystem)) return err('ENUM','fromSystem');
  const tokLimit=limits(x,'sizeValue',!measure); if(tokLimit) return tokLimit;
  if(measure) {
    const row=tab.find(r=>r.cmLow*10<=mm&&mm<r.cmHigh*10)??null;
    const status=row?'in-range':mm<tab[0].cmLow*10?'below-range':'above-range';
    return {ok:true,result:{garment,mode,measurementCm:mm/10,status,onBoundary:row!==null&&row.cmLow*10===mm,row}};
  }
  if(!code.test(x.sizeValue)||/^0\d+$/.test(x.sizeValue)) return err('SIZE_FORMAT','sizeValue');
  const sizeToken=x.sizeValue.toUpperCase();
  // Literal table match. SPEC validation prose instead says US "0" is not in a table.
  for(const row of tab) {
    const k=systems[fromSystem].find(k=>row[k]===sizeToken);
    if(k) return {ok:true,result:{garment,mode,fromSystem,sizeToken,matchedBy:k.endsWith('Letter')?'letter':'numeric',row}};
  }
  return err('UNKNOWN_SIZE','sizeValue');
}
const settle=draft=>{
  const out=run(draft);
  return out.ok?p('success',true):p('error',false,{error:out.error});
};
function checkPayload(draft,result) {
  if(!isDeepStrictEqual(run(draft).result,result)) throw new Error('Injected payload differs from table');
}
function controller(id,i){
  switch(id){
    case 'state-dirty-error':
      return {afterRun:settle(i.initial),afterEdit:p('dirty',false),afterRerun:settle(i.edit)};
    case 'state-cancel-late':
      checkPayload(i.draft,i.lateResult);
      return {whilePending:p('busy',false),afterCancel:p('cancelled',false,{draft:i.draft}),
        afterLateResult:p('cancelled',false),afterReset:p('empty',false,{draft:initial})};
    case 'state-replace-late':
      checkPayload(i.olderDraft,i.olderLateResult);
      return {afterNewerResult:settle(i.newerDraft),afterOlderLateResult:settle(i.newerDraft)};
    default: throw new Error('Unknown scenario '+id);
  }
}
function extra() {
  const a={...initial,mode:'size',fromSystem:'us',sizeValue:'0'};
  const b={...a,fromSystem:'eu',sizeValue:'36'};
  const c={...a,garment:'men',fromSystem:'jp',sizeValue:'XXL'};
  const invariants=Object.fromEntries(Object.entries(chart).map(([garment,rows])=>[garment,{
    rowCount:rows.length,continuous:rows.slice(1).every((r,j)=>r.cmLow===rows[j].cmHigh),
    noDuplicateTokens:Object.values(systems).every(ks=>{
      const codes=rows.flatMap(r=>ks.map(k=>r[k])).filter(x=>x!==null);
      return codes.length===new Set(codes).size;
    }),
    eachLowMatches:rows.every(r=>{
      const o=run({...initial,garment,measurementCm:String(r.cmLow)}).result;
      return o.row.row===r.row&&o.onBoundary;
    }),
    topExcluded:run({...initial,garment,measurementCm:String(rows.at(-1).cmHigh)}).result.status==='above-range'
  }]));
  return [{id:'CLOTH-01',input:a,perTable:run(a),perProse:err('UNKNOWN_SIZE','sizeValue')},
    {id:'CLOTH-02',input:b,perPinnedTable:run(b),ASOSOwnChart:{us:'4',uk:'8',european:'36'}},
    {id:'CLOTH-03',input:c,perPinnedTable:run(c),publishedOrbitikaJPRowForEU52:'XXL',pinnedJPRowForEU52:'2L'},
    {id:'chart-invariants',invariants}];
}
audit({fixtureSHA:'b7a51ca26b46c9131898671efd962aacf0ef00fbf2cfef2b7b89454bc10ccb80',
  run,runController:controller,additional:extra});
