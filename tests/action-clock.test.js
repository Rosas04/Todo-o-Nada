const test=require('node:test'),assert=require('node:assert/strict');
const clock=require('../action-clock'),game=require('../game');
function room(){return {code:'TEST1',phase:'playing',dealId:'deal',turnSerial:1,turnPlayerId:'p0',direction:1,activeColor:'Lila',config:{mode:'virtual'},deck:[{id:'drawn',color:'Coral'}],players:new Map([0,1,2].map(i=>['p'+i,{id:'p'+i,name:'J'+i,hand:[{id:'a'+i,color:'Lila'},{id:'b'+i,color:'Coral'}]}]))};}
test('each action has the requested total duration',()=>{
 const cases=[['turn',25],['cards',20],['shots',20],['question',60],['challenge',90],['selection',30],['spoken',150],['virtual-dice',15],['physical-dice',30]];
 for(const [kind,seconds] of cases){const r=room();if(['cards','shots'].includes(kind))r.penalty={type:kind,amount:8,minimum:4,playerId:'p0'};else if(kind.endsWith('dice')){r.config.mode=kind==='physical-dice'?'presencial':'virtual';r.diceTask={id:'d',playerId:'p0'};}else if(kind!=='turn')r.pending={id:'t',playerId:'p0',kind,requiresSelection:kind==='selection'};clock.sync(r,1000);assert.equal(r.actionClock.deadline,1000+seconds*1000,kind);}
});
test('normal timeout draws once and passes; a previous draw is not charged twice',()=>{
 for(const drew of [false,true]){const r=room();clock.sync(r,0);if(drew)game.drawOne(r,'p0');clock.sync(r,5000);assert.equal(r.actionClock.deadline,25000);assert.equal(clock.expire(r,24999),false);assert.equal(clock.expire(r,25000),true);assert.equal(r.players.get('p0').hand.length,3);assert.equal(r.turnPlayerId,'p1');assert.equal(r.actionClock.deadline,50000);assert.equal(Boolean(r.players.get('p0').eliminated),false);}
});
test('card accumulations are charged in full on timeout and shots wait for confirmation',()=>{
 const r=room();r.penalty={type:'cards',amount:8,minimum:4,playerId:'p0'};clock.sync(r,0);clock.expire(r,20000);assert.equal(r.players.get('p0').hand.length,10);assert.equal(r.penalty,null);assert.equal(r.turnPlayerId,'p1');
 const shots=room();shots.penalty={type:'shots',amount:8,minimum:4,playerId:'p0'};clock.sync(shots,0);clock.expire(shots,20000);assert.equal(shots.penalty.amount,8);assert.equal(shots.penalty.awaitingConfirmation,true);assert.equal(shots.turnPlayerId,'p0');assert.equal(clock.expire(shots,30000),false);assert.equal(game.canPlay(shots,'p0',{effectId:'shots4'}),false);game.completeShots(shots,'p0');clock.sync(shots,30000);assert.equal(shots.turnPlayerId,'p1');assert.equal(shots.actionClock.seconds,25);
});
test('questions and challenges end in final evaluation, not automatic failure or a new turn',()=>{
 for(const kind of ['question','challenge','spoken']){const r=room();r.pending={id:'t',kind,playerId:'p1',judgeId:'p0'};r.finisherId='p0';clock.sync(r,0);const end=r.actionClock.deadline;clock.expire(r,end);assert.equal(r.pending.awaitingEvaluation,true);assert.equal(r.diceTask,undefined);assert.equal(r.phase,'playing');assert.equal(r.actionClock.expired,true);assert.equal(clock.expire(r,end+10000),false);game.completeAction(r,null,true);assert.equal(r.phase,'finished');assert.equal(r.winnerId,'p0');clock.sync(r,end+10000);assert.equal(r.actionClock,null);}
});
test('truth-or-dare choices and suggestions share a single 150 second countdown',()=>{
 const r=room();r.pending={id:'t',kind:'spoken',playerId:'p1',judgeId:'p0'};clock.sync(r,0);
 r.pending.choice='challenge';clock.sync(r,20000);assert.equal(r.actionClock.deadline,150000);
 r.pending.suggestion={seconds:120};clock.sync(r,90000);assert.equal(r.actionClock.startedAt,0);assert.equal(r.actionClock.deadline,150000);
});
test('120 second external-response challenges are measured from the original start',()=>{
 const r=room();r.pending={id:'t',kind:'challenge',playerId:'p1',judgeId:'p0'};clock.sync(r,1000);
 r.pending.suggestion={seconds:120};clock.sync(r,31000);assert.equal(r.actionClock.deadline,121000);assert.equal(r.actionClock.startedAt,1000);
 r.pending.suggestion={seconds:90};clock.sync(r,61000);assert.equal(r.actionClock.deadline,121000);
});
test('dice timeout gives exactly one card, closes the action and never rolls automatically',()=>{
 for(const mode of ['virtual','presencial']){const r=room();r.config.mode=mode;r.diceTask={id:'d',playerId:'p0'};clock.sync(r,0);clock.expire(r,r.actionClock.deadline);assert.equal(r.players.get('p0').hand.length,3);assert.equal(r.diceTask,null);assert.equal(r.diceResult,undefined);assert.equal(r.turnPlayerId,'p0');assert.equal(r.actionClock.type,'turn');assert.equal(clock.expire(r,r.actionClock.startedAt+1),false);assert.throws(()=>game.rollDice(r,'p0','d'),/corresponde/);}
});
test('timeout card still enforces 25-card limit and selection timeout does not select anyone',()=>{
 const r=room();r.players.get('p0').hand=Array.from({length:25},(_,i)=>({id:'c'+i,color:'Lila'}));clock.sync(r,0);clock.expire(r,25000);assert.equal(r.players.get('p0').hand.length,26);assert.equal(r.players.get('p0').eliminated,true);assert.equal(r.turnPlayerId,'p1');
 const selection=room();selection.pending={id:'s',kind:'action',selection:'player',playerId:'p0'};clock.sync(selection,0);clock.expire(selection,30000);assert.equal(selection.pending.awaitingAction,true);assert.equal(selection.diceTask,undefined);
});
test('restored clocks retain their deadline; lobby and finished games have no clock',()=>{
 const r=room();clock.sync(r,0);const saved=JSON.parse(JSON.stringify(r.actionClock));r.actionClock=saved;clock.sync(r,20000);assert.equal(r.actionClock.deadline,25000);r.phase='lobby';clock.sync(r,21000);assert.equal(r.actionClock,null);r.phase='finished';clock.sync(r,22000);assert.equal(r.actionClock,null);
});
