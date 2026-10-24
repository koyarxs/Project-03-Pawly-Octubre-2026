# Pawly Appointments — estado final local

Actualizado: 23 de octubre de 2026. Rama `feature/appointments-booking`.

## Actualización: proyecto personal ficticio

### Presentación del agendamiento

El portal público incorpora el logo de Porvenir, fotografía veterinaria grande a la izquierda y reserva a la derecha, acentos verde agua y tarjetas claras. Se descargaron dos fotografías nuevas de Pexels y se creó una ilustración original de perro y gato para Pawly, optimizada en WebP. Los créditos están en `apps/frontend/public/images/booking/sources.md`. Los personajes y trazos decorativos tienen animaciones CSS suaves con soporte de movimiento reducido. Los accesos rápidos solo aparecen para servicios configurados con profesionales compatibles y permiten seleccionar la atención. En móvil, la composición pasa a una columna.

Camila, Matías y Valentina conservan sus retratos distintos y su área de atención; las asociaciones visuales se limitan a esos perfiles ficticios. Se retiró «Sin preferencia»: el usuario selecciona explícitamente a un profesional compatible, incluso cuando el servicio tiene un único encargado. No se cambió la política de asignación del backend. Los avisos grandes de demostración se sustituyeron por una nota discreta de datos ficticios. Los nombres y descripciones iniciales se presentan sin prefijos técnicos en el portal; no se renombraron registros ni se cambiaron credenciales o restricciones. El administrador de servicios reutiliza los mismos iconos.

Última revisión visual: TypeScript, ESLint, compilación de Next.js y diez pruebas de interfaz de reservas aprobadas (escritorio/móvil), incluyendo retratos, accesos rápidos, movimiento reducido, selección explícita y restricción de cirugía al médico asignado. Revisión visual local a 1440 y 390 píxeles sin desbordamiento horizontal y con las imágenes visibles cargadas. La revisión anterior también verificó dos recorridos con PostgreSQL real que completaron creación, confirmación, llegada, atención, finalización e historial; sus esquemas aislados se retiraron con RESTRICT y las huellas de public permanecieron intactas.

El usuario aclaró que el objetivo es un proyecto personal completamente ficticio. La preparación de hosting, dominio y entrega de correo externo no forma parte de esta activación local; no se contrató ni activó ningún servicio externo.

- Se añadieron ocho tutores y ocho pacientes ficticios a la clínica DEMOSTRACIÓN, conservando las ediciones existentes.
- Se añadió un perfil de simulación del propietario únicamente en ese tenant. Las credenciales siguen sin verificar; effectivePermissions permite facultades simuladas solo en development/test, para el UUID configurado y perfiles marcados. Las denegaciones siguen prevaleciendo; en producción no se concede esa autoridad.
- El propietario puede recorrer el flujo de estados completo sin iniciar sesión como los profesionales ficticios. La interfaz privada muestra un aviso de simulación.
- Se cargaron seis citas de ejemplo mediante el motor y AppointmentsService: programada, confirmada, en espera, en atención, completada y cancelada. Se añadió una séptima cita histórica marcada como importación ficticia; su transición a inasistencia se realizó mediante el servicio normal. Todas conservan historial. La aplicación continúa rechazando crear citas pasadas y marcar inasistencia futura.
- Verificación adicional: 120 unitarias backend, 15 unitarias frontend, 25 de integración de agendamiento y 83 de autenticación aprobadas; build, TypeScript y ESLint aprobados. Dos nuevos recorridos de navegador con PostgreSQL real (personal-demo.real, escritorio/móvil) completaron creación, confirmación, llegada, atención, finalización e historial con credenciales ficticias sin verificar.
- No hay nuevas migraciones en esta ampliación. Los datos originales y credenciales de la cuenta propietaria se conservan. Guía actualizada en appointments-demo.md.

## Implementación y configuración

- Se reutilizaron autenticación, permisos, clínicas, personal, tutores, pacientes, citas, historia y consultas. El trabajo local anterior se conserva. No se realizaron commits, push ni PR.
- Dashboard: Agendamiento en `/app/clinicas/:clinicId/agenda`, con calendario diario/semanal/mensual, citas del día, próximas citas, solicitudes, historial, disponibilidad, servicios y configuración.
- Motor compartido entre portal y gestión privada: horarios de clínica/profesionales, duración, preparación, recurso exclusivo, feriados, vacaciones, ausencias, bloqueos, anticipación, horizonte y políticas. UTC, zona IANA y DST de Chile.
- Portal `/agendar-cita` y `/reservar/[clinicSlug]`: servicios configurables, selección o asignación automática, disponibilidad real, consentimiento, solicitud pendiente/confirmada, comprobante y clave privada para gestionar cambios. Los botones de la landing dicen Agendar cita.
- Solicitudes públicas no crean identidades clínicas automáticamente. El personal verifica al tutor y vincula paciente/tutor existentes. Los módulos normales permiten registrar nuevos tutores/pacientes.
- Confirmación, reprogramación, cancelación con motivo, llegada, atención, finalización e inasistencia siguen reglas del servidor. El modo de simulación permite ensayarlas en el tenant ficticio sin representar autorización médica real.
- Outbox transaccional: recepción, confirmación, cambios, cancelación, recordatorios y cambios relevantes de disponibilidad, incluidos servicios y horario propio. Sin doble confirmación al vincular una reserva previamente confirmada. Conserva el contacto de la reserva tras vincularla.
- Servicios: crear/editar/desactivar; eliminación auditada únicamente si no tienen citas ni solicitudes. Con historial se conserva el servicio.

