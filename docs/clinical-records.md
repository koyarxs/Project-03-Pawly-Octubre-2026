# Tutores y pacientes — Sprint 07

## Modelo y aislamiento

Cada `Tutor` y `Patient` pertenece a una `VeterinaryClinic`. Los datos de una persona atendida en dos clínicas se mantienen como registros independientes; no hay búsqueda ni deduplicación global de datos personales.

`PatientTutor` implementa una relación muchos a muchos sin jerarquía de responsables. Cada paciente creado mediante la API requiere entre 1 y 10 tutores activos de la misma clínica. Un tutor puede tener varios pacientes. La tabla tiene PK `(clinicId, patientId, tutorId)` y dos FK compuestas que referencian `(id, clinicId)` de sus padres. PostgreSQL rechaza una asociación entre clínicas incluso si se omite la validación de aplicación. Todas las FK usan `RESTRICT`. El mínimo de responsables y su estado activo se validan en transacciones de aplicación; no se añaden triggers.

El microchip se normaliza a mayúsculas y es único dentro de la clínica, permitiendo que distintas clínicas atiendan a la misma mascota sin revelar información entre ellas. La especie y sexo usan enumeraciones; `OTHER` y `UNKNOWN` permiten información todavía no determinada. El peso se almacena como `Decimal(8,3)` y se comunica en kg como número, con rango API de 0,001 a 10.000. La fecha de nacimiento es una fecha de calendario sin hora, opcional, entre 1900 y el día actual UTC. Los campos opcionales pueden borrarse mediante `null`; nombre, apellidos, teléfono, especie, sexo y responsables no admiten `null` al editar.

## API

Todos los endpoints requieren sesión y membresía activa del usuario en una clínica activa. `SessionGuard` autentica y `ClinicGuard` obtiene `request.clinic` comprobando membresía y permisos; el servicio utiliza ese ID validado. No se acepta `clinicId`, rol o identidad en el cuerpo ni en la consulta.

| Método | Ruta bajo `/api/clinics/:clinicId` | Permiso |
| --- | --- | --- |
| GET / POST | `/tutors` | `tutor:read` / `tutor:write` |
| GET / PATCH | `/tutors/:id` | `tutor:read` / `tutor:write` |
| GET | `/tutors/:id/patients` | `tutor:read`, `patient:read` |
| PATCH | `/tutors/:id/archive` | `clinical:archive` |
| GET / POST | `/patients` | `patient:read` / `patient:write` |
| GET / PATCH | `/patients/:id` | `patient:read` / `patient:write` |
| PATCH | `/patients/:id/archive` | `clinical:archive` |

Las listas aceptan `q` (hasta 100 caracteres), `page` (1–10.000), `limit` (1–50; predeterminado 20) y `status`. Devuelven `{items,total,page,limit,totalPages}` con orden determinista. Búsqueda y conteo siempre filtran por clínica. La búsqueda por términos admite nombres completos y, para pacientes, los datos del responsable. Por defecto se omiten los archivados; los pacientes fallecidos siguen disponibles. Las listas no incluyen dirección ni observaciones del tutor. Las fichas autorizadas incluyen los campos necesarios para su consulta y edición.

Las mutaciones exigen Origin permitido, JSON y `X-Pawly-CSRF: 1`; CORS ahora permite PATCH. Se conservan cookies HttpOnly, rate limiting, errores genéricos y `Cache-Control: no-store`, también ante fallos de parser. Las contraseñas, cookies, tokens, datos personales y cuerpos no se registran en logs.

## Permisos y archivado

| Rol activo | Consultar | Crear/editar tutores | Crear/editar pacientes | Archivar |
| --- | --- | --- | --- | --- |
| OWNER / ADMIN | Sí | Sí | Sí | Sí |
| VETERINARIAN | Sí | Sí | Sí | No |
| RECEPTIONIST | Sí | Sí | No | No |

