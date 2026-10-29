# TODO O NADA

Juego web con pantalla principal del árbitro y controles privados en el celular. Preparado para ejecución local o publicación en Render.

## Publicar en Render

El repositorio incluye render.yaml y las instrucciones en [DEPLOY_RENDER.md](DEPLOY_RENDER.md). Solo queda importar el repositorio como Blueprint y confirmar el despliegue. La demo usa el plan Free sin disco ni base de datos. Las salas son temporales y se borran cuando el servidor reinicia o se suspende.

## Abrir

Requiere Node.js, sin dependencias:

```sh
node server.js
```

PC: http://127.0.0.1:5173/#home. El lobby muestra el enlace de red para abrir /play en los celulares. Para acceder desde distintas redes, publica el servidor con el Blueprint de Render incluido.

## Sala y reparto

Se configuran cantidad de jugadores (2–100) y modalidad presencial o virtual. Cada partida nueva reparte exactamente 8 cartas. Se usan varias copias del mazo cuando hace falta, con IDs únicos. Los móviles esperan hasta que el árbitro inicia.

Al iniciar, PC y móviles muestran una animación breve de barajar y repartir. Las cartas entran en la mano de forma escalonada. La animación se identifica por el reparto y no se repite al recargar una partida antigua. Respeta la preferencia de reducir movimiento.

Cada teléfono recibe solo su mano. La principal recibe cantidades, turno, dirección y descarte. En la demo gratuita, STORAGE_MODE=ephemeral mantiene las salas solo en memoria: recargar conserva la sesión mientras el servidor siga activo; reiniciar o suspender el servidor borra las salas. Las salas, credenciales, manos y reacciones se guardan en .runtime/rooms.json en local, o en DATA_DIR/rooms.json en Render, excluido del repositorio y del servidor de archivos. Recargar o reiniciar conserva la sesión.

## Jugar, coger y pasar

Solo el propietario puede jugar una carta durante su turno. Se permite jugar por coincidencia de color, de número o del mismo tipo de carta especial (por ejemplo, reversa sobre reversa o bloqueo sobre bloqueo de cualquier color). Las cartas bicolor coral/lila y amarillo/turquesa admiten cualquiera de sus dos colores, tanto para jugarlas como para continuar después. La siguiente carta fija sus propios colores. Los números se reconocen también en las cartas con preguntas o retos. Las acumulaciones mantienen su validación de tipo y valor. Las cartas se juegan directamente haciendo clic o tocándolas, sin botón adicional. El cursor eleva una carta a la vez.

Solo puede cogerse UNA carta ordinaria en el turno propio. El servidor registra el robo, por lo que recargar o pulsar dos veces no permite coger otra. Robar no cambia automáticamente el turno. Si la carta robada no se puede jugar, aparece Pasar turno; también se permite jugar otra carta válida de la mano. Si la carta robada es válida, se debe jugar una carta válida en vez de pasar. Pasar sin haber robado o fuera de turno se rechaza.

## Acumulaciones

Las cadenas de CARTAS y SHOTS se mantienen separadas. +2 admite +2 o +4 del mismo tipo; +4 solo admite +4. Durante la cadena no se permite jugar cartas ordinarias ni pasar para evitar el castigo.

El límite de una carta ordinaria no reduce una penalización acumulada: si se aceptan, por ejemplo, 6 cartas, se cogen las 6 y se pierde el turno. Se comprueba la eliminación al terminar de recibirlas. Las penalizaciones de shots se confirman desde el teléfono y también hacen perder el turno. Aceptar una penalización +2, +4 o acumulada, de cartas o de shots, pasa al siguiente jugador activo. La principal muestra la cantidad acumulada y el botón de robo indica cuántas cartas corresponden.

## Eliminación

Con 25 cartas se puede continuar; al superar 25 el jugador queda eliminado inmediatamente. Los turnos, elecciones y acciones pendientes omiten a los eliminados. Su móvil muestra el motivo, oculta la mano y deja de permitir jugar, robar o lanzar el dado. Puede seguir viendo la partida y reaccionar mientras la sesión siga en curso. Si queda una sola persona, gana; si todos quedan eliminados, la partida termina sin ganador.

La regla también se aplica al cargar partidas anteriores con manos que ya superaban el límite. Un reparto nuevo restablece la participación y vuelve a dar 8 cartas por persona.

## Dado y cartas escritas

