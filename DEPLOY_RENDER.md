# Publicar TODO O NADA en Render

El repositorio incluye `render.yaml`: configura el servicio web, Node.js, pruebas previas, comprobación de salud y disco persistente. PC y celulares usan el mismo servidor y dominio. No requiere Supabase, otra base de datos ni instalar dependencias.

## Único paso externo pendiente

1. Entra a https://dashboard.render.com y elige **New → Blueprint**.
2. Conecta tu cuenta de GitHub y selecciona **Rosas04/Todo-o-Nada**, rama **main**.
3. Render leerá `render.yaml`. Revisa y confirma el servicio **Starter** y el disco de **1 GB** antes de desplegar: tienen costo. No se ha contratado ningún servicio desde este proyecto.
4. Cuando indique **Live**, abre la URL HTTPS que Render asignó.

## Direcciones

- PC: `https://TU-SERVICIO.onrender.com/` para crear sala.
- Celulares: `https://TU-SERVICIO.onrender.com/play` para ingresar código, nombre y avatar.
- El QR y **Copiar invitación** incluyen el código automáticamente.
- Render asigna `RENDER_EXTERNAL_URL`; el juego la usa para construir las invitaciones públicas. El dominio concreto se conoce al crear el servicio.
- Para un dominio propio, conéctalo en Render y establece `PUBLIC_URL=https://tu-dominio.com`. Es opcional para las pruebas iniciales.

## Configuración incluida

| Configuración | Valor |
|---|---|
| Inicio | `node server.js` |
| Comprobación antes de publicar | `node scripts/check.js && node --test tests/*.test.js` |
| Puerto | `PORT`, proporcionado por Render |
| Dirección de escucha | `0.0.0.0` |
| Salud | `/healthz` |
| Persistencia | `/var/data/rooms.json` |
| Instancias | 1 |
| Actualizaciones | Manuales para elegir un momento sin partidas activas |

No subas `.runtime`, datos de salas ni credenciales a GitHub. La primera publicación comienza con salas nuevas. El disco conserva partidas al reiniciar o volver a publicar; los participantes reconectan con la sesión guardada en su navegador. Al publicar una nueva versión hay una interrupción breve; el disco no ofrece despliegue sin interrupciones.

Mantén una sola instancia: las salas se coordinan en memoria y se respaldan en el disco. Para ampliar a varias instancias hace falta almacenamiento compartido y coordinación entre servidores.

## Prueba después de que Render indique Live

1. Abre la principal y crea una sala para dos personas.
2. En un teléfono con datos móviles, escanea el QR; en otro, abre `/play` e introduce el código.
3. Elige nombres y avatares; comprueba que ambos aparecen conectados en el lobby.
4. Inicia y verifica ocho cartas privadas, turnos, penalizaciones, reacciones y dado virtual.
5. Recarga un teléfono y comprueba la reconexión sin volver a repartir.

Esta prueba entre redes reales solo puede completarse tras crear el servicio público.

## Referencias

- https://render.com/docs/blueprint-spec
- https://render.com/docs/web-services
- https://render.com/docs/disks
- https://render.com/docs/environment-variables
