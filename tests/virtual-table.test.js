const test=require('node:test'),assert=require('node:assert/strict');
const {model}=require('../virtual-table'),{createServer}=require('../server');
function players(count){return Array.from({length:count},(_,i)=>({id:'p'+i,name:'J'+i,avatar:'pato-sinfondo.png',cardCount:8,connected:true,hand:[{id:'secret-'+i}]}));}
test('each player sees their own seat below and opponents in relative order',()=>{
 const state={players:players(4),turnPlayerId:'p2'};const a=model(state,'p0'),b=model(state,'p2');
 assert.equal(a.self.id,'p0');assert.deepEqual(a.seats.map(p=>p.id),['p1','p2','p3']);assert.equal(b.self.id,'p2');assert.deepEqual(b.seats.map(p=>p.id),['p3','p0','p1']);assert.equal(b.self.active,true);
 for(const view of [a,b]){assert.equal('hand' in view.self,false);for(const seat of view.seats){assert.equal('hand' in seat,false);assert.equal(seat.backs,5);assert.equal(seat.cardCount,8);assert.ok(seat.x>=7&&seat.x<=93);}}
});
test('ten players fit around the table and larger rooms can page through everyone',()=>{
 const ten=model({players:players(10)},'p0');assert.equal(ten.seats.length,9);assert.equal(ten.pages,1);assert.equal(ten.crowded,true);
 const state={players:players(100)},ids=new Set();for(let page=0;page<11;page++)for(const seat of model(state,'p25',page).seats)ids.add(seat.id);assert.equal(ids.size,99);assert.equal(ids.has('p25'),false);
});
test('virtual players share public table data and reaction history, while hands remain private',async()=>{
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const api=async(route,token,data)=>{const response=await fetch(base+route,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});return response.json();};
 try{for(const mode of ['virtual','presencial']){
  const host=await api('/api/rooms',null,{mode,expectedPlayers:3});const a=await api('/api/join',null,{code:host.code,name:'Ana'}),b=await api('/api/join',null,{code:host.code,name:'Luis'}),c=await api('/api/join',null,{code:host.code,name:'Vale'});
  await api('/api/reaction',a.token,{emoji:'🔥'});const state=await api('/api/state',b.token);
  assert.equal(state.players.length,3);assert.equal(state.players.some(p=>'hand' in p||'token' in p),false);assert.equal(state.hand.length,0);
  if(mode==='virtual')assert.equal(state.reactions.length,1);else assert.equal(state.reactions,undefined);
  assert.equal((await fetch(base+'/virtual-table.js')).status,200);assert.equal((await fetch(base+'/virtual-table.css')).status,200);
  assert.equal((await api('/api/state',c.token)).code,host.code);
 }}finally{await new Promise(resolve=>server.close(resolve));}
});
