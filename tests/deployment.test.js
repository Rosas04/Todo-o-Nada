const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {runtimeConfig}=require('../runtime-config'),{createServer}=require('../server');

test('Render runtime uses its port, persistent disk, public address and trusted HTTPS proxy',()=>{
 const config=runtimeConfig({PORT:'10000',DATA_DIR:'/var/data',RENDER:'true',RENDER_EXTERNAL_URL:'https://todo-o-nada.onrender.com'});
 assert.equal(config.port,10000);assert.equal(config.host,'0.0.0.0');assert.equal(config.trustProxy,true);
 assert.equal(config.statePath,path.resolve('/var/data/rooms.json'));assert.equal(config.publicUrl,'https://todo-o-nada.onrender.com');
 assert.equal(runtimeConfig({PUBLIC_URL:'https://custom.example',RENDER_EXTERNAL_URL:'https://render.example'}).publicUrl,'https://custom.example');
 assert.equal(runtimeConfig({}).port,5173);assert.equal(runtimeConfig({}).trustProxy,false);
 assert.throws(()=>runtimeConfig({PORT:'not-a-port'}),/PORT/);
 assert.throws(()=>runtimeConfig({RENDER:'true'}),/STORAGE_MODE/);
 assert.throws(()=>runtimeConfig({PUBLIC_URL:'javascript:bad'}),/PUBLIC_URL/);
});

test('free demo keeps rooms in memory, reconnects before restart and starts fresh after restart',async()=>{
 const config=runtimeConfig({RENDER:'true',STORAGE_MODE:'ephemeral',PORT:'0',RENDER_EXTERNAL_URL:'https://demo.onrender.com'});
 assert.equal(config.statePath,null);assert.equal(config.trustProxy,true);
 assert.equal(runtimeConfig({STORAGE_MODE:'ephemeral',DATA_DIR:'/unused'}).statePath,null);
 assert.throws(()=>runtimeConfig({STORAGE_MODE:'unknown'}),/STORAGE_MODE/);
 let server=createServer(config);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const api=async(route,{token,data}={})=>fetch('http://127.0.0.1:'+server.address().port+route,{method:data===undefined?'GET':'POST',headers:{Origin:config.publicUrl,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});
 try{
  const host=await (await api('/api/rooms',{data:{}})).json();
  const player=await (await api('/api/join',{data:{code:host.code,name:'Demo',avatar:'copa-sinfondo.png'}})).json();
  assert.equal((await api('/api/state',{token:player.token})).status,200);
  const state=await (await api('/api/state',{token:host.token})).json();assert.equal(state.players[0].avatar,'copa-sinfondo.png');assert.equal(state.publicUrl,config.publicUrl);
  await new Promise(resolve=>server.close(resolve));server=createServer(config);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  assert.equal((await api('/api/state',{token:host.token})).status,401);
  assert.equal((await api('/api/join',{data:{code:host.code,name:'Nueva'}})).status,404);
  assert.equal((await api('/api/rooms',{data:{}})).status,201);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('HTTPS deployment supports room creation, private hands, SSE, restart and reconnection',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'todo-deploy-'));
 const statePath=path.join(directory,'persistent','rooms.json'),origin='https://todo-o-nada.onrender.com';
 let server=createServer({statePath,publicUrl:origin,trustProxy:true}),controllers=[];
 const listen=()=>new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));await listen();
 const request=async(route,{token,data,extra={}}={})=>fetch('http://127.0.0.1:'+server.address().port+route,{method:data===undefined?'GET':'POST',headers:{Origin:origin,'X-Forwarded-Proto':'https','Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...extra},...(data===undefined?{}:{body:JSON.stringify(data)})});
 const api=async(route,options)=>{const response=await request(route,options);assert.ok(response.ok,route+' '+response.status);return response.json();};
 const stream=async token=>{const controller=new AbortController();controllers.push(controller);const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/events?token='+token,{headers:{Origin:origin,'X-Forwarded-Proto':'https'},signal:controller.signal});assert.equal(response.status,200);assert.equal(response.headers.get('x-accel-buffering'),'no');await response.body.getReader().read();};
 const close=async()=>{const done=new Promise(resolve=>server.once('close',resolve));server.shutdown();controllers.forEach(c=>c.abort());controllers=[];await done;};
 try{
  assert.deepEqual(await (await request('/healthz')).json(),{status:'ok'});
  assert.equal((await request('/api/rooms',{data:{},extra:{Origin:'https://unrelated.example'}})).status,403);
  // A custom domain's HTTPS origin is recognized through the trusted proxy.
  assert.equal((await request('/api/rooms',{data:{},extra:{Origin:'https://127.0.0.1:'+server.address().port}})).status,201);
  const host=await api('/api/rooms',{data:{expectedPlayers:2,mode:'virtual'}});
  const first=await api('/api/join',{data:{code:host.code,name:'Ana',avatar:'copa-sinfondo.png'}});
  const second=await api('/api/join',{data:{code:host.code,name:'Luis'}});
  await stream(first.token);await stream(second.token);await api('/api/start',{token:host.token,data:{}});
  const before=await api('/api/state',{token:first.token});assert.equal(before.hand.length,8);
  const hostState=await api('/api/state',{token:host.token});assert.equal(hostState.publicUrl,origin);assert.equal(hostState.hand,undefined);
  for(const route of ['/','/play','/play?room='+host.code,'/vendor/qrcode.js','/avatars.js','/Rules/Rules.png'])assert.equal((await request(route)).status,200,route);
  for(const route of ['/.runtime/rooms.json','/render.yaml','/runtime-config.js','/.env.example','/server.js'])assert.equal((await request(route)).status,403,route);
  await close();
  server=createServer({statePath,publicUrl:origin,trustProxy:true});await listen();
  const after=await api('/api/state',{token:first.token});assert.deepEqual(after.hand,before.hand);assert.equal(after.phase,'playing');assert.equal(after.players.find(p=>p.id===first.id).avatar,'copa-sinfondo.png');
  await stream(first.token);assert.equal((await api('/api/state',{token:host.token})).players.find(p=>p.id===first.id).connected,true);
 }finally{await close();await fs.rm(directory,{recursive:true,force:true});}
});

test('untrusted proxy headers cannot bypass the origin check',async()=>{
 const server=createServer({publicUrl:null,trustProxy:false});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{assert.equal((await fetch('http://127.0.0.1:'+server.address().port+'/api/rooms',{method:'POST',headers:{Host:'juego.example',Origin:'https://juego.example','X-Forwarded-Proto':'https','Content-Type':'application/json'},body:'{}'})).status,403);}
 finally{await new Promise(resolve=>server.close(resolve));}
});
