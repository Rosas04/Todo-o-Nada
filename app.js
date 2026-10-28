const escapeHTML=value=>String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const asset=file=>'/Resource/'+file.split('/').map(encodeURIComponent).join('/');
const players=[{name:'Dani',avatar:'pato-sinfondo.png',cards:5},{name:'Vale',avatar:'fantasmacute-sinfondo.png',cards:3},{name:'Nico',avatar:'calavera-sinfondo.png',cards:6},{name:'Majo',avatar:'caraderretida-sinfondo.png',cards:1}];
let active=0,sound=false,roomState=null;
const $=id=>document.getElementById(id);
function render(){
 $('players').innerHTML=players.map((p,i)=>`<div class="player ${i===active&&!p.eliminated&&roomState?.phase!=='finished'?'active':''}" ${i===active&&!p.eliminated&&roomState?.phase!=='finished'?'aria-current="true"':''}>${i===active&&!p.eliminated&&roomState?.phase!=='finished'?'<span class="active-label">SU TURNO</span>':''}<div class="avatar"><img src="${asset('Users/Sin Fondo/'+p.avatar)}" alt=""></div><div><strong>${escapeHTML(p.name)}</strong><p class="${p.cards===1?'one-card':''}">${p.eliminated?'Eliminado · '+p.cards+' cartas':p.cards===null?(p.connected?'Conectado':'Sin conexión'):`<b>${p.cards}</b> ${p.cards===1?'carta · ¡Última!':'cartas'}`}</p></div></div>`).join('');
 document.querySelector('.players-heading h2 span').textContent=players.length+' jugadores';
 if(!players.length){$('turnName').textContent='Esperando jugadores';$('nextPlayer').textContent='';return;}
 $('turnName').textContent=players[active].name;$('turnAvatar').src=asset('Users/Sin Fondo/'+players[active].avatar);
 const alive=players.filter(player=>!player.eliminated),position=alive.findIndex(player=>player.id===players[active].id);
 $('nextPlayer').textContent=alive.length>1&&roomState?.phase!=='finished'?'Sigue: '+alive[(position+(roomState?.direction||1)+alive.length)%alive.length].name+' →':'';
}
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('visible'),3000);}
function tone(){if(!sound)return;const ctx=new AudioContext(),o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);g.gain.setValueAtTime(.035,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.18);o.frequency.value=520;o.start();o.stop(ctx.currentTime+.18);o.onended=()=>ctx.close();}
const rulesSections=[
 ['El juego, el objetivo y los jugadores',[14,183,998,225]],
 ['Cómo jugar: pantallas, turnos y retos',[14,409,998,304]],
 ['Cartas especiales',[14,717,998,358]],
 ['Acumulaciones, penalizaciones y final',[14,1078,998,448]]
];
let rulesStep=0,rulesOverview=false;
function renderRulesTutorial(){
 const [title,area]=rulesSections[rulesStep];
 const bounds=rulesOverview?[0,0,1024,1536]:area;
 $('rulesArtwork').setAttribute('viewBox',bounds.join(' '));
 ['x','y','width','height'].forEach((attribute,index)=>$('rulesCropArea').setAttribute(attribute,bounds[index]));
 $('rulesArtworkTitle').textContent=rulesOverview?'Reglas completas de Todo o Nada':title;
 $('rulesStage').classList.toggle('overview',rulesOverview);$('rulesStage').scrollTop=0;
 $('rulesTitle').textContent=rulesOverview?'Reglas del juego':title;
 $('rulesProgress').textContent=rulesOverview?'La guía completa':`${rulesStep+1} / ${rulesSections.length}`;
 $('rulesOverview').textContent=rulesOverview?'Volver al tutorial →':'Ver imagen completa ↗';
 $('rulesPrevious').disabled=rulesOverview||rulesStep===0;$('rulesNext').disabled=rulesOverview||rulesStep===rulesSections.length-1;
 $('rulesSteps').querySelectorAll('button').forEach((button,index)=>button.setAttribute('aria-current',String(!rulesOverview&&index===rulesStep)));
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches)$('rulesArtwork').animate([{opacity:0,transform:'translateY(12px) scale(.98)'},{opacity:1,transform:'none'}],{duration:300,easing:'ease-out'});
}
rulesSections.forEach(([title],index)=>{const button=document.createElement('button');button.type='button';button.textContent=index+1;button.setAttribute('aria-label',`${index+1}. ${title}`);button.addEventListener('click',()=>{rulesStep=index;rulesOverview=false;renderRulesTutorial();});$('rulesSteps').append(button);});
$('rulesPrevious').addEventListener('click',()=>{if(rulesStep>0){rulesStep--;renderRulesTutorial();}});
$('rulesNext').addEventListener('click',()=>{if(rulesStep<rulesSections.length-1){rulesStep++;renderRulesTutorial();}});
$('rulesOverview').addEventListener('click',()=>{rulesOverview=!rulesOverview;renderRulesTutorial();});
$('rulesButton').addEventListener('click',()=>{rulesStep=0;rulesOverview=false;renderRulesTutorial();$('rulesDialog').showModal();});
$('rulesDialog').querySelector('.dialog-close').addEventListener('click',()=>$('rulesDialog').close());
$('rulesDialog').addEventListener('keydown',event=>{if(event.key==='ArrowRight'&&!$('rulesNext').disabled){event.preventDefault();$('rulesNext').click();}if(event.key==='ArrowLeft'&&!$('rulesPrevious').disabled){event.preventDefault();$('rulesPrevious').click();}});
$('rulesDialog').addEventListener('click',e=>{if(e.target===$('rulesDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('copyRoom').addEventListener('click',async()=>{try{await ensurePhoneRoom();await navigator.clipboard.writeText(currentRoomCode());toast('Código de sala copiado.');}catch{toast('Consulta la conexión en la sala de espera.');}});
$('sound').addEventListener('click',()=>{sound=!sound;$('sound').setAttribute('aria-pressed',String(sound));$('sound').setAttribute('aria-label',sound?'Desactivar sonido':'Activar sonido');$('sound').textContent=sound?'♫':'♪';tone();toast(sound?'Sonido activado':'Sonido desactivado');});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('La pantalla completa no está disponible en esta ventana.');}});
render();

/* Entry and waiting-room screens share the original lavender relief style. */
const shell=document.createElement('div');
shell.id='welcome';
shell.innerHTML=`<div class="welcome-frame"><div class="welcome-top"><a href="#home" class="welcome-title" aria-label="Todo o Nada, inicio"><img src="${asset('Logo/logo-vertical.png')}" alt="Todo o Nada"></a><button class="host-profile" data-account aria-label="Editar perfil del árbitro"><div><small>ÁRBITRO</small><b data-profile-name>Tu nombre</b></div><img src="${asset('Users/Sin Fondo/fantasma-sinfondo.png')}" alt=""></button></div>
<section id="homeScreen" class="welcome-content"><h1>El juego de decisiones extremas</h1><div class="entry-panels">
<section class="entry-panel create-panel"><h2>CREAR SALA</h2><p>Crea tu propia sala y juega<br>con tus amigos</p><button class="relief-button" id="createRoom">CREAR SALA <span>＋</span></button></section></div>
<div class="welcome-features"><div><span>♧</span><p>Desde 2 jugadores<small>La diversión se comparte</small></p></div><div><span>▱</span><p>Cartas extremas<small>Ríe, decide y arriesga</small></p></div><div><span>ϟ</span><p>Una sola mesa<small>Cada mano en su celular</small></p></div></div></section>
<section id="lobbyScreen" class="lobby-content" hidden><div class="lobby-intro"><span class="eyebrow">QUE SE REÚNA LA MESA</span><h1>Sala de espera</h1><p>Este es el lugar de espera antes de repartir las cartas.</p></div><div class="lobby-grid"><section class="invite-panel"><small>CÓDIGO DE SALA</small><button id="lobbyCopy" aria-label="Copiar código de sala HT5KL">HT5KL <span>▣</span></button><p>Juega en persona o a distancia.<br>Tu mano está en tu celular.</p></section><section class="waiting-panel"><div class="waiting-heading"><h2>En la sala</h2><span id="lobbyCount" role="status">0 jugadores</span></div><div id="waitingPlayers" class="waiting-players" aria-live="polite"></div><div class="waiting-status"><i></i><span id="waitingStatus">Esperando a los jugadores…</span></div><button id="startDemo" class="relief-button" disabled>INICIAR PARTIDA <span>→</span></button><p class="start-note">Todos los jugadores deben estar conectados.</p></section></div><a class="back-home" href="#home">← Volver al inicio</a></section></div>`;
document.body.prepend(shell);
function renderLobby(){
 const roster=roomState?.players||[],online=roster.filter(p=>p.connected),expected=roomState?.config?.expectedPlayers||0;
 $('lobbyCount').textContent=online.length+' / '+(expected||'—')+' jugadores';
 $('waitingPlayers').replaceChildren();
 if(!roster.length)$('waitingPlayers').innerHTML='<div class="waiting-empty"><span>♧</span><h3>Aquí comienza el grupo</h3><p>Esperando a que los jugadores se unan.</p></div>';
 roster.forEach((p,i)=>{const item=document.createElement('div');item.className='waiting-player';const image=document.createElement('img');image.src=asset('Users/Sin Fondo/'+(p.avatar||PLAYER_AVATARS[i%PLAYER_AVATARS.length].file));image.alt='';const name=document.createElement('strong');name.textContent=p.name;const status=document.createElement('span');status.textContent=p.connected?'Conectado':'Sin conexión';item.append(image,name,status);$('waitingPlayers').append(item);});
 $('startDemo').disabled=!expected||online.length<expected;
 $('waitingStatus').textContent=expected&&online.length>=expected?'La sala está lista.':'Esperando a los jugadores…';
}
function route(){
 const view=location.hash==='#table'?'table':location.hash==='#lobby'?'lobby':'home';
 shell.hidden=view==='table';document.querySelector('.app').hidden=view!=='table';
 $('homeScreen').hidden=view!=='home';$('lobbyScreen').hidden=view!=='lobby';
 document.body.classList.toggle('welcome-mode',view!=='table');
 document.title='TODO O NADA · '+({home:'Inicio',lobby:'Sala de espera',table:'La mesa'}[view]);
 if(view==='lobby')renderLobby();
 window.scrollTo(0,0);
}
$('createRoom').addEventListener('click',()=>configDialog.showModal());
$('startDemo').addEventListener('click',async()=>{if($('startDemo').disabled)return;$('startDemo').disabled=true;try{await roomRequest('/api/start',{});location.hash='table';}catch(error){toast(error.message);renderLobby();}});
$('lobbyCopy').addEventListener('click',async()=>{try{await ensurePhoneRoom();await navigator.clipboard.writeText(currentRoomCode());toast('Código de sala copiado.');}catch{toast('No se pudo copiar el código.');}});
window.addEventListener('hashchange',route);route();


const renderedReactionIds=new Set(),reactionSides=new Map();let reactionSessionKey=null;
function showPlayerReaction(name,emoji,id=null,playSound=true,playerId=null){
 const allowed=['😂','🔥','😎','💜','👍','😮','👏','🎉'];
 if(!allowed.includes(emoji))return;
 if(id&&renderedReactionIds.has(id))return;
 if(id)renderedReactionIds.add(id);
 const feed=$('reactionFeed');$('reactionsEmpty').hidden=true;
 const atBottom=feed.scrollHeight-feed.scrollTop-feed.clientHeight<70;
 const key=playerId||String(name||'Jugador');
 if(!reactionSides.has(key))reactionSides.set(key,reactionSides.size%2===0?'right':'left');
 const item=document.createElement('div');item.className='public-reaction reaction-'+reactionSides.get(key);
 const face=document.createElement('span');face.textContent=emoji;
 const sender=document.createElement('small');sender.textContent=String(name||'Jugador').slice(0,40);
 item.append(face,sender);feed.append(item);
 if(atBottom)feed.scrollTop=feed.scrollHeight;
 if(playSound)tone();
}
function syncReactionHistory(state){
 const key=state.code+':'+(state.dealId||'lobby');
 if(reactionSessionKey!==key||state.phase==='finished'){
  reactionSessionKey=key;renderedReactionIds.clear();reactionSides.clear();document.querySelectorAll('#reactionFeed .public-reaction').forEach(item=>item.remove());$('reactionsEmpty').hidden=false;
 }
 for(const reaction of state.reactions||[])showPlayerReaction(reaction.name,reaction.emoji,reaction.id,false,reaction.playerId);
}
window.addEventListener('player-reaction',e=>{if(e.detail)showPlayerReaction(e.detail.name,e.detail.emoji);});
const profileDialog=document.createElement('dialog');profileDialog.id='profileDialog';
profileDialog.innerHTML='<form class="profile-form"><span class="eyebrow">CUENTA</span><h2>Perfil del árbitro</h2><label for="refereeName">Nombre o correo que se mostrará</label><input id="refereeName" maxlength="60" placeholder="Tu nombre o correo" required autocomplete="nickname"><p class="profile-hint">Se guarda en este navegador.</p><button class="relief-button" type="submit">GUARDAR</button><button class="profile-cancel" type="button">Cancelar</button></form>';
document.body.append(profileDialog);
let refereeName='Tu nombre';try{refereeName=localStorage.getItem('todo-nada-referee')||refereeName;}catch{}
function updateReferee(){document.querySelectorAll('[data-profile-name]').forEach(el=>el.textContent=refereeName);}
updateReferee();
document.querySelectorAll('[data-account]').forEach(button=>button.addEventListener('click',()=>{$('refereeName').value=refereeName==='Tu nombre'?'':refereeName;profileDialog.showModal();}));
profileDialog.querySelector('.profile-cancel').addEventListener('click',()=>profileDialog.close());
profileDialog.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const value=$('refereeName').value.trim();if(!value){$('refereeName').setCustomValidity('Escribe un nombre o correo.');$('refereeName').reportValidity();return;}refereeName=value;try{localStorage.setItem('todo-nada-referee',value);}catch{}updateReferee();profileDialog.close();});
$('refereeName').addEventListener('input',()=>$('refereeName').setCustomValidity(''));



