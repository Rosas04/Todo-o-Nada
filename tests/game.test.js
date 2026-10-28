const test=require('node:test'),assert=require('node:assert/strict');
const game=require('../game'),{dealRoom,makeDeck}=require('../deck');
function room(mode='virtual',count=3){const players=new Map(Array.from({length:count},(_,i)=>['p'+i,{id:'p'+i,name:'J'+i,hand:[],streams:new Set([{}])}]));return {players,config:{mode,expectedPlayers:count},phase:'playing',turnPlayerId:'p0',direction:1,activeColor:'Lila',deck:makeDeck(),pending:null,diceTask:null,penalty:null};}
function card(id,color='Lila',effectId=null){return {id,color,effectId,title:id,file:'test.png',text:null};}
function hand(r,id,cards){r.players.get(id).hand=[...cards,card(id+'-extra')];}

test('fulfilling a penalty clears its total and the next chain starts from zero',()=>{
 for(const type of ['draw','shots']){
  const r=room('virtual',4);hand(r,'p0',[card('first','Lila',type+'2')]);hand(r,'p1',[card('second','Coral',type+'4')]);hand(r,'p3',[card('new-chain','Coral',type+'2')]);
  game.playCard(r,'p0','first');game.playCard(r,'p1','second');assert.equal(r.penalty.amount,6);
  if(type==='draw')game.drawOne(r,'p2');else game.completeShots(r,'p2');
  assert.equal(r.penalty,null);assert.equal(r.turnPlayerId,'p3');
  game.playCard(r,'p3','new-chain');assert.equal(r.penalty.amount,2);assert.equal(r.penalty.minimum,2);assert.equal(r.penalty.playerId,'p0');
 }
});

test('+2 +2 +4 totals eight for the fourth player, for both cards and shots',()=>{
 for(const type of ['draw','shots']){
  const r=room('virtual',4);
  hand(r,'p0',[card('first','Lila',type+'2')]);hand(r,'p1',[card('second','Amarillo',type+'2')]);hand(r,'p2',[card('third','Coral',type+'4')]);hand(r,'p3',[card('held','Turquesa')]);
  game.playCard(r,'p0','first');assert.equal(r.penalty.amount,2);
  game.playCard(r,'p1','second');assert.equal(r.penalty.amount,4);
  game.playCard(r,'p2','third');assert.equal(r.penalty.amount,8);assert.equal(r.penalty.playerId,'p3');assert.equal(r.penalty.minimum,4);
  assert.equal(game.canPass(r,'p3'),false);assert.equal(game.canPlay(r,'p3',card('smaller','Coral',type+'2')),false);
  const before=r.players.get('p3').hand.length;
  if(type==='draw'){assert.equal(game.drawOne(r,'p3').count,8);assert.equal(r.players.get('p3').hand.length,before+8);}
  else {game.completeShots(r,'p3');assert.equal(r.players.get('p3').hand.length,before);}
  assert.equal(r.penalty,null);assert.equal(r.turnPlayerId,'p0');
 }
});

test('reverse and block can follow the same type across colors and apply the new effect',()=>{
 const reverse=room();hand(reverse,'p0',[card('first','Lila','reverse')]);hand(reverse,'p2',[card('second','Coral','reverse')]);
 game.playCard(reverse,'p0','first');game.playCard(reverse,'p2','second');assert.equal(reverse.direction,1);assert.equal(reverse.turnPlayerId,'p0');assert.equal(reverse.activeColor,'Coral');
 const block=room();hand(block,'p0',[card('first','Lila','block')]);hand(block,'p2',[card('second','Amarillo','block')]);
 game.playCard(block,'p0','first');assert.equal(block.turnPlayerId,'p2');game.playCard(block,'p2','second');assert.equal(block.turnPlayerId,'p1');assert.equal(block.activeColor,'Amarillo');
});
test('all special types match across colors but unrelated effects do not match by type',()=>{
 for(const effect of ['reverse','block','dice','choice','draw2','draw4','shots2','shots4']){
  const r=room();r.topCard=card('top','Coral',effect);
  assert.equal(game.canPlay(r,'p0',card('same','Amarillo',effect)),true,effect);
  assert.equal(game.canPlay(r,'p0',card('wrong','Amarillo',effect==='block'?'reverse':'block')),false,effect);
 }
 const r=room();r.topCard=card('top','Coral','reverse');r.deck=[card('drawn','Amarillo','reverse')];game.drawOne(r,'p0');assert.equal(game.canPass(r,'p0'),false);
});
test('penalties accept other colors, reject same-color blocks, and cannot decrease or mix cards and shots',()=>{
 for(const type of ['draw','shots']){
  const r=room();hand(r,'p0',[card('first','Lila',type+'2')]);hand(r,'p1',[card('second','Amarillo',type+'2')]);hand(r,'p2',[card('third','Coral',type+'4')]);
  game.playCard(r,'p0','first');assert.equal(game.canPlay(r,'p1',card('block','Lila','block')),false);
  game.playCard(r,'p1','second');assert.equal(r.penalty.amount,4);game.playCard(r,'p2','third');assert.equal(r.penalty.amount,8);
  assert.equal(game.canPlay(r,'p0',card('lower','Coral',type+'2')),false);
  assert.equal(game.canPlay(r,'p0',card('mixed','Coral',type==='draw'?'shots4':'draw4')),false);
  assert.equal(game.canPlay(r,'p0',card('block','Coral','block')),false);
  assert.equal(game.canPlay(r,'p0',card('four','Turquesa',type+'4')),true);
 }
});

