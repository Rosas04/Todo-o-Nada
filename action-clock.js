const game=require('./game');
function descriptor(room){
 if(room.phase!=='playing')return null;
 const task=room.pending;
 if(task)return {key:'task:'+task.id,type:'task',playerId:task.playerId,seconds:task.kind==='spoken'?150:task.requiresSelection||task.selection?30:task.kind==='question'?60:task.kind==='challenge'?Math.max(90,task.suggestion?.seconds||0):30};
 if(room.diceTask)return {key:'dice:'+room.diceTask.id,type:'dice',playerId:room.diceTask.playerId,seconds:room.config.mode==='virtual'?15:30};
 if(room.penalty)return {key:'penalty:'+room.turnSerial+':'+room.penalty.playerId,type:room.penalty.type==='cards'?'cards':'shots',playerId:room.penalty.playerId,seconds:20};
 return {key:'turn:'+room.turnSerial,type:'turn',playerId:room.turnPlayerId,seconds:25};
}
function sync(room,now=Date.now()){
 const d=descriptor(room);
 if(!d){room.actionClock=null;return;}
 d.key=(room.dealId||'game')+':'+d.key;
 if(room.actionClock?.key!==d.key)room.actionClock={...d,startedAt:now,deadline:now+d.seconds*1000,expired:false};
 else{room.actionClock.playerId=d.playerId;if(!room.actionClock.expired&&d.seconds>room.actionClock.seconds){room.actionClock.seconds=d.seconds;room.actionClock.deadline=room.actionClock.startedAt+d.seconds*1000;}}
}
function expire(room,now=Date.now()){
 sync(room,now);const clock=room.actionClock;
 if(!clock||clock.expired||now<clock.deadline)return false;
 clock.expired=true;
 if(clock.type==='task'){if(room.pending.judgeId)room.pending.awaitingEvaluation=true;else room.pending.awaitingAction=true;return true;}
 if(clock.type==='shots'){room.penalty.awaitingConfirmation=true;return true;}
 const player=room.players.get(clock.playerId);if(!player||player.eliminated){game.enforceLimits(room);room.actionClock=null;sync(room,now);return true;}
 if(clock.type==='dice'){
  game.drawCards(room,player,1);room.diceTask=null;
  room.lastTimeout={id:clock.key,playerId:player.id,type:'dice',cards:1};
 }else if(clock.type==='cards'){
  const amount=room.penalty.amount;game.drawCards(room,player,amount);room.penalty=null;
  game.advance(room,player.id);room.lastTimeout={id:clock.key,playerId:player.id,type:'cards',cards:amount};
 }else{
  const alreadyDrew=room.drawState?.playerId===player.id&&room.drawState.turnSerial===(room.turnSerial||0);
  if(!alreadyDrew)game.drawCards(room,player,1);
  game.advance(room,player.id);room.lastTimeout={id:clock.key,playerId:player.id,type:'turn',cards:alreadyDrew?0:1};
 }
 game.enforceLimits(room);game.finishIfReady(room);room.actionClock=null;sync(room,now);return true;
}
module.exports={descriptor,sync,expire};
