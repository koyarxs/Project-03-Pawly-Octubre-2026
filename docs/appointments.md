# Agenda veterinaria

Ruta privada: `/app/clinicas/:clinicId/agenda`. Se accede desde la navegación de la clínica o el dashboard. Calendario diario/semanal, búsqueda paginada de pacientes, filtros por estado/profesional y paginación de citas (100 por página). En móvil la semana se apila por día; cada tarjeta muestra hora, paciente, motivo, profesional y estado.

## Contrato y permisos

API bajo `/api/clinics/:clinicId/appointments`, protegida por sesión, membresía activa, CORS, CSRF y `no-store` existentes:

- `GET ?from=<UTC>&to=<UTC>&status=&professionalMembershipId=&page=`: citas que intersectan el intervalo semiabierto `[from,to)`, máximo 32 días.
- `GET /professionals`: miembros activos OWNER/ADMIN/VETERINARIAN con usuario activo; solo ID de membresía y nombre. No se inventan profesionales. Un propietario/administrador puede ser responsable provisional; no se valida acreditación profesional en esta versión.
- `POST`: `patientId`, `tutorId`, `professionalMembershipId` (UUID o `null`, obligatorio), `startsAt` (ISO UTC con `Z`), `durationMinutes` (entero 5–480), `reason` (1–1000 caracteres).
- `PATCH /:id`: mismo cuerpo completo más `version` y `status`; al cancelar exige `cancellationReason`. El control de versión evita sobreescribir cambios de otra persona. Un conflicto exige recargar, no reintenta una edición obsoleta.
- `GET /:id/history`: cambios antes/después, autor y fecha; no se exponen hashes ni correos de usuarios.

Los cuatro roles consultan, crean, reprograman, confirman y cancelan. Solo OWNER/ADMIN/VETERINARIAN pueden pasar a IN_PROGRESS/COMPLETED. Transiciones: SCHEDULED ↔ CONFIRMED; ambos pueden pasar a IN_PROGRESS/CANCELLED; IN_PROGRESS puede pasar a COMPLETED/CANCELLED. COMPLETED/CANCELLED son terminales. No existe DELETE ni restauración.

Cada nueva cita y reprogramación debe comenzar en el futuro (tolerancia de 60 segundos). Se permiten actualizaciones de estado conservando la hora de citas anteriores. Paciente y tutor deben estar activos y vinculados; profesional, si existe, debe estar habilitado en esa misma clínica. Al cancelar se conservan paciente, tutor, motivo y horario originales, incluso si posteriormente se archivaron o desvincularon; no se aplican otros cambios del formulario.

## Persistencia y concurrencia

`Appointment` y `AppointmentEvent` usan claves foráneas compuestas por ID y `clinicId`, también para profesional y autor. PostgreSQL impide referencias entre clínicas y eliminación de registros referenciados. CHECK de duración, motivo y motivo de cancelación. Historial y cita se guardan en una sola transacción.

La detección de solapamientos usa `[startsAt,endsAt)`, excluye citas canceladas y se ejecuta dentro de una transacción SERIALIZABLE. Dos reservas concurrentes incompatibles producen un único ganador; el aborto de serialización se convierte en 409. Los horarios adyacentes se permiten. Sin profesional asignado no se bloquean horarios. Esta regla depende de las escrituras por el servicio; no hay restricción de exclusión SQL para escrituras administrativas directas. El aislamiento de referencias sí está impuesto en PostgreSQL.

Fechas en `timestamptz`, enviadas como UTC. La UI convierte a la zona IANA de `VeterinaryClinic.timezone`, con respaldo explícito `America/Santiago`. Los cálculos de fecha civil son independientes del huso horario del navegador. Las horas locales inexistentes o repetidas por DST se rechazan con un mensaje explícito; no se elige silenciosamente un desplazamiento.

## Migración y validación

`20261018010000_veterinary_appointments` es aditiva, generada offline y no modifica migraciones anteriores. Debe autorizarse antes de aplicar a una base con datos. Comando posterior a la aprobación: `npx.cmd --no-install prisma migrate deploy` desde `apps/backend`; regenerar cliente con `npm.cmd run prisma:generate` si corresponde.

Pruebas: unitarias backend (DTO/fechas/transiciones), HTTP/PostgreSQL (CRUD, historial, concurrencia, conflictos, permisos, CSRF, relaciones/FK, filtros, versiones), unitarias frontend (UTC/DST), y Playwright real en escritorio/móvil (creación, reprogramación, cancelación, historial, errores y desbordamiento). Los runners crean exclusivamente esquemas temporales propios, comparan estructura y huellas de `public` y limpian sus objetos con RESTRICT. Cada proyecto de navegador (escritorio/móvil) usa su propia instancia Nest/esquema para no compartir contadores de rate limiting entre proyectos; los límites reales permanecen activos. No utilizan citas reales para fixtures.

Las aserciones DOM de QA real esperan hasta 15 segundos para incluir autorización y carga secuencial desde PostgreSQL. Conservan las mismas condiciones y respuestas esperadas; no se desactivan controles de seguridad.

Límites: sin recurrencia, arrastrar/soltar, recordatorios, horarios laborales, salas, bloqueos de vacaciones ni gestión de integrantes. No hay sincronización en tiempo real; se ofrece Actualizar. El historial se consulta por cita, no es una auditoría global del SaaS. Canceladas/completadas conservan sus referencias y pueden impedir borrados administrativos; la aplicación archiva registros.