test('accepting +2 or +4 penalties skips the recipient turn for cards and shots',()=>{
 for(const effect of ['draw2','draw4','shots2','shots4']){
  const r=room();hand(r,'p0',[card('penalty','Lila',effect)]);hand(r,'p1',[card('held')]);
  game.playCard(r,'p0','penalty');assert.equal(r.turnPlayerId,'p1');
  if(effect.startsWith('shots'))game.completeShots(r,'p1');else game.drawOne(r,'p1');
  assert.equal(r.penalty,null);assert.equal(r.turnPlayerId,'p2');assert.equal(game.canDraw(r,'p1'),false);assert.equal(game.canPlay(r,'p1',card('held')),false);
 }
});
test('accepting accumulated shots skips once and respects reverse direction and eliminated players',()=>{
 const r=room();hand(r,'p0',[card('two','Lila','shots2')]);hand(r,'p1',[card('four','Coral','shots4')]);
 game.playCard(r,'p0','two');game.playCard(r,'p1','four');assert.equal(r.penalty.amount,6);
 assert.throws(()=>game.completeShots(r,'p0'),/pendiente/);assert.equal(r.penalty.amount,6);
 r.direction=-1;r.players.get('p1').eliminated=true;
 game.completeShots(r,'p2');assert.equal(r.turnPlayerId,'p0');assert.equal(r.penalty,null);
 assert.throws(()=>game.completeShots(r,'p2'),/pendiente/);assert.equal(r.turnPlayerId,'p0');
});