Esta primera política separa la gestión de contacto de la edición de fichas de pacientes. Los controles visuales reflejan el rol confirmado por el servidor; los permisos se vuelven a exigir en cada endpoint. Una URL o selección del navegador no otorga acceso.

No hay DELETE. El archivado conserva registros y relaciones, los retira del listado predeterminado y bloquea nuevas ediciones. No se puede archivar un tutor con pacientes sin archivar: primero hay que reasignarlos o archivarlos. Los tutores archivados no se pueden asociar a nuevos pacientes. Reemplazar responsables se realiza atómicamente; una asociación inválida conserva la información anterior. Las mutaciones usan aislamiento serializable y convierten conflictos Prisma esperables a HTTP 409 seguro. No se incluyen restauración, historial/auditoría de cambios ni control de versiones para resolver ediciones humanas concurrentes; no hay garantía de detectar un formulario que llevaba tiempo abierto.

## Interfaz

Rutas `/app/clinicas/:clinicId/tutores` y `/pacientes`, con `/nuevo`, `/:id` y `/:id/editar`. Reutilizan `WorkspaceShell`, sesión, autorización, navegación móvil, selector de clínica y logout. El cambio de clínica lleva al listado equivalente y desmonta las solicitudes y formularios anteriores. Las fichas esperan la autorización y luego su carga propia; no se serializan datos personales en el HTML inicial. Las respuestas se validan, incluyendo el ID de clínica. No se guardan fichas, borradores ni tokens en almacenamiento del navegador. Un formulario no guardado se pierde al navegar.

Las pantallas usan datos de API reales. Los indicadores de pacientes dan acceso a su módulo; no se fabrican cifras. Agenda, consultas, vacunación, inventario, reportes y configuración siguen deshabilitados. La landing no cambia.

## Migración y QA

La migración nueva versionada es `20261015010000_clinical_tutors_patients`; no modifica migraciones previas. Se generó mediante diff offline entre los esquemas anterior y nuevo. Su aplicación se valida únicamente en esquemas temporales propiedad de cada proceso de pruebas, nunca en `public`.

- Backend: Prisma validate/generate, TypeScript, lint, build, `npm test`, `npm run test:integration`.
- Frontend: `next typegen` en un checkout nuevo, TypeScript, lint, build, `npm run test:unit`, `npm run test:e2e`, `npm run test:e2e:real`.
- HTTP/PostgreSQL: las pruebas existentes y clínicas comparten una instancia aislada con fixtures independientes; comprueban FK, lecturas/mutaciones ajenas, búsqueda, paginación, roles, suspensión, CSRF y archivado.
- Playwright: contratos controlados para validación y errores, más flujos reales en escritorio y móvil. La API de QA utiliza 4001 y Next 3100. Los usuarios y registros QA solo existen en el esquema temporal.
- Ambos runners verifican conexión local `pawly`/loopback:5433 y esquema propio, y comparan estructura y huellas de todas las filas de `public`. Limpian exclusivamente las tablas/tipos conocidos y su esquema con RESTRICT, sin CASCADE. Un fallo de limpieza o cambio en public falla el comando. No limpian esquemas ajenos.

El navegador de QA bloquea cualquier destino distinto de Next 3100 y Nest 4001; no puede llamar a 3000/3001 ni a servicios externos. Las comprobaciones de huellas requieren evitar el uso concurrente de la aplicación de desarrollo: cada autenticación de una petición actualiza `Session.lastSeenAt`. Si se detecta esa actividad, la comprobación también falla y se debe repetir; no se omiten columnas ni se relaja la aserción, y no se detienen los servicios del usuario.

El Sprint se desarrolla en un worktree independiente (`tmp/sprint07-clinical`) con copias locales de dependencias y Prisma Client para mantener los servicios del usuario en 3000/3001. La migración no está aplicada a su base de desarrollo. Para utilizar estos módulos allí será necesario autorizar su aplicación posteriormente, una vez revisado el PR. No se ha creado un entorno clínico persistente ni se han insertado datos de demostración en datos reales.
