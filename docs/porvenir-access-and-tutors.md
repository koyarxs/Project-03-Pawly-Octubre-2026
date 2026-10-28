# Porvenir: usuarios, tutores y documentos

El registro público `/registrarse` crea directamente una cuenta personal dentro de la clínica indicada por `WEBSITE_CLINIC_ID`, con nombre, correo, contraseña y cargo. No pide códigos ni invitaciones y abre la sesión al completar el registro. Los cargos disponibles son medicina veterinaria, recepción, asistencia veterinaria y peluquería canina. El registro no crea nuevas clínicas ni asigna el permiso de edición web. Las invitaciones desde Personal siguen disponibles como una vía adicional.

El endpoint `/auth/register-user` está habilitado en desarrollo y pruebas. Antes de habilitar acceso público en producción se debe definir la aprobación de cargos y la verificación de correo; no se habilita automáticamente el acceso de trabajadores a datos de una clínica en producción.

## Edición del sitio

`WEBSITE_EDITOR_MEMBERSHIP_ID` identifica la única membresía activa que recibe `website:manage`, dentro de `WEBSITE_CLINIC_ID`. Tener el rol de propietario o administrador no concede este permiso. Sin esa configuración, el editor permanece cerrado. Al desactivar la membresía o su usuario se pierde el acceso.

El script `apps/backend/scripts/provision-porvenir-users.cjs` crea seis cuentas **solo en desarrollo local** sin sustituir cuentas existentes. Guarda las claves en `tmp/porvenir-cuentas.json`, excluido de Git, y configura al editor. La cuenta editorial solo tiene lectura básica de la clínica y edición del sitio. Las demás cuentas usan los permisos existentes de sus cargos.

Los permisos clínicos siguen requiriendo verificación independiente del profesional desde Personal por el propietario. Crear una cuenta no verifica títulos ni habilita el ejercicio médico.

## Datos de tutores

La migración `20261027000000_tutor_identity` agrega RUT, previsión, institución y tramo Fonasa al tutor, y RUT del responsable a las reservas. Los registros anteriores se conservan sin inventar sus datos. El formulario y la API requieren un RUT válido al crear tutores; la API valida y normaliza cualquier RUT recibido. La validación de módulo 11 no consulta el Registro Civil ni acredita identidad.

La previsión es opcional y pertenece al tutor. La ficha del paciente la muestra junto a sus responsables solamente con permiso `tutor:read`.

## Archivos clínicos

La ficha del paciente permite adjuntar PDF, JPEG y PNG de hasta 5 MB, con un máximo de 100 documentos por paciente. Se guardan en PostgreSQL con relaciones compuestas por clínica; no hay URLs públicas. Subir requiere `consultation:write`; listar y descargar requieren `consultation:read` y acceso al paciente. Se comprueba la firma del formato y se entrega como descarga privada, sin caché. Esta validación no es un análisis antivirus.

## Google Maps

Se conserva el mapa actual y se abre en otra pestaña, con indicaciones para escribir una reseña desde Google. La dirección configurada no proporciona por sí sola el identificador de una ficha comercial. Para mostrar reseñas reales mediante la integración existente se requieren `GOOGLE_PLACES_API_KEY` y `GOOGLE_PLACE_ID`; el sitio no simula la autenticación de Google.

## Despliegue

Ejecutar `prisma generate`, `prisma migrate deploy` y reiniciar la API con las variables del editor. Las cuentas y claves locales no se publican ni se transfieren automáticamente a otro entorno.
