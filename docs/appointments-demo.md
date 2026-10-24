# Demostración local de Agendamiento

Alcance confirmado por el usuario: **proyecto personal con información ficticia**. No requiere contratar hosting, dominio, correo ni personal auténtico para recorrer el flujo local.

La demostración utiliza los mismos módulos, base PostgreSQL, permisos y motor de disponibilidad que las clínicas reales. Vive en una clínica separada llamada **Clínica Veterinaria Porvenir · DEMOSTRACIÓN**, vinculada al propietario existente del sitio. No modifica pacientes, tutores, personal ni horarios de la clínica real.

## Datos iniciales autorizados

| Servicio | Minutos |
|---|---:|
| Consulta veterinaria general | 30 |
| Vacunación | 20 |
| Desparasitación | 20 |
| Control médico | 30 |
| Consulta dermatológica | 40 |
| Consulta de especialidad | 45 |
| Exámenes de laboratorio | 30 |
| Ecografía | 45 |
| Radiografía | 30 |
| Procedimientos menores | 60 |
| Cirugía veterinaria | 120 |
| Control postoperatorio | 30 |

De lunes a viernes: 09:00–14:00 y 15:00–19:00. Sábados: 09:00–14:00. Domingos cerrados. La interrupción entre franjas implementa la colación recurrente, sin crear cientos de bloqueos. Zona America/Santiago, anticipación inicial cero, horizonte 60 días, inicios cada cinco minutos. Todas las solicitudes requieren confirmación manual, incluida cirugía.

Profesionales ficticios: **[DEMO] Dra. Camila Rojas**, **[DEMO] Dr. Matías Herrera**, **[DEMO] Dra. Valentina Morales**. Cirugía, procedimientos e imagenología se asignan al perfil de Matías; prevención y controles a Camila/Valentina; los servicios pueden reasignarse desde la administración. Los nombres y duraciones son ejemplos editables, no acreditan especialidades reales.

## Protección de la demostración

- Perfiles sin credenciales verificadas, sin habilitación médica y sin publicación en el equipo real de la landing.
- Correos sintéticos `.invalid` y contraseñas aleatorias no conservadas ni mostradas. No se entregan credenciales para iniciar sesión como esos profesionales.
- La simulación requiere la marca interna de demostración, el UUID exacto `BOOKING_DEMO_CLINIC_ID` y NODE_ENV development/test. El propietario de esta clínica dispone de permisos simulados para ensayar llegada, atención y finalización. Se respetan roles y denegaciones; las credenciales permanecen UNVERIFIED. No concede autoridad clínica en otras clínicas ni en producción.
- En producción se excluyen esos perfiles y el catálogo demostrativo queda cerrado. El sitio resuelve nuevamente su clínica real.
- Banner público de demostración: ninguna solicitud constituye una hora de atención real. Usar únicamente nombres y contactos de prueba.
- Mailpit captura los correos en `http://localhost:8025`; no se envían a destinatarios reales.

## Uso

1. Entrar con la cuenta propietaria habitual. En el selector de clínicas, elegir **Porvenir · DEMOSTRACIÓN**.
2. Abrir **Agendamiento**. En **Servicios**, editar duración, profesionales y preparación; desactivar para dejar de ofrecer un servicio. Solo se elimina definitivamente un servicio sin citas ni reservas, y la eliminación queda auditada.
3. En **Disponibilidad**, editar franjas de clínica/profesionales y excepciones: feriados, vacaciones, ausencias y bloqueos. Elegir un cupo para crear una cita con paciente/tutor existentes.
4. En **Configuración**, ajustar políticas y textos. Guardar los cambios antes de probar el portal.
5. El botón de la landing **Agendar cita** resuelve la demostración solo en este entorno local. También existe `/reservar/<slug-demostrativo>`.
6. En **Solicitudes pendientes**, confirmar/reprogramar/cancelar. Para convertir la reserva en cita clínica, registrar al tutor y mascota desde sus módulos normales, verificar identidad y vincular ambos. Nunca se buscan fichas clínicas por correo desde el portal público.
7. Hay ocho tutores y ocho mascotas ficticios preparados para seleccionar. Tu cuenta habitual puede completar el recorrido de estados dentro de esta clínica sin usar contraseñas de otros perfiles. El banner privado identifica que se trata de una simulación.
8. La agenda incluye siete escenarios: programada, confirmada, en espera, en atención, completada, cancelada y una inasistencia histórica ficticia, con historial. La inasistencia conserva la regla de negocio: solo se registra para citas que ya comenzaron; no se permite marcar futuras como ausentes.

## Inicialización y mantenimiento

`apps/backend/scripts/booking-demo.cjs` es un inicializador local explícito. Requiere una conexión a pawly/public en loopback:5433, entorno no productivo y WEBSITE_CLINIC_ID configurado. Crea el tenant y registra su UUID en el `.env` local ignorado por Git. Los servicios tienen IDs estables; repetir la inicialización conserva nombres, duraciones, asignaciones y horarios que el administrador haya editado.

No ejecutar este inicializador para configurar personal real ni en producción. Para pasar a operación real, retirar BOOKING_DEMO_CLINIC_ID del entorno local y configurar la clínica real mediante usuarios autorizados, verificación de credenciales y publicación consentida. No convertir automáticamente los perfiles ficticios en médicos reales ni trasladar sus reservas.

`scripts/populate-demo-agenda.cjs` crea seis ejemplos mediante AppointmentsService y el motor existentes. Añade un registro histórico explícitamente marcado como importación ficticia y registra su inasistencia mediante el servicio normal; así se puede recorrer Historial sin esperar al día siguiente. No cambia la prohibición de crear citas pasadas desde la aplicación. Todos conservan autor e historial. Requiere el backend compilado y la clínica demo inicializada. No abre otro puerto ni utiliza datos ajenos al tenant demostrativo.
