# Porvenir Concierge — continuidad

Actualizado: 2026-10-23. Rama: `feature/clinic-staff-access`. Conservar todos los cambios locales anteriores; sin commits ni publicación del chatbot.

## Estado recuperado

- Backend implementado: `apps/backend/src/concierge/` (proveedor OpenAI SDK oficial, conversaciones, herramientas de información publicada y agenda, propuestas con confirmación, transferencia humana, presencia, control de consumo y retención).
- Frontend implementado: widget `components/website/concierge-widget.*`, panel `components/concierge/concierge-admin.*`, rutas `asistente-ia` y `atencion`, tipos `lib/concierge.ts` y extensión compatible de navegación/permisos. La landing mantiene su diseño.
- Prisma: seis modelos nuevos y migración aditiva `20261023020000_porvenir_concierge`; cliente generado. **Aplicada a pawly/public con autorización expresa.**
- Backend sin credenciales ni catálogo de modelos de OpenAI: degradación honesta a solicitudes y atención humana; no hay proveedor simulado en código operativo.
- Otros cambios de landing, personal, boletín y módulos clínicos son anteriores y deben conservarse.

## Verificaciones completadas antes de la interrupción

- 10 pruebas de integración con PostgreSQL en esquema aislado: migraciones, consentimiento, memoria, conocimiento publicado, conflictos de agenda, confirmación de solicitudes, permisos, aislamiento y FK, presencia, transferencia y respuestas humanas, presupuesto, errores, bloqueo de herramientas no autorizadas y dosis, expiración y concurrencia.
- 9 pruebas unitarias: política de seguridad/horarios y adaptador oficial con red simulada explícita.
- Build backend, build frontend y TypeScript frontend correctos. ESLint de los archivos frontend del chatbot pasó antes de añadir sus pruebas de navegador. Falta repetir lint final después de las últimas correcciones de tests backend.
- La prueba de comprensión lingüística contra un LLM real **no se ejecutó**: falta clave y catálogo de modelos con tarifas.

## Fase de recuperación verificada

- Backend recuperado en un único watcher local; frontend existente conservado. PostgreSQL y Mailpit saludables.
- 116 pruebas unitarias backend correctas; 12 pruebas iniciales de navegador correctas (6 escenarios por viewport).
- Estados disponible/ocupado/ausente/desconectado implementados en el flujo existente; una asignación activa por ejecutivo y recuperación de transferencia si el asignado se desconecta.
- Integración actualizada: **13 pruebas correctas** en esquema aislado, incluyendo SSE HTTP y los cuatro estados. Cliente Prisma regenerado; migración aplicada posteriormente (ver cierre local).
- Build frontend actualizado correcto; TypeScript frontend y ESLint backend/frontend correctos antes de las últimas adiciones de pruebas.
- Autorización recibida para aplicar `20261023020000_porvenir_concierge` a `pawly/public` **al terminar las verificaciones**. No volver a solicitarla.
- Guía operativa `docs/concierge.md` y variables documentadas en backend `.env.example`; no se modificó `.env` con credenciales reales.

## Pendientes actuales

1. El operador debe configurar `OPENAI_API_KEY` y `CONCIERGE_MODELS_JSON` en backend, con un modelo de su cuenta y tarifas revisadas. No pedir secretos por chat ni modificar sus credenciales existentes.
2. Reiniciar solo backend para recargar esas variables; en Dashboard → Asistente IA seleccionar modelo/presupuesto y activar. Publicar información real y ventanas de agenda antes de ofrecer horas.
3. Ejecutar una conversación contra OpenAI con presupuesto acotado y comprobar comprensión real, herramientas y consumo. **Este paso permanece bloqueado por credenciales externas.**

## Validación posterior completada

- 66 casos de navegador correctos en total: 14 del chatbot y 52 de autenticación/dashboard, escritorio y móvil. El primer pase tuvo dos fallos por un selector de prueba; se corrigió a rol accesible y los dos casos pasaron al repetirlos. No hubo cambios de producto para ocultar esos fallos.
- 83 pruebas existentes de integración correctas: autenticación, sesiones, permisos, personal, sitio público, tutores/pacientes, agenda e historia clínica. La estructura y fingerprints de todas las filas de `public` quedaron sin cambios.
- 13 pruebas de integración específicas de Concierge correctas en esquema aislado.
- 116 pruebas unitarias backend correctas; build backend/frontend, TypeScript frontend, ESLint backend y archivos frontend del chatbot, y validación Prisma correctos.
- No se llamó a OpenAI ni se probó comprensión lingüística real por falta de credenciales. Los avisos de Next `destination stream closed early` aparecieron al cerrar páginas de pruebas y no provocaron fallos de producto en las comprobaciones. La consola de la sesión local final se revisó sin errores.

## Cierre local verificado

