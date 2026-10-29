const test=require('node:test'),assert=require('node:assert/strict');
const game=require('../game'),{createServer}=require('../server');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
function room(){return {code:'CLOCK',dealId:'deal',turnSerial:1,phase:'playing',turnPlayerId:'p0',direction:1,activeColor:'Lila',config:{mode:'virtual'},deck:[],players:new Map([0,1,2].map(i=>['p'+i,{id:'p'+i,token:'token'+i,name:'J'+i,hand:[{id:'c'+i,color:'Lila'}],streams:new Set()}]))};}
test('turn deadline is exactly 15 seconds and reconnecting or drawing does not extend it',()=>{
 const r=room();game.syncTurnClock(r,1000);assert.equal(r.turnClock.deadline,16000);
 game.syncTurnClock(r,3000);assert.equal(r.turnClock.deadline,16000);
 r.deck=[{id:'drawn',color:'Coral'}];game.drawOne(r,'p0');game.syncTurnClock(r,5000);assert.equal(r.turnClock.deadline,16000);
 assert.equal(game.expireTurn(r,15999),false);assert.equal(game.expireTurn(r,16000),true);
 assert.equal(r.players.get('p0').eliminated,true);assert.match(r.players.get('p0').eliminationReason,/15 segundos/);assert.equal(r.turnPlayerId,'p1');assert.equal(r.turnClock.deadline,31000);
 assert.equal(game.canPlay(r,'p0',{color:'Lila'}),false);
});
test('each new turn gets its own clock and eliminated players are skipped',()=>{
 const r=room();game.syncTurnClock(r,0);r.players.get('p1').eliminated=true;
 game.playCard(r,'p0','c0');assert.equal(r.turnPlayerId,'p2');
 // The last card ends the game, so no clock continues after victory.
 game.syncTurnClock(r,5000);assert.equal(r.turnClock,null);
});
test('timeout disqualifies the assigned pending responder and releases other players',()=>{
 const r=room();r.turnPlayerId='p1';r.pending={id:'task',playerId:'p0',text:'Elige a alguien'};game.syncTurnClock(r,0);
 assert.equal(r.turnClock.playerId,'p0');assert.equal(game.expireTurn(r,15000),true);
 assert.equal(r.pending,null);assert.equal(r.turnPlayerId,'p1');assert.equal(r.turnClock.playerId,'p1');assert.equal(r.turnClock.deadline,30000);
});
test('dice and penalties time out, respect direction, and stop when there is a winner',()=>{
 for(const kind of ['dice','penalty']){
  const r=room();r.direction=-1;if(kind==='dice')r.diceTask={id:'dice',playerId:'p0'};else r.penalty={type:'cards',amount:8,minimum:4,playerId:'p0'};
  game.syncTurnClock(r,0);game.expireTurn(r,15000);assert.equal(r.turnPlayerId,'p2');assert.equal(r.diceTask||r.penalty||null,null);
  game.expireTurn(r,30000);assert.equal(r.phase,'finished');assert.equal(r.winnerId,'p1');assert.equal(r.turnClock,null);
 }
});
test('lobby has no clock and timed-out finishers cannot win',()=>{
 const r=room();r.phase='lobby';game.syncTurnClock(r,0);assert.equal(r.turnClock,null);
 r.phase='playing';r.finisherId='p0';r.pending={id:'choose',playerId:'p0'};r.players.get('p0').hand=[];game.syncTurnClock(r,0);game.expireTurn(r,15000);
 assert.equal(r.finisherId,null);assert.notEqual(r.winnerId,'p0');
});
test('server automatically broadcasts disqualification without a client taking an action',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'todo-clock-')),statePath=path.join(directory,'rooms.json'),r=room();
 r.hostToken='host';game.syncTurnClock(r,Date.now());r.turnClock.deadline=Date.now()+1500;
 await fs.writeFile(statePath,JSON.stringify([{...r,players:[...r.players.values()].map(p=>({...p,streams:undefined}))}]));
 const server=createServer({statePath});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),6000);let reader;
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const stream=await fetch(base+'/api/events?token=host',{signal:controller.signal});reader=stream.body.getReader();let output='';
  while(!output.includes('Tiempo agotado')){const part=await reader.read();if(part.done)throw Error('La conexión terminó antes del vencimiento');output+=new TextDecoder().decode(part.value);}
  const response=await fetch(base+'/api/state',{headers:{Authorization:'Bearer host'}}),state=await response.json();
  assert.equal(state.players.find(p=>p.id==='p0').eliminated,true);assert.equal(state.turnPlayerId,'p1');assert.equal(state.turnClock.limitSeconds,15);
  assert.equal((await fetch(base+'/api/draw',{method:'POST',headers:{Authorization:'Bearer token0','Content-Type':'application/json'},body:'{}'})).status,409);
 }finally{clearTimeout(deadline);controller.abort();await reader?.cancel().catch(()=>{});server.shutdown();await new Promise(resolve=>server.listening?server.once('close',resolve):resolve());await fs.rm(directory,{recursive:true,force:true});}
});