// Presentation layer only: the future game server supplies card IDs and public text.
const cardCatalog={
 reverse:{title:'Reversa',file:'Cartas normales/Lila/Reversa-lila.png',kind:'reverse',symbol:'↻',caption:'Cambia la dirección del juego.',color:'Lila'},
 block:{title:'Bloqueo',file:'Cartas normales/Turqueza/Bloqueo_13.png',kind:'block',symbol:'⊘',caption:'El siguiente jugador pierde su turno.',color:'Turquesa'},
 draw2:{title:'+2 cartas',file:'Cartas normales/Turqueza/+2 cartas.png',kind:'draw',symbol:'+2',caption:'Penalización de cartas.',color:'Turquesa'},
 draw4:{title:'+4 cartas',file:'Cartas normales/Coral/+4 carta_5.png',kind:'draw',symbol:'+4',caption:'Penalización de cartas.',color:'Coral'},
 shots2:{title:'+2 shots',file:'Cartas normales/Lila/+2 shots_4.png',kind:'shots',symbol:'+2',caption:'Penalización de shots.',color:'Lila'},
 shots4:{title:'+4 shots',file:'Cartas normales/Amarillo/+4 shots_10.png',kind:'shots',symbol:'+4',caption:'Penalización de shots.',color:'Amarillo'},
 dice:{title:'Lanza el dado',file:'Cartas normales/Lila/Lanza el dado_3.png',kind:'dice',symbol:'⚄',caption:'El jugador afectado lanza el dado.',color:'Lila'},
 choice:{title:'Verdad o reto',file:'Cartas especiales/T).png',kind:'choice',symbol:'?',caption:''},
 text:{title:'Elige al siguiente',file:'Cartas normales/Lila/Lila-5.png',kind:'text',symbol:'✦',caption:'Una decisión para la mesa.',color:'Lila',category:'CARTA CON TEXTO',text:'Elige quién será el siguiente en lanzar el dado.'},
 truth:{title:'Verdad',file:'Cartas especiales/T).png',kind:'choice',symbol:'?',caption:''},
 challenge:{title:'Reto',file:'Cartas especiales/T).png',kind:'choice',symbol:'?',caption:''}
};
for(const card of window.WRITTEN_CARDS||[])cardCatalog[card.id]={...card,kind:'text',caption:'',completionType:card.kind};
let effectQueue=[],effectBusy=false,effectTimer,lastPublicCard={id:'reverse',player:'Majo'},restoreCardFocus=null;
function openPublicCard(card,event){
 if(card.kind==='choice')return;
 restoreCardFocus=document.activeElement;
 $('cardModalImage').src=asset(card.file);$('cardModalImage').alt=card.title;
 $('cardModalCategory').textContent=card.category||'CARTA JUGADA';
 $('cardModalTitle').textContent=card.title;
 $('cardModalPlayer').textContent=event.player?String(event.player).slice(0,60)+' ha jugado esta carta.':'';
 const text=typeof event.text==='string'?event.text:card.text;
 const textOnly=Boolean(text);
 $('cardDialog').classList.toggle('text-only',textOnly);
 $('cardDialog').setAttribute('aria-labelledby',textOnly?'cardModalText':'cardModalTitle');
 $('cardModalText').textContent=text||card.caption;
 $('cardModalHint').textContent='La lectura permanece abierta hasta que el árbitro la cierre.';
 $('cardDialog').showModal();
 if(textOnly)beginMobileConfirmation(text,event);
}
function finishCardPresentation(){
 if($('cardDialog').open)return;
 effectBusy=false;
 if(restoreCardFocus?.isConnected)restoreCardFocus.focus({preventScroll:true});
 restoreCardFocus=null;
 presentNextCard();
}
function presentNextCard(){
 if(effectBusy||!effectQueue.length||location.hash!=='#table')return;
 if(document.querySelector('dialog[open]'))return;
 effectBusy=true;
 const event=effectQueue.shift(),card={...cardCatalog[event.id],...(event.card?{file:event.card.file,title:event.card.title,color:event.card.color,text:event.card.text||cardCatalog[event.id].text}:{})};lastPublicCard=event;
 const previous=document.querySelector('.previous-card');previous.src=$('playedCard').src;previous.alt=$('playedCard').alt;
 $('playedCard').src=asset(card.file);$('playedCard').alt='Última carta: '+card.title;
 $('playedCard').classList.remove('card-enter');void $('playedCard').offsetWidth;$('playedCard').classList.add('card-enter');
 $('cardTitle').textContent=card.title;$('cardDescription').textContent=card.caption;
 if(card.color){$('currentColor').textContent=card.color;document.querySelector('.color-dot').style.background={Lila:'#ab86d3',Turquesa:'#65beba',Coral:'#ee948d',Amarillo:'#edc34c'}[card.color];}
 if(card.kind!=='choice'&&(card.text||event.text)){
  openPublicCard(card,event);
  return;
 }
 const overlay=$('cardEffect');overlay.dataset.kind=card.kind;
 $('effectSymbol').textContent=card.symbol;$('effectName').textContent=card.title;$('effectCaption').textContent='';
 if(card.kind==='dice'&&roomState?.config.mode==='presencial'){overlay.dataset.kind='physical';$('effectSymbol').textContent='✦';$('effectName').textContent='Lanza el dado físico';}
 overlay.hidden=false;tone();
 const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?350:1700;
 effectTimer=setTimeout(()=>{overlay.hidden=true;if(card.kind!=='choice'&&(card.text||event.text)){openPublicCard(card,event);}else finishCardPresentation();},duration);
}
function enqueuePublicCard(event){
 if(location.hash!=='#table'||!event||!Object.hasOwn(cardCatalog,event.id))return;
 // Never interpret public card content as HTML or accept arbitrary image URLs.
 const clean={id:event.id,player:typeof event.player==='string'?event.player.slice(0,60):''};
 if(event.card&&typeof event.card.file==='string')clean.card=event.card;
 if(typeof event.responderId==='string')clean.responderId=event.responderId;
 if(['question','challenge','action'].includes(event.completionType))clean.completionType=event.completionType;
 if(cardCatalog[event.id].kind!=='choice'&&typeof event.text==='string'&&event.text.trim())clean.text=event.text.slice(0,4000);
 if(effectQueue.length<20)effectQueue.push(clean);
 presentNextCard();
}
window.addEventListener('card-played',e=>enqueuePublicCard(e.detail));
$('closeCardDialog').addEventListener('click',()=>$('cardDialog').close());
$('cardModalDone').addEventListener('click',()=>$('cardDialog').close());
$('cardDialog').addEventListener('close',finishCardPresentation);
$('rulesDialog').addEventListener('close',presentNextCard);
profileDialog.addEventListener('close',presentNextCard);
window.addEventListener('hashchange',()=>{if(location.hash!=='#table'){clearTimeout(effectTimer);effectQueue=[];$('cardEffect').hidden=true;if($('cardDialog').open)$('cardDialog').close();effectBusy=false;restoreCardFocus=null;}});