- `prisma migrate status`: ocho migraciones aplicadas, base al día. `health/ready`: PostgreSQL conectado. No se borraron ni modificaron datos clínicos.
- Prueba real de navegador contra localhost: conversación creada con consentimiento, mensaje técnico identificado como ficticio guardado y transferencia a Seguimiento en estado WAITING. Ningún ejecutivo asignado ni simulado. Se conserva una conversación de prueba para revisión; no se crearon cuentas ficticias ni se usaron datos reales de pacientes.
- Widgets revisados visualmente en 1440 y 390 px, sin desbordamiento ni errores JavaScript. Capturas locales en `tmp/concierge/live-chat-*.png` (ignoradas por Git).
- Comprobación PostgreSQL del registro de prueba: un mensaje, cero llamadas LLM. API pública `ready:true`, `aiAvailable:false`, según configuración real.
- Último endurecimiento: validación de configuración rechaza propiedades heredadas (`__proto__`, `constructor`); seis tests de política repetidos correctos, build y lint backend correctos.
- Guía de activación y límites: `docs/concierge.md`. No hubo commits, push ni PR del chatbot, ni edición de `.env` con credenciales reales durante esta recuperación.

## Seguimiento: backend y activación pendiente

- Se encontraron dos watchers Nest sobre el mismo repositorio. Se retiró exclusivamente el árbol del watcher iniciado en segundo plano por Codex y se conservó el watcher de la terminal existente de VS Code. La instancia restante volvió a escuchar en 3001; no se detuvieron frontend, PostgreSQL ni Mailpit.
- `start:dev` ahora usa `scripts/start-dev.mjs`: bloqueo por repositorio y comprobación del puerto antes de compilar, sin detener procesos. Evita otro watcher incluso durante una recompilación con el puerto temporalmente libre. `main.ts` libera conexiones y temporizadores si falla `listen`.
- No ejecutar `nest build` simultáneamente con el watcher: limpia `dist` y puede provocar `MODULE_NOT_FOUND`. Para comprobar tipos con el servidor funcionando se usó `tsc --noEmit --incremental false`.
- Verificación repetida: 13 integraciones Concierge en esquema aislado, 9 unitarias Concierge, 3 pruebas del arranque protegido, TypeScript backend y ESLint backend correctos. Frontend 3000 responde HTTP 200; readiness backend confirma PostgreSQL conectado. API pública: `ready:true`, `aiAvailable:false`.
- El usuario confirmó que **todavía no tiene una clave de OpenAI API**. No se modificaron sus credenciales, no se configuró un modelo arbitrario ni se realizaron llamadas facturables. La validación con IA real sigue pendiente por este requisito externo; el chat y las transferencias humanas están implementados y probados.
- Próximo paso: crear la clave en la plataforma de OpenAI, guardarla solo localmente como `OPENAI_API_KEY`, configurar catálogo/tarifas verificados, reiniciar el único backend y activar el modelo desde Asistente IA. Nunca pedir la clave por chat. No hubo nuevas migraciones, commits ni publicaciones en este seguimiento.

## Alcance conservado

Las reservas públicas son solicitudes para que el equipo valide identidad, tutor, paciente y disponibilidad; no se crea una cita clínica anónima. No hay ventanas de agenda ni profesionales ficticios precargados. La IA consulta únicamente contenido publicado y FAQ/políticas autorizadas. Las dosis se filtran y las instrucciones del visitante no otorgan herramientas ni acceso a datos privados. La atención humana usa polling y heartbeat, y la IA usa SSE. Los costos son estimados y las reservas conservadoras de presupuesto permanecen debitadas incluso si la llamada falla.

## Retirada solicitada por el usuario — 23 de octubre de 2026

El usuario canceló el asistente completo y rechazó aplicar la migración local de costo cero. Este estado sustituye los pendientes de activación de las fases anteriores.

Se retiraron widget, paneles, rutas, código backend/frontend, SDK OpenAI y variables de entorno del asistente (sin exponer credenciales). Ollama fue detenido; su descarga, motor y modelo locales se eliminaron del directorio propio `tmp/ollama`. No se aplicó `20261023030000_local_concierge`; se retiró ese archivo pendiente.

Se conserva la migración Concierge ya aplicada y sus modelos/tablas/datos por seguridad e integridad del historial de migraciones. El módulo no está registrado y no ejecuta retención ni proveedores. La prueba mínima previa de OpenAI devolvió 429 `credit_balance_exhausted`; no se configuró facturación ni recargas. No continuar activando IA salvo nueva instrucción expresa.

Validación de la retirada: 107 pruebas unitarias backend correctas; ESLint y TypeScript backend correctos; build frontend correcto, sin rutas del asistente. PostgreSQL conectado, `/api/concierge` devuelve 404 y no hay listener en 11434. La landing se comprobó en 1440 y 390 px sin botón de chatbot ni errores JavaScript. ESLint de los archivos frontend modificados correcto.
