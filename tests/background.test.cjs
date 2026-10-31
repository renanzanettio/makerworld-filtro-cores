const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const coreSource = fs.readFileSync(path.join(__dirname,'../core.js'),'utf8');
const backgroundSource = fs.readFileSync(path.join(__dirname,'../background.js'),'utf8');
const C = require('../core.js');
function worker(fetcher, data = {}) {
  let listener;
  const calls = [];
  const sandbox = vm.createContext({console, URL, AbortSignal, setTimeout:fn=>setImmediate(fn), fetch:async (url, options) => { calls.push({url,options}); return fetcher(url,options); }, chrome:{
    runtime:{id:'own-extension',onMessage:{addListener(fn){listener=fn;}}},
    action:{onClicked:{addListener(){}}},tabs:{},
    storage:{local:{async get(k){return {[k]:data[k]};},async set(v){Object.assign(data,v);},async remove(k){delete data[k];}}}
  }});
  sandbox.importScripts = () => vm.runInContext(coreSource,sandbox);
  vm.runInContext(backgroundSource,sandbox);
  const sender = {id:'own-extension',url:'https://makerworld.com/pt/search/models',tab:{url:'https://makerworld.com/pt/search/models'}};
  const message = (value, from = sender) => new Promise(resolve => { const async = listener(value,from,resolve); if (!async) resolve(undefined); });
  return {message,calls,data};
}
const payload = id => ({id,instances:[{id:1,title:'Perfil',instanceFilaments:[{color:'#FFFFFF',usedG:10}]}]});
test('uses only the fixed metadata endpoint and sends no credentials or bearer tokens', async () => {
  const w=worker(async()=>new Response(JSON.stringify(payload(123))));
  const r=await w.message({type:'MWCF_LOOKUP',id:123,url:'https://evil.test/private'});
  assert.equal(r.ok,true);assert.equal(w.calls.length,1);
  assert.equal(w.calls[0].url,'https://api.bambulab.com/v1/design-service/design/123');
  assert.equal(w.calls[0].options.credentials,'omit');assert.equal(w.calls[0].options.headers.Authorization,undefined);
});
test('deduplicates concurrent requests and reuses persistent cache', async () => {
  const w=worker(async()=>new Response(JSON.stringify(payload(123))));
  const [a,b]=await Promise.all([w.message({type:'MWCF_LOOKUP',id:123}),w.message({type:'MWCF_LOOKUP',id:123})]);
  assert.equal(a.ok,true);assert.equal(b.ok,true);assert.equal(w.calls.length,1);
  await w.message({type:'MWCF_LOOKUP',id:123});assert.equal(w.calls.length,1);
  const afterRestart=worker(async()=>{throw Error('must not fetch');},w.data);
  assert.equal((await afterRestart.message({type:'MWCF_LOOKUP',id:123})).ok,true);assert.equal(afterRestart.calls.length,0);
});
for(const code of [401,403,429]) test('pauses on HTTP '+code+' without an alternate-route retry', async () => {
  const w=worker(async()=>new Response('denied',{status:code}));
  const first=await w.message({type:'MWCF_LOOKUP',id:123});assert.equal(first.code,'blocked');
  await w.message({type:'MWCF_CLEAR_CACHE'});
  const second=await w.message({type:'MWCF_LOOKUP',id:124});assert.equal(second.code,'blocked');assert.equal(w.calls.length,1);
  const afterRestart=worker(async()=>{throw Error('must not fetch');},w.data);
  assert.equal((await afterRestart.message({type:'MWCF_LOOKUP',id:125})).code,'blocked');assert.equal(afterRestart.calls.length,0);
});
test('rejects foreign senders and hostile IDs', async () => {
  const w=worker(async()=>{throw Error('must not fetch');});
  assert.equal(await w.message({type:'MWCF_LOOKUP',id:'../../my/profile'}),undefined);
  assert.equal(await w.message({type:'MWCF_LOOKUP',id:123},{id:'other',url:'https://makerworld.com/pt'}),undefined);
  assert.equal(await w.message({type:'MWCF_LOOKUP',id:123},{id:'own-extension',url:'https://evil.test'}),undefined);
  assert.equal(w.calls.length,0);
});
test('404 can fall back to embedded public-page metadata without counting a download', async () => {
  const html='<script id="__NEXT_DATA__">'+JSON.stringify({props:{pageProps:{design:payload(123)}}})+'</script>';
  const w=worker(async url=>url.includes('api.bambulab.com')?new Response('not found',{status:404}):new Response(html));
  const r=await w.message({type:'MWCF_LOOKUP',id:123});assert.equal(r.ok,true);assert.equal(r.model.profiles[0].complete,true);
  assert.equal(w.calls.length,2);assert.equal(w.calls[1].url,'https://makerworld.com/pt/models/123');
  assert.ok(w.calls.every(c=>!c.url.includes('download')&&!c.url.includes('visitHistory')));
});
test('only normalized public filament fields are retained from observed page data', async () => {
  const w=worker(async()=>{throw Error('must not fetch');});
  const raw={...payload(123),secret:'do-not-store',designCreator:{privatePhone:'do-not-store'}};
  const r=await w.message({type:'MWCF_OBSERVED',id:123,payload:raw});assert.equal(r.ok,true);
  assert.equal(JSON.stringify(w.data).includes('do-not-store'),false);
  assert.equal(w.calls.length,0);
});
test('challenge HTML produces a pause rather than an empty or compatible result', async () => {
  const w=worker(async()=>new Response('<html>Verify you are human</html>'));
  const r=await w.message({type:'MWCF_LOOKUP',id:123});assert.equal(r.ok,false);assert.equal(r.code,'blocked');assert.equal(w.calls.length,1);
});
