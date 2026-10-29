let playerSession=null,playerState=null,mobileStream=null,submitting=false,lastDisplayedTaskId=null,selectedTargetId=null;
let gameActionBusy=false,lastDiceResultId=null,diceAnimationTimer=null,mobileDealing=false,reactionBusy=false;
let lastTimeoutSeen=null;
const mobilePreview=new URLSearchParams(location.search).get('preview');
const el=id=>document.getElementById(id);
let selectedAvatar=PLAYER_AVATARS[0].file;
try{const saved=localStorage.getItem('todo-nada-avatar');if(PLAYER_AVATARS.some(avatar=>avatar.file===saved))selectedAvatar=saved;}catch{}
PLAYER_AVATARS.forEach(avatar=>{
 const label=document.createElement('label'),input=document.createElement('input'),image=document.createElement('img');
 input.type='radio';input.name='avatar';input.value=avatar.file;input.checked=avatar.file===selectedAvatar;input.setAttribute('aria-label',avatar.name);
 input.addEventListener('change',()=>{selectedAvatar=avatar.file;try{localStorage.setItem('todo-nada-avatar',selectedAvatar);}catch{}});
 image.src=mobileAsset('Users/Sin Fondo/'+avatar.file);image.alt='';label.title=avatar.name;label.append(input,image);el('avatarOptions').append(label);
});
async function playerRequest(endpoint,data){const response=await fetch(endpoint,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(playerSession?{Authorization:'Bearer '+playerSession.token}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});const result=await response.json();if(!response.ok)throw Error(result.error||'No se pudo conectar.');return result;}
function renderTaskApproval(task){
 const judged=Boolean(task?.judgeId),canJudge=judged&&task.judgeId===playerSession?.id;
 el('rejectTask').hidden=!canJudge;el('rejectTask').disabled=submitting;
 if(!judged){if(task)el('mobileTaskStatus').textContent='';return;}
 el('completeTask').hidden=!canJudge;el('completeTask').disabled=submitting;
 el('completeTask').textContent='CUMPLIÓ';el('rejectTask').textContent='NO CUMPLIÓ';
 const responder=playerState.players.find(p=>p.id===task.playerId)?.name||'El jugador';
 const judge=playerState.players.find(p=>p.id===task.judgeId)?.name||'Quien lanzó la carta';
 el('mobileTaskTitle').textContent=canJudge?'Evalúa el cumplimiento':'Tu pregunta o reto';
 el('mobileTaskStatus').textContent=canJudge?(task.awaitingEvaluation?'Se acabó el tiempo. Evalúa si '+responder+' cumplió.':'¿'+responder+' cumplió? Confirma el resultado.'):judge+' confirmará si se cumplió.';
 el('mobileTurnLabel').textContent=canJudge?'EVALÚA EL CUMPLIMIENTO':'RESPONDE O CUMPLE EL RETO';
 el('mobileTurnHint').textContent=canJudge?'Tú lanzaste esta carta':'Espera la confirmación de '+judge;
}
function renderSuggestions(task){
 const judged=Boolean(task?.judgeId),mine=task?.judgeId===playerSession?.id,expired=Boolean(playerState?.actionClock?.expired);
 el('suggestionTools').hidden=!judged;
 const kind=task?.kind==='spoken'?task.choice:task?.kind;
 for(const [id,value] of [['suggestQuestion','question'],['suggestChallenge','challenge']]){el(id).hidden=!judged||!mine||Boolean(kind&&kind!==value);el(id).disabled=submitting||expired;}
 for(const [id,value] of [['chooseTruth','question'],['chooseDare','challenge']]){el(id).hidden=!judged||task.kind!=='spoken'||task.playerId!==playerSession?.id||Boolean(task.choice);el(id).disabled=submitting||expired;}
 el('suggestionCriteria').hidden=!task?.suggestion;
 el('suggestionCriteria').textContent=task?.suggestion?'Cumple si: '+task.suggestion.completion:'';
 if(task?.suggestion)el('mobileTaskText').textContent=task.suggestion.text;
 else if(task?.kind==='spoken'&&task.choice)el('mobileTaskText').textContent=task.choice==='question'?'Verdad':'Reto';
}
function renderMobile(state){
 playerState=state;window.updateActionClock?.(state);el('mobileEntry').hidden=true;el('joinMobile').hidden=true;
 if(state.lastTimeout?.id!==lastTimeoutSeen){lastTimeoutSeen=state.lastTimeout?.id||null;if(state.lastTimeout?.type==='dice'&&state.lastTimeout.playerId===playerSession?.id){if(el('mobileDiceDialog').open)el('mobileDiceDialog').close();suspendedDiceDialog=false;el('mobileStatus').textContent='Se agotó el tiempo del dado: recibiste una carta. No se hizo ninguna tirada.';}}
 const waiting=state.phase==='lobby'&&!['hand','task','selection'].includes(mobilePreview);
 el('mobileLobby').hidden=!waiting;el('mobileGame').hidden=waiting;document.body.classList.toggle('is-playing',!waiting);
 if(waiting){
  el('mobileLobbyIdentity').textContent=playerSession.name+' · SALA '+state.code;
  el('mobileTask').hidden=true;el('completeTask').hidden=true;el('playerSelection').hidden=true;
  if(el('mobileCardDialog').open)el('mobileCardDialog').close();lastDisplayedTaskId=null;selectedTargetId=null;
  return;
 }
 el('mobilePlayer').textContent=playerSession.name+' · SALA '+state.code;
 const task=state.pending;if(task?.id!==lastDisplayedTaskId)selectedTargetId=null;el('mobileWaiting').hidden=false;el('mobileTask').hidden=!task;
 const eliminated=Boolean(state.players.find(player=>player.id===playerSession?.id)?.eliminated);
 el('mobileWaiting').hidden=eliminated;el('eliminatedMessage').hidden=!eliminated;
 el('completeTask').hidden=!task;el('mobileDice').hidden=Boolean(task);el('mobileDraw').hidden=Boolean(task);
 el('mobileTurnLabel').textContent=task?'— TU TURNO —':(state.hand?.length?'TU MANO':'EN LA SALA');el('mobileTurnHint').textContent=task?'Confirma cuando hayas terminado':(state.hand?.length?'Solo tú puedes ver estas cartas':'Esperando la siguiente carta');
 renderRoster(state.players);renderHand(false);
 if(task){el('mobileTaskText').textContent=task.text;el('mobileTaskTitle').textContent=task.kind==='question'?'Tu pregunta':task.kind==='challenge'?'Tu reto':'Tu carta';el('completeTask').textContent=task.kind==='question'?'PREGUNTA RESPONDIDA':task.kind==='challenge'?'RETO CUMPLIDO':'PREGUNTA O RETO CUMPLIDO';}
 if(task){
  const portrait=matchMedia('(orientation: portrait) and (max-width:700px)').matches;
  if(portrait&&el('mobileCardDialog').open)el('mobileCardDialog').close();
  if(!portrait&&!el('mobileCardDialog').open)el('mobileCardDialog').showModal();
  if(task.id!==lastDisplayedTaskId){
   lastDisplayedTaskId=task.id;
   el('mobileTask').classList.remove('zoom-arrival');void el('mobileTask').offsetWidth;el('mobileTask').classList.add('zoom-arrival');
  }
 }else{
  lastDisplayedTaskId=null;
  if(el('mobileCardDialog').open)el('mobileCardDialog').close();
 }
 renderPlayerSelection(task);
 if(!['hand','task','selection'].includes(mobilePreview)&&window.playDealAnimation?.(state,()=>{mobileDealing=false;el('mobileHand').classList.remove('dealing');renderGameActions();})){
  mobileDealing=true;el('mobileHand').classList.add('dealing');renderGameActions();
 }
}
function renderPlayerSelection(task){
 const required=Boolean(task?.requiresSelection);el('playerSelection').hidden=!required;el('mobileCardDialog').classList.toggle('has-selection',required);
 const list=el('selectionPlayers');list.replaceChildren();
 if(required){
  const candidates=playerState.players.filter(player=>player.connected&&!player.eliminated&&player.id!==playerSession.id);
  if(!candidates.some(player=>player.id===selectedTargetId))selectedTargetId=null;
  candidates.forEach(player=>{const button=document.createElement('button');button.type='button';button.className='selection-person';button.textContent=player.name;button.setAttribute('aria-pressed',String(player.id===selectedTargetId));button.addEventListener('click',()=>{selectedTargetId=player.id;renderPlayerSelection(task);});list.append(button);});
  el('selectionHelp').textContent=candidates.length?'La elección también aparecerá en la pantalla principal.':'Esperando a que otro jugador se conecte.';
  el('completeTask').textContent='CONFIRMAR ELECCIÓN';
 }
 el('completeTask').disabled=submitting||(required&&!selectedTargetId);
 renderGameActions();
}
function renderGameActions(){
 const state=playerState;if(!state)return;
 const playing=state.phase==='playing',myTurn=state.turnPlayerId===playerSession?.id;
 document.querySelectorAll('[data-reaction]').forEach(button=>button.disabled=reactionBusy||state.phase==='finished');
 const eliminated=Boolean(state.players.find(player=>player.id===playerSession?.id)?.eliminated);
 const canRoll=playing&&state.diceTask?.playerId===playerSession?.id;
 el('mobileDice').disabled=!canRoll||gameActionBusy||mobileDealing;el('mobileDice').hidden=Boolean(state.pending);
 el('mobileDice').title=canRoll?'Te corresponde el dado':'Se habilita cuando te corresponde lanzar';
 el('mobileDraw').disabled=!state.canDraw||gameActionBusy||mobileDealing;el('mobileDraw').hidden=Boolean(state.pending);
 el('mobilePass').hidden=!state.canPass;el('mobilePass').disabled=gameActionBusy||mobileDealing;
 const drawAmount=state.penalty?.type==='cards'&&state.penalty.playerId===playerSession?.id?state.penalty.amount:1;
 el('mobileDraw').querySelector('b').textContent=drawAmount>1?'COGER\n'+drawAmount+' CARTAS':'COGER\nCARTA';
 el('mobileDraw').title='Coger una carta de la baraja';
 el('completeShots').hidden=state.penalty?.type!=='shots'||state.penalty.playerId!==playerSession?.id;
 el('completeShots').disabled=gameActionBusy;
 if(!state.pending){
  const who=state.players.find(p=>p.id===state.turnPlayerId)?.name||'otro jugador';
  el('mobileTurnLabel').textContent=eliminated?'ELIMINADO':state.phase==='finished'?'PARTIDA TERMINADA':canRoll?'TE TOCA EL DADO':myTurn?'— TU TURNO —':'TURNO DE '+who.toUpperCase();
  el('mobileTurnHint').textContent=eliminated?'Superaste las 25 cartas':canRoll?(state.config?.mode==='virtual'?'Lanza desde el botón del dado':'Lanza el dado físico y confirma'):state.canPass?'Puedes pasar o jugar otra carta':myTurn?(state.canDraw?'Juega una carta o coge una':'Juega una carta'):'Puedes revisar tu mano';
 }
 if(state.diceResult?.id&&state.diceResult.id!==lastDiceResultId){
  const previous=lastDiceResultId;lastDiceResultId=state.diceResult.id;
  if(state.diceResult.playerId===playerSession?.id&&(previous!==null||gameActionBusy))showDiceResult(state.diceResult);
 }
 if(lastDiceResultId===null&&!state.diceResult)lastDiceResultId='none';
 renderTaskApproval(state.pending);
 renderSuggestions(state.pending);
 if(state.config?.mode==='presencial'&&state.pending?.action==='next-dice'){
  el('mobileTaskStatus').textContent='Elijan en voz alta quién lanza el dado físico. Confirma después de la tirada.';
  el('completeTask').textContent='DADO FÍSICO LANZADO';
 }
}
async function sendGameAction(endpoint,data){
 if(gameActionBusy||mobileDealing)return;gameActionBusy=true;renderGameActions();
 try{const result=await playerRequest(endpoint,data);renderMobile(await playerRequest('/api/state'));return result;}
 catch(error){el('mobileStatus').textContent=error.message;throw error;}
 finally{gameActionBusy=false;renderGameActions();}
}
el('mobileDraw').addEventListener('click',()=>sendGameAction('/api/draw',{}).then(result=>{if(result)el('mobileStatus').textContent='Cogiste '+result.count+' carta'+(result.count===1?'':'s')+'.';}).catch(()=>{}));
el('mobilePass').addEventListener('click',()=>sendGameAction('/api/pass',{}).catch(()=>{}));
el('completeShots').addEventListener('click',()=>sendGameAction('/api/penalty',{}).catch(()=>{}));
function showDiceResult(result){
 if(result.mode==='presencial'){if(el('mobileDiceDialog').open)el('mobileDiceDialog').close();return;}
 clearTimeout(diceAnimationTimer);el('mobileDiceTitle').textContent='Tu tirada';el('mobileDiceMessage').textContent='';
 el('mobileDiceCube').hidden=false;el('mobileDiceCube').textContent='?';el('mobileDiceCube').classList.remove('rolling');void el('mobileDiceCube').offsetWidth;el('mobileDiceCube').classList.add('rolling');
 el('mobileDiceDone').textContent='CONTINUAR';el('mobileDiceDone').disabled=true;
 if(matchMedia('(orientation: portrait) and (max-width:700px)').matches)suspendedDiceDialog=true;else if(!el('mobileDiceDialog').open)el('mobileDiceDialog').showModal();
 diceAnimationTimer=setTimeout(()=>{el('mobileDiceCube').classList.remove('rolling');el('mobileDiceCube').textContent=String(result.value);el('mobileDiceMessage').textContent='Resultado: '+result.value;el('mobileDiceDone').disabled=false;},matchMedia('(prefers-reduced-motion: reduce)').matches?0:1000);
}
el('mobileDice').addEventListener('click',()=>{
 if(playerState?.diceTask?.playerId!==playerSession?.id)return;
 if(playerState.config.mode==='presencial'){
  el('mobileDiceTitle').textContent='Lanza el dado físico';el('mobileDiceCube').hidden=true;el('mobileDiceMessage').textContent='Realiza la tirada y confirma cuando hayas terminado.';el('mobileDiceDone').textContent='YA LANCÉ EL DADO';el('mobileDiceDone').disabled=false;el('mobileDiceDialog').showModal();
 }else sendGameAction('/api/dice',{taskId:playerState.diceTask.id}).then(result=>{if(result&&!el('mobileDiceDialog').open)showDiceResult(result);}).catch(()=>{});
});
el('mobileDiceDone').addEventListener('click',()=>{
 if(playerState?.config?.mode==='presencial'&&playerState.diceTask?.playerId===playerSession?.id){el('mobileDiceDone').disabled=true;sendGameAction('/api/dice',{taskId:playerState.diceTask.id}).then(()=>el('mobileDiceDialog').close()).catch(()=>{el('mobileDiceDone').disabled=false;});}
 else el('mobileDiceDialog').close();
});
el('mobileDiceDialog').addEventListener('cancel',event=>{if(el('mobileDiceDone').disabled||playerState?.diceTask?.playerId===playerSession?.id)event.preventDefault();});
async function connectMobile(){
 const state=await playerRequest('/api/state');
 const roomUrl=new URL(location.href);roomUrl.searchParams.set('room',state.code);roomUrl.searchParams.delete('preview');history.replaceState(null,'',roomUrl);
 el('joinCode').value=state.code;
 renderMobile(state);
 mobileStream?.close();mobileStream=new EventSource('/api/events?token='+encodeURIComponent(playerSession.token));
 mobileStream.onmessage=e=>{el('mobileStatus').textContent='Conectado';el('mobileTaskStatus').textContent='';renderMobile(JSON.parse(e.data));};
 mobileStream.onerror=()=>{el('mobileStatus').textContent='Reconectando… No cierres esta pantalla.';el('mobileTaskStatus').textContent='Reconectando… La carta sigue pendiente.';el('completeTask').disabled=true;};
}
const invitedRoom=(new URLSearchParams(location.search).get('room')||'').trim().toUpperCase();
el('joinCode').value=invitedRoom;
if(invitedRoom){el('joinMobile').querySelector('h1').textContent='ENTRAR A LA SALA '+invitedRoom;el('joinName').focus();}
el('joinMobile').addEventListener('submit',async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{playerSession=await playerRequest('/api/join',{code:el('joinCode').value.trim().toUpperCase(),name:el('joinName').value.trim(),avatar:selectedAvatar});try{sessionStorage.setItem('todo-nada-phone',JSON.stringify(playerSession));}catch{}await connectMobile();}catch(error){el('mobileStatus').textContent=error.message;}finally{button.disabled=false;}});
async function submitTask(fulfilled=true){
 if(submitting||!playerState?.pending)return;
 if(['task','selection'].includes(mobilePreview)){renderMobile({...playerState,pending:null});renderHand(true);el('mobileStatus').textContent='Vista de diseño · confirmación de ejemplo';return;}
 submitting=true;el('completeTask').disabled=true;el('rejectTask').disabled=true;
 const task=playerState.pending;
 try{await playerRequest('/api/complete',{taskId:task.id,selectedPlayerId:selectedTargetId,...(task.judgeId?{fulfilled}:{})});el('mobileStatus').textContent=fulfilled?'¡Confirmado!':'No cumplido. Corresponde lanzar el dado.';renderMobile(await playerRequest('/api/state'));}
 catch(error){el('mobileStatus').textContent=error.message;el('mobileTaskStatus').textContent=error.message;}
 finally{submitting=false;renderPlayerSelection(playerState?.pending);}
}
el('completeTask').addEventListener('click',()=>submitTask(true));
el('rejectTask').addEventListener('click',()=>submitTask(false));
async function requestPrompt(endpoint,kind){
 if(submitting||!playerState?.pending)return;submitting=true;renderSuggestions(playerState.pending);
 try{await playerRequest(endpoint,{taskId:playerState.pending.id,kind});renderMobile(await playerRequest('/api/state'));}
 catch(error){el('mobileTaskStatus').textContent=error.message;el('mobileStatus').textContent=error.message;}
 finally{submitting=false;renderPlayerSelection(playerState?.pending);}
}
el('suggestQuestion').addEventListener('click',()=>requestPrompt('/api/suggest','question'));
el('suggestChallenge').addEventListener('click',()=>requestPrompt('/api/suggest','challenge'));
el('chooseTruth').addEventListener('click',()=>requestPrompt('/api/choice','question'));
el('chooseDare').addEventListener('click',()=>requestPrompt('/api/choice','challenge'));
el('landscapeMode').addEventListener('click',async()=>{
 try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen?.();}catch{}
 try{await screen.orientation?.lock?.('landscape');}catch{}
});
let suspendedDiceDialog=false;
matchMedia('(orientation: portrait) and (max-width:700px)').addEventListener('change',event=>{
 if(event.matches&&el('mobileDiceDialog').open){suspendedDiceDialog=true;el('mobileDiceDialog').close();}
 if(playerState)renderMobile(playerState);
 if(!event.matches&&suspendedDiceDialog){suspendedDiceDialog=false;el('mobileDiceDialog').showModal();}
});
el('mobileCardDialog').addEventListener('cancel',e=>e.preventDefault());
async function leaveMobileRoom(){if(!['hand','task','selection'].includes(mobilePreview)){try{await playerRequest('/api/leave',{});}catch(error){el('mobileStatus').textContent=error.message;return;}}mobileStream?.close();mobileStream=null;playerSession=null;playerState=null;try{sessionStorage.removeItem('todo-nada-phone');}catch{}el('mobileEntry').hidden=false;el('joinMobile').hidden=false;el('mobileGame').hidden=true;el('mobileLobby').hidden=true;document.body.classList.remove('is-playing');el('mobileStatus').textContent='Saliste de la sala.';}
el('leaveMobile').addEventListener('click',leaveMobileRoom);
el('leaveMobileLobby').addEventListener('click',leaveMobileRoom);
(async()=>{if(['hand','task','selection'].includes(mobilePreview))return;try{
 const saved=sessionStorage.getItem('todo-nada-phone');
 if(saved){
  const previous=JSON.parse(saved),requested=new URLSearchParams(location.search).get('room')?.trim().toUpperCase();
  if(requested&&requested!==previous.code){
   sessionStorage.removeItem('todo-nada-phone');playerSession=null;
   el('mobileStatus').textContent='Ingresa tu nombre para unirte a la sala '+requested+'.';return;
  }
  playerSession=previous;await connectMobile();
 }
}catch{playerSession=null;try{sessionStorage.removeItem('todo-nada-phone');}catch{}el('mobileStatus').textContent='Vuelve a ingresar a la sala.';}})();

