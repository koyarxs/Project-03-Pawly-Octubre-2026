# Boletín de la veterinaria

El formulario público registra solicitudes en PostgreSQL, asociadas exclusivamente a `WEBSITE_CLINIC_ID`. Requiere consentimiento explícito, normaliza el correo y evita duplicados. No devuelve direcciones ni revela si una persona ya estaba registrada. El endpoint `POST /api/website/newsletter` valida Origin, cabecera CSRF y JSON; admite cinco solicitudes por minuto por IP.

La migración `20261023010000_newsletter_subscribers` añade una tabla, una clave foránea y restricciones. No modifica registros previos. Debe autorizarse antes de aplicarla a una base con datos.

## Correo de prueba local

Mailpit captura los mensajes en `http://localhost:8025`, mediante SMTP en `127.0.0.1:1025`. El servicio Docker se inicia con `docker compose --profile development up -d --no-deps mailpit`; ambos puertos están publicados solo en localhost. No se configura reenvío externo. El contenedor usa almacenamiento temporal: los mensajes pueden perderse si se recrea; las suscripciones se conservan en PostgreSQL.

Configurar en `apps/backend/.env`: `MAIL_MODE=local`, `MAIL_HOST=127.0.0.1`, `MAIL_PORT=1025`. El valor predeterminado es `MAIL_MODE=disabled`. El modo local rechaza ejecución en producción y destinos SMTP fuera de loopback; no usa credenciales ni imprime destinatarios o contenido en registros.

Cada solicitud nueva genera un acuse de registro en texto y HTML, claramente marcado como prueba local. Los duplicados conservan la respuesta genérica y no generan otro mensaje. Si SMTP falla, se revierte el alta nueva para permitir reintentar. La entrega SMTP se realiza dentro de la transacción **solo para este entorno de pruebas**; antes de habilitar proveedores reales debe sustituirse por una cola de salida persistente para gestionar reintentos y fallos de commit sin duplicar mensajes.

Esto habilita la **recepción de solicitudes y acuses locales**, no el envío de campañas. No hay automatización de campañas, verificación de propiedad de la dirección ni baja pública configurados. Antes de enviar novedades reales deben incorporarse confirmación de dirección, mecanismo de baja y un proveedor de correo. No se enviarán campañas automáticamente a los correos guardados. La interfaz confirma únicamente el registro de la solicitud.

La vista previa del editor mantiene el formulario desactivado. Los errores de conexión y del servidor se muestran sin simular suscripciones exitosas.
