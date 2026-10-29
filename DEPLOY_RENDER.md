# Publicar gratis la demo en Render

Esta demo mantiene el juego completo en un servicio Node.js gratuito. No necesita disco, base de datos ni Supabase. El archivo render.yaml usa plan: free y STORAGE_MODE=ephemeral. No incluye recursos de pago.

## Desde el panel de Render

Para elegir explícitamente el plan gratuito:

1. Entra a https://dashboard.render.com y selecciona **New → Web Service**.
2. Conecta GitHub y el repositorio **Rosas04/Todo-o-Nada**, rama **main**.
3. Selecciona **Node** y deja Root Directory vacío.
4. Build Command: `node scripts/check.js && node --test tests/*.test.js`.
5. Start Command: `node server.js`.
6. Instance Type: **Free**. No agregues disco ni base de datos.
7. En Environment añade `STORAGE_MODE=ephemeral` y `NODE_ENV=production`.
8. En Health Check Path coloca `/healthz`. Desactiva los despliegues automáticos para elegir cuándo actualizar.
9. Crea el servicio. Cuando indique **Live**, abre su enlace HTTPS.

También puedes usar **New → Blueprint** con el render.yaml actualizado. Debe mostrar únicamente un servicio **Free**, sin disco. Si sigues viendo Starter o un disco, la pantalla está usando la configuración anterior: recarga o comienza una nueva creación. No aceptes un recurso de pago para esta demo.

Si ya creaste un servicio pagado, cambiar este archivo no garantiza que Render elimine su disco o detenga su facturación. Revisa esos recursos en tu panel por separado; esta actualización no los modifica desde aquí.

## Enlaces

- PC: `https://TU-SERVICIO.onrender.com/` para crear sala.
- Jugadores: `https://TU-SERVICIO.onrender.com/play` para ingresar código, nombre y avatar.
- El QR y Copiar invitación incluyen la sala automáticamente.
- Render proporciona PORT y RENDER_EXTERNAL_URL; no necesitas inventar ni escribir la URL final.
- Un dominio propio es opcional. Para utilizarlo, configura PUBLIC_URL con su origen HTTPS.

## Límites de la demo gratuita

- Las salas y partidas viven en la memoria del servidor.
- Recargar el teléfono conserva la sesión mientras el servidor siga funcionando.
- Un reinicio, suspensión o despliegue borra las salas. Crea una nueva para seguir probando.
- Render suspende servicios gratuitos tras 15 minutos sin tráfico; al volver a abrirlos pueden tardar alrededor de un minuto en arrancar.
- No hay historial permanente, rankings guardados ni garantía de continuidad de una partida ante reinicios.
- La gratuidad depende de las cuotas del proveedor. No agregues recursos de pago y comprueba los límites de consumo de tu cuenta.

## Prueba con personas

1. Desde una PC crea una sala para dos jugadores.
2. Un teléfono con datos móviles entra por QR; otro por enlace y código.
3. Ambos eligen nombre y avatar y esperan en el lobby.
4. Inicia y comprueba las ocho cartas privadas, turnos, acumulaciones, reacciones y dado.
5. Recarga un teléfono y verifica que vuelve a la partida.

La prueba desde redes reales solo puede completarse después de publicar el servicio.

## Referencia

https://render.com/docs/free