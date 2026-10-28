# Reserva veterinaria y comprobantes de Porvenir

La reserva pública está en `/agendar-cita` y `/reservar/[clinicSlug]`.

## Recorrido

1. RUT del tutor, con validación de formato y dígito verificador.
2. Atención veterinaria: solo se muestran los servicios publicados del catálogo.
3. Búsqueda por atención o nombre del profesional, siempre limitada al equipo compatible con el servicio.
4. Franja semanal y selector de fecha; horarios obtenidos de la disponibilidad del backend.
5. Datos del tutor, correo, teléfono, mascota, especie y motivo.
6. Resumen y consentimiento antes de enviar. El comprobante conserva el estado pendiente o confirmado que devuelve el servidor.

Cambiar de servicio o profesional descarta el horario elegido. El backend vuelve a validar la disponibilidad y mantiene su protección contra reservas simultáneas e intentos duplicados.

## PDF, correo y calendario

- `POST /api/bookings/:slug/receipt` genera un PDF con datos actuales de la reserva, identidad de la clínica, enlaces de gestión y ubicación.
- `POST /api/bookings/:slug/calendar` devuelve un archivo ICS únicamente para reservas confirmadas.
- Ambos reciben `{ reference, managementToken }` por JSON, con las mismas restricciones de origen del resto de la reserva. No llevan claves en la ruta ni en la consulta.
- El comprobante se descarga desde la pantalla final y desde la gestión privada de la reserva.
- El worker de notificaciones procesa eventos confirmados en base de datos cada 15 segundos. Usa la dirección registrada en esa reserva; el correo del remitente se configura por separado.
- El correo contiene HTML, alternativa de texto, logo embebido y PDF adjunto. Las citas confirmadas incluyen una invitación ICS; las cancelaciones pueden actualizar el mismo evento mediante su UID y versión.
- Una solicitud pendiente no crea una invitación confirmada.
- Los enlaces de correo usan una clave derivada con HMAC. `BOOKING_LINK_SECRET` debe ser aleatoria, privada y estable. El token original continúa funcionando. La clave viaja en el fragmento del enlace, se lee una sola vez y se retira de la barra de dirección. Abrir el enlace consulta la reserva: no cancela ni reprograma automáticamente.
- La pantalla distingue envío pendiente, aceptado por el proveedor, fallido o no configurado. La aceptación SMTP no prueba lectura ni entrega final en la bandeja del destinatario.

## Activar Gmail

La dirección solicitada por el usuario está guardada en `apps/backend/.env`, en `MAIL_USER` y `MAIL_FROM`. El transporte se mantiene local hasta ingresar la contraseña de aplicación.

Desde PowerShell, ejecutar en la raíz del repositorio:

```powershell
node ./apps/backend/scripts/configure-booking-gmail.cjs
```

El script solicita la contraseña de aplicación de Gmail con entrada oculta, conserva el resto del `.env` y configura SMTP de Gmail en el puerto 587 con STARTTLS. No usa la contraseña normal de la cuenta ni imprime el secreto. Reiniciar el backend después.

Configuración equivalente:

```dotenv
MAIL_MODE=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=tu-cuenta@gmail.com
MAIL_FROM=tu-cuenta@gmail.com
MAIL_PASSWORD=contraseña-de-aplicación
PUBLIC_SITE_URL=https://tu-dominio
BOOKING_LINK_SECRET=clave-aleatoria-de-al-menos-32-caracteres
```

En una instalación publicada, `PUBLIC_SITE_URL` debe apuntar al dominio accesible de la clínica. Los datos de ubicación vienen de la publicación de su web; para la clínica configurada también existen `WEBSITE_PUBLIC_ADDRESS` y `WEBSITE_PUBLIC_PHONE` como respaldo.

El modo `local` usa únicamente Mailpit en loopback y no entrega a Gmail. El modo `disabled` no envía. No se presenta una captura local como un correo enviado al destinatario.

## Revisar el diseño sin crear una cita

```powershell
cd apps/backend
node --env-file=.env scripts/preview-booking-receipt.cjs
```

Produce `output/pdf/comprobante-porvenir-vista-previa.pdf` y `tmp/booking-preview/correo.html`. La vista previa no crea una reserva ni envía mensajes.

La referencia de donación humana se utilizó solo como orientación visual. No se copiaron sus indicaciones médicas al comprobante veterinario.
