const test=require('node:test'),assert=require('node:assert/strict');
const {createServer}=require('../server');
const qrcode=require('../vendor/qrcode');
test('public invitations share a fixed entry and a room link; QR library is served locally',async()=>{
 const server=createServer({publicUrl:'https://juego.example/'});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const host=await (await fetch(base+'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json();
  const state=await (await fetch(base+'/api/state',{headers:{Authorization:'Bearer '+host.token}})).json();
  assert.equal(state.publicUrl,'https://juego.example');
  const invitation=state.publicUrl+'/play?room='+state.code;
  const qr=qrcode(0,'M');qr.addData(invitation);qr.make();assert.ok(qr.getModuleCount()>0);assert.match(qr.createSvgTag(),/<svg/);
  const entry=await fetch(base+'/play');assert.equal(entry.status,200);assert.match(await entry.text(),/id="joinCode"/);
  assert.equal((await fetch(base+'/play?room='+state.code)).status,200);
  assert.equal((await fetch(base+'/vendor/qrcode.js')).status,200);
  assert.equal((await fetch(base+'/.runtime/rooms.json')).status,403);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
