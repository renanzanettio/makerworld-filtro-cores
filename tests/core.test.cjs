const {test} = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');
const stock = C.sanitizeSettings();
const p = (colors, extra = {}) => ({id: 42, title: 'Perfil', instanceFilaments: colors.map(color => ({color, type: 'PLA', usedG: 1})), ...extra});
const model = profiles => C.extractModel({id: 123, instances: profiles}, 123);

test('initial stock is exactly white, black, green and red', () => {
  assert.deepEqual(stock.inventory.filter(c => c.enabled).map(c => c.id), ['white','black','green','red']);
});
test('normalizes hex, shorthand, alpha and invalid multicolour strings', () => {
  assert.equal(C.hex('#aBc'), '#AABBCC'); assert.equal(C.hex('00ae42'), '#00AE42');
  assert.equal(C.hex('#FFFFFF00'), '#FFFFFF00'); assert.equal(C.hex('#00GG00'), null);
  assert.equal(C.hex('#FF0000;#00FF00'), null); assert.equal(C.hex(null), null);
});
for (const [value, expected] of [
  ['#FFFFFF','white'], ['#F7F6EF','white'], ['#000000','black'], ['#242424','black'],
  ['#00AE42','green'], ['#135D33','green'], ['#EC2020','red'], ['#C91D1D','red'],
  ['#FFED00','yellow'], ['#2154CA','blue'], ['#25C6D4','cyan'], ['#79513A','brown'],
  ['#D7BD91','beige'], ['#939393','gray'], ['#ED82B0','pink'], ['#8549BB','purple'],
  ['#F58A24','orange'], ['#FFFFFF00','transparent']
]) test('classifies ' + value + ' as ' + expected, () => assert.equal(C.family(value), expected));
test('family matching accepts other greens but never unknown strings', () => {
  assert.equal(C.matches('#135D33', '#00A650', stock), true);
  assert.equal(C.matches('green','green',stock), false);
  assert.equal(C.matches('#FFFFFF00','#FFFFFF',stock), false);
});
test('tone mode rejects a materially different green and accepts small differences', () => {
  const s = {...stock, mode:'tone'};
  assert.equal(C.matches('#135D33','#00A650',s), false);
  assert.equal(C.matches('#DB2428','#DC2529',s), true);
});
test('all required colours must fit the inventory', () => {
  assert.equal(C.evaluate(model([p(['#FFFFFF','#FF0000','#000000','#00AE42'])]),stock).status,'compatible');
  const result = C.evaluate(model([p(['#FFFFFF','#F5D52B'])]),stock);
  assert.equal(result.status,'incompatible'); assert.match(result.reason,/Amarelo/);
});
test('profiles are alternatives, not a combined palette', () => {
  const result = C.evaluate(model([p(['#2154CA','#F5D52B']),p(['#FFFFFF','#00AE42'],{id:43})]),stock);
  assert.equal(result.status,'compatible'); assert.equal(result.best.id,'43');
});
test('missing or partial filament data never produces a false positive', () => {
  assert.equal(C.evaluate(model([{id:4,materialColorCnt:3}]),stock).status,'unknown');
  assert.equal(C.evaluate(model([p(['#FFFFFF'],{materialColorCnt:3})]),stock).status,'unknown');
  assert.equal(C.evaluate(model([p(['#FFFFFF','not-a-colour'])]),stock).status,'unknown');
  assert.equal(C.evaluate(model([p(['#F5D52B']),{id:4}]),stock).status,'unknown');
});
test('a complete matching alternative still wins over incomplete profiles', () => {
  assert.equal(C.evaluate(model([{id:4},p(['#FFFFFF'])]),stock).status,'compatible');
});
test('explicitly unused filament slots are ignored', () => {
  const m = model([{id:2,materialColorCnt:2,instanceFilaments:[{color:'#FFFFFF',usedG:10},{color:'#F5D52B',usedG:'0',usedM:'0'}]}]);
  assert.equal(C.evaluate(m,stock).status,'compatible');
});
test('missing usage fields do not make a filament unused', () => {
  assert.equal(C.evaluate(model([{id:1,instanceFilaments:[{color:'#F5D52B'}]}]),stock).status,'incompatible');
});
test('snake_case profile and per-plate metadata are supported', () => {
  const m = C.extractModel({data:{id:123,instances:[{profile_id:8,instance_filaments:[{color:'#FFFFFF',used_g:'5'}]}]}},123);
  assert.equal(C.evaluate(m,stock).status,'compatible'); assert.equal(m.profiles[0].id,'8');
  const twoPlates = model([{id:8,print_info:{plates:[{filaments:[{color:'#FFFFFF'}]},{filaments:[{color:'#F5D52B'}]}]}}]);
  assert.equal(C.evaluate(twoPlates,stock).status,'incompatible');
});
test('recommended models and arbitrary cover colours never contaminate extraction', () => {
  assert.equal(C.extractModel({id:999,instances:[p(['#FFFFFF'])]},123),null);
  assert.equal(C.extractModel({id:123,cover:{color:'#FFFFFF'},summary:'red black'},123),null);
  const selected = C.extractModel({recommended:[{id:999,instances:[p(['#F5D52B'])]}],data:{id:123,instances:[p(['#FFFFFF'])]}},123);
  assert.equal(C.evaluate(selected,stock).status,'compatible');
});
test('monochrome recolouring is strictly opt-in, never applied to incomplete/multicolour profiles', () => {
  const brown = model([p(['#79513A'])]);
  assert.equal(C.evaluate(brown,stock).status,'incompatible');
  assert.equal(C.evaluate(brown,{...stock,flexibleSingle:true}).status,'compatible');
  assert.equal(C.evaluate(model([p(['#79513A','#2154CA'])]),{...stock,flexibleSingle:true}).status,'incompatible');
  assert.equal(C.evaluate(model([p(['#79513A'],{materialColorCnt:3})]),{...stock,flexibleSingle:true}).status,'unknown');
});
test('no stock means unknown, never every model compatible', () => {
  const s = {...stock,inventory:stock.inventory.map(c => ({...c,enabled:false}))};
  assert.equal(C.evaluate(model([p(['#FFFFFF'])]),s).status,'unknown');
});
test('only numeric MakerWorld model URLs are accepted', () => {
  assert.equal(C.modelId('https://makerworld.com/pt/models/799707-christmas-trees'),'799707');
  assert.equal(C.modelId('/en/models/42?from=search'),'42');
  for (const url of ['https://evil.test/pt/models/42','https://makerworld.com.evil.test/en/models/42','javascript:alert(1)','http://makerworld.com/pt/models/42','https://makerworld.com/pt/models/42evil']) assert.equal(C.modelId(url),null);
});
test('embedded JSON is read without evaluating executable scripts', () => {
  const data = JSON.stringify({props:{pageProps:{design:{id:123,instances:[p(['#FFFFFF'])]}}}});
  const parsed = C.embeddedModels('<script id="__NEXT_DATA__" type="application/json">'+data+'</script><script>throw Error("do not run");</script>',123);
  assert.equal(C.evaluate(parsed,stock).status,'compatible');
  assert.equal(C.embeddedModels('<script>globalThis.pwned = true;</script>',123),null);
});
test('cache expires known data in 7 days, unknown data in 1 hour', () => {
  const now = Date.now();
  assert.equal(C.cacheFresh({...model([p(['#FFFFFF'])]),fetchedAt:now-86400000},now),true);
  assert.equal(C.cacheFresh({...model([p(['#FFFFFF'])]),fetchedAt:now-8*86400000},now),false);
  assert.equal(C.cacheFresh({profiles:[],fetchedAt:now-2*3600000},now),false);
});
