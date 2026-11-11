import {isDeepStrictEqual} from 'node:util';
import {audit, checkpoint as p, err, own, plain} from '../recheck-lib.mjs';

const fixedKeys = ['wallMode','rollWidthM','rollLengthM','patternRepeatCm','openingsMode','wastePercent'];
const wallKeys = {perimeter:['perimeterM','heightM'], walls:['walls']};
const openKeys = {none:[],area:['openingsAreaM2'],list:['openings']};
const exactly = (o, ks) => plain(o) && Object.keys(o).length === ks.length && ks.every(k => own(o,k));
const goodRow = o => exactly(o, ['widthM','heightM']) && Object.values(o).every(x => typeof x === 'string');
const ceiling = (n, d) => (n + d - 1n) / d;
const showArea = cm2 => {
  const x = ((cm2 + 50n)/100n).toString().padStart(3,'0');
  return x.slice(0,-2) + '.' + x.slice(-2);
};
const decimal = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
const integer = /^(?:0|[1-9]\d*)$/;
const unit = (s, places) => {
  const [whole, frac=''] = s.split('.');
  return BigInt(whole + frac.padEnd(places,'0'));
};
function numberField(s, key, low, high, places, row = null) {
  const fail = code => {throw err(code,key,row);};
  if (s.length > 8) fail('INPUT_LIMIT');
  if (!s.isWellFormed()) fail('UNICODE');
  if (!s) fail('EMPTY');
  if (!(places ? decimal : integer).test(s)) fail(places ? 'DECIMAL_FORMAT' : 'INTEGER_FORMAT');
  const value = unit(s, places);
  if (value < low || value > high) fail('RANGE');
  return value;
}
function rowFields(rows, key, max) {
  if (!rows.length) throw err('EMPTY',key);
  if (rows.length > max) throw err('ROW_LIMIT',key);
  return rows.map(({widthM,heightM}, i) => ({
    w: numberField(widthM,'widthM',1n,10000n,2,i+1),
    h: numberField(heightM,'heightM',1n,2000n,2,i+1)
  }));
}
function run(x) {
  if (!plain(x) || !fixedKeys.every(k => own(x,k) && typeof x[k] === 'string')) return err('SCHEMA');
  // Document's valid-enum fixtures unambiguously define these sets; malformed enum+shape precedence is unresolved.
  if (!own(wallKeys,x.wallMode)) return err('ENUM','wallMode');
  if (!own(openKeys,x.openingsMode)) return err('ENUM','openingsMode');
  if (!exactly(x,[...fixedKeys,...wallKeys[x.wallMode],...openKeys[x.openingsMode]])) return err('SCHEMA');
  for (const [k,v] of Object.entries(x)) {
    if (k === 'walls' || k === 'openings') {
      if (!Array.isArray(v)) return err('SCHEMA');
      for (let i=0;i<v.length;i++) if (!goodRow(v[i])) return err('SCHEMA',null,i+1);
    } else if (typeof v !== 'string') return err('SCHEMA');
  }
  if (x.wallMode === 'walls' && x.openingsMode === 'list') return err('MODE_COMBINATION','openingsMode');
  try {
    const perimeter = x.wallMode === 'perimeter';
    const dimensions = perimeter ? [{
      w:numberField(x.perimeterM,'perimeterM',1n,20000n,2),
      h:numberField(x.heightM,'heightM',1n,2000n,2)
    }] : rowFields(x.walls,'walls',12);
    const rw = numberField(x.rollWidthM,'rollWidthM',10n,200n,2);
    const rl = numberField(x.rollLengthM,'rollLengthM',100n,10000n,2);
    const repeat = numberField(x.patternRepeatCm,'patternRepeatCm',0n,200n,0);
    const sum = (arr, f) => arr.reduce((s, v) => s+f(v),0n);
    const gross = sum(dimensions, ({w,h})=>w*h);
    const windows = x.openingsMode === 'list' ? rowFields(x.openings,'openings',20) : [];
    const openArea = x.openingsMode === 'area' ? numberField(x.openingsAreaM2,'openingsAreaM2',0n,100000000n,4)
      : sum(windows, ({w,h})=>w*h);
    const waste = numberField(x.wastePercent,'wastePercent',0n,50n,0);
    const ow = sum(windows, ({w})=>w);
    if ((windows.length && ow >= dimensions[0].w) || openArea > gross)
      return err('OPENINGS_EXCEED_WALL', x.openingsMode === 'list' ? 'openings':'openingsAreaM2');
    const walls = dimensions.map(({w,h}, j) => {
      const ew = w-ow;
      const n = ceiling(ew,rw);
      const min = h+10n;
      const length = repeat ? ceiling(min,repeat)*repeat : min;
      const capacity = rl/length;
      if (!capacity) throw err('STRIP_TOO_LONG','rollLengthM',perimeter ? null : j+1);
      const reserved = ceiling(n*(100n+waste),100n);
      return {index:j+1,widthCm:Number(w),openingsWidthCm:Number(ow),effectiveWidthCm:Number(ew),
        strips:Number(n),stripLengthCm:Number(length),dropsPerRoll:Number(capacity),
        stripsWithWaste:Number(reserved),rolls:Number(ceiling(reserved,capacity))};
    });
    const total = key => walls.reduce((acc,r)=>acc+r[key],0);
    return {ok:true,result:{walls,strips:total('strips'),stripsWithWaste:total('stripsWithWaste'),rolls:total('rolls'),
      grossWallAreaM2:showArea(gross),openingsAreaM2:showArea(openArea),netWallAreaM2:showArea(gross-openArea)}};
  } catch (e) {if (e?.ok === false) return e; throw e;}
}
const initial = {wallMode:'perimeter',perimeterM:'12',heightM:'2.5',rollWidthM:'0.53',rollLengthM:'10.05',
  patternRepeatCm:'0',openingsMode:'none',wastePercent:'0'};
