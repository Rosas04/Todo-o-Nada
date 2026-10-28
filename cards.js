// Texts transcribed from the original numbered card artwork.
(function(root){
 const cards=[
 {id:'text',file:'Cartas normales/Lila/Lila-5.png',color:'Lila',title:'Elige al siguiente',text:'Elige quién será el siguiente en lanzar el dado',kind:'action',selection:'player',action:'next-dice'},
 {id:'lila9',file:'Cartas normales/Lila/Lila-9.png',color:'Lila',title:'Pregunta',text:'¿Quién del grupo crees que sería peor pareja?',kind:'question'},
 {id:'coral2',file:'Cartas normales/Coral/Coral-2.png',color:'Coral',title:'Reto compartido',text:'Elige a cualquier jugador para que tome tu próximo reto contigo',kind:'action',selection:'player',action:'share-challenge'},
 {id:'coral6',file:'Cartas normales/Coral/Coral-6.png',color:'Coral',title:'Intercambiar posiciones',text:'Elige a cualquier jugador para intercambiar posiciones contigo',kind:'action',selection:'player',action:'swap-positions'},
 {id:'coral9',file:'Cartas normales/Coral/Coral-9.png',color:'Coral',title:'Pregunta',text:'¿Cuál es tu mayor “red flag” en una relación?',kind:'question'},
 {id:'turquesa2',file:'Cartas normales/Turqueza/Turqesa-2.png',color:'Turquesa',title:'Pregunta',text:'¿Quién del grupo sería tu primera opción para una cita?',kind:'question'},
 {id:'turquesa4',file:'Cartas normales/Turqueza/Turqesa-4.png',color:'Turquesa',title:'Una decisión a tu derecha',text:'Deja que el jugador de tu derecha elija tu próxima bebida',kind:'action'},
 {id:'turquesa20',file:'Cartas normales/Turqueza/Turqesa2-0.png',color:'Turquesa',title:'Pregunta',text:'¿Alguna vez has sentido celos de alguien que está aquí?',kind:'question'},
 {id:'turquesa21',file:'Cartas normales/Turqueza/Turqesa2-1.png',color:'Turquesa',title:'Pregunta',text:'¿A quién besarías para salvarte de tomar tres shots?',kind:'question'},
 {id:'turquesa25',file:'Cartas normales/Turqueza/Turqesa2-5.png',color:'Turquesa',title:'Pregunta',text:'¿Qué es lo más salvaje o sucio que has hecho bajo los efectos del alcohol?',kind:'question'},
 {id:'amarillo4',file:'Cartas normales/Amarillo/Amarillo-4.png',color:'Amarillo',title:'Pregunta',text:'¿Alguna vez te has sentido atraído/a por alguien que está aquí?',kind:'question'},
 {id:'amarillo8',file:'Cartas normales/Amarillo/Amarillo-8.png',color:'Amarillo',title:'Reto',text:'Manda un “te extraño” a tu último chat',kind:'challenge'},
 {id:'amarillo26',file:'Cartas normales/Amarillo/Amarillo2-6.png',color:'Amarillo',title:'Pregunta',text:'Di quién fue tu último crush',kind:'question'},
 {id:'amarillo28',file:'Cartas normales/Amarillo/Amarillo2-8.png',color:'Amarillo',title:'Reto',text:'Bebe un trago sin usar las manos',kind:'challenge'}
 ];
 if(typeof module!=='undefined'&&module.exports)module.exports=cards;else root.WRITTEN_CARDS=cards;
})(typeof globalThis!=='undefined'?globalThis:this);
