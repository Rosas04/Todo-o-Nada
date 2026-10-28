const test=require('node:test');
const assert=require('node:assert/strict');
const {createServer}=require('../server');
test('only the assigned phone can complete the pending card; stale and repeated confirmations are handled',async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port,controllers=[];
 const api=async(route,token,data)=>{const response=await fetch(base+route,{method:data===undefined?'GET':'POST',headers:{...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});return {status:response.status,body:await response.json()};};
 const stream=async token=>{const controller=new AbortController();controllers.push(controller);const response=await fetch(base+'/api/events?token='+token,{signal:controller.signal});await response.body.getReader().read();return controller;};
 try{
  const host=(await api('/api/rooms',null,{})).body;
  assert.equal((await api('/api/state',host.token)).body.phase,'lobby');
  assert.equal((await api('/api/start',host.token,{})).status,409);
  assert.equal((await api('/api/task',host.token,{text:'Antes del inicio'})).status,409);
  const alice=(await api('/api/join',null,{code:host.code,name:'Ana'})).body;
  const bob=(await api('/api/join',null,{code:host.code,name:'Luis'})).body;
  await stream(alice.token);await stream(bob.token);
  assert.equal((await api('/api/start',alice.token,{})).status,403);
  assert.equal((await api('/api/start',host.token,{})).status,200);
  assert.equal((await api('/api/state',alice.token)).body.phase,'playing');
  const doubleDraw=await Promise.all([api('/api/draw',alice.token,{}),api('/api/draw',alice.token,{})]);
  assert.deepEqual(doubleDraw.map(result=>result.status).sort(),[200,409]);
  assert.equal((await api('/api/state',alice.token)).body.hand.length,9);
  assert.equal((await api('/api/state',host.token)).body.turnPlayerId,alice.id);
  const task=await api('/api/task',host.token,{text:'Instrucción de la carta',playerId:alice.id,kind:'challenge'});assert.equal(task.status,201);
  assert.equal((await api('/api/state',bob.token)).body.pending,null);
  assert.equal((await api('/api/complete',bob.token,{taskId:task.body.id})).status,403);
  assert.equal((await api('/api/complete',alice.token,{taskId:'stale'})).status,409);
  assert.equal((await api('/api/task',host.token,{text:'otra'})).status,409);
  assert.equal((await api('/api/state',alice.token)).body.pending.id,task.body.id);
  assert.equal((await api('/api/complete',alice.token,{taskId:task.body.id})).status,200);
  assert.equal((await api('/api/state',host.token)).body.pending,null);
  assert.equal((await api('/api/complete',alice.token,{taskId:task.body.id})).status,200);
  assert.equal((await api('/api/task',bob.token,{text:'no'})).status,403);
  const waiting=(await api('/api/task',host.token,{text:'Sin asignar'})).body;
  assert.equal((await api('/api/assign',host.token,{taskId:waiting.id,playerId:bob.id})).status,200);
  assert.equal((await api('/api/state',bob.token)).body.pending.id,waiting.id);
  assert.equal((await api('/api/cancel',alice.token,{taskId:waiting.id})).status,403);
  assert.equal((await api('/api/cancel',host.token,{taskId:waiting.id})).status,200);
  assert.equal((await api('/api/state',host.token)).body.pending,null);
  assert.equal((await fetch(base+'/play')).status,200);
  assert.equal((await api('/api/state','invalid')).status,401);
 }finally{for(const c of controllers)c.abort();server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('room settings and virtual player choices are validated by the server',async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,controllers=[];
 const api=async(route,token,data)=>{const response=await fetch(base+route,{method:data===undefined?'GET':'POST',headers:{...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});return {status:response.status,body:await response.json()};};
 const connect=async token=>{const controller=new AbortController();controllers.push(controller);const response=await fetch(base+'/api/events?token='+token,{signal:controller.signal});await response.body.getReader().read();return controller;};
 try{
  assert.equal((await api('/api/rooms',null,{mode:'invalid',expectedPlayers:4})).status,400);
  assert.equal((await api('/api/rooms',null,{mode:'virtual',expectedPlayers:1})).status,400);
  const host=(await api('/api/rooms',null,{mode:'virtual',expectedPlayers:3})).body;
  const alice=(await api('/api/join',null,{code:host.code,name:'Ana'})).body,bob=(await api('/api/join',null,{code:host.code,name:'Luis'})).body;
  const offline=(await api('/api/join',null,{code:host.code,name:'Fuera'})).body;
  assert.equal((await api('/api/join',null,{code:host.code,name:'Extra'})).status,409);
  await connect(alice.token);await connect(bob.token);
  const temporary=await connect(offline.token);
  assert.equal((await api('/api/start',host.token,{})).status,200);
  temporary.abort();
  for(let attempt=0;attempt<30;attempt++){if(!(await api('/api/state',host.token)).body.players.find(p=>p.id===offline.id).connected)break;}
  const state=(await api('/api/state',host.token)).body;assert.deepEqual(state.config,{mode:'virtual',expectedPlayers:3});
  const task=(await api('/api/task',host.token,{cardId:'text',playerId:alice.id})).body;
  assert.equal(task.requiresSelection,true);assert.match(task.text,/Elige quién/);
  for(const selectedPlayerId of [undefined,alice.id,offline.id,'inventado'])assert.equal((await api('/api/complete',alice.token,{taskId:task.id,selectedPlayerId})).status,400);
  assert.equal((await api('/api/complete',bob.token,{taskId:task.id,selectedPlayerId:alice.id})).status,403);
  assert.equal((await api('/api/complete',alice.token,{taskId:task.id,selectedPlayerId:bob.id})).status,200);
  const final=(await api('/api/state',host.token)).body;assert.equal(final.pending,null);assert.equal(final.resolution.selectedName,'Luis');assert.equal(final.resolution.action,'next-dice');
  assert.equal((await api('/api/leave',offline.token,{})).status,409);
  assert.equal((await api('/api/join',null,{code:host.code,name:'Nuevo'})).status,409);
  const local=(await api('/api/rooms',null,{mode:'presencial',expectedPlayers:2})).body;
  const localPlayer=(await api('/api/join',null,{code:local.code,name:'Mesa'})).body;await connect(localPlayer.token);
  const localOther=(await api('/api/join',null,{code:local.code,name:'Mesa 2'})).body;await connect(localOther.token);
  assert.equal((await api('/api/start',local.token,{})).status,200);
  const localTask=(await api('/api/task',local.token,{cardId:'coral6',playerId:localPlayer.id})).body;assert.equal(localTask.requiresSelection,false);
  assert.equal((await api('/api/complete',localPlayer.token,{taskId:localTask.id})).status,200);
  const cards=require('../cards');assert.equal(cards.length,14);for(const card of cards)assert.ok(require('node:fs').existsSync(require('node:path').join(__dirname,'../Resource',card.file)),card.file);
 }finally{for(const controller of controllers)controller.abort();server.closeAllConnections();await new Promise(r=>server.close(r));}
});


test('dealing creates private unique hands, survives reload and persists across restart',async()=>{
 const disk=require('node:fs'),path=require('node:path'),os=require('node:os');
 const folder=disk.mkdtempSync(path.join(os.tmpdir(),'todo-nada-deal-')),statePath=path.join(folder,'rooms.json');
 let server=createServer({statePath}),controllers=[];
 const launch=async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));return 'http://127.0.0.1:'+server.address().port;};let base=await launch();
 const api=async(route,token,data)=>{const response=await fetch(base+route,{method:data===undefined?'GET':'POST',headers:{...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});return {status:response.status,body:await response.json()};};
 const connect=async token=>{const controller=new AbortController();controllers.push(controller);const response=await fetch(base+'/api/events?token='+token,{signal:controller.signal});await response.body.getReader().read();};
 const stop=async()=>{for(const controller of controllers)controller.abort();controllers=[];server.closeAllConnections();await new Promise(r=>server.close(r));};
 try{
  const host=(await api('/api/rooms',null,{expectedPlayers:2,initialCards:7})).body;
  assert.equal((await api('/api/rooms',null,{expectedPlayers:1})).status,400);
  const one=(await api('/api/join',null,{code:host.code,name:'Uno'})).body,two=(await api('/api/join',null,{code:host.code,name:'Dos'})).body;
  await connect(one.token);await connect(two.token);assert.equal((await api('/api/start',host.token,{})).status,200);
  const a=(await api('/api/state',one.token)).body,b=(await api('/api/state',two.token)).body,publicState=(await api('/api/state',host.token)).body;
  assert.equal(a.hand.length,8);assert.equal(b.hand.length,8);assert.equal(new Set([...a.hand,...b.hand].map(card=>card.id)).size,16);
  assert.ok(!Object.hasOwn(publicState,'hand'));assert.ok(publicState.players.every(player=>!Object.hasOwn(player,'hand')&&!Object.hasOwn(player,'token')&&player.cardCount===8));
  assert.equal(publicState.deckRemaining+17,require('../deck').makeDeck().length);
  assert.ok([...a.hand,...b.hand].every(card=>disk.existsSync(path.join(__dirname,'../Resource',card.file))));
  assert.deepEqual((await api('/api/state',one.token)).body.hand,a.hand);
  await api('/api/start',host.token,{});assert.equal((await api('/api/state',one.token)).body.dealId,a.dealId);
  await stop();server=createServer({statePath});base=await launch();
  const resumed=(await api('/api/state',one.token)).body;assert.equal(resumed.phase,'playing');assert.equal(resumed.code,host.code);assert.deepEqual(resumed.hand,a.hand);assert.equal(resumed.dealId,a.dealId);
 }finally{await stop();for(const filename of [statePath,statePath+'.tmp'])if(disk.existsSync(filename))disk.unlinkSync(filename);disk.rmdirSync(folder);}
});