Solo el destinatario puede lanzar el dado. En virtual el servidor genera un entero de 1 a 6 y móvil/principal muestran el mismo resultado animado; repetir la petición no vuelve a sortear. En presencial se indica lanzar el dado físico y confirmar. La elección presencial de quién lanza se hace por voz, sin lista digital.

cards.js contiene los textos de las 14 cartas numéricas escritas revisadas. Se muestran ampliadas con zoom, sin títulos adicionales. En preguntas y retos, quien lanzó la carta evalúa Cumplido o No cumplido desde su móvil; el receptor espera esa evaluación. Las acciones de selección conservan su confirmación específica. En virtual las cartas que piden elegir otra persona muestran participantes conectados que no estén eliminados. Verdad o reto muestra la duda sin generar una pregunta; se propone verbalmente.

Reversa cambia la dirección y bloqueo salta al siguiente jugador. Los efectos de la última carta se resuelven antes de anunciar la victoria.

## Reacciones persistentes

El móvil tiene risa, fuego, genial y corazón. Cada envío se añade al historial con un ID distinto y el nombre autenticado del jugador. Una persona puede acumular varias reacciones, incluso repetidas. Ninguna se sustituye ni desaparece por tiempo, y no hay un límite de seis visibles: el panel tiene desplazamiento para recorrer todas.

El historial se conserva al recargar la principal y al reiniciar el servidor. Se vacía cuando termina la partida o empieza una sesión/reparto nuevo. Los eventos en vivo y el historial se deduplican por ID, sin duplicarlos al reconectar. Las reacciones no afectan a manos ni turnos; se limita únicamente la repetición inmediata de peticiones.

## Alcance pendiente

Quedan por completar las reglas de repartir más de 10 shots con ayudante y el cumplimiento coordinado de un próximo reto compartido. No hay grabación ni reconocimiento de voz, ni videollamada integrada.

## Verificación

```sh
node --check app.js
node --check mobile.js
node --check server.js
node --check deck.js
node --check game.js
node --check deal-animation.js
node --test tests/confirmations.test.js tests/game.test.js tests/reactions.test.js tests/invitations.test.js tests/avatars.test.js
```

35 pruebas: privacidad y persistencia, ocho cartas, permisos de turno/propiedad/color/tipo, doble robo simultáneo, una carta por turno, pasar después de robar, umbral 25/26, eliminación por acumulación, suma de penalizaciones y reinicio de la cuenta al cumplirlas, turnos que saltan eliminados, dado virtual/físico, selecciones, victoria, historial de varias reacciones y limpieza al iniciar/terminar. En navegador se verificaron la animación inicial, robo con Pasar turno y dos reacciones del mismo jugador conservadas al recargar.

Vistas visuales sin conexión: /play?preview=hand, /play?preview=task y /play?preview=selection.

## Invitaciones por enlace y QR

El lobby presenta el enlace fijo /play para ingresar el código manualmente y un QR con /play?room=CODIGO para completar la sala automáticamente. Copiar invitación copia el código y el enlace directo. El jugador confirma su nombre antes de entrar. El QR se genera localmente con vendor/qrcode.js (MIT; licencia incluida), sin servicios externos.

Al publicar, puede configurarse PUBLIC_URL con el origen HTTPS del juego. Si no se configura, un navegador abierto en un dominio público usa ese mismo origen; en localhost se usa la dirección LAN disponible. En local los teléfonos deben acceder a la misma red.

## Avatares

Al unirse, cada jugador elige uno de los seis avatares transparentes de Resource/Users/Sin Fondo. avatars.js comparte el catálogo entre el servidor y las pantallas. El servidor valida la selección y la conserva con la sesión. El lobby, la mesa, el turno y la lista móvil muestran esa misma imagen. Las salas anteriores reciben un avatar predeterminado compatible.

## Evaluación y orientación móvil

Las preguntas, los retos y Verdad o reto guardan al emisor como evaluador. Solo su sesión puede marcar Cumplido o No cumplido. El receptor ve la carta y espera; terceros no reciben esa carta privada. No cumplido activa el dado para el receptor y respeta la modalidad virtual/presencial. Las evaluaciones repetidas no cambian el resultado ya registrado.

El teléfono se usa en horizontal. En vertical aparece una guía para girarlo, también al ingresar. El botón de pantalla completa intenta fijar orientación horizontal si el navegador lo permite; en los demás casos se gira el dispositivo manualmente.
