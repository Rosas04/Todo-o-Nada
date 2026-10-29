const crypto=require('node:crypto');
const questions=[
 '¿Con quién de esta mesa tendrías algo que no contarías al grupo?',
 '¿A quién le has dado esperanzas solo porque te gustaba su atención?',
 '¿Qué intención tenías con alguien de aquí que nunca te atreviste a decir?',
 '¿Cuál es la mentira más descarada que has dicho para conseguir una cita?',
 '¿Qué persona te ha gustado y te daría roche admitirlo delante de este grupo?',
 '¿Qué señal de alarma has ignorado porque alguien te atraía demasiado?',
 '¿Cuál fue la excusa más inventada que usaste para volver a hablar con alguien?',
 '¿A quién quisiste poner celoso y qué hiciste para lograrlo?',
 '¿Cuál ha sido tu peor intento de coqueteo y cómo terminó?',
 '¿Has mantenido una conversación solo para tener una segunda opción? Cuenta qué pasó.',
 '¿Qué halago te hizo caer aunque sabías que era puro floro?',
 '¿Qué haría que perdieras el interés en una cita aunque la persona te encantara?',
 '¿Qué cita repetirías solo para decir algo que te guardaste?',
 '¿Has negado que alguien te gustaba cuando era evidente? Cuenta cómo te descubrieron.',
 '¿Qué has hecho para parecer indiferente cuando estabas pendiente de alguien?',
 '¿Cuál fue el momento más incómodo en que confundiste amabilidad con coqueteo?',
 '¿Qué promesa romántica hiciste sabiendo que no ibas a cumplirla?',
 '¿Qué persona fue tu casi algo más difícil de explicar?',
 '¿Cuál es el mensaje que más te arrepientes de haber enviado por impulso? Cuéntalo sin mostrarlo.',
 '¿Quién de aquí detectaría primero cuando estás coqueteando y por qué?'
];
const challenges=[
 ['Llamada comprometida','Elige junto al grupo un contacto al que te parezca bien llamar y dile: «Te tengo que confesar algo: una vez soñé contigo». Si contesta, conversa 30 segundos.','Cumple al intentar la llamada; si contesta, mantener 30 segundos. Que no conteste no es negarse.',120],
 ['Prenda prestada','Consigue que alguien te preste voluntariamente una casaca, gorra o accesorio y úsalo durante una ronda. En virtual, pide a alguien que elija un accesorio tuyo.','Cumple al pedirlo y usarlo si hay acuerdo. Si nadie acepta, elige un accesorio propio y muéstralo.',90],
 ['Baile o alternativa','Baila 20 segundos con una canción que el grupo elija o haz la penalización alternativa que acuerden antes de empezar.','Cualquiera de las dos opciones acordadas cuenta como cumplido; no se añade otro castigo.',90],
 ['Mensaje con suspenso','Propón tres contactos con los que te parezca bien conversar. El grupo elige uno y tú envías «Tengo algo que confesarte». Decide tú cómo continuar si responde.','Cumple al enviar el mensaje. No hace falta respuesta ni mostrar mensajes privados.',120],
 ['Foto del roche','El grupo propone una pose y tú eliges una que aceptes. Hazte una foto y, si quieres publicarla, úsala de perfil hasta terminar la partida.','Cumple al hacer y mostrar tu propia foto; publicarla es opcional y no se exige mostrar a otras personas.',90],
 ['Estado sospechoso','Publica «Creo que estoy volviendo a caer con la misma persona» hasta terminar la partida, o dilo en voz alta como anuncio al grupo.','Publicar o hacer el anuncio cuenta como cumplido. Una sola opción, sin penalización adicional.',90],
 ['Cambio de look','Pide al grupo que elija un peinado y tres accesorios que aceptes. Haz el cambio y mantenlo dos rondas. En virtual puedes hacerlo tú siguiendo sus propuestas.','Cumple al presentar el look acordado. Los accesorios que no estén disponibles se pueden sustituir.',90],
 ['Negociación difícil','Tienes hasta 60 segundos para pedir un accesorio prestado al grupo sin explicar para qué lo quieres. En virtual, negocia qué accesorio tuyo usarás.','Cumple al realizar la negociación. La negativa de otra persona no cuenta como rechazo tuyo.',90],
 ['Último audio','Busca un audio propio que puedas compartir sin datos privados y reprodúcelo para el grupo; también puedes recrearlo sin enseñar el chat.','Reproducir un audio apto o recrearlo cuenta como cumplido; nunca se exige exponer conversaciones.',90],
 ['Que decida el grupo','El grupo elige entre un baile de 30 segundos, la llamada comprometida o una pose para una foto propia sin publicación obligatoria. Acepta una opción y hazla.','La opción elegida y cumplida cierra el reto. Si la llamada no tiene respuesta, el intento cuenta.',120],
 ['Audio de valentía','Graba un audio de 15 segundos diciendo una confesión graciosa pero real y escúchalo delante del grupo. Tú decides si lo envías a alguien.','Cumple al grabar y reproducir tu propio audio; enviarlo no es obligatorio.',90],
 ['Llamada de rescate','Llama a alguien de confianza y dile «Necesito que me inventes una excusa para salir de una cita». Si contesta, escucha su propuesta.','El intento de llamada cumple; no depende de que la otra persona conteste.',120],
 ['El accesorio protagonista','Deja que el grupo elija entre tres accesorios tuyos y úsalo de una forma llamativa durante una ronda.','Cumple al mostrar el accesorio de la forma acordada, presencial o en cámara.',90],
 ['Dedicatoria con roche','El grupo elige una canción y tú dedicas 20 segundos del estribillo a alguien que tú decidas, mirándolo o dirigiéndote a su cámara.','Cumple con la dedicatoria; no presupone atracción ni exige respuesta de la otra persona.',90],
 ['Confesión al centro','Cada persona te propone una pregunta incómoda. Elige una y contéstala delante del grupo.','Cumple al elegir y responder una; las demás preguntas se descartan.',90],
 ['El piropo consentido','Pide permiso a alguien del grupo para dedicarle tu mejor frase de conquista. Si acepta, dísela mirándole a los ojos o a la cámara.','Si no acepta, dedica la frase a una persona imaginaria; esa alternativa también cumple.',90],
 ['Cambio de nombre','El grupo propone tres apodos para esta ronda y tú eliges uno. Preséntate con él cada vez que hables hasta tu siguiente turno.','Cumple al elegir y presentarte con el apodo; no hace falta cambiar cuentas ni perfiles.',90],
 ['La propuesta','Hazle a quien tú elijas una propuesta de cita de 20 segundos que te daría roche decir sobrio. Puedes dirigirla al grupo entero.','Cumple con la propuesta; no se exige aceptar la cita ni asumir atracción entre participantes.',90],
 ['Objeto de la vergüenza','Busca un objeto o accesorio tuyo que tenga una historia incómoda y cuenta la historia al grupo.','Cumple al mostrar un objeto propio y contar su historia; sin datos privados de terceros.',90],
 ['La nota inesperada','Escribe «Hoy me atrevo a admitirlo» en una nota y completa la frase con una confesión tuya. Léela delante del grupo.','Cumple al leer la nota. No requiere publicarla ni entregarla a otra persona.',90]
];
const catalog=[...questions.map((text,i)=>({id:'q'+i,kind:'question',title:'Pregunta',text,completion:'Responder en voz alta; no hace falta enseñar chats ni identificar a terceros.',seconds:60})),...challenges.map(([title,text,completion,seconds],i)=>({id:'r'+i,kind:'challenge',title,text,completion,seconds}))];
function suggest(room,kind){
 const unused=catalog.filter(p=>p.kind===kind&&!(room.usedSuggestions||[]).includes(p.id));
 if(!unused.length)throw Error('Ya salieron todas las sugerencias de este tipo en esta partida. Propongan una en voz alta.');
 const prompt=unused[crypto.randomInt(unused.length)];room.usedSuggestions??=[];room.usedSuggestions.push(prompt.id);return {...prompt};
}
module.exports={catalog,suggest};
