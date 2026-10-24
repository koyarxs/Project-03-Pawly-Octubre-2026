# Agenda veterinaria

> Ampliación local validada el 23-10-2026. Resultados y autorizaciones en [appointments-progress.md](appointments-progress.md); acceso a los datos de prueba en [appointments-demo.md](appointments-demo.md). La demostración está diferenciada de la clínica real y bloqueada para reservas de producción.

## Agendamiento público y administración

La navegación privada se llama **Agendamiento** y conserva la ruta por clínica. Añade calendario mensual, citas del día, próximas citas, solicitudes públicas, historial, disponibilidad, servicios y configuración. Los botones públicos **Agendar cita** abren `/agendar-cita`, que resuelve la clínica configurada del sitio. También existe `/reservar/[clinicSlug]`.

Servicios, duración, preparación, recurso exclusivo, horarios de clínica/profesionales, excepciones, anticipación, cancelación, confirmación y asignación automáticas son configuración de cada clínica. Por defecto la reserva pública está cerrada; no hay horarios ni profesionales inventados. La publicación de personal requiere consentimiento y habilitación médica real.

El motor comparte las transacciones y el bloqueo por clínica con citas privadas. Revalida en servidor cada escritura; horas mostradas no garantizan disponibilidad hasta guardar. Almacena UTC y calcula según zona IANA, incluyendo cambios de horario chileno.

La reserva pública usa `BookingRequest` y ocupa disponibilidad mientras está PENDING/CONFIRMED. No crea tutores/pacientes por coincidencia de correo o nombre. Recepción verifica identidad y vincula registros existentes para crear una `Appointment` con origen PUBLIC. Después ambas se sincronizan sin contabilizar dos veces la ocupación. El visitante solo consulta/modifica su reserva con referencia y clave aleatoria de 256 bits; se almacena únicamente su hash. El comprobante descargable contiene esa clave privada y debe guardarse de forma segura.

API pública `/api/bookings`: catálogo por slug, disponibilidad, creación y POST de consulta/reprogramación/cancelación con clave. API privada `/api/clinics/:clinicId/booking`: configuración, servicios, horario propio autorizado, disponibilidad, solicitudes, gestión e historial. Rutas privadas conservan sesión y permisos; escrituras públicas exigen origen permitido, JSON y cabecera CSRF. Límites de solicitudes, cuota por contacto y campo trampa reducen abuso; no sustituyen protección operativa de producción.

Las citas incorporan ARRIVED y NO_SHOW; la inasistencia futura se rechaza. Completadas, canceladas e inasistencias son terminales. Las acciones médicas conservan las credenciales y permisos existentes.

Notificaciones se guardan en una outbox transaccional; recepción, confirmación, reprogramación, cancelación, recordatorio y cambio de disponibilidad general. Solo `MAIL_MODE=local` en desarrollo y SMTP loopback permiten capturarlas en Mailpit (`http://localhost:8025`); no hay envío a bandejas reales, IA ni proveedor de pago. El recordatorio usa claves idempotentes y omite versiones obsoletas. SMTP no garantiza exactamente una entrega ante fallo entre aceptación y commit.

Migraciones `20261023040000_professional_booking` y `20261023050000_booking_audit_actions` aplicadas con autorización. La corrección habilita los eventos auditados de configuración, servicios y horario propio. No editar migraciones aplicadas.

Ruta privada: `/app/clinicas/:clinicId/agenda`. Se accede desde la navegación de la clínica o el dashboard. Calendario diario/semanal, búsqueda paginada de pacientes, filtros por estado/profesional y paginación de citas (100 por página). En móvil la semana se apila por día; cada tarjeta muestra hora, paciente, motivo, profesional y estado.

## Contrato y permisos

API bajo `/api/clinics/:clinicId/appointments`, protegida por sesión, membresía activa, CORS, CSRF y `no-store` existentes:

- `GET ?from=<UTC>&to=<UTC>&status=&professionalMembershipId=&page=`: citas que intersectan el intervalo semiabierto `[from,to)`, máximo 32 días.
- `GET /professionals`: miembros activos de roles médicos con permiso efectivo de consulta y credencial verificada por otro usuario autorizado; solo ID de membresía y nombre. No se inventan profesionales. Véase [Personal y Accesos](staff-access.md).
- `POST`: `patientId`, `tutorId`, `professionalMembershipId` (UUID o `null`, obligatorio), `startsAt` (ISO UTC con `Z`), `durationMinutes` (entero 5–480), `reason` (1–1000 caracteres).
- `PATCH /:id`: mismo cuerpo completo más `version` y `status`; al cancelar exige `cancellationReason`. El control de versión evita sobreescribir cambios de otra persona. Un conflicto exige recargar, no reintenta una edición obsoleta.
- `GET /:id/history`: cambios antes/después, autor y fecha; no se exponen hashes ni correos de usuarios.

