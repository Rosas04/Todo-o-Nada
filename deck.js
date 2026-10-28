const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const written=require('./cards');
function cardColors(card){
 if(card?.colors?.length)return card.colors;
 if(card?.file?.startsWith('Cartas especiales/L)'))return ['Coral','Lila'];
 if(card?.file?.startsWith('Cartas especiales/T)'))return ['Amarillo','Turquesa'];
 return card?.color?[card.color]:[];
}
function cardNumber(card){
 if(Number.isInteger(card?.number))return card.number;
 if(!card?.file?.startsWith('Cartas normales/'))return null;
 const filename=path.basename(card.file),match=filename.match(/^(?:Lila|Coral|Turqesa|Amarillo)2?-(\d)\.png$/);
 return match?Number(match[1]):filename==='Lila-.png'?6:null;
}
function activeColors(room){const colors=cardColors(room.topCard);return colors.length?colors:room.activeColor?[room.activeColor]:[];}
function makeDeck(){
 const result=[];
 for(const color of ['Lila','Coral','Turqueza','Amarillo']){
  for(const filename of fs.readdirSync(path.join(__dirname,'Resource','Cartas normales',color)).filter(name=>name.endsWith('.png'))){
   const file='Cartas normales/'+color+'/'+filename,content=written.find(card=>card.file===file);
   let effectId=null,title=filename.replace(/\.png$/,'');
   if(content){effectId=content.id;title=content.title;}
   else if(filename.startsWith('Reversa')){effectId='reverse';title='Reversa';}
   else if(filename.startsWith('Bloqueo')){effectId='block';title='Bloqueo';}
   else if(filename.startsWith('Lanza el dado')){effectId='dice';title='Lanza el dado';}
   else if(filename.startsWith('+2 cartas')){effectId='draw2';title='+2 cartas';}
   else if(filename.startsWith('+4 carta')){effectId='draw4';title='+4 cartas';}
   else if(filename.startsWith('+2 shots')){effectId='shots2';title='+2 shots';}
   else if(filename.startsWith('+4 shots')){effectId='shots4';title='+4 shots';}
   else{const value=filename.match(/-(\d)\.png$/)?.[1]||(filename==='Lila-.png'?'6':'');title=value+' '+(color==='Turqueza'?'turquesa':color.toLowerCase());}
   result.push({id:Buffer.from(file).toString('base64url'),file,title,color:color==='Turqueza'?'Turquesa':color,effectId,text:content?.text||null});
  }
 }
 for(const filename of fs.readdirSync(path.join(__dirname,'Resource','Cartas especiales')).filter(name=>name.endsWith('.png'))){const file='Cartas especiales/'+filename;result.push({id:Buffer.from(file).toString('base64url'),file,title:'Verdad o reto',color:null,effectId:'choice',text:null});}
 return result.map(card=>({...card,colors:cardColors(card),number:cardNumber(card)}));
}
function dealRoom(room){
 for(const field of ['pending','diceTask','penalty','finisherId','winnerId','lastPlay','diceResult','sharedChallenge','resolution','lastCompleted','drawState'])room[field]=null;
 room.reactions=[];room.turnSerial=1;room.dealtAt=Date.now();
 const deck=[],count=8,participants=[...room.players.values()];
 const base=makeDeck(),packs=Math.ceil((participants.length*count+1)/base.length);
 for(let pack=0;pack<packs;pack++)deck.push(...base.map(card=>({...card,id:card.id+'-pack-'+pack})));
 for(let i=deck.length-1;i>0;i--){const j=crypto.randomInt(i+1);[deck[i],deck[j]]=[deck[j],deck[i]];}
 for(const player of participants){player.hand=[];player.eliminated=false;player.eliminationReason=null;}
 for(let round=0;round<count;round++)for(const player of participants)player.hand.push(deck.pop());
 const initial=deck.findIndex(card=>!card.effectId&&!card.text);
 room.topCard=deck.splice(initial>=0?initial:0,1)[0];room.activeColor=room.topCard.color;room.direction=1;room.deck=deck;room.dealId=crypto.randomUUID();room.turnPlayerId=participants[0]?.id||null;
}
module.exports={makeDeck,dealRoom,cardColors,cardNumber,activeColors};
