const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {dayKey,totals,signature,validCookie,record}=require('../lib/visit-counter');
test('Amsterdam midnight and Monday/year boundaries',()=>{
 assert.equal(dayKey(new Date('2026-10-04T22:30:00Z')),'2026-10-05');
 assert.equal(dayKey(new Date('2026-01-01T23:30:00Z')),'2026-01-02');
 assert.deepEqual(totals({'2025-12-28':8,'2025-12-29':2,'2025-12-31':3,'2026-01-01':4,'2026-01-02':5},'2026-01-01'),
 {day:4,week:9,month:4,year:4});
});
test('cookie validation rejects tampering',()=>{
 const value='khufu_visit=2026-10-05.'+signature('2026-10-05','test-secret');
 assert.equal(validCookie(value,'test-secret'),true);
 assert.equal(validCookie(value,'other-secret'),false);
 assert.equal(validCookie('khufu_visit=bad','test-secret'),false);
});
test('concurrent visits survive SHA conflicts; reads do not increment',async()=>{
 let data={version:1,days:{}},sha=0;
 const fake=async(url,options)=>{
  if(options.method!=='PUT')return {ok:true,json:async()=>({sha:String(sha),content:Buffer.from(JSON.stringify(data)).toString('base64')})};
  const body=JSON.parse(options.body);
  if(body.sha!==String(sha))return {ok:false,status:409};
  data=JSON.parse(Buffer.from(body.content,'base64'));sha++;
  return {ok:true};
 };
 const opts={token:'test',today:'2026-10-05',fetchImpl:fake,pause:async()=>{}};
 await Promise.all(Array.from({length:5},()=>record({...opts,increment:true})));
 assert.deepEqual(await record({...opts,increment:false}),{day:5,week:5,month:5,year:5});
 assert.equal(sha,5);
});
test('storage errors never reset totals',async()=>{
 let writes=0;
 await assert.rejects(record({token:'test',increment:true,fetchImpl:async(u,o)=>{if(o.method==='PUT')writes++;return {ok:false,status:403};}}));
 assert.equal(writes,0);
});
test('frontend hides immediately and stays hidden after late response',async()=>{
 let onHome=true,callback,resolve,method;
 const listeners={},values={},status={textContent:''};
 const panel={hidden:false,setAttribute(){},querySelectorAll(){return ['day','week','month','year'].map(key=>({dataset:{total:key},set textContent(v){values[key]=v;}}));},querySelector(){return status;}};
 const scene={querySelector:()=>onHome?{}:null,after(){}};
 const context={document:{getElementById:id=>id==='scene'?scene:{addEventListener:(event,fn)=>{listeners[id]=fn;}},createElement:()=>panel},
 MutationObserver:class{constructor(fn){callback=fn;}observe(){}disconnect(){}},
 sessionStorage:{getItem:()=>null,setItem(){}},
 fetch:(url,opts)=>{method=opts.method;return new Promise(r=>resolve=r);}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../js/counter.js'),'utf8'),context);
 assert.equal(method,'POST');
 listeners.introNext(); assert.equal(panel.hidden,true);
 resolve({ok:true,json:async()=>({day:1,week:2,month:3,year:4})});
 await new Promise(r=>setImmediate(r));
 assert.equal(panel.hidden,true);
 assert.equal(values.day,'1');
});
test('resumed game does not send counter request',()=>{
 vm.runInNewContext(fs.readFileSync(require.resolve('../js/counter.js'),'utf8'),{
 document:{getElementById:()=>({querySelector:()=>null})},fetch:()=>assert.fail('Unexpected counter request')
 });
});
test('repeat tab session reads only',()=>{
 let method;
 const panel={setAttribute(){},querySelectorAll:()=>[],querySelector:()=>({})};
 vm.runInNewContext(fs.readFileSync(require.resolve('../js/counter.js'),'utf8'),{
 document:{getElementById:id=>id==='scene'?{querySelector:()=>({}),after(){}}:{addEventListener(){}},createElement:()=>panel},
 MutationObserver:class{observe(){}disconnect(){}},
 sessionStorage:{getItem:()=> 'yes'},
 fetch:(url,opts)=>{method=opts.method;return new Promise(()=>{});}
 });
 assert.equal(method,'GET');
});