Consultar exige `appointment:read`; crear, reprogramar, confirmar y cancelar requieren `appointment:write`. Los estados IN_PROGRESS/COMPLETED requieren además `appointment:clinical` y autorización médica verificada. El alcance de pacientes asignados también se aplica a listados, detalles y cambios. Transiciones: SCHEDULED ↔ CONFIRMED; ambos pueden pasar a IN_PROGRESS/CANCELLED; IN_PROGRESS puede pasar a COMPLETED/CANCELLED. COMPLETED/CANCELLED son terminales. No existe DELETE ni restauración.

Cada nueva cita y reprogramación debe comenzar en el futuro (tolerancia de 60 segundos). Se permiten actualizaciones de estado conservando la hora de citas anteriores. Paciente y tutor deben estar activos y vinculados; profesional, si existe, debe estar habilitado en esa misma clínica. Al cancelar se conservan paciente, tutor, motivo y horario originales, incluso si posteriormente se archivaron o desvincularon; no se aplican otros cambios del formulario.

## Persistencia y concurrencia

`Appointment` y `AppointmentEvent` usan claves foráneas compuestas por ID y `clinicId`, también para profesional y autor. PostgreSQL impide referencias entre clínicas y eliminación de registros referenciados. CHECK de duración, motivo y motivo de cancelación. Historial y cita se guardan en una sola transacción.

La detección de solapamientos usa `[startsAt,endsAt)`, excluye citas canceladas y se ejecuta dentro de una transacción READ COMMITTED con advisory lock por clínica, compartido con los cambios de acceso. Dos reservas concurrentes incompatibles producen un único ganador; el conflicto devuelve 409. Los horarios adyacentes se permiten. Sin profesional asignado no se bloquean horarios. Esta regla depende de las escrituras por el servicio; no hay restricción de exclusión SQL para escrituras administrativas directas. El aislamiento de referencias sí está impuesto en PostgreSQL.

Fechas en `timestamptz`, enviadas como UTC. La UI convierte a la zona IANA de `VeterinaryClinic.timezone`, con respaldo explícito `America/Santiago`. Los cálculos de fecha civil son independientes del huso horario del navegador. Las horas locales inexistentes o repetidas por DST se rechazan con un mensaje explícito; no se elige silenciosamente un desplazamiento.

## Migración y validación

`20261018010000_veterinary_appointments` es aditiva, generada offline y no modifica migraciones anteriores. Debe autorizarse antes de aplicar a una base con datos. Comando posterior a la aprobación: `npx.cmd --no-install prisma migrate deploy` desde `apps/backend`; regenerar cliente con `npm.cmd run prisma:generate` si corresponde.

Pruebas: unitarias backend (DTO/fechas/transiciones), HTTP/PostgreSQL (CRUD, historial, concurrencia, conflictos, permisos, CSRF, relaciones/FK, filtros, versiones), unitarias frontend (UTC/DST), y Playwright real en escritorio/móvil (creación, reprogramación, cancelación, historial, errores y desbordamiento). Los runners crean exclusivamente esquemas temporales propios, comparan estructura y huellas de `public` y limpian sus objetos con RESTRICT. Cada archivo de pruebas y proyecto de navegador (escritorio/móvil) usa su propia instancia Nest/esquema para no compartir contadores de rate limiting entre proyectos; los límites reales permanecen activos. No utilizan citas reales para fixtures.

Las aserciones DOM de QA real esperan hasta 15 segundos para incluir autorización y carga secuencial desde PostgreSQL. Conservan las mismas condiciones y respuestas esperadas; no se desactivan controles de seguridad.

Límites vigentes: sin recurrencia, arrastrar/soltar ni sincronización en tiempo real; se ofrece Actualizar. Un recurso exclusivo por servicio, sin capacidad múltiple. Reservas pendientes no caducan automáticamente. Franjas por día; turnos nocturnos deben dividirse. Los cambios de horarios no cancelan automáticamente reservas anteriores. El historial se consulta por cita/reserva, no es auditoría global. Canceladas/completadas conservan referencias; la aplicación archiva registros.

Integración con [consultas](consultations.md): una cita puede tener una atención. Guardar su borrador pasa la cita a en atención; finalizar la completa de forma atómica. Las citas vinculadas se gestionan desde la consulta y conservan su historial.
