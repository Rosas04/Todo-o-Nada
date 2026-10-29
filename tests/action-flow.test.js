const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createServer}=require('../server'),clock=require('../action-clock');
async function fixture(type='spoken',deadline=null){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'todo-flow-')),statePath=path.join(directory,'rooms.json');
 const r={code:'FLOW1',hostToken:'host',phase:'playing',dealId:'deal',turnSerial:1,turnPlayerId:'p1',direction:1,activeColor:'Lila',config:{mode:'virtual',expectedPlayers:3},deck:[{id:'drawn',color:'Coral'}],players:new Map([0,1,2].map(i=>['p'+i,{id:'p'+i,token:'token'+i,name:'J'+i,hand:[{id:'a'+i,color:'Lila'},{id:'b'+i,color:'Coral'}]}]))};
 if(type==='dice')r.diceTask={id:'dice',playerId:'p1'};else r.pending={id:'task',kind:type,playerId:'p1',judgeId:'p0',text:'Consigna'};
 clock.sync(r);if(deadline!==null)r.actionClock.deadline=deadline;
 await fs.writeFile(statePath,JSON.stringify([{...r,players:[...r.players.values()]}]));
 const server=createServer({statePath});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const api=async(route,token,data)=>{const response=await fetch(base+route,{method:data===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});return {status:response.status,body:await response.json()};};
 return {api,base,server,close:async()=>{await new Promise(resolve=>server.close(resolve));await fs.rm(directory,{recursive:true,force:true});}};
}
test('only the sender requests nonrepeating prompts and choosing never resets the 150 second deadline',async()=>{
 const f=await fixture();try{
  const first=(await f.api('/api/state','token0')).body.actionClock;
  assert.equal((await f.api('/api/suggest','token1',{taskId:'task',kind:'challenge'})).status,403);
  assert.equal((await f.api('/api/choice','token1',{taskId:'task',kind:'challenge'})).status,200);
  assert.equal((await f.api('/api/choice','token1',{taskId:'task',kind:'question'})).status,409);
  assert.equal((await f.api('/api/suggest','token0',{taskId:'task',kind:'question'})).status,400);
  assert.equal((await f.api('/api/suggest','token0',{taskId:'task',kind:'challenge'})).status,200);
  const a=(await f.api('/api/state','token0')).body;
  assert.equal(a.actionClock.deadline,first.deadline);assert.equal(a.actionClock.startedAt,first.startedAt);
  assert.equal((await f.api('/api/suggest','token0',{taskId:'task',kind:'challenge'})).status,200);
  const b=(await f.api('/api/state','token1')).body;assert.notEqual(a.pending.suggestion.id,b.pending.suggestion.id);assert.equal(b.actionClock.deadline,first.deadline);
  assert.equal((await f.api('/api/complete','token1',{taskId:'task',fulfilled:true})).status,403);
  assert.equal((await f.api('/api/complete','token0',{taskId:'task',fulfilled:true})).status,200);
  const completed=(await f.api('/api/state','host')).body;assert.equal(completed.pending,null);assert.equal(completed.diceTask,null);assert.equal(completed.actionClock.seconds,25);
  await f.api('/api/complete','token0',{taskId:'task',fulfilled:false});assert.equal((await f.api('/api/state','host')).body.diceTask,null);
 }finally{await f.close();}
});
test('an expired challenge requests final evaluation and can still be approved without a penalty',async()=>{
 const f=await fixture('challenge',Date.now()-1);try{
  const state=(await f.api('/api/state','token0')).body;
  assert.equal(state.pending.awaitingEvaluation,true);assert.equal(state.actionClock.expired,true);assert.equal(state.diceTask,null);
  assert.equal((await f.api('/api/suggest','token0',{taskId:'task',kind:'challenge'})).status,409);
  assert.equal((await f.api('/api/complete','token0',{taskId:'task',fulfilled:true})).status,200);
  const after=(await f.api('/api/state','host')).body;assert.equal(after.pending,null);assert.equal(after.diceTask,null);assert.equal(after.turnPlayerId,'p1');
 }finally{await f.close();}
});
test('the server expires dice automatically, sends the one-card result and rejects late rolls',async()=>{
 const f=await fixture('dice',Date.now()+1400),controller=new AbortController(),abort=setTimeout(()=>controller.abort(),6000);let reader;
 try{
  const response=await fetch(f.base+'/api/events?token=host',{signal:controller.signal});reader=response.body.getReader();let events='';
  while(!events.includes('"lastTimeout":{"id"')){const chunk=await reader.read();if(chunk.done)throw Error('La conexión terminó');events+=new TextDecoder().decode(chunk.value);}
  const state=(await f.api('/api/state','token1')).body;assert.equal(state.hand.length,3);assert.equal(state.diceTask,null);assert.equal(state.diceResult,null);assert.equal(state.lastTimeout.cards,1);assert.equal(state.actionClock.seconds,25);
  assert.equal((await f.api('/api/dice','token1',{taskId:'dice'})).status,409);
 }finally{clearTimeout(abort);controller.abort();await reader?.cancel().catch(()=>{});await f.close();}
});
