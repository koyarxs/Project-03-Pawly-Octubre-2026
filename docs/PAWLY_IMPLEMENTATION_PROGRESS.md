# Personal, permisos y equipo público — progreso comprobado

Actualización: 22 de octubre de 2026. Rama local `feature/clinic-staff-access`.
Sin commits, push ni PR nuevos: el usuario pidió conservar los cambios locales.

## Implementado e integrado en código

- Se mantienen OWNER, ADMIN, VETERINARIAN y RECEPTIONIST; se añaden
  CLINIC_DIRECTOR, VET_TECHNICIAN y PET_GROOMER, con cargo público independiente.
- Permisos efectivos desde NestJS, concesiones/denegaciones tipadas, acceso por
  clínica, revocación en solicitudes de sesiones existentes y control de pacientes
  asignados. Las facultades médicas requieren verificación documental independiente.
- Personal por clínica: invitaciones mediante enlace privado, perfiles, roles,
  excepciones de permisos, suspensión/reactivación, credenciales, asignaciones y
  auditoría inmutable. No hay envío de correo configurado.
- Rutas de frontend `personal`, `mi-perfil` y `/activar-acceso`; navegación y
  dashboard usan permisos enviados por el backend. Las rutas privadas también
  comprueban capacidades; no conceden acceso basándose en el cargo mostrado.
- Publicación de instantáneas consentidas, retirada de consentimiento y endpoint
  público limitado a campos de presentación de la clínica configurada.
- Sección «Conoce a nuestro equipo»: cinco perfiles ficticios sin cuentas,
  retratos generados e identificación de demostración. Los perfiles consentidos
  publicados sustituyen al ejemplo. Los retratos están en `public/images/staff`.
- Notas clínicas restringidas y contactos de tutores ocultos si falta autorización.

## Migración y entorno

- `20261022010000_clinic_staff_access`: aplicada a `pawly/public` con autorización
  explícita del usuario; se verificó que los valores de las columnas anteriores y
  el historial anterior de migraciones permanecieron iguales. No se borraron datos.
- Antes de aplicarla se comprobó en un esquema exclusivo: despliegue, FK por clínica,
  restricciones de credenciales/consentimiento/publicación, permisos contradictorios
  y auditoría append-only. El esquema se retiró con RESTRICT y public quedó intacto.
- Cliente Prisma generado. Se detuvo únicamente el proceso Nest de Pawly que
  bloqueaba su DLL, conservando el watcher de VS Code.
- En la recuperación Docker Desktop estaba detenido; se inició la instalación
  existente en AppData/Local/Programs/DockerDesktop. El contenedor PostgreSQL
  existente volvió a exponer 127.0.0.1:5433, sin recrear contenedores ni volúmenes.

## Verificaciones y pendientes de validación

- Backend: lint sin errores; 96 pruebas unitarias aprobadas (9 suites).
- Frontend: lint sin errores y 9 pruebas unitarias aprobadas.
- TypeScript, lint y builds finales de ambas aplicaciones aprobados.
- Integración actualizada: 82/82 aprobadas, incluida revocación concurrente,
  dirección con permisos operativos limitados y protección de cuentas existentes.
  Se retiró el esquema exclusivo con RESTRICT y se verificó public sin cambios.
- Prueba real de personal/consentimiento/publicación/suspensión aprobada en
  escritorio y móvil (2 recorridos), con public sin cambios.
- Refuerzo posterior de personal: 11/11 integraciones aprobadas (72 casos ajenos a
  ese grupo omitidos en esa repetición). Incluye un caso nuevo de techo de permisos
  para roles predefinidos, invitaciones renovadas y autoasignaciones. Total único de
  integración cubierto: 83 casos entre corrida completa y repetición dirigida.
