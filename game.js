const crypto=require('node:crypto');
const written=require('./cards');
const {makeDeck,cardColors,cardNumber,activeColors}=require('./deck');
function nextPlayer(room,from,steps=1){
 const ids=[...room.players.keys()];if(!ids.some(id=>!room.players.get(id).eliminated))return null;
 let index=ids.indexOf(from);for(let step=0;step<steps;step++){do{index=(index+(room.direction||1)+ids.length)%ids.length;}while(room.players.get(ids[index]).eliminated);}return ids[index];
}
function finishIfReady(room){
 const survivors=[...room.players.values()].filter(player=>!player.eliminated);
 if(survivors.length<=1&&room.players.size>1){room.winnerId=survivors[0]?.id||null;room.phase='finished';room.pending=null;room.diceTask=null;room.penalty=null;}
 else if(room.finisherId&&!room.pending&&!room.diceTask&&!room.penalty){room.winnerId=room.finisherId;room.phase='finished';}
 if(room.phase==='finished')room.reactions=[];
}
function setTurn(room,id){room.turnPlayerId=id;room.turnSerial=(room.turnSerial||0)+1;room.drawState=null;}
function advance(room,from,steps=1){setTurn(room,nextPlayer(room,from,steps));finishIfReady(room);}
function enforceLimits(room){
 for(const player of room.players.values())if(player.hand?.length>25&&!player.eliminated){player.eliminated=true;player.eliminationReason='Más de 25 cartas';}
 if(room.pending&&room.players.get(room.pending.playerId)?.eliminated)room.pending=null;
 if(room.diceTask&&room.players.get(room.diceTask.playerId)?.eliminated)room.diceTask=null;
 if(room.penalty&&room.players.get(room.penalty.playerId)?.eliminated)room.penalty=null;
 if(room.players.get(room.turnPlayerId)?.eliminated)advance(room,room.turnPlayerId);
 finishIfReady(room);
}
function requireGame(room){if(room.phase!=='playing')throw Error('La partida no está en curso.');}
function drawCards(room,player,count){
 for(let i=0;i<count;i++){
  if(!room.deck?.length){room.deck=makeDeck().map(card=>({...card,id:card.id+'-'+crypto.randomUUID()}));for(let j=room.deck.length-1;j>0;j--){const k=crypto.randomInt(j+1);[room.deck[j],room.deck[k]]=[room.deck[k],room.deck[j]];}}
  player.hand.push(room.deck.pop());
 }
}
function setDice(room,playerId,source){room.diceTask={id:crypto.randomUUID(),playerId,mode:room.config.mode,source};}
function penaltyInfo(card){return {draw2:['cards',2],draw4:['cards',4],shots2:['shots',2],shots4:['shots',4]}[card.effectId];}
function canPlay(room,playerId,card){
 if(room.phase!=='playing'||room.players.get(playerId)?.eliminated||room.turnPlayerId!==playerId||room.pending||room.diceTask)return false;
 if(room.penalty){const info=penaltyInfo(card);return Boolean(info&&info[0]===room.penalty.type&&info[1]>=room.penalty.minimum);}
 const colors=cardColors(card),inPlay=activeColors(room),number=cardNumber(card),topNumber=cardNumber(room.topCard);
 const sameType=Boolean(card.effectId&&card.effectId===room.topCard?.effectId);
 return !colors.length||!inPlay.length||colors.some(color=>inPlay.includes(color))||(number!==null&&topNumber!==null&&number===topNumber)||sameType;
}
function hasDrawn(room,playerId){return room.drawState?.playerId===playerId&&room.drawState.turnSerial===(room.turnSerial||0);}
function canDraw(room,playerId){return room.phase==='playing'&&room.turnPlayerId===playerId&&!room.players.get(playerId)?.eliminated&&!room.pending&&!room.diceTask&&room.penalty?.type!=='shots'&&!hasDrawn(room,playerId);}
function canPass(room,playerId){
 if(room.phase!=='playing'||room.turnPlayerId!==playerId||room.players.get(playerId)?.eliminated||room.pending||room.diceTask||room.penalty||!hasDrawn(room,playerId))return false;
 const drawn=room.players.get(playerId).hand.find(card=>card.id===room.drawState.cardId);
 return Boolean(drawn&&!canPlay(room,playerId,drawn));
}
function playCard(room,playerId,cardId){
 requireGame(room);if(room.turnPlayerId!==playerId)throw Error('Espera tu turno para jugar una carta.');
 const player=room.players.get(playerId),index=player.hand.findIndex(card=>card.id===cardId);if(index<0)throw Error('Esa carta no está en tu mano.');
 const card=player.hand[index];if(!canPlay(room,playerId,card))throw Error(room.pending||room.diceTask?'Primero debe completarse la acción pendiente.':room.penalty?'Responde con una penalización del mismo tipo e igual o mayor valor.':'La carta debe coincidir en color, número o tipo con la carta en juego.');
 player.hand.splice(index,1);room.topCard=card;room.activeColor=cardColors(card)[0]||room.activeColor;
 room.lastPlay={id:crypto.randomUUID(),card,playerId,playerName:player.name};
 if(player.hand.length===0&&!room.finisherId)room.finisherId=playerId;
 const next=nextPlayer(room,playerId),effect=card.effectId,content=written.find(entry=>entry.id===effect);
 if(effect==='reverse'){room.direction=-(room.direction||1);advance(room,playerId);}
 else if(effect==='block')advance(room,playerId,2);
 else if(effect==='dice'){setTurn(room,next);setDice(room,next,'card');}
 else if(penaltyInfo(card)){const [type,amount]=penaltyInfo(card);room.penalty={type,amount:(room.penalty?.amount||0)+amount,minimum:amount,playerId:next};setTurn(room,next);}
 else if(content){
  setTurn(room,next);
  const responder=content.selection==='player'?playerId:next;
  room.pending={id:crypto.randomUUID(),cardId:content.id,text:content.text,kind:content.kind,playerId:responder,judgeId:['question','challenge'].includes(content.kind)?playerId:null,selection:content.selection||null,requiresSelection:content.selection==='player'&&room.config.mode==='virtual',action:content.action||null,sourcePlayId:room.lastPlay.id};
 }else if(effect==='choice'){setTurn(room,next);room.pending={id:crypto.randomUUID(),text:'Verdad o reto',kind:'spoken',playerId:next,judgeId:playerId,publicModal:false,requiresSelection:false,sourcePlayId:room.lastPlay.id};}
 else advance(room,playerId);
 finishIfReady(room);return room.lastPlay;
}
function drawOne(room,playerId){
 requireGame(room);const player=room.players.get(playerId);if(!player)throw Error('Jugador no encontrado.');
 if(player.eliminated)throw Error('Estás eliminado por superar 25 cartas.');
 if(room.turnPlayerId!==playerId)throw Error('Solo puedes coger cartas en tu turno.');
 if(hasDrawn(room,playerId))throw Error('Ya cogiste una carta en este turno. Juega o pasa si la carta robada no es válida.');
 if(room.pending?.playerId===playerId||room.diceTask?.playerId===playerId)throw Error('Completa primero tu acción pendiente.');
 const amount=room.penalty?.playerId===playerId&&room.penalty.type==='cards'?room.penalty.amount:1;
 if(room.turnPlayerId===playerId&&(room.pending||room.diceTask))throw Error('Espera a que termine la acción pendiente.');
 if(room.penalty?.playerId===playerId&&room.penalty.type==='shots')throw Error('Completa la penalización o acumula otra carta del mismo tipo.');
 const forced=room.penalty?.type==='cards';drawCards(room,player,amount);
 room.drawState={playerId,turnSerial:room.turnSerial||0,cardId:player.hand.at(-1).id};
 if(forced){room.penalty=null;if(player.hand.length<=25)advance(room,playerId);}
 enforceLimits(room);
 return {count:amount,eliminated:Boolean(player.eliminated)};
}
function passTurn(room,playerId){requireGame(room);if(!canPass(room,playerId))throw Error('Puedes pasar después de coger una carta que no puedas jugar.');advance(room,playerId);return {ok:true};}
function completeAction(room,selected,fulfilled=true){
 const task=room.pending;
 if(task?.judgeId&&fulfilled===false){setDice(room,task.playerId,'failed-challenge');room.pending=null;finishIfReady(room);return;}
 if(task?.action==='next-dice'){
  if(room.config.mode==='virtual')setDice(room,selected.id,'selection');
  // In person the choice and physical throw are made aloud before confirming.
 }
 if(task?.action==='swap-positions'&&selected){
  const entries=[...room.players.entries()],first=entries.findIndex(([id])=>id===task.playerId),second=entries.findIndex(([id])=>id===selected.id);
  [entries[first],entries[second]]=[entries[second],entries[first]];room.players=new Map(entries);
 }
 if(task?.action==='share-challenge'&&selected)room.sharedChallenge={playerId:task.playerId,partnerId:selected.id};
 room.pending=null;finishIfReady(room);
}
function rollDice(room,playerId,taskId){
 if(room.diceResult?.taskId===taskId&&room.diceResult.playerId===playerId)return room.diceResult;requireGame(room);
 if(!room.diceTask||room.diceTask.playerId!==playerId||room.diceTask.id!==taskId)throw Error('No te corresponde lanzar el dado.');
 const result={id:crypto.randomUUID(),taskId,playerId,playerName:room.players.get(playerId).name,mode:room.config.mode,value:room.config.mode==='virtual'?crypto.randomInt(1,7):null};
 room.diceResult=result;room.diceTask=null;finishIfReady(room);return result;
}
function completeShots(room,playerId){requireGame(room);if(room.pending||room.diceTask||room.penalty?.type!=='shots'||room.penalty.playerId!==playerId)throw Error('No tienes una penalización de shots pendiente.');room.penalty=null;advance(room,playerId);}
module.exports={nextPlayer,finishIfReady,enforceLimits,canPlay,canDraw,canPass,playCard,drawOne,passTurn,completeAction,rollDice,completeShots};
