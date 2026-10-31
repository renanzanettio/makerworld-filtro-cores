const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let parseHTML;
try { ({parseHTML}=require('linkedom')); }
catch { ({parseHTML}=require(process.env.MWCF_TEST_NODE_MODULES+'/linkedom')); }
const C=require('../core.js');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function setup(options={}) {
  const {window,document}=parseHTML('<!doctype html><html><head></head><body><main><div id="grid"></div></main></body></html>');
  const listeners=[],data={},requests=[];
  const fixtures={}; const ids=[];
  const colors=options.colors||[['#FFFFFF'],['#F5D52B'],null,['#00AE42','#FF0000']];
  colors.forEach((list,i)=>{
    const id=String(990001+i);ids.push(id);
    fixtures[id]={id,instances:[{id:i+1,title:'Perfil '+(i+1),...(list?{instanceFilaments:list.map(color=>({color}))}:{})}]};
    const article=document.createElement('article');article.className='model-card';article.id='card-'+id;
    article.innerHTML='<a href="https://makerworld.com/pt/models/'+id+'-test"><img alt="Modelo '+id+'"><h2>Modelo '+id+'</h2></a><p>Autor</p>';
    document.getElementById('grid').append(article);
  });
  // linkedom deliberately has a read-only select.value. Native browsers support this setter.
  Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return this.querySelector('option[selected]')?.getAttribute('value')||this.querySelector('option')?.getAttribute('value')||'';},set(v){for(const o of this.querySelectorAll('option')){if(o.getAttribute('value')===v)o.setAttribute('selected','');else o.removeAttribute('selected');}}});
  const chrome={runtime:{onMessage:{addListener(){}},async sendMessage(m){
    if(m.type==='MWCF_CACHED')return{ok:true,models:{}};
    if(m.type==='MWCF_CLEAR_CACHE')return{ok:true};
    if(m.type==='MWCF_LOOKUP'){
      requests.push(m.id);await pause(options.delay||5);
      if(options.block)return{ok:false,code:'blocked',error:'Consultas pausadas pelo site.'};
      return{ok:true,model:C.extractModel(fixtures[m.id],m.id)};
    }
    return{ok:true};
  }},storage:{local:{async get(k){return{[k]:data[k]};},async set(next){const changes={};for(const[k,v]of Object.entries(next)){changes[k]={newValue:v};data[k]=v;}listeners.forEach(f=>f(changes,'local'));}},onChanged:{addListener(f){listeners.push(f);}}}};
  Object.assign(window,{chrome,console,URL,location:{href:options.url||'https://makerworld.com/pt/search/models?keyword=natal'},setTimeout,clearTimeout});
  const sandbox=vm.createContext(window);vm.runInContext(read('core.js'),sandbox);vm.runInContext(read('content.js'),sandbox);
  await pause(30);const ui=document.getElementById('mwcf-root').shadowRoot;
  return{document,window,ui,ids,requests,data,fixtures};
}
test('actual content script filters cards, preserves order and restores all nodes when disabled',async()=>{
  const {ui,document,ids}=await setup();
  ui.getElementById('analyze').click();await pause(100);
  assert.equal(ui.getElementById('compatible-count').textContent,'2');
  assert.equal(ui.getElementById('incompatible-count').textContent,'1');
  assert.equal(ui.getElementById('unknown-count').textContent,'1');
  assert.equal(document.getElementById('card-'+ids[1]).getAttribute('data-mwcf-hidden'),'1');
  assert.equal(document.getElementById('card-'+ids[2]).hasAttribute('data-mwcf-hidden'),false);
  assert.deepEqual([...document.getElementById('grid').children].map(n=>n.id),ids.map(id=>'card-'+id));
  const enabled=ui.getElementById('enabled');enabled.checked=false;enabled.dispatchEvent(new document.defaultView.Event('change'));await pause(20);
  assert.equal(document.querySelectorAll('[data-mwcf-hidden]').length,0);
  assert.ok([...document.querySelectorAll('.mwcf-badge')].every(n=>n.hidden));
});
test('adding yellow refilters existing results without further metadata calls',async()=>{
  const s=await setup();s.ui.getElementById('analyze').click();await pause(100);
  const yellow=[...s.ui.getElementById('palette').children].find(n=>n.title.startsWith('Amarelo'));
  yellow.click();await pause(25);
  assert.equal(s.ui.getElementById('compatible-count').textContent,'3');assert.equal(s.requests.length,4);
  assert.equal(s.document.querySelectorAll('[data-mwcf-hidden]').length,0);
});
test('stop finishes the in-flight query and schedules no new requests',async()=>{
  const s=await setup({delay:70});s.ui.getElementById('analyze').click();await pause(10);
  s.ui.getElementById('stop').click();
  assert.equal(s.ui.getElementById('analyze').disabled,true);
  await pause(100);assert.equal(s.requests.length,1);assert.match(s.ui.getElementById('status').textContent,/interrompida/);
});
test('a block stops the batch and never hides a model as incompatible',async()=>{
  const s=await setup({block:true});s.ui.getElementById('analyze').click();await pause(70);
  assert.equal(s.requests.length,1);assert.match(s.ui.getElementById('status').textContent,/pausadas/);
  assert.equal(s.document.querySelectorAll('[data-mwcf-hidden]').length,0);
});
test('a batch never exceeds 20 loaded models',async()=>{
  const s=await setup({colors:Array.from({length:25},()=>['#FFFFFF'])});s.ui.getElementById('analyze').click();await pause(300);
  assert.equal(s.requests.length,20);assert.equal(s.ui.getElementById('unknown-count').textContent,'5');
});
test('a model detail page analyzes only the open model, not related cards or its hero',async()=>{
  const s=await setup({url:'https://makerworld.com/pt/models/990001-test'});s.ui.getElementById('analyze').click();await pause(60);
  assert.deepEqual(s.requests,['990001']);assert.equal(s.document.querySelectorAll('.mwcf-badge').length,0);
});
test('unknown-data hiding is opt-in and leaves unscanned cards visible',async()=>{
  const s=await setup();s.ui.getElementById('analyze').click();await pause(100);
  const checkbox=s.ui.getElementById('hide-unknown');checkbox.checked=true;checkbox.dispatchEvent(new s.window.Event('change'));await pause(20);
  assert.equal(s.document.getElementById('card-990003').getAttribute('data-mwcf-hidden'),'1');
});
test('infinite-scroll additions are discovered without changing their order',async()=>{
  const s=await setup();s.ui.getElementById('analyze').click();await pause(100);
  s.fixtures['990099']={id:990099,instances:[{id:99,instanceFilaments:[{color:'#FFFFFF'}]}]};
  const card=s.document.createElement('article');card.id='new-card';card.className='model-card';
  card.innerHTML='<a href="https://makerworld.com/pt/models/990099-new"><img alt="Modelo novo"><h2>Novo</h2></a>';
  s.document.getElementById('grid').append(card);await pause(330);
  assert.equal(s.ui.getElementById('unknown-count').textContent,'2');
  s.ui.getElementById('analyze').click();await pause(60);
  assert.equal(s.requests.at(-1),'990099');assert.equal(s.requests.length,5);
  assert.equal(s.document.getElementById('grid').lastElementChild.id,'new-card');
});
test('monochrome option updates existing classifications without extra queries',async()=>{
  const s=await setup({colors:[['#79513A'],['#2154CA','#F5D52B']]});s.ui.getElementById('analyze').click();await pause(80);
  assert.equal(s.ui.getElementById('compatible-count').textContent,'0');
  const box=s.ui.getElementById('flexible');box.checked=true;box.dispatchEvent(new s.window.Event('change'));await pause(20);
  assert.equal(s.ui.getElementById('compatible-count').textContent,'1');
  assert.equal(s.ui.getElementById('incompatible-count').textContent,'1');assert.equal(s.requests.length,2);
});
