const test=require('node:test'),assert=require('node:assert/strict');
const {catalog,suggest}=require('../suggestions'),{dealRoom}=require('../deck');
test('suggestions do not repeat in a session and explicitly define completion',()=>{
 const r={},ids=new Set();
 for(const kind of ['question','challenge']){const entries=catalog.filter(p=>p.kind===kind);for(let i=0;i<entries.length;i++){const p=suggest(r,kind);assert.equal(ids.has(p.id),false);ids.add(p.id);assert.ok(p.text&&p.completion);assert.ok([60,90,120].includes(p.seconds));}assert.throws(()=>suggest(r,kind),/todas/);}
 assert.equal(ids.size,catalog.length);
 const loaded=JSON.parse(JSON.stringify(r));assert.throws(()=>suggest(loaded,'question'),/todas/);
});
test('a new round resets prompt history and clock',()=>{
 const r={players:new Map([['p0',{id:'p0'}],['p1',{id:'p1'}]]),usedSuggestions:catalog.map(p=>p.id),actionClock:{expired:true}};dealRoom(r);assert.deepEqual(r.usedSuggestions,[]);assert.equal(r.actionClock,null);assert.ok(suggest(r,'challenge'));
});
test('phone and external-response prompts allow 120 seconds and define unanswered attempts',()=>{
 const call=catalog.find(p=>p.title==='Llamada comprometida');assert.equal(call.seconds,120);assert.match(call.completion,/no conteste/);const alternative=catalog.find(p=>p.title==='Baile o alternativa');assert.match(alternative.completion,/no se añade otro castigo/);
});
