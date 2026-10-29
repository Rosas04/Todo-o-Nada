(function(root){
 const back='Cartas normales/Carta-Trasera2.png';
 function model(state,playerId,page=0){
  const players=state.players||[],index=players.findIndex(p=>p.id===playerId),order=index<0?players:[...players.slice(index+1),...players.slice(0,index)];
  const pages=Math.max(1,Math.ceil(order.length/9)),current=((page%pages)+pages)%pages,visible=order.slice(current*9,current*9+9),n=visible.length;
  const activeId=state.actionClock?.playerId||state.turnPlayerId;
  const publicPlayer=p=>({id:p.id,name:p.name,avatar:p.avatar||'pato-sinfondo.png',cardCount:p.cardCount??0,connected:Boolean(p.connected),eliminated:Boolean(p.eliminated),active:p.id===activeId});
  return {self:index>=0?publicPlayer(players[index]):null,pages,page:current,total:players.length,crowded:n>3,seats:visible.map((p,i)=>{let x,y;if(n===1){x=50;y=19;}else if(n===2){x=i?84:16;y=32;}else if(n===3){x=[12,50,88][i];y=[43,19,43][i];}else{const angle=Math.PI*i/(n-1);x=50-38*Math.cos(angle);y=54-36*Math.sin(angle);}return {...publicPlayer(p),x,y,backs:Math.min(5,Math.max(0,p.cardCount||0))};})};
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={model};return;}
 const el=id=>document.getElementById(id),asset=file=>'/Resource/'+file.split('/').map(encodeURIComponent).join('/');
 let state=null,playerId=null,page=0,handlers={},reactionKey=null;
 const reactions=new Map();
 function renderReactions(){
  el('virtualReactionsList').replaceChildren();
  for(const r of reactions.values()){const item=document.createElement('div');item.className='virtual-reaction';const face=document.createElement('span');face.textContent=r.emoji;const name=document.createElement('small');name.textContent=r.name;item.append(face,name);el('virtualReactionsList').append(item);}
  el('virtualReactionCount').textContent=reactions.size||'';
  document.querySelectorAll('[data-seat-id]').forEach(seat=>{let strip=seat.querySelector('.seat-reactions');if(!strip)return;strip.replaceChildren();for(const r of reactions.values())if(r.playerId===seat.dataset.seatId){const emoji=document.createElement('span');emoji.textContent=r.emoji;strip.append(emoji);}});
 }
 function addReaction(reaction){if(state?.phase==='finished'||!reaction?.id)return;reactions.set(reaction.id,reaction);renderReactions();}
 function render(next,id){
  state=next;playerId=id;const view=model(state,id,page);page=view.page;
  el('virtualScene').classList.toggle('crowded',view.crowded);
  el('virtualRoomCode').textContent='SALA '+state.code;
  el('virtualPlayerCount').textContent=view.total+' JUGADORES';
  el('virtualOpponents').replaceChildren();
  for(const p of view.seats){
   const seat=document.createElement('article');seat.className='virtual-seat'+(p.y<=20?' top-seat':'')+(p.active?' active':'')+(p.eliminated?' eliminated':'')+(!p.connected?' offline':'');seat.dataset.seatId=p.id;seat.style.left=p.x+'%';seat.style.top=p.y+'%';seat.setAttribute('aria-label',p.name+', '+p.cardCount+' cartas'+(p.active?', su turno':'')+(p.eliminated?', eliminado':''));
   const avatar=document.createElement('img');avatar.className='opponent-avatar';avatar.src=asset('Users/Sin Fondo/'+p.avatar);avatar.alt='';
   const fan=document.createElement('div');fan.className='opponent-hand';fan.setAttribute('aria-hidden','true');
   for(let i=0;i<p.backs;i++){const card=document.createElement('img');card.src=asset(back);card.alt='';card.style.setProperty('--i',i);card.style.setProperty('--n',p.backs);fan.append(card);}
   const label=document.createElement('div');label.className='opponent-name';const name=document.createElement('strong');name.textContent=p.name;const count=document.createElement('b');count.textContent=p.eliminated?'×':p.cardCount;label.append(name,count);
   const strip=document.createElement('div');strip.className='seat-reactions';seat.append(avatar,fan,label,strip);el('virtualOpponents').append(seat);
  }
  el('virtualSelf').dataset.seatId=id;
  if(view.self){el('virtualSelfAvatar').src=asset('Users/Sin Fondo/'+view.self.avatar);el('virtualSelfName').textContent=view.self.name+' · Tú';el('virtualSelfCount').textContent=view.self.cardCount;el('virtualSelf').classList.toggle('active',view.self.active);}
  const top=state.topCard;el('virtualDiscardImage').src=asset(top?.file||back);el('virtualDiscardImage').alt=top?'Última carta: '+top.title:'Esperando la primera carta';
  el('virtualDeckCount').textContent=state.deckRemaining===null?'Baraja':state.deckRemaining+' cartas';
  const colors=state.activeColors||[state.activeColor].filter(Boolean);el('virtualColor').textContent='Color: '+(colors.join(' / ')||'Libre');
  el('virtualDirection').textContent=state.direction===-1?'↶':'↷';el('virtualDirection').setAttribute('aria-label',state.direction===-1?'Sentido antihorario':'Sentido horario');
  el('virtualPenalty').hidden=!state.penalty;el('virtualPenalty').textContent=state.penalty?'Acumuladas: '+state.penalty.amount+' '+(state.penalty.type==='cards'?'cartas':'shots'):'';
  const action=state.publicAction||state.pending;
  el('virtualPublicAction').hidden=!action;
  if(action){const who=state.players.find(p=>p.id===action.playerId)?.name||'Jugador';el('virtualPublicAction').textContent=who+' · '+(action.awaitingEvaluation?'Evaluación final':action.kind==='spoken'?'Verdad o reto':action.kind==='question'?'Pregunta':action.kind==='challenge'?'Reto':'Acción pendiente')+' ↗';}
  el('virtualDeck').disabled=!state.canDraw;el('virtualDeck').setAttribute('aria-label',state.penalty?.type==='cards'?'Coger '+state.penalty.amount+' cartas acumuladas':'Coger una carta');
  el('virtualSeatPage').hidden=view.pages===1;el('virtualSeatPage').textContent='Ver más jugadores · '+(page+1)+' / '+view.pages;
  const key=state.code+':'+state.dealId;if(reactionKey!==key||state.phase==='finished'){reactions.clear();reactionKey=key;}
  for(const r of state.reactions||[])reactions.set(r.id,r);renderReactions();
  if(el('virtualCardDialog').open){if(!action)el('virtualCardDialog').close();else el('virtualCardText').textContent=action.text||'Verdad o reto';}
  if(state.lastPlay?.id&&el('virtualDiscardImage').dataset.play!==state.lastPlay.id){el('virtualDiscardImage').dataset.play=state.lastPlay.id;if(!matchMedia('(prefers-reduced-motion: reduce)').matches)el('virtualDiscardImage').animate([{transform:'translateY(-40px) rotate(20deg)',opacity:0},{transform:'rotate(7deg)',opacity:1}],{duration:380,easing:'ease-out'});}
 }
 el('virtualDeck').addEventListener('click',()=>handlers.draw?.());
 el('virtualFullscreen').addEventListener('click',()=>document.getElementById('landscapeMode').click());
 el('virtualSettings').addEventListener('click',()=>el('virtualSettingsDialog').showModal());
 el('virtualSettingsClose').addEventListener('click',()=>el('virtualSettingsDialog').close());
 el('virtualLeave').addEventListener('click',()=>{el('virtualSettingsDialog').close();handlers.leave?.();});
 el('virtualRoomCode').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(state.code);}catch{}});
 el('virtualReactionToggle').addEventListener('click',()=>{const expanded=el('virtualReactionPanel').hidden;el('virtualReactionPanel').hidden=!expanded;el('virtualReactionToggle').setAttribute('aria-expanded',String(expanded));});
 el('virtualReactionClose').addEventListener('click',()=>{el('virtualReactionPanel').hidden=true;el('virtualReactionToggle').setAttribute('aria-expanded','false');});
 el('virtualSeatPage').addEventListener('click',()=>{page++;if(state)render(state,playerId);});
 function readCard(){const action=state?.publicAction||state?.pending;if(!action)return;el('virtualCardText').textContent=action.text||'Verdad o reto';if(!el('virtualCardDialog').open)el('virtualCardDialog').showModal();}
 el('virtualPublicAction').addEventListener('click',readCard);el('virtualDiscard').addEventListener('click',readCard);
 el('virtualCardClose').addEventListener('click',()=>el('virtualCardDialog').close());
 root.VirtualTable={model,render,addReaction,setHandlers:next=>{handlers=next;}};
})(typeof globalThis!=='undefined'?globalThis:this);
