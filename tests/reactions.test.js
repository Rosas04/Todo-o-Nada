const test=require('node:test'),assert=require('node:assert/strict');
const {createServer}=require('../server');
test('reactions reach only their room, use the authenticated name and do not change the turn',async()=>{
 const disk=require('node:fs'),path=require('node:path'),os=require('node:os');const folder=disk.mkdtempSync(path.join(os.tmpdir(),'ton-reactions-')),statePath=path.join(folder,'rooms.json');
 const server=createServer({statePath});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port,controllers=[];
 const request=async(route,token,data)=>{const response=await fetch(base+route,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});return {status:response.status,body:await response.json()};};
 async function watch(token){
  const controller=new AbortController();controllers.push(controller);const response=await fetch(base+'/api/events?token='+token,{signal:controller.signal}),reader=response.body.getReader(),events=[];
  const decoder=new TextDecoder();let buffer='';
  (async()=>{try{while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let separator;while((separator=buffer.indexOf('\n\n'))>=0){const frame=buffer.slice(0,separator);buffer=buffer.slice(separator+2);if(frame.startsWith('event: reaction\n'))events.push(JSON.parse(frame.split('data: ')[1]));}}}catch(error){if(error.name!=='AbortError')throw error;}})();
  return events;
 }
 try{
  const room=(await request('/api/rooms',null,{})).body,other=(await request('/api/rooms',null,{})).body;
  const player=(await request('/api/join',null,{code:room.code,name:'Ana'})).body;
  const own=await watch(room.token),outside=await watch(other.token);
  const before=(await request('/api/state',room.token)).body;
  assert.equal((await request('/api/reaction',room.token,{emoji:'😂'})).status,403);
  assert.equal((await request('/api/reaction',player.token,{emoji:'<script>'})).status,400);
  assert.equal((await request('/api/reaction',player.token,{emoji:'😂',name:'Nombre falso'})).status,200);
  const deadline=Date.now()+2000;while(!own.length&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(own.length,1);assert.equal(own[0].emoji,'😂');assert.equal(own[0].name,'Ana');assert.equal(own[0].playerId,player.id);
  assert.equal(outside.length,0);
  assert.equal((await request('/api/reaction',player.token,{emoji:'💜'})).status,429);
  await new Promise(resolve=>setTimeout(resolve,360));
  assert.equal((await request('/api/reaction',player.token,{emoji:'💜'})).status,200);
  const history=(await request('/api/state',room.token)).body.reactions;
  assert.equal(history.length,2);assert.equal(history[0].playerId,history[1].playerId);assert.notEqual(history[0].id,history[1].id);
  assert.deepEqual(history.map(item=>item.emoji),['😂','💜']);
  assert.deepEqual(JSON.parse(disk.readFileSync(statePath,'utf8')).find(saved=>saved.code===room.code).reactions,history);
  const after=(await request('/api/state',room.token)).body;assert.equal(after.turnPlayerId,before.turnPlayerId);assert.equal(after.phase,before.phase);assert.equal(after.lastPlay,before.lastPlay);
  await watch(player.token);const second=(await request('/api/join',null,{code:room.code,name:'Luis'})).body;await watch(second.token);
  assert.equal((await request('/api/start',room.token,{})).status,200);
  assert.deepEqual((await request('/api/state',room.token)).body.reactions,[]);
 }finally{controllers.forEach(controller=>controller.abort());server.closeAllConnections();await new Promise(resolve=>server.close(resolve));for(const file of [statePath,statePath+'.tmp'])if(disk.existsSync(file))disk.unlinkSync(file);disk.rmdirSync(folder);}
});