function mobileAsset(file){return '/Resource/'+file.split('/').map(encodeURIComponent).join('/');}
function renderRoster(players){
 const avatars=['pato-sinfondo.png','fantasmacute-sinfondo.png','calavera-sinfondo.png','caraderretida-sinfondo.png','fantasma-sinfondo.png'];
 el('mobileRoster').replaceChildren();
 players.forEach((player,index)=>{const item=document.createElement('div');item.className='rail-player'+(player.connected?'':' offline')+(player.id===playerSession?.id?' me':'');item.setAttribute('aria-label',player.name+(player.connected?' · conectado':' · desconectado'));item.title=player.name;const img=document.createElement('img');img.src=mobileAsset('Users/Sin Fondo/'+(player.avatar||avatars[index%avatars.length]));img.alt='';item.append(img,document.createElement('i'));el('mobileRoster').append(item);});
}
function renderHand(preview){
 const hand=el('mobileHand');
 const privateCards=preview?[]:playerState?.hand||[];
 const interactive=preview||privateCards.length>0;
 hand.classList.toggle('is-interactive',interactive);
 hand.setAttribute('aria-hidden',String(!interactive));
 const cards=preview?['Cartas normales/Coral/Coral-1.png','Cartas normales/Amarillo/Amarillo-2.png','Cartas normales/Turqueza/Turqesa-3.png','Cartas normales/Turqueza/Bloqueo_13.png','Cartas normales/Lila/Reversa-lila.png']:privateCards.length?privateCards.map(card=>card.file):Array(5).fill('Cartas normales/Carta-Trasera2.png');
 el('handCaption').textContent=preview?'Mano de ejemplo · vista de diseño':privateCards.length?privateCards.length+' cartas · Color en juego: '+(playerState.activeColors?.join(' / ')||playerState.activeColor||'libre'):'Esperando el reparto';
 const signature=JSON.stringify([preview,...(privateCards.length?privateCards.map(card=>card.id):cards)]);
 if(hand.dataset.signature===signature)return;
 hand.dataset.signature=signature;hand.replaceChildren();
 const labels=['Uno coral','Dos amarillo','Tres turquesa','Bloqueo turquesa','Reversa lila'];
 cards.forEach((file,i)=>{
  const card=document.createElement(interactive?'button':'span');card.className='hand-card';
  const midpoint=(cards.length-1)/2,step=Math.min(29,200/Math.max(1,cards.length-1)),angleStep=Math.min(10,60/Math.max(1,cards.length-1));
  card.style.setProperty('--angle',(i-midpoint)*angleStep+'deg');card.style.setProperty('--offset','calc(var(--fan-spread, 200px) * '+((i-midpoint)*step/200)+')');card.style.setProperty('--stack',i+1);
  card.style.setProperty('--deal-order',i);
  const img=document.createElement('img');img.src=mobileAsset(file);img.alt='';img.draggable=false;card.append(img);
  if(interactive){
   card.type='button';card.setAttribute('aria-label',preview?labels[i]:'Jugar '+privateCards[i].title);if(preview)card.setAttribute('aria-pressed','false');
   const raise=raised=>{hand.querySelectorAll('.hand-card').forEach(other=>{other.classList.remove('is-raised');if(preview)other.setAttribute('aria-pressed','false');});card.classList.toggle('is-raised',raised);if(preview)card.setAttribute('aria-pressed',String(raised));};
   const toggle=()=>raise(!card.classList.contains('is-raised'));
   card.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')raise(true);});
   card.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse'){card.classList.remove('is-raised');if(preview)card.setAttribute('aria-pressed','false');}});
   if(preview){
    card.addEventListener('pointerup',event=>{if(event.pointerType!=='mouse')toggle();});
    card.addEventListener('click',event=>{if(event.detail===0)toggle();});
   }else card.addEventListener('click',()=>sendGameAction('/api/play',{cardId:privateCards[i].id}).catch(()=>{}));
  }
  hand.append(card);
 });
}
if(['hand','task','selection'].includes(mobilePreview)){
 mobileStream?.close();playerSession={id:'preview',name:'Dani'};
 renderMobile({code:'DISEÑO',players:['Dani','Vale','Nico','Majo','Alex'].map((name,i)=>({id:i?'example-'+i:'preview',name,connected:true})),pending:null});
 renderHand(true);el('mobileTurnLabel').textContent='— TU TURNO —';el('mobileTurnHint').textContent='Es tu momento de decidir';el('mobileStatus').textContent='Vista de diseño. Las acciones de la partida aún no están conectadas.';
 if(mobilePreview==='task')renderMobile({...playerState,pending:{id:'preview-written-card',kind:'action',text:'Elige quién será el siguiente en lanzar el dado.'}});
 if(mobilePreview==='selection')renderMobile({...playerState,config:{mode:'virtual',expectedPlayers:5},pending:{id:'preview-selection',kind:'action',requiresSelection:true,text:'Elige quién será el siguiente en lanzar el dado'}});
}


// Reactions are independent of whose turn it is and do not play a card.
document.querySelectorAll('[data-reaction]').forEach(button=>button.addEventListener('click',async()=>{
 if(reactionBusy)return;reactionBusy=true;
 const buttons=document.querySelectorAll('[data-reaction]');buttons.forEach(item=>item.disabled=true);
 button.classList.add('reaction-sent');
 try{
  if(['hand','task','selection'].includes(mobilePreview))el('mobileStatus').textContent='Vista de diseño · '+button.dataset.reaction;
  else{await playerRequest('/api/reaction',{emoji:button.dataset.reaction});el('mobileStatus').textContent='Reacción enviada '+button.dataset.reaction;}
 }catch(error){el('mobileStatus').textContent=error.message;}
 finally{setTimeout(()=>{reactionBusy=false;buttons.forEach(item=>item.disabled=playerState?.phase==='finished');button.classList.remove('reaction-sent');},400);}
}));