// Basic phone-to-table confirmation; gameplay and private hands remain separate.
let roomConnection=null,roomStream=null,bridgePromise=null,remoteTaskId=null,assigning=false,creatingTask=false,lastResolutionId=null,lastSeenPlayId=null,lastSeenDiceId=null;
const phonePanel=document.createElement('div');phonePanel.className='lobby-phone-link';
phonePanel.innerHTML='<div class="join-method"><span class="join-method-label">ESCANEA Y ENTRA A ESTA SALA</span><a id="phoneQrLink" class="room-qr" target="_blank" rel="noopener" aria-label="Abrir la sala en el celular"></a><small>Solo escribe tu nombre para entrar.</small></div><div class="join-method manual-join"><span class="join-method-label">O ABRE EL ENLACE E INGRESA EL CÓDIGO</span><a id="phoneJoinLink" target="_blank" rel="noopener"></a></div><button id="copyInvitation" type="button" class="copy-invitation">Copiar invitación ↗</button><p id="phoneStatus" role="status">Conectando con la sala…</p>';
document.querySelector('.invite-panel').append(phonePanel);
let invitationUrl=null,invitationQrUrl=null;
function renderRoomInvitation(state){
 const loopback=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
 const base=state.publicUrl||(!loopback?location.origin:state.joinUrls?.[0]?new URL(state.joinUrls[0]).origin:location.origin);
 const entry=new URL('/play',base),direct=new URL(entry);direct.searchParams.set('room',state.code);
 invitationUrl=direct.href;$('phoneJoinLink').href=entry.href;$('phoneJoinLink').textContent=entry.host+entry.pathname;
 $('phoneQrLink').href=direct.href;
 if(invitationQrUrl!==direct.href){
  const qr=qrcode(0,'M');qr.addData(direct.href);qr.make();
  $('phoneQrLink').innerHTML=qr.createSvgTag({cellSize:4,margin:16,scalable:true,alt:'QR para entrar a la sala '+state.code});
  invitationQrUrl=direct.href;
 }
}
$('copyInvitation').addEventListener('click',async()=>{
 try{if(!invitationUrl)await ensurePhoneRoom();await navigator.clipboard.writeText('¡Juguemos TODO O NADA!\nSala: '+currentRoomCode()+'\n'+invitationUrl);toast('Invitación copiada.');}
 catch{toast('No se pudo copiar. Abre el QR para copiar el enlace de la sala.');}
});
const mobileStatus=document.createElement('p');mobileStatus.id='mobileConfirmationStatus';mobileStatus.className='mobile-confirmation-status';mobileStatus.setAttribute('role','status');$('cardDialog').append(mobileStatus);
function currentRoomCode(){return roomConnection?.code||'Sin sala';}
async function roomRequest(endpoint,data){
 const response=await fetch(endpoint,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(roomConnection?{Authorization:'Bearer '+roomConnection.token}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});
 const result=await response.json();if(!response.ok)throw Error(result.error||'No se pudo conectar.');return result;
}
function applyRoomState(state){
 roomState=state;
 syncReactionHistory(state);
 window.playDealAnimation?.(state);
 const avatarNames=['pato-sinfondo.png','fantasmacute-sinfondo.png','calavera-sinfondo.png','caraderretida-sinfondo.png'];
 players.splice(0,players.length,...state.players.map((p,i)=>({...p,avatar:p.avatar||avatarNames[i%avatarNames.length],cards:p.cardCount??null})));
 const turnIndex=players.findIndex(player=>player.id===state.turnPlayerId);
 active=turnIndex>=0?turnIndex:players.length?active%players.length:0;render();
 const online=state.players.filter(p=>p.connected);
 if(state.topCard){
  $('playedCard').src=asset(state.topCard.file);$('playedCard').alt='Última carta: '+state.topCard.title;
  $('cardTitle').textContent=state.topCard.title;$('cardDescription').textContent='';document.querySelector('.previous-card').hidden=true;
  if(state.topCard.color){$('currentColor').textContent=state.topCard.color;document.querySelector('.color-dot').style.background={Lila:'#ab86d3',Turquesa:'#65beba',Coral:'#ee948d',Amarillo:'#edc34c'}[state.topCard.color];}
 }
 if(state.deckRemaining!==null)document.querySelector('.deck').parentElement.querySelector('p').textContent=state.deckRemaining+' cartas por robar';
 if(state.activeColor)$('currentColor').textContent=state.activeColors?.join(' / ')||state.activeColor;
 $('penaltyStatus').hidden=!state.penalty;
 $('penaltyStatus').textContent=state.penalty?'Acumuladas: '+state.penalty.amount+' '+(state.penalty.type==='cards'?'cartas':'shots'):'';
 document.querySelector('.table-top>span:last-child').textContent=state.direction===-1?'↺ Sentido antihorario':'↻ Sentido horario';
 if(state.lastPlay?.id!==lastSeenPlayId){
  const initialized=lastSeenPlayId!==null;lastSeenPlayId=state.lastPlay?.id||'none';
  if(initialized&&state.lastPlay){
   const play=state.lastPlay;
   if(play.card.effectId)enqueuePublicCard({id:play.card.effectId,card:play.card,player:play.playerName,text:play.card.text||undefined,responderId:state.pending?.playerId});
   else{$('playedCard').classList.remove('card-enter');void $('playedCard').offsetWidth;$('playedCard').classList.add('card-enter');}
  }
 }
 if(state.diceResult?.id!==lastSeenDiceId){
  const initialized=lastSeenDiceId!==null;lastSeenDiceId=state.diceResult?.id||'none';
  if(initialized&&state.diceResult)showMainDiceResult(state.diceResult);
 }
 if(state.diceTask){const roller=state.players.find(p=>p.id===state.diceTask.playerId)?.name||'Jugador';$('turnName').textContent=roller+(state.config.mode==='presencial'?' · Dado físico':' · Lanza el dado');}
 if(state.winnerId)$('turnName').textContent='¡Ganó '+(state.players.find(p=>p.id===state.winnerId)?.name||'el jugador')+'!';
 else if(state.phase==='finished')$('turnName').textContent='Partida terminada';
 $('phoneStatus').textContent=online.length+' jugador'+(online.length===1?'':'es')+' conectado'+(online.length===1?'':'s');
 const code=state.code;
 $('copyRoom').replaceChildren(document.createTextNode(code+' ▣'));
 $('lobbyCopy').replaceChildren(document.createTextNode(code+' ▣'));$('lobbyCopy').setAttribute('aria-label','Copiar código de sala '+code);
 renderLobby();
 if(state.config)$('phoneStatus').textContent+=(state.config.mode==='virtual'?' · Virtual':' · Presencial');
 if(state.resolution?.id!==lastResolutionId){
  const previous=lastResolutionId;lastResolutionId=state.resolution?.id||null;
  if(state.resolution?.selectedName&&(previous||remoteTaskId))toast(state.resolution.actor+' eligió a '+state.resolution.selectedName);
 }
 const target=state.players.find(p=>p.id===state.pending?.playerId);
 if(state.pending){
  if(!remoteTaskId&&$('cardDialog').open&&$('cardDialog').classList.contains('text-only'))remoteTaskId=state.pending.id;
  mobileStatus.textContent=target?(target.connected?'Esperando confirmación de '+target.name:'Esperando a que '+target.name+' vuelva a conectarse'):'Esperando al jugador que responderá';
  maybeAssignPlayer();
 }else if(remoteTaskId){
  remoteTaskId=null;
  if($('cardDialog').open)$('cardDialog').close();
 }
}
function ensurePhoneRoom(){
 if(bridgePromise)return bridgePromise;
 bridgePromise=(async()=>{
  try{const saved=localStorage.getItem('todo-nada-host-room');if(saved)roomConnection=JSON.parse(saved);}catch{}
  let state;
  if(roomConnection){try{state=await roomRequest('/api/state');}catch{roomConnection=null;}}
  if(!roomConnection){location.hash='home';throw Error('Configura la sala antes de crearla.');}
  renderRoomInvitation(state);
  applyRoomState(state);
  if(state.pending&&state.pending.publicModal!==false&&location.hash==='#table'&&!$('cardDialog').open){
   effectBusy=true;lastPublicCard={id:'text'};$('cardDialog').classList.add('text-only');$('cardDialog').setAttribute('aria-labelledby','cardModalText');$('cardModalText').textContent=state.pending.text;remoteTaskId=state.pending.id;$('cardDialog').showModal();applyRoomState(state);
  }
  roomStream?.close();roomStream=new EventSource('/api/events?token='+encodeURIComponent(roomConnection.token));
  roomStream.onmessage=e=>applyRoomState(JSON.parse(e.data));
  roomStream.addEventListener('reaction',event=>{const reaction=JSON.parse(event.data);showPlayerReaction(reaction.name,reaction.emoji,reaction.id,true,reaction.playerId);});
  roomStream.onerror=()=>{$('phoneStatus').textContent='Reconectando con la sala…';if(remoteTaskId)mobileStatus.textContent='Reconectando. La carta sigue pendiente.';};
  return roomConnection;
 })().catch(error=>{bridgePromise=null;$('phoneStatus').textContent=error.message;throw error;});
 return bridgePromise;
}
async function maybeAssignPlayer(){
 const target=automaticResponderId();
 if(assigning||!roomState?.pending||roomState.pending.playerId||!target)return;
 assigning=true;try{await roomRequest('/api/assign',{taskId:roomState.pending.id,playerId:target});}catch(error){mobileStatus.textContent=error.message;}finally{assigning=false;}
}
function automaticResponderId(){
 const online=roomState?.players.filter(player=>player.connected)||[];
 return online.find(player=>player.id===players[active]?.id)?.id||online.find(player=>player.name===players[active]?.name)?.id||(online.length===1?online[0].id:null);
}
async function beginMobileConfirmation(text,event){
 mobileStatus.textContent='Conectando con el jugador…';
 if(creatingTask)return;creatingTask=true;
 try{
  await ensurePhoneRoom();
  if(roomState?.pending){remoteTaskId=roomState.pending.id;applyRoomState(roomState);return;}
  const target=event.responderId||automaticResponderId();
  const pending=await roomRequest('/api/task',{text,cardId:event.id,playerId:target,kind:event.completionType||'action'});
  remoteTaskId=pending.id;
  const state=await roomRequest('/api/state');applyRoomState(state);
 }catch(error){mobileStatus.textContent=error.message+' · Reconecta el móvil y vuelve a abrir la carta.';}finally{creatingTask=false;}
}
$('cardDialog').addEventListener('cancel',e=>{if($('cardDialog').classList.contains('text-only')&&(remoteTaskId||creatingTask))e.preventDefault();});
window.addEventListener('hashchange',()=>{if(['#table','#lobby'].includes(location.hash))ensurePhoneRoom().catch(()=>{});else if(remoteTaskId)roomRequest('/api/cancel',{taskId:remoteTaskId}).catch(()=>{});});
if(['#table','#lobby'].includes(location.hash))ensurePhoneRoom().catch(()=>{});



