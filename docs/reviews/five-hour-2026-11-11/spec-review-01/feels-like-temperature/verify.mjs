import {isDeepStrictEqual} from 'node:util';
import {audit, checkpoint as p, err, plain} from '../recheck-lib.mjs';

const fields=[['temperature',6,-600,600],['windSpeed',5,0,3000],['humidity',5,0,1000]];
const defaults={temperature:'22',windSpeed:'10',humidity:'60'};
const round=x=>Math.floor(10*x+0.5)/10;
function tenth(s,signed) {
  const ok=(signed?/^-?[0-9]+(?:\.[0-9])?$/:/^[0-9]+(?:\.[0-9])?$/).test(s);
  if(!ok) return null;
  const [i,f='0']=s.replace(/^-/, '').split('.');
  return (s[0]==='-'?-1:1)*(10*Number(i)+Number(f));
}
// Independent exact evaluation of the Rothfusz polynomial's rational coefficients,
// using 1/50 Fahrenheit and 1/10 percentage point as the argument units.
function hi(T10,R10) {
  const tn=BigInt(9*T10+1600), hn=BigInt(R10);
  const poly=[
    [-4237900000n,1014333127n,-5481717n],
    [204901523n,-22475541n,85282n],
    [-683783n,122874n,-199n]
  ];
  const d=50n**2n*10n**2n*100000000n;
  let n=0n;
  for(let i=0;i<3;i++) for(let j=0;j<3;j++)
    n+=poly[i][j]*(tn**BigInt(i))*(hn**BigInt(j))*(50n**BigInt(2-i))*(10n**BigInt(2-j));
  const f=Number(tn)/50, rh=R10/10;
  const baseF=Number(n)/Number(d);
  let correctionF=0;
  if(rh<13&&80<=f&&f<=112) correctionF=-(13-rh)*Math.sqrt((17-Math.abs(f-95))/17)/4;
  if(rh>85&&80<=f&&f<=87) correctionF=(rh-85)*(87-f)/50;
  const apparentF=baseF+correctionF;
  const screenF=(f+0.5*(f+61+1.2*(f-68)+0.094*rh))/2;
  return {f,rh,screenF,baseF,correctionF,apparentF,c:(apparentF-32)*5/9};
}
function raw(T10,V10,R10) {
  const t=T10/10,v=V10/10;
  if(T10<=100&&V10>48) {
    const w=Math.exp(0.16*Math.log(v));
    return ['wind-chill',13.12+0.6215*t+(-11.37+0.3965*t)*w];
  }
  if(T10>=270&&R10>=400) return ['heat-index',hi(T10,R10).c];
  return ['actual',t];
}
function run(x) {
  if(!plain(x)||Reflect.ownKeys(x).length!==fields.length||!fields.every(([k])=>
    typeof Object.getOwnPropertyDescriptor(x,k)?.value==='string')) return err('SCHEMA');
  const xs=[];
  for(const [k,max,lo,hi] of fields){
    const s=x[k];
    if(s.length>max) return err('INPUT_LIMIT',k);
    if(!s.isWellFormed()) return err('UNICODE',k);
    if(!s.length) return err('EMPTY',k);
    const n=tenth(s,k==='temperature');
    if(n===null) return err('DECIMAL_FORMAT',k);
    if(n<lo||n>hi) return err('RANGE',k);
    xs.push(n);
  }
  const [model,c]=raw(...xs);
  return {ok:true,result:{model,feelsLikeC:round(c),deltaC:round(c-xs[0]/10)}};
}
const settle=draft=>{
  const out=run(draft);
  return out.ok?p('success',true):p('error',false,{error:out.error});
};
function checkPayload(draft,result){
  if(!isDeepStrictEqual(run(draft).result,result)) throw new Error('Synthetic payload failed independent formula');
}
function controller(id,i) {
  switch(id){
    case 'state-dirty-error':
      return {afterRun:settle(i.initial),afterEdit:p('dirty',false),afterRerun:settle(i.edit)};
    case 'state-cancel-late':
      checkPayload(i.draft,i.lateResult);
      return {whilePending:p('busy',false),afterCancel:p('cancelled',false,{draft:i.draft}),
        afterLateResult:p('cancelled',false),afterReset:p('empty',false,{draft:defaults})};
    case 'state-replace-late':
      checkPayload(i.olderDraft,i.olderLateResult);
      return {afterNewerResult:settle(i.newerDraft),afterOlderLateResult:settle(i.newerDraft)};
    default: throw new Error('Unknown scenario '+id);
  }
}
const v=(temperature,humidity,windSpeed='10')=>({temperature,windSpeed,humidity});
function additional(){
  const extreme=v('60','100'), dry=v('43','30'), cornerAdjacent=v('27','40.1');
  return [
    {id:'TEMP-01',input:extreme,spec:run(extreme),rawRothfusz:hi(600,1000),
      nWSValidity:'outside original data range; numeric result not a validated official estimate'},
    {id:'TEMP-01-DRY',input:dry,spec:run(dry),nwsThresholdCrossCheck:hi(430,300),
      note:'NWS algorithm uses precheck, not a fixed RH>=40 gate; polynomial value supplied only to illustrate routing divergence.'},
    {id:'TEMP-02',input:cornerAdjacent,spec:run(cornerAdjacent),rawRothfusz:hi(270,401),
      claimFalsified:hi(270,401).c<27},
    {id:'thresholds',windAt4_8:run(v('10','50','4.8')),windAt4_9:run(v('10','50','4.9')),
      windAt10_1:run(v('10.1','50','4.9')),hiScreenAtLowerCorner:hi(270,400).screenF,
      highHumidity85:hi(280,850).correctionF,highHumidity86:hi(280,860).correctionF}
  ];
}
audit({fixtureSHA:'743c8e0d6e349ea192c6165aa0bcc96a55e0cb527778aca3c89815f9db8580ad',
  run,runController:controller,additional});
