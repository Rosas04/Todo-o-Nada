const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const os=require('node:os');
const writtenCards=require('./cards');
const {dealRoom,activeColors}=require('./deck');
const disk=require('node:fs');
const game=require('./game');
const avatars=require('./avatars');
const root=__dirname;
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.md':'text/plain; charset=utf-8'};
function createServer({statePath=null,publicUrl=process.env.PUBLIC_URL||process.env.RENDER_EXTERNAL_URL||null,trustProxy=false}={}){
 if(publicUrl){const address=new URL(publicUrl);if(!['https:','http:'].includes(address.protocol)||address.username||address.password)throw Error('PUBLIC_URL debe ser una dirección HTTP o HTTPS.');publicUrl=address.origin;}
 if(statePath){disk.mkdirSync(path.dirname(statePath),{recursive:true});disk.accessSync(path.dirname(statePath),disk.constants.W_OK);}
 let shuttingDown=false;
 const rooms=new Map();
 const reactionTimes=new WeakMap();
 if(statePath&&disk.existsSync(statePath)){
  const saved=JSON.parse(disk.readFileSync(statePath,'utf8'));
  for(const data of saved){delete data.config.initialCards;const players=new Map(data.players.map((p,index)=>[p.id,{...p,avatar:avatars.some(a=>a.file===p.avatar)?p.avatar:avatars[index%avatars.length].file,streams:new Set()}]));const restored={...data,reactions:data.phase==='finished'?[]:data.reactions||[],activeColor:data.activeColor||data.topCard?.color||null,direction:data.direction||1,players,clients:new Set()};if(restored.phase==='playing')game.enforceLimits(restored);rooms.set(data.code,restored);}
 }
 function persist(){
  if(!statePath)return;
  const saved=[...rooms.values()].map(room=>({...room,clients:undefined,players:[...room.players.values()].map(p=>({...p,streams:undefined}))}));
  disk.mkdirSync(path.dirname(statePath),{recursive:true});disk.writeFileSync(statePath+'.tmp',JSON.stringify(saved));disk.renameSync(statePath+'.tmp',statePath);
 }
 function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
 function snapshot(room,identity){return {code:room.code,phase:room.phase,config:{mode:room.config.mode,expectedPlayers:room.config.expectedPlayers},dealId:room.dealId||null,dealtAt:room.dealtAt||null,...(identity.role==='host'?{reactions:room.phase==='finished'?[]:room.reactions||[]}:{}),topCard:room.topCard||null,activeColors:activeColors(room),activeColor:room.activeColor||room.topCard?.color||null,direction:room.direction||1,lastPlay:room.lastPlay||null,diceTask:room.diceTask||null,diceResult:room.diceResult||null,penalty:room.penalty||null,winnerId:room.winnerId||null,deckRemaining:room.deck?.length??null,turnPlayerId:room.turnPlayerId||null,...(identity.role==='player'?{hand:room.players.get(identity.id)?.eliminated?[]:room.players.get(identity.id)?.hand||[],canDraw:game.canDraw(room,identity.id),canPass:game.canPass(room,identity.id),playableCardIds:(room.players.get(identity.id)?.hand||[]).filter(card=>game.canPlay(room,identity.id,card)).map(card=>card.id)}:{}),resolution:room.resolution||null,players:[...room.players.values()].map(p=>({id:p.id,name:p.name,avatar:p.avatar||avatars[0].file,connected:p.streams.size>0,cardCount:p.hand?.length??null,eliminated:Boolean(p.eliminated),eliminationReason:p.eliminationReason||null})),pending:identity.role==='host'||room.pending?.playerId===identity.id?room.pending:null};}
 function broadcast(room){persist();for(const client of room.clients){if(client.res.destroyed||client.res.writableEnded)continue;client.res.write('data: '+JSON.stringify(snapshot(room,client.identity))+'\n\n');}}
 async function body(req){let bytes=0,parts=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>12000)throw Error('Solicitud demasiado grande');parts.push(chunk);}return JSON.parse(Buffer.concat(parts).toString()||'{}');}
 function authenticate(req,url){const token=req.headers.authorization?.replace(/^Bearer /,'')||url.searchParams.get('token');for(const room of rooms.values()){if(token===room.hostToken)return {room,identity:{role:'host'}};for(const player of room.players.values())if(token===player.token)return {room,identity:{role:'player',id:player.id}};}return null;}
 const server=http.createServer(async(req,res)=>{try{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
  const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname);
  if(pathname==='/healthz')return json(res,shuttingDown?503:200,{status:shuttingDown?'stopping':'ok'});
  if(shuttingDown)return json(res,503,{error:'Reconectando con el juego. Intenta de nuevo en unos segundos.'});
  if(pathname.startsWith('/api/')){
   const forwardedProtocol=String(req.headers['x-forwarded-proto']||'').split(',')[0].trim();
   const protocol=req.socket.encrypted?'https':trustProxy&&forwardedProtocol==='https'?'https':'http';
   const requestOrigin=new URL(protocol+'://'+req.headers.host).origin;
   if(req.headers.origin&&req.headers.origin!==requestOrigin&&req.headers.origin!==publicUrl)return json(res,403,{error:'Origen no permitido'});
   if(pathname==='/api/rooms'&&req.method==='POST'){
    const data=await body(req),mode=data.mode||'presencial',expectedPlayers=data.expectedPlayers??2;
    if(!['presencial','virtual'].includes(mode)||!Number.isInteger(expectedPlayers)||expectedPlayers<2||expectedPlayers>100)return json(res,400,{error:'Elige una modalidad y una cantidad de 2 a 100 jugadores.'});
    let code;do{code=crypto.randomBytes(4).toString('hex').slice(0,5).toUpperCase();}while(rooms.has(code));
    const room={code,phase:'lobby',config:{mode,expectedPlayers},hostToken:crypto.randomUUID(),players:new Map(),clients:new Set(),pending:null,lastCompleted:null,created:Date.now()};rooms.set(code,room);persist();
    return json(res,201,{code,token:room.hostToken});
   }
   if(pathname==='/api/join'&&req.method==='POST'){
    const data=await body(req),room=rooms.get(String(data.code||'').toUpperCase()),name=String(data.name||'').trim().slice(0,40);
    if(!room)return json(res,404,{error:'No se encontró la sala. Revisa el código.'});if(!name)return json(res,400,{error:'Escribe tu nombre.'});
    if(data.avatar!==undefined&&!avatars.some(a=>a.file===data.avatar))return json(res,400,{error:'Elige uno de los avatares disponibles.'});
    if(room.phase==='playing')return json(res,409,{error:'La partida ya comenzó. Vuelve desde el dispositivo con el que ingresaste.'});
    if(room.players.size>=room.config.expectedPlayers)return json(res,409,{error:'La sala ya tiene los jugadores configurados.'});
    const player={id:crypto.randomUUID(),token:crypto.randomUUID(),name,avatar:data.avatar||avatars[0].file,streams:new Set()};room.players.set(player.id,player);broadcast(room);
    return json(res,201,{token:player.token,id:player.id,code:room.code,name,avatar:player.avatar});
   }
   const auth=authenticate(req,url);if(!auth)return json(res,401,{error:'Vuelve a conectar con la sala.'});
   const {room,identity}=auth;
   if(pathname==='/api/reaction'&&req.method==='POST'){
    if(identity.role!=='player')return json(res,403,{error:'Las reacciones se envían desde el jugador.'});
    const data=await body(req),allowed=['😂','🔥','😎','💜','👍','😮','👏','🎉'];
    if(!allowed.includes(data.emoji))return json(res,400,{error:'Reacción no válida.'});
    const player=room.players.get(identity.id),now=Date.now();
    if(now-(reactionTimes.get(player)||0)<350)return json(res,429,{error:'Espera un momento antes de enviar otra reacción.'});
    reactionTimes.set(player,now);
    if(room.phase==='finished')return json(res,409,{error:'La sesión ya terminó.'});const reaction={id:crypto.randomUUID(),playerId:player.id,name:player.name,emoji:data.emoji};room.reactions??=[];room.reactions.push(reaction);persist();
    for(const client of room.clients)if(!client.res.destroyed&&!client.res.writableEnded)client.res.write('event: reaction\ndata: '+JSON.stringify(reaction)+'\n\n');
    return json(res,200,{ok:true});
   }
   if(['/api/play','/api/draw','/api/pass','/api/dice','/api/penalty'].includes(pathname)&&req.method==='POST'){
    if(identity.role!=='player')return json(res,403,{error:'Esta acción corresponde al jugador.'});
    const data=await body(req);let result;
    try{
     if(pathname==='/api/play')result=game.playCard(room,identity.id,data.cardId);
     if(pathname==='/api/draw')result=game.drawOne(room,identity.id);if(pathname==='/api/pass')result=game.passTurn(room,identity.id);
     if(pathname==='/api/dice')result=game.rollDice(room,identity.id,data.taskId);
     if(pathname==='/api/penalty')result=game.completeShots(room,identity.id);
    }catch(error){return json(res,409,{error:error.message});}
    broadcast(room);return json(res,200,result||{ok:true});
   }
   if(pathname==='/api/start'&&req.method==='POST'){
    if(identity.role!=='host')return json(res,403,{error:'Solo el árbitro puede iniciar la partida.'});
    if(room.phase==='playing')return json(res,200,{ok:true});
    if([...room.players.values()].filter(player=>player.streams.size>0).length<room.config.expectedPlayers)return json(res,409,{error:'Faltan jugadores por conectarse.'});
    try{dealRoom(room);}catch(error){return json(res,409,{error:error.message});}
    room.phase='playing';broadcast(room);return json(res,200,{ok:true});
   }
   if(pathname==='/api/leave'&&req.method==='POST'){
    if(identity.role!=='player')return json(res,403,{error:'Acción reservada al jugador.'});
    if(room.phase==='playing')return json(res,409,{error:'La partida está en curso. Puedes cerrar la página y volver para reconectarte.'});
    if(room.pending?.playerId===identity.id)return json(res,409,{error:'Completa tu carta antes de salir.'});
    const player=room.players.get(identity.id);room.players.delete(identity.id);if(player)for(const client of player.streams){room.clients.delete(client);client.res.end();}broadcast(room);return json(res,200,{ok:true});
   }
   if(pathname==='/api/state'&&req.method==='GET'){
    const data=snapshot(room,identity);
    if(identity.role==='host'){const port=server.address().port;data.publicUrl=publicUrl;data.joinUrls=Object.values(os.networkInterfaces()).flat().filter(i=>i.family==='IPv4'&&!i.internal).map(i=>'http://'+i.address+':'+port+'/play?room='+room.code);}
    return json(res,200,data);
   }
   if(pathname==='/api/events'&&req.method==='GET'){
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('retry: 1500\n: connected\n\n');
    const client={res,identity};room.clients.add(client);
    const player=room.players.get(identity.id);if(player)player.streams.add(client);
    broadcast(room);const heartbeat=setInterval(()=>res.write(': keepalive\n\n'),20000);heartbeat.unref();
    req.on('close',()=>{clearInterval(heartbeat);room.clients.delete(client);if(player)player.streams.delete(client);broadcast(room);});return;
   }
   if(pathname==='/api/task'&&req.method==='POST'){
    if(identity.role!=='host')return json(res,403,{error:'Solo el árbitro puede asignar la carta.'});
    if(room.phase!=='playing')return json(res,409,{error:'El árbitro todavía no ha iniciado la partida.'});
    const data=await body(req);
    if(room.pending)return json(res,409,{error:'Hay una carta pendiente de confirmación.'});
    const card=writtenCards.find(card=>card.id===data.cardId);
    const text=String(card?.text||data.text||'').trim().slice(0,4000);if(!text)return json(res,400,{error:'La carta necesita texto.'});
    if(data.playerId&&!room.players.get(data.playerId)?.streams.size)return json(res,409,{error:'El jugador no está conectado.'});
    room.pending={id:crypto.randomUUID(),text,cardId:card?.id||null,selection:card?.selection||null,requiresSelection:card?.selection==='player'&&room.config.mode==='virtual',action:card?.action||null,playerId:data.playerId||null,kind:card?.kind||(['question','challenge'].includes(data.kind)?data.kind:'action')};
    broadcast(room);return json(res,201,room.pending);
   }
   if(pathname==='/api/assign'&&req.method==='POST'){
    if(identity.role!=='host')return json(res,403,{error:'Solo el árbitro puede asignar la carta.'});
    const data=await body(req);if(!room.pending||data.taskId!==room.pending.id)return json(res,409,{error:'La carta ya no está pendiente.'});
    if(!room.players.get(data.playerId)?.streams.size)return json(res,409,{error:'El jugador no está conectado.'});
    room.pending.playerId=data.playerId;broadcast(room);return json(res,200,{ok:true});
   }
   if(pathname==='/api/complete'&&req.method==='POST'){
    const data=await body(req);
    if(identity.role!=='player')return json(res,403,{error:'La confirmación corresponde al jugador.'});
    if(room.lastCompleted?.id===data.taskId&&room.lastCompleted.playerId===identity.id)return json(res,200,{ok:true});
    if(!room.pending||data.taskId!==room.pending.id)return json(res,409,{error:'Esta carta ya no está pendiente.'});
    if(room.pending.playerId!==identity.id)return json(res,403,{error:'Esta carta corresponde a otro jugador.'});
    let selected=null;
    if(room.pending.requiresSelection){
     selected=room.players.get(data.selectedPlayerId);
     if(!selected||selected.eliminated||selected.id===identity.id||!selected.streams.size)return json(res,400,{error:'Elige a otro jugador que esté conectado.'});
    }
    room.resolution={id:room.pending.id,actor:room.players.get(identity.id).name,selectedPlayerId:selected?.id||null,selectedName:selected?.name||null,action:room.pending.action};
    room.lastCompleted={id:room.pending.id,playerId:identity.id};game.completeAction(room,selected);broadcast(room);return json(res,200,{ok:true});
   }
   if(pathname==='/api/cancel'&&req.method==='POST'){
    if(identity.role!=='host')return json(res,403,{error:'Solo el árbitro puede cancelar la carta.'});
    const data=await body(req);if(room.pending?.id===data.taskId){room.pending=null;broadcast(room);}return json(res,200,{ok:true});
   }
   return json(res,404,{error:'No encontrado'});
  }
  const file=path.resolve(root,'.'+(pathname==='/play'?'/mobile.html':['/','/host'].includes(pathname)?'/index.html':pathname));
  const relative=path.relative(root,file);
  if(!file.startsWith(root+path.sep)||(!['index.html','avatars.js','app.js','deal-animation.js','cards.js','styles.css','screen.css','mobile-screen.css','mobile.html','mobile.js','mobile.css'].includes(relative)&&file!==path.join(root,'vendor','qrcode.js')&&!file.startsWith(path.join(root,'Resource')+path.sep)&&file!==path.join(root,'Rules','Reglas_Todo_o_Nada.md')&&file!==path.join(root,'Rules','Rules.png')))return json(res,403,{error:'Acceso no permitido'});
  const content=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(content);
 }catch(error){if(!res.headersSent)json(res,error.code==='ENOENT'?404:400,{error:error.code==='ENOENT'?'No encontrado':'Solicitud no válida'});else res.end();}});
 server.on('close',()=>{for(const room of rooms.values()){const clients=[...room.clients];room.clients.clear();for(const client of clients)client.res.end();}});
 server.shutdown=()=>{
  if(shuttingDown)return;shuttingDown=true;persist();
  for(const room of rooms.values())for(const client of [...room.clients])client.res.end();
  server.close();
  const deadline=setTimeout(()=>server.closeAllConnections(),5000);deadline.unref();
  server.once('close',()=>clearTimeout(deadline));
 };
 return server;
}
if(require.main===module){
 const {runtimeConfig}=require('./runtime-config');
 const config=runtimeConfig(),server=createServer(config);
 server.listen(config.port,config.host,()=>console.log('TODO O NADA · '+(config.publicUrl||'http://127.0.0.1:'+server.address().port)+' · móviles en /play'));
 server.on('error',error=>{console.error('No se pudo iniciar el juego: '+error.message);process.exitCode=1;});
 for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>server.shutdown());
}
module.exports={createServer};