const configDialog=document.createElement('dialog');configDialog.id='roomConfigDialog';configDialog.setAttribute('aria-labelledby','roomConfigTitle');
configDialog.innerHTML='<form id="roomConfigForm"><span class="eyebrow">ANTES DE EMPEZAR</span><h2 id="roomConfigTitle">Configura tu sala</h2><label class="config-label" for="expectedPlayers">¿Cuántos jugadores serán?</label><input id="expectedPlayers" type="number" min="2" max="100" step="1" value="4" required><fieldset><legend>¿Cómo van a jugar?</legend><label class="mode-option"><input type="radio" name="roomMode" value="presencial" checked><span><b>Presencial</b><small>Todos reunidos, cada uno con su celular.</small></span></label><label class="mode-option"><input type="radio" name="roomMode" value="virtual"><span><b>Virtual</b><small>Desde distintos lugares. Las elecciones se confirman en el móvil.</small></span></label></fieldset><p class="config-network-note">La conexión actual es local. Para jugar desde distintas redes se necesita publicar el juego.</p><p id="roomConfigError" role="status"></p><button class="relief-button" type="submit">CREAR SALA</button><button id="cancelRoomConfig" class="profile-cancel" type="button">Cancelar</button></form>';
document.body.append(configDialog);
$('cancelRoomConfig').addEventListener('click',()=>configDialog.close());
$('roomConfigForm').addEventListener('submit',async event=>{
 event.preventDefault();const button=event.submitter;button.disabled=true;$('roomConfigError').textContent='';
 try{
  const response=await fetch('/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedPlayers:Number($('expectedPlayers').value),mode:configDialog.querySelector('[name="roomMode"]:checked').value})});
  const created=await response.json();if(!response.ok)throw Error(created.error);
  roomStream?.close();roomStream=null;bridgePromise=null;roomState=null;remoteTaskId=null;lastResolutionId=null;roomConnection=created;
  try{localStorage.setItem('todo-nada-host-room',JSON.stringify(created));}catch{}
  configDialog.close();location.hash='lobby';await ensurePhoneRoom();
 }catch(error){$('roomConfigError').textContent=error.message;}finally{button.disabled=false;}
});




const mainDiceOverlay=document.createElement('div');mainDiceOverlay.id='mainDiceResult';mainDiceOverlay.className='main-dice-result';mainDiceOverlay.hidden=true;mainDiceOverlay.setAttribute('role','status');
mainDiceOverlay.innerHTML='<div class="main-dice-cube" aria-hidden="true"></div><h2></h2>';
document.body.append(mainDiceOverlay);
let mainDiceTimer=null;
function showMainDiceResult(result){
 clearTimeout(mainDiceTimer);const cube=mainDiceOverlay.querySelector('.main-dice-cube'),title=mainDiceOverlay.querySelector('h2');
 mainDiceOverlay.hidden=false;cube.hidden=result.mode!=='virtual';cube.textContent='?';title.textContent=result.mode==='virtual'?result.playerName+' lanza el dado':result.playerName+' lanzó el dado físico';
 cube.classList.remove('rolling');void cube.offsetWidth;cube.classList.add('rolling');
 mainDiceTimer=setTimeout(()=>{cube.classList.remove('rolling');cube.textContent=result.value===null?'':String(result.value);title.textContent=result.mode==='virtual'?result.playerName+' · '+result.value:result.playerName+' lanzó el dado físico';mainDiceTimer=setTimeout(()=>{mainDiceOverlay.hidden=true;},2200);},matchMedia('(prefers-reduced-motion: reduce)').matches?0:1000);
}