function checkPayload(draft, payload) {
  if (!isDeepStrictEqual(run(draft).result,payload)) throw new Error('Injected synthetic worker payload differs from the calculation');
}
function settle(draft) {
  const outcome = run(draft);
  return outcome.ok ? p('success',true) : p('error',false,{error:outcome.error});
}
function controller(id,i) {
  switch (id) {
    case 'state-dirty-error':
      return {afterRun:settle(i.initial),afterEdit:p('dirty',false),afterRerun:settle(i.edit)};
    case 'state-cancel-late':
      checkPayload(i.draft,i.lateResult);
      // Cancel invalidates the pending generation, so its success is discarded.
      return {whilePending:p('busy',false),afterCancel:p('cancelled',false,{draft:i.draft}),
        afterLateResult:p('cancelled',false),afterReset:p('empty',false,{draft:initial})};
    case 'state-replace-late':
      checkPayload(i.olderDraft,i.olderLateResult);
      return {afterNewerResult:settle(i.newerDraft),afterOlderLateResult:settle(i.newerDraft)};
    default: throw new Error('Unknown controller case ' + id);
  }
}
function extra() {
  const counter = {...initial,perimeterM:'3.18',rollLengthM:'7.8',openingsMode:'list',openings:[{widthM:'1.59',heightM:'1.2'}]};
  const r = run(counter).result;
  const availableCm2 = 53*780*r.rolls;
  const exactNetCm2 = 318*250-159*120;
  return [
    {id:'WALL-01',input:counter,specResult:r,availableCm2,exactNetCm2,minimumByArea:Math.ceil(exactNetCm2/(53*780)),
      status:availableCm2<exactNetCm2?'FAIL_PURCHASE_CONSERVATISM':'UNEXPECTED'},
    {id:'WALL-02',input:{...counter,openings:[{widthM:'0.9',heightM:'3'}]},
      specOutcome:run({...counter,openings:[{widthM:'0.9',heightM:'3'}]}),status:'ACCEPTED_IMPOSSIBLE_OPENING_HEIGHT'},
    {id:'rounding',inputCm2:[49,50,149,150],derived:[49n,50n,149n,150n].map(showArea)}
  ];
}
audit({fixtureSHA:'794c3fed08ddfc05c61e240c370a9c849909f4135f07ec5b5a9af52588c8f5cc',
  run,runController:controller,additional:extra});
