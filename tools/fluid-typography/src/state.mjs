import{defaults,fields,calculate,sampleValid}from'./core.mjs';
export const samples={en:'Type that grows with your ideas.','zh-Hant':'讓文字隨著你的想法，舒展開來。'};
export function initial(lang='zh-Hant'){return {lang,raw:{...defaults},sample:samples[lang],result:null,errors:{},dirty:false};}
export function transition(state,event){const s={...state,raw:{...state.raw},errors:{...state.errors}};switch(event.type){case'number':if(!fields.includes(event.field))throw Error('unknown field');s.raw[event.field]=event.value;s.result=null;s.errors={};s.dirty=true;break;case'sample':s.sample=event.value;break;case'generate':{const r=calculate(s.raw);s.result=r.result;s.errors=r.errors;s.dirty=!r.valid;break;}case'language':if(!['en','zh-Hant'].includes(event.lang))throw Error('unknown language');s.lang=event.lang;break;case'reset':return initial(s.lang);default:throw Error('unknown event');}return s;}
export const canPreview=s=>Boolean(s.result)&&sampleValid(s.sample);