- Regresión UI: 178 escenarios iniciales aprobados; tras corregir las pantallas
  restringidas, los casos afectados y pendientes pasaron. Los 14 escenarios nuevos
  de cargos, equipo público y borradores también pasaron. Total único: 199 aprobados
  y un gesto táctil omitido en escritorio, entre corrida inicial y repeticiones.
- Revisión visual de los retratos y de la sección de equipo en escritorio y móvil
  completada; evidencias locales ignoradas en `tmp/staff-access/team-*.png`.
- Salud local verificada: 3000 y 3001 responden; health/ready 200 y migraciones al día.
  Escaneo de secretos sin coincidencias; archivos de entorno fuera de Git.
- Regresión real completa: 14 escenarios únicos aprobados, 7 módulos en escritorio
  y móvil: autenticación, dashboard, tutores/pacientes, agenda, historia clínica,
  sitio y personal. Se conservan las comprobaciones de cookies, CORS, CSRF y
  aislamiento. Cada esquema QA se retiró con RESTRICT y public permaneció intacto.
  El caso de clínica secundaria prueba primero el bloqueo sin credencial y después
  su verificación exclusivamente en QA para comprobar el aislamiento autorizado.
- Panel de personal revisado visualmente en escritorio; captura local en
  `tmp/staff-access/staff-desktop.png`. Se corrigió un acento en la navegación.

## Archivos principales

- `apps/backend/prisma/schema.prisma` y migración `20261022010000_clinic_staff_access`.
- Backend: `src/authorization/permission-policy.ts`, `authorization.module.ts`,
  `src/staff/{staff.module,staff.service,staff.dto,permission-labels}.ts` y controles
  de autorización/alcance en servicios y controllers de los módulos existentes.
- Frontend: `src/components/staff`, rutas `personal`, `mi-perfil`, `activar-acceso`,
  `src/lib/{auth,permissions,staff}.ts`, shell, dashboard y formularios clínicos.
- Público: `src/components/website/clinic-team.tsx`, su CSS y renderer de la portada;
  cinco imágenes WebP y procedencia/prompts en `public/images/staff`.
- Pruebas: política de permisos e integración backend; escenarios de cargos y
  personal real en frontend; fixtures, respuestas de API y runners actualizados.
- Guía funcional: `docs/staff-access.md`; contratos anteriores corregidos en agenda,
  consultas, fichas clínicas y README.

## Decisiones y límites reales

- Las escrituras sensibles toman el mismo advisory lock por clínica dentro de
  transacciones READ COMMITTED: la lectura posterior al lock ve revocaciones ya
  confirmadas. Activación de contraseña toma además un lock por identidad global.
- No se otorga OWNER desde personal ni se permite modificar el propio acceso.
  La delegación de permisos críticos permanece reservada al propietario;
  administradores y directores pueden ajustar permisos operativos de trabajadores
  inferiores, sin conceder facultades que no poseen ni modificar su propio acceso.
- Credenciales: revisión manual documentada; no hay integración con un registro
  oficial. El propietario necesita un revisor independiente para facultades médicas.
- Perfiles públicos: publicar requiere consentimiento sobre el contenido exacto;
  editar el borrador no modifica una instantánea ya consentida. Suspender oculta la
  presentación mientras dura la suspensión; retirar consentimiento la despublica.
- Carga de retratos propios, correo transaccional/verificación de correo y
  recuperación de contraseña siguen pendientes. Nuevas cuentas no pueden iniciar
  sesión en producción hasta incorporar la verificación de correo.
- No se implementaron caja, pagos, inventario, recetas, vacunación, hospitalización,
  cirugía ni servicios de peluquería. Sus permisos futuros no habilitan endpoints
  inexistentes ni métricas ficticias.

La implementación solicitada quedó integrada y verificada localmente. Los cambios
permanecen sin commit en la rama indicada, para revisión del usuario. Las mejoras
futuras enumeradas arriba no se presentan como funcionalidades operativas. No
realizar commits, push, PR ni fusiones sin una nueva autorización.