test('original numbered artwork carries numbers and bicolor artwork carries its two colors',()=>{
 const deck=makeDeck(),numbers=deck.filter(c=>/\/(?:Lila|Coral|Turqesa|Amarillo)2?-/.test(c.file));
 assert.equal(numbers.length,80);assert.ok(numbers.every(c=>Number.isInteger(c.number)&&c.number>=0&&c.number<=9));
 const dual=deck.filter(c=>c.file.startsWith('Cartas especiales/'));assert.equal(dual.length,16);
 for(const c of dual)assert.deepEqual(c.colors,c.file.includes('/L)')?['Coral','Lila']:['Amarillo','Turquesa']);
});
test('both bicolor colors are valid on entry and after resolving its action, without accepting unrelated colors',()=>{
 const r=room(),deck=makeDeck(),dual=deck.find(c=>c.file==='Cartas especiales/L).png');
 r.topCard=card('top','Coral');hand(r,'p0',[dual]);assert.equal(game.canPlay(r,'p0',dual),true);
 r.topCard=card('top','Amarillo');assert.equal(game.canPlay(r,'p0',dual),false);
 r.topCard=card('top','Lila');game.playCard(r,'p0',dual.id);assert.equal(game.canPlay(r,'p1',card('coral','Coral')),false);
 game.completeAction(r,null);
 assert.equal(game.canPlay(r,'p1',card('coral','Coral')),true);assert.equal(game.canPlay(r,'p1',card('lila')),true);assert.equal(game.canPlay(r,'p1',card('yellow','Amarillo')),false);
 hand(r,'p1',[card('coral','Coral')]);game.playCard(r,'p1','coral');
 assert.equal(game.canPlay(r,'p2',card('lila')),false);
});
test('same number in another color is playable, including saved cards without new metadata and drawn cards',()=>{
 const r=room(),deck=makeDeck(),top=deck.find(c=>c.file==='Cartas normales/Lila/Lila-5.png'),same=deck.find(c=>c.file==='Cartas normales/Coral/Coral-5.png'),wrong=deck.find(c=>c.file==='Cartas normales/Coral/Coral-7.png');
 r.topCard={...top};delete r.topCard.number;delete r.topCard.colors;
 const legacy={...same};delete legacy.number;delete legacy.colors;
 assert.equal(game.canPlay(r,'p0',legacy),true);assert.equal(game.canPlay(r,'p0',wrong),false);
 r.deck=[legacy];game.drawOne(r,'p0');assert.equal(game.canPass(r,'p0'),false);game.playCard(r,'p0',legacy.id);
 assert.equal(r.activeColor,'Coral');assert.equal(game.canPlay(r,'p1',card('lila')),false);
});
test('all players receive exactly eight, including when multiple packs are needed',()=>{for(const count of [2,8,30,100]){const r=room('presencial',count);r.config.initialCards=1;dealRoom(r);assert.ok([...r.players.values()].every(p=>p.hand.length===8));assert.equal(new Set([...r.players.values()].flatMap(p=>p.hand.map(c=>c.id))).size,count*8);assert.ok(r.deck.length>0);}});
test('only the turn owner can play or draw',()=>{const r=room();hand(r,'p0',[card('one'),card('wrong','Coral')]);hand(r,'p1',[card('other')]);assert.throws(()=>game.playCard(r,'p1','other'),/turno/);assert.throws(()=>game.playCard(r,'p0','missing'),/mano/);assert.throws(()=>game.playCard(r,'p0','wrong'),/color/);game.playCard(r,'p0','one');assert.equal(r.turnPlayerId,'p1');assert.throws(()=>game.drawOne(r,'p0'),/turno/);});
test('reverse and block update turn order',()=>{const reverse=room();hand(reverse,'p0',[card('reverse','Lila','reverse')]);game.playCard(reverse,'p0','reverse');assert.equal(reverse.direction,-1);assert.equal(reverse.turnPlayerId,'p2');const block=room();hand(block,'p0',[card('block','Lila','block')]);game.playCard(block,'p0','block');assert.equal(block.turnPlayerId,'p2');});
test('a dice card enables only its recipient; virtual roll is authoritative and replay-safe',()=>{const r=room();hand(r,'p0',[card('dice','Lila','dice')]);game.playCard(r,'p0','dice');assert.equal(r.diceTask.playerId,'p1');const id=r.diceTask.id;assert.throws(()=>game.rollDice(r,'p0',id),/corresponde/);assert.throws(()=>game.playCard(r,'p1','missing'));const result=game.rollDice(r,'p1',id);assert.ok(Number.isInteger(result.value)&&result.value>=1&&result.value<=6);assert.deepEqual(game.rollDice(r,'p1',id),result);assert.equal(r.diceTask,null);});
test('virtual selection assigns dice to the selected person; physical selection stays verbal',()=>{for(const mode of ['virtual','presencial']){const r=room(mode);hand(r,'p0',[card('choose','Lila','text')]);game.playCard(r,'p0','choose');assert.equal(r.pending.playerId,'p0');assert.equal(r.pending.requiresSelection,mode==='virtual');game.completeAction(r,mode==='virtual'?r.players.get('p2'):null);assert.equal(r.pending,null);assert.equal(r.diceTask?.playerId||null,mode==='virtual'?'p2':null);}});
test('physical dice generate no random number',()=>{const r=room('presencial');hand(r,'p0',[card('dice','Lila','dice')]);game.playCard(r,'p0','dice');const result=game.rollDice(r,'p1',r.diceTask.id);assert.equal(result.mode,'presencial');assert.equal(result.value,null);});
test('card penalties stack only with same type and nondecreasing value',()=>{const r=room();hand(r,'p0',[card('two','Lila','draw2')]);hand(r,'p1',[card('four','Coral','draw4')]);hand(r,'p2',[card('small','Lila','draw2'),card('shots','Lila','shots4')]);game.playCard(r,'p0','two');game.playCard(r,'p1','four');assert.equal(r.penalty.amount,6);assert.throws(()=>game.playCard(r,'p2','small'));assert.throws(()=>game.playCard(r,'p2','shots'));const before=r.players.get('p2').hand.length;game.drawOne(r,'p2');assert.equal(r.players.get('p2').hand.length,before+6);assert.equal(r.penalty,null);assert.equal(r.turnPlayerId,'p0');});
test('finishing on a dice card resolves the effect before declaring the winner',()=>{const r=room();r.players.get('p0').hand=[card('last','Lila','dice')];game.playCard(r,'p0','last');assert.equal(r.phase,'playing');assert.equal(r.winnerId,undefined);game.rollDice(r,'p1',r.diceTask.id);assert.equal(r.winnerId,'p0');assert.equal(r.phase,'finished');});


