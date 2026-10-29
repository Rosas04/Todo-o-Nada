const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createServer}=require('../server'),{makeDeck}=require('../deck');
test('only the sender evaluates questions, challenges and truth-or-dare; rejection assigns the responder a die',async()=>{
 for(const [effect,fulfilled] of [['lila9',true],['amarillo8',false],['choice',false]]){
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'todo-approval-')),statePath=path.join(directory,'rooms.json');
  const played=makeDeck().find(card=>card.effectId===effect),normal={id:'normal',color:played.colors[0],title:'Normal',file:'test.png'};
  const players=[0,1,2].map(i=>({id:'p'+i,token:'token'+i,name:'J'+i,hand:i===0?[played,{...normal,id:'extra'}]:[{...normal,id:'n'+i}]}));
  await fs.writeFile(statePath,JSON.stringify([{code:'TEST1',hostToken:'host',config:{mode:'virtual',expectedPlayers:3},phase:'playing',players,turnPlayerId:'p0',activeColor:played.colors[0],topCard:normal,deck:[],direction:1}]));
  const server=createServer({statePath});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const api=async(route,token,data)=>{const response=await fetch('http://127.0.0.1:'+server.address().port+route,{method:data===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});return {status:response.status,body:await response.json()};};
  try{
   assert.equal((await api('/api/play','token0',{cardId:played.id})).status,200);
   const sender=(await api('/api/state','token0')).body,responder=(await api('/api/state','token1')).body;
   assert.equal(sender.pending.judgeId,'p0');assert.equal(sender.pending.playerId,'p1');assert.equal(responder.pending.id,sender.pending.id);
   const observer=(await api('/api/state','token2')).body;
   assert.equal(observer.pending,null);assert.equal(observer.publicAction.id,sender.pending.id);assert.equal(observer.publicAction.text,sender.pending.text);assert.equal(observer.publicAction.judgeId,'p0');assert.equal(observer.players.some(p=>'hand' in p||'token' in p),false);
   const taskId=sender.pending.id;
   assert.equal((await api('/api/complete','token1',{taskId,fulfilled:true})).status,403);
   assert.equal((await api('/api/complete','host',{taskId,fulfilled:true})).status,403);
   assert.equal((await api('/api/complete','token0',{taskId})).status,400);
   assert.equal((await api('/api/complete','token0',{taskId:'stale',fulfilled})).status,409);
   assert.equal((await api('/api/complete','token0',{taskId,fulfilled})).status,200);
   const after=(await api('/api/state','host')).body;
   assert.equal(after.pending,null);assert.equal(after.resolution.fulfilled,fulfilled);assert.equal(after.turnPlayerId,'p1');
   assert.equal(after.diceTask?.playerId||null,fulfilled?null:'p1');
   assert.equal((await api('/api/complete','token0',{taskId,fulfilled:!fulfilled})).status,200);
   assert.equal((await api('/api/state','host')).body.resolution.fulfilled,fulfilled);
  }finally{await new Promise(resolve=>server.close(resolve));await fs.rm(directory,{recursive:true,force:true});}
 }
});