## Migraciones aplicadas

- `20261023040000_professional_booking`: aplicada con autorización.
- `20261023050000_booking_audit_actions`: aplicada con autorización ya recibida. Corrige la restricción de eventos de auditoría, sin modificar filas anteriores.
- Prisma migrate status confirmó las diez migraciones aplicadas y la base actualizada. No se usaron reset, db push ni eliminaciones de datos reales.

## Demostración solicitada por el usuario

El usuario autorizó expresamente doce servicios, horarios y tres profesionales ficticios. Se creó un tenant separado dentro del sistema: **Clínica Veterinaria Porvenir · DEMOSTRACIÓN**, UUID `306369e3-4731-446b-b440-cf76dabd230a`, slug `porvenir-demo-9049405c`, con acceso OWNER para la cuenta propietaria existente. La clínica real y sus registros se conservaron.

- Doce servicios y duraciones exactas solicitadas; asignaciones compatibles editables.
- Lunes a viernes 09:00–14:00 y 15:00–19:00; sábado 09:00–14:00; domingo cerrado. America/Santiago. Confirmación manual, incluida cirugía.
- Camila Rojas, Matías Herrera y Valentina Morales llevan [DEMO], no tienen credenciales verificadas, habilitación médica ni publicación en la landing.
- BOOKING_DEMO_CLINIC_ID habilita la planificación y los permisos simulados solo en desarrollo/pruebas y en ese tenant exacto. En producción se excluyen y se cierra su catálogo. No se habilitaron proveedores de pago ni IA.
- Inicializador `apps/backend/scripts/booking-demo.cjs`: conexión local comprobada, transacción, IDs de servicio estables, no sobrescribe ediciones del catálogo ni horarios. Configura únicamente el `.env` ignorado por Git.
- Guía y reglas en [appointments-demo.md](appointments-demo.md).

## Verificación completada

- Backend: TypeScript compilado a `.cache/booking-build` sin perturbar dist del watcher, ESLint y 119 pruebas unitarias aprobados.
- Frontend: build Next.js, TypeScript, ESLint y 15 pruebas unitarias aprobados.
- Integración Nest/PostgreSQL: 25/25 aprobadas. Incluye concurrencia pública/privada, aislamiento, roles, FK, versiones, privacidad, ausencia, preparación, recurso, consentimiento, abuso, auditoría, Mailpit, recordatorios, eliminación protegida, semilla idempotente y bloqueo de demo en producción. Prueba de colación y duración de 20 minutos incluida.
- Navegador de interfaz: 8/8 aprobadas en escritorio/móvil. También se repitieron y aprobaron los cuatro casos pendientes de conflicto y portada editorial de la fase anterior.
- Navegador con API y PostgreSQL reales: 6/6 aprobados (appointments.real, booking.real y consultations.real, cada uno en escritorio y móvil). Creación, confirmación, vinculación, calendario mensual, reprogramación, cancelación, consulta, rectificación, historial y permisos. Cada ejecución usó su propio esquema y verificó public sin cambios.
- Se corrigió el aviso de conflicto que desaparecía al recargar catálogo, la carrera al editar una cita antes de terminar de cargar el paciente y la superposición de columnas mensuales en móvil. Capturas revisadas en `.next/qa/booking-month-desktop.png` y `booking-month-mobile.png`.
- Smoke del localhost real: banner demo, horarios PostgreSQL, una solicitud sintética pendiente, cancelación y móvil sin desbordamiento. La solicitud cancelada queda solo en el historial de la clínica demostrativa. Capturas `.next/qa/local-demo-*.png`.
- Últimos controles: backend health y ready HTTP200, frontend agendar-cita e iniciar-sesion HTTP200, PostgreSQL y Mailpit healthy. El watcher Nest de VS Code se conservó y recargó la nueva configuración; no se iniciaron instancias duplicadas.

## Accesos

- Portal: http://localhost:3000/agendar-cita
- Portal demostrativo directo: http://localhost:3000/reservar/porvenir-demo-9049405c
- Gestión demo: http://localhost:3000/app/clinicas/306369e3-4731-446b-b440-cf76dabd230a/agenda
- Correo capturado localmente: http://localhost:8025

Usar la cuenta propietaria habitual; no se cambiaron sus credenciales. Seleccionar la clínica DEMOSTRACIÓN para administrar estos ejemplos. El nombre público y los registros internos originales de Porvenir se conservaron.

## Límites explícitos

Sin recurrencia, arrastrar/soltar, multicapacidad ni sincronización externa. Un recurso exclusivo por servicio. Reservas pendientes sin caducidad automática; el equipo debe resolverlas. Horarios nocturnos requieren dividir franjas. Cambiar horarios no cancela citas existentes. Exclusión de solapamientos mediante servicios con bloqueo por clínica, sin EXCLUDE para escrituras SQL administrativas directas. SMTP puede duplicar ante fallo entre aceptación y commit; no garantizar exactly-once. Mailpit es captura local, no entrega real ni WhatsApp. Una reserva ya vinculada clínicamente requiere gestión del personal para cambios públicos. La clínica real sigue sin profesionales/horarios reservables hasta que su propietario configure y verifique personal auténtico; la demo no debe convertirse automáticamente en producción.