test('one ordinary draw per turn; an unplayable drawn card offers pass without forcing it',()=>{const r=room('virtual',2);hand(r,'p0',[card('old-valid')]);hand(r,'p1',[card('other')]);r.deck=[card('drawn-bad','Coral')];assert.equal(game.canPass(r,'p0'),false);game.drawOne(r,'p0');assert.equal(r.turnPlayerId,'p0');assert.equal(game.canDraw(r,'p0'),false);assert.equal(game.canPass(r,'p0'),true);assert.throws(()=>game.drawOne(r,'p0'),/Ya cogiste/);assert.equal(game.canPlay(r,'p0',r.players.get('p0').hand[0]),true);game.passTurn(r,'p0');assert.equal(r.turnPlayerId,'p1');game.playCard(r,'p1','other');assert.equal(r.turnPlayerId,'p0');assert.equal(game.canDraw(r,'p0'),true);});
test('a playable drawn card cannot be skipped; it can be played directly',()=>{const r=room();hand(r,'p0',[card('wrong','Coral')]);r.deck=[card('drawn-good')];game.drawOne(r,'p0');assert.equal(game.canPass(r,'p0'),false);assert.throws(()=>game.passTurn(r,'p0'));game.playCard(r,'p0','drawn-good');assert.equal(r.turnPlayerId,'p1');});
test('25 cards are allowed but 26 eliminates immediately and skips that player',()=>{const r=room();r.players.get('p0').hand=Array.from({length:25},(_,i)=>card('a'+i));game.enforceLimits(r);assert.equal(Boolean(r.players.get('p0').eliminated),false);r.deck=[card('limit','Coral')];game.drawOne(r,'p0');assert.equal(r.players.get('p0').hand.length,26);assert.equal(r.players.get('p0').eliminated,true);assert.equal(r.turnPlayerId,'p1');assert.equal(game.canDraw(r,'p0'),false);assert.equal(game.canPlay(r,'p0',r.players.get('p0').hand[0]),false);assert.equal(game.nextPlayer(r,'p2'),'p1');});
test('accumulated penalty draws the full amount and can eliminate over 25',()=>{const r=room();r.players.get('p0').hand=Array.from({length:24},(_,i)=>card('a'+i));r.penalty={type:'cards',amount:6,minimum:4,playerId:'p0'};const result=game.drawOne(r,'p0');assert.equal(result.count,6);assert.equal(result.eliminated,true);assert.equal(r.players.get('p0').hand.length,30);assert.equal(r.penalty,null);assert.equal(r.turnPlayerId,'p1');});
test('a persisted oversized hand loses and leaves a winner; session reactions clear at the end',()=>{const r=room('virtual',2);r.reactions=[{id:'old',emoji:'😂'}];r.players.get('p0').hand=Array.from({length:99},(_,i)=>card('oversized'+i));hand(r,'p1',[card('alive')]);game.enforceLimits(r);assert.equal(r.players.get('p0').eliminated,true);assert.equal(r.phase,'finished');assert.equal(r.winnerId,'p1');assert.deepEqual(r.reactions,[]);});
test('a new deal clears reaction history, draw allowance and elimination status',()=>{const r=room();r.reactions=[{id:'old'}];r.drawState={playerId:'p0',turnSerial:2};r.players.get('p0').eliminated=true;dealRoom(r);assert.deepEqual(r.reactions,[]);assert.equal(r.drawState,null);assert.ok([...r.players.values()].every(p=>!p.eliminated&&p.hand.length===8));assert.ok(r.dealtAt>0);});
