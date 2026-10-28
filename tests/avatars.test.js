const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createServer}=require('../server'),avatars=require('../avatars');
test('chosen avatars are validated, shared with all screens and persist across restart',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'todo-avatars-')),statePath=path.join(dir,'rooms.json');
 let server=createServer({statePath});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const api=async(route,token,data)=>{const response=await fetch('http://127.0.0.1:'+server.address().port+route,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});return {status:response.status,body:await response.json()};};
 try{
  const host=(await api('/api/rooms',null,{expectedPlayers:2})).body;
  assert.equal((await api('/api/join',null,{code:host.code,name:'Incorrecto',avatar:'../../private.png'})).status,400);
  const avatar=avatars.find(a=>a.name==='Copa').file;
  const player=(await api('/api/join',null,{code:host.code,name:'Ana',avatar})).body;
  assert.equal(player.avatar,avatar);
  const other=(await api('/api/join',null,{code:host.code,name:'Luis'})).body;
  assert.equal(other.avatar,avatars[0].file);
  for(const token of [host.token,player.token,other.token])assert.equal((await api('/api/state',token)).body.players.find(p=>p.id===player.id).avatar,avatar);
  for(const option of avatars)await fs.access(path.join(__dirname,'../Resource/Users/Sin Fondo',option.file));
  await new Promise(resolve=>server.close(resolve));server=createServer({statePath});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  assert.equal((await api('/api/state',host.token)).body.players.find(p=>p.id===player.id).avatar,avatar);
 }finally{await new Promise(resolve=>server.close(resolve));await fs.rm(dir,{recursive:true,force:true});}
});
