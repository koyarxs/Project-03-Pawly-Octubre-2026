# Consultas e historia clínica

Primer módulo de atención clínica: consultas desde cita o sin cita, borradores editables, finalización y rectificaciones anexas. Sin dependencias nuevas. La ficha del paciente incluye una línea de tiempo paginada con filtros por fecha y estado, diagnóstico, tratamiento y profesional.

## Uso y permisos

En el workspace de una clínica, abrir **Consultas → Nueva consulta**, o **Agenda → cita → Iniciar consulta clínica**. También se puede iniciar desde la historia del paciente. Guardar crea un borrador; abrir **Editar borrador** para completarlo y **Finalizar consulta** para protegerlo. Una cita admite una sola consulta; el enlace pasa a abrir la existente.

Leer y escribir requieren `consultation:read` y `consultation:write`, respectivamente, y autorización médica independiente con credencial verificada. OWNER, ADMIN, CLINIC_DIRECTOR y VETERINARIAN son roles elegibles; el cargo administrativo por sí solo no habilita estas facultades. Recepción, técnicos y estilistas no acceden a consultas, versiones ni rectificaciones. Se aplica también el alcance de pacientes asignados. La revisión profesional es manual documentada, sin conexión con un registro oficial; véase [Personal y Accesos](staff-access.md).

Datos: paciente, profesional, fecha de atención, motivo, anamnesis, examen, hallazgos, diagnóstico y tipo presuntivo/definitivo, tratamiento, indicaciones, notas, signos vitales opcionales y próximo control. Un borrador exige paciente activo, profesional habilitado, fecha y motivo. Finalizar exige además anamnesis, examen, diagnóstico, tipo y tratamiento. El control posterior no crea una cita ni recordatorios. Las fechas se guardan en UTC y se muestran en la zona IANA de la clínica, con respaldo explícito America/Santiago. Se rechazan horas ambiguas/inexistentes por DST y controles anteriores a la atención.

## Persistencia y trazabilidad

`Consultation`, `ConsultationEvent` y `ConsultationAmendment` tienen referencias compuestas por ID y clínica para paciente, cita, profesional y autores. La referencia a cita incorpora también el paciente. Todos los endpoints usan SessionGuard, ClinicGuard y permisos declarados; los identificadores de URL nunca otorgan acceso. Las respuestas clínicas son no-store, y las escrituras exigen cookies, origen permitido y CSRF.

Las escrituras clínicas usan READ COMMITTED y advisory lock por clínica, compartido con los cambios de acceso, y vuelven a comprobar autorización antes de escribir. `version` impide sobrescribir borradores obsoletos; un UUID de solicitud único por clínica evita duplicar un envío reintentado. Un conflicto devuelve 409 y requiere recargar: no se fusionan versiones automáticamente. El estado de la cita y su historial se actualizan dentro de la misma transacción: DRAFT → IN_PROGRESS, FINALIZED → COMPLETED. Las citas vinculadas ya no admiten cambios administrativos; profesional y estado se gestionan mediante la consulta. Se comprueban conflictos de agenda al asignar profesional.

Cada cambio clínico guarda una instantánea con actor y fecha. Una consulta finalizada no admite UPDATE/DELETE en PostgreSQL; las rectificaciones conservan motivo, texto, actor y fecha en filas nuevas. Eventos y rectificaciones también son inmutables ante UPDATE/DELETE. Una restricción diferida comprueba al terminar la transacción que cita y consulta coincidan en profesional y estado. Los triggers se resuelven en el esquema de su tabla, permitiendo pruebas aisladas sin acceder a public. No son un sistema de auditoría criptográfica ni impiden al administrador de PostgreSQL alterar su propia infraestructura.

## Migración y verificación

`20261018020000_veterinary_consultations` es aditiva y transaccional: crea dos enums, tres tablas, índices, claves foráneas, CHECK y triggers. En Appointment añade un índice único sobre una combinación que ya contiene su clave primaria. No modifica filas existentes ni migraciones anteriores. Revisar el destino antes de `prisma migrate deploy`; nunca usar reset, db push ni CASCADE.

Las suites backend prueban borradores, finalización, rectificaciones, inmutabilidad mediante SQL, citas, concurrencia, roles, aislamiento, paginación y validaciones. Playwright real recorre el flujo con API/PostgreSQL en escritorio y móvil. Cada archivo de pruebas y viewport obtiene su propio esquema/API para conservar los límites de solicitudes reales sin compartir contadores agotados. Los runners comprueban el esquema antes de escribir, limpian solo sus objetos conocidos con RESTRICT y comparan estructura y huellas de filas de public. El TRUNCATE de fixtures está limitado al esquema temporal recién creado y comprobado; nunca al esquema local de uso normal.

## Límites

Sin recetas estructuradas, adjuntos, hospitalización, facturación, firma electrónica, exportación ni diagnósticos automáticos. No hay autosave ni colaboración en tiempo real; guardar explícitamente y recargar ante conflictos. Las rectificaciones son texto anexo, no reemplazan los campos originales. La finalización es irreversible desde la aplicación. La calificación sanitaria, políticas de conservación, respaldos y controles operativos requieren evaluación antes de comercializar.

Esta rama parte de la agenda del PR #9, pendiente de fusión al iniciar el trabajo. El PR hacia main incluye esa dependencia; no fusionar sin revisar primero la secuencia de ambos cambios.
