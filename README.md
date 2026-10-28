# Project-03 · Pawly — Clínica Veterinaria Porvenir

Sitio público y sistema de gestión veterinaria con **Next.js, NestJS, Prisma y PostgreSQL**. Incluye reservas, agenda, tutores, pacientes, consultas, documentos clínicos, personal y administración del sitio.

**Actualizado: 28 de octubre de 2026.** Proyecto personal de demostración con datos ficticios. No incluye contratación de suscripciones ni un despliegue de producción.

## Contenido

- [Cambios recientes](#cambios-del-27-y-28-de-octubre)
- [Recorrido visual](#recorrido-visual)
- [Funcionalidades](#funcionalidades)
- [Arquitectura](#arquitectura-y-seguridad)
- [Instalación](#instalación-local)
- [Pruebas y capturas](#pruebas-y-capturas)
- [Documentación](#documentación)
- [Pendientes](#pendientes-y-límites)

## Cambios del 27 y 28 de octubre

| Área | Actualización |
| --- | --- |
| Reservas | RUT validado, búsqueda por atención/profesional, compatibilidad y selector semanal |
| Comprobantes | PDF privado, correo HTML con adjunto y calendario ICS para citas confirmadas |
| Cancelación | Revisión previa, opción de conservar la cita, validación del plazo y comprobante actualizado |
| Tutores | RUT normalizado y previsión opcional, institución y tramo Fonasa |
| Pacientes | Adjuntos PDF, JPEG y PNG protegidos por permisos clínicos |
| Accesos | Nueva pantalla de ingreso, registro local de personal y editor exclusivo por membresía |
| Sitio público | Navegación responsive, campañas, accesos rápidos, visita ilustrada, historia, equipo, reseñas, ubicación, preguntas frecuentes y WhatsApp |
| Verificación | Pruebas nuevas y actualización de los recorridos y limpieza de esquemas temporales |

La migración `20261027000000_tutor_identity` agrega identidad y previsión, el RUT del responsable de reserva y la tabla `PatientDocument`. Los registros antiguos se conservan sin inventar datos.

La revisión agrega `20261028000000_booking_notification_captured`, que permite registrar la captura local de Mailpit sin confundirla con un envío SMTP externo. Las migraciones anteriores no se modifican.

## Recorrido visual

Capturas de la aplicación ejecutándose, con datos exclusivamente ficticios. Las nuevas imágenes utilizan NestJS y PostgreSQL reales en un esquema temporal. Escritorio: 1440 × 1000; móvil: 390 × 844. Las secciones y páginas completas pueden tener otra altura. No se modifican cifras ni textos mediante edición de imagen.

### Sitio público

![Portada de Clínica Veterinaria Porvenir](docs/screenshots/landing.webp)

<details>
<summary>Visita, historia, equipo, reseñas y preguntas frecuentes</summary>

La agenda de esta sección es ilustrativa. La disponibilidad real se consulta al abrir el portal de reservas.

![Prepara tu visita](docs/screenshots/tu-visita.webp)

![Historia y cuidado](docs/screenshots/historia.webp)

![Equipo](docs/screenshots/equipo-publico.webp)

Los testimonios y retratos locales son demostrativos, no acreditan opiniones reales de Google.

![Reseñas](docs/screenshots/testimonios.webp)

![Preguntas frecuentes](docs/screenshots/preguntas-frecuentes.webp)

![Footer](docs/screenshots/footer.webp)

</details>

### Acceso y dashboard

![Inicio de sesión](docs/screenshots/inicio-sesion.webp)

![Dashboard con datos ficticios](docs/screenshots/dashboard.webp)

### Reserva pública

![Servicios disponibles](docs/screenshots/reserva-servicios.webp)

<details>
<summary>Profesionales, disponibilidad y móvil</summary>

![Profesionales compatibles](docs/screenshots/reserva-profesionales.webp)

![Horarios de reserva](docs/screenshots/reserva-horarios.webp)

<img src="docs/screenshots/reserva-movil.webp" width="350" alt="Reserva veterinaria en móvil" />

</details>

### Agenda y gestión clínica

![Agenda con citas ficticias](docs/screenshots/agenda.webp)

<details>
<summary>Servicios, disponibilidad, tutores, pacientes, consultas y personal</summary>

![Servicios y duración](docs/screenshots/servicios.webp)

![Disponibilidad profesional](docs/screenshots/disponibilidad.webp)

![Políticas de reserva](docs/screenshots/configuracion-reservas.webp)

![Tutores](docs/screenshots/tutores.webp)

![Pacientes](docs/screenshots/pacientes.webp)

![Ficha de paciente](docs/screenshots/ficha-paciente.webp)

![Consulta clínica](docs/screenshots/consulta-clinica.webp)

![Personal y accesos](docs/screenshots/personal.webp)

</details>

## Funcionalidades

### Reserva, PDF, correo y calendario

Rutas: `/agendar-cita` y `/reservar/[clinicSlug]`.

1. Ingresar un RUT con dígito verificador válido.
2. Elegir una atención publicada.
3. Seleccionar un profesional compatible.
4. Elegir fecha y hora entre los cupos del backend.
5. Completar datos del tutor, contacto, mascota y motivo.
6. Revisar, consentir y enviar.

El backend revalida disponibilidad y evita solapamientos. Cambiar servicio o profesional descarta la hora elegida. Una solicitud pendiente no equivale a una cita confirmada. Recepción verifica y vincula tutor/paciente; la reserva pública no busca fichas por nombre o correo.

La referencia y clave privada permiten consultar, reprogramar o cancelar. PDF e ICS reciben las credenciales por POST, sin incluirlas en la ruta. El PDF refleja el estado actual; el ICS descargable corresponde a reservas confirmadas. Los enlaces de correo llevan una clave firmada en el fragmento, que la interfaz retira al leerla. Abrirlos no modifica la reserva.

El correo admite `disabled`, Mailpit local y SMTP. Incluye HTML, texto y PDF; las confirmaciones pueden incluir calendario. Se distinguen cola, aceptación del proveedor, fallo y transporte no configurado. Aceptación SMTP no garantiza entrega final ni lectura. [Guía completa](docs/porvenir-booking-and-receipts.md).

### Agenda interna

Ruta: `/app/clinicas/:clinicId/agenda`. Vistas diaria, semanal y mensual, filtros, citas del día, próximas citas, solicitudes, historial, servicios, disponibilidad y configuración.

| Estado | Presentación |
| --- | --- |
| `SCHEDULED` / `CONFIRMED` | Programada / confirmada |
| `ARRIVED` / `IN_PROGRESS` | Llegada / en atención |
| `COMPLETED` | Completada |
| `CANCELLED` | Cancelada con motivo e historial |
| `NO_SHOW` | Inasistencia; se rechaza para citas futuras |

Permite crear, editar, reprogramar y cancelar conservando historial. Revalida permisos, profesionales, duración, bloqueos, recursos y relaciones. Los instantes se guardan en UTC y se presentan en la zona IANA de la clínica, inicialmente `America/Santiago`, incluyendo cambios de horario.

La demo incluye 12 servicios editables, tres profesionales ficticios y horarios configurables de ejemplo. No acredita prestaciones ni credenciales reales. [Agenda](docs/appointments.md) · [Demo](docs/appointments-demo.md).

### Tutores, pacientes y archivos

Los tutores se crean con RUT válido y normalizado mediante módulo 11; esto no consulta el Registro Civil. La previsión es opcional y pertenece al tutor. Los registros antiguos pueden conservar estos campos vacíos.

Los pacientes admiten varios responsables de la misma clínica, especie, sexo, raza, nacimiento, peso, microchip y observaciones según permisos. Hay búsqueda, filtros, paginación y archivado con integridad. La previsión de los responsables requiere `tutor:read`.

Se permiten PDF, JPEG y PNG de hasta **5 MB**, máximo **100 documentos por paciente**, almacenados en PostgreSQL sin URLs públicas. Subir requiere `consultation:write`; listar y descargar requieren `consultation:read` y acceso al paciente. Se comprueba la firma del formato, no se implementa análisis antivirus. [Detalle](docs/porvenir-access-and-tutors.md).

### Consultas e historia clínica

Consultas en borrador, finalización, historial y rectificaciones con control de versiones. La base de datos protege registros finalizados y relaciones con citas. [Campos, estados y permisos](docs/consultations.md).

### Cuentas, personal y sitio autoadministrable

Sesiones y membresías por clínica; invitaciones, cargos, permisos efectivos, suspensión, auditoría, verificación manual de credenciales y perfiles públicos con consentimiento.

`/registrarse` crea personal dentro de la clínica configurada únicamente en desarrollo/pruebas. No crea clínicas, verifica títulos ni concede edición web. El registro directo está bloqueado en producción. No hay recuperación de contraseña ni verificación de correo.

Solo la membresía activa `WEBSITE_EDITOR_MEMBERSHIP_ID` dentro de `WEBSITE_CLINIC_ID` recibe `website:manage`. Esa membresía dispone de lectura básica y edición web; el rol de propietario o administrador por sí solo no abre el editor. Borrador, vista previa, publicación y retirada permanecen separados.

El script de provisión local genera contraseñas aleatorias en `tmp/porvenir-cuentas.json`, excluido de Git. No se ejecuta automáticamente al instalar. [Accesos](docs/porvenir-access-and-tutors.md) · [Personal](docs/staff-access.md).

## Arquitectura y seguridad

| Capa | Tecnología |
| --- | --- |
| Web | Next.js 16, React 19, TypeScript, CSS Modules, Tailwind y Lucide |
| API | NestJS 11, validación DTO, sesiones y permisos |
| Persistencia | PostgreSQL 17, Prisma 6, migraciones y claves compuestas por clínica |
| Documentos y correo | PDFKit, Nodemailer, ICS y worker de notificaciones |
| Calidad | ESLint, TypeScript, Jest y Playwright |

Contraseñas con Argon2id, sesiones mediante cookies y controles de origen/CSRF. El servidor calcula permisos y verifica clínica, membresía y acceso al paciente. Las APIs públicas excluyen borradores e historia clínica. Las claves de reserva se verifican por hash o firma HMAC según su origen.

```text
apps/backend/
  prisma/                 Esquema y migraciones
  scripts/                Desarrollo, demo y configuración local
  src/auth/               Registro y sesiones
  src/authorization/      Permisos y aislamiento
  src/appointments/       Citas, reservas, PDF, ICS y correo
  src/clinical/           Tutores, pacientes y documentos
  src/consultations/      Historia clínica
  src/staff/              Personal y accesos
  src/website/            Contenido público y borradores
apps/frontend/
  src/app/                Rutas públicas y privadas
  src/components/         Sitio y módulos de gestión
  public/images/          Recursos y procedencia
  tests/                  Unitarias, interfaz y recorridos reales
docs/                     Guías y capturas
docker-compose.yml        PostgreSQL y Mailpit opcional
```

## Instalación local

Requisitos: Node.js compatible con las dependencias del proyecto, npm, Docker Compose y Edge en Windows para las pruebas de navegador. Usar `npm ci` para respetar los lockfiles.

```powershell
git clone https://github.com/koyarxs/Project-03-Pawly-Octubre-2026.git
cd Project-03-Pawly-Octubre-2026
Copy-Item .env.example .env
Copy-Item apps/backend/.env.example apps/backend/.env
Copy-Item apps/frontend/.env.example apps/frontend/.env.local
```

Editar los archivos locales: establecer una contraseña propia para PostgreSQL y la conexión equivalente en `DATABASE_URL`. No sobrescribir archivos de entorno existentes.

```powershell
docker compose up -d postgres
cd apps/backend
npm.cmd ci
npx.cmd --no-install prisma migrate deploy
npm.cmd run start:dev
```

En otra terminal:

```powershell
cd apps/frontend
npm.cmd ci
npm.cmd run dev
```

| Servicio | Dirección |
| --- | --- |
| Web | `http://localhost:3000` |
| Salud API | `http://localhost:3001/api/health` |
| PostgreSQL disponible | `http://localhost:3001/api/health/ready` |
| PostgreSQL | `127.0.0.1:5433` |
| Mailpit opcional | `http://localhost:8025` |

Si Docker conserva el proyecto con otro nombre de carpeta, reutilizar su contenedor: dos proyectos Compose no pueden ocupar 5433. No borrar volúmenes para resolver ese conflicto.

| Variable | Propósito |
| --- | --- |
| `DATABASE_URL` | Conexión privada del backend |
| `CORS_ORIGINS` | Orígenes autorizados de la web |
| `NEXT_PUBLIC_API_URL` | Normalmente `http://localhost:3001/api` |
| `WEBSITE_CLINIC_ID` | Clínica existente vinculada al sitio |
| `WEBSITE_EDITOR_MEMBERSHIP_ID` | Membresía exclusiva del editor |
| `MAIL_MODE`, `MAIL_HOST`, `MAIL_PORT` | Transporte de correo; desactivado por defecto |
| `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM` | Cuenta y remitente SMTP, solo en entorno privado |
| `PUBLIC_SITE_URL` | Base pública de los enlaces de correo |
| `BOOKING_LINK_SECRET` | Secreto aleatorio estable de al menos 32 caracteres |
| `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACE_ID` | Reseñas opcionales; solo servidor |

Para Mailpit: `docker compose --profile development up -d mailpit`, `MAIL_MODE=local`, `MAIL_HOST=127.0.0.1`, `MAIL_PORT=1025`. Gmail usa el script interactivo de la [guía de correo](docs/porvenir-booking-and-receipts.md). Las pruebas no requieren enviar correo externo.

La clínica y la membresía deben existir antes de configurar sus identificadores. El registro de clínicas está disponible en desarrollo sin `WEBSITE_CLINIC_ID`; el registro de personal requiere ese vínculo. Las cuentas locales no se transfieren al hacer push.

Revisar `prisma migrate status` antes de actualizar una base existente. Usar `prisma migrate deploy`, no reset ni `db push`. Publicar el repositorio o abrir el PR no ejecuta migraciones ni despliega.

## Pruebas y capturas

El [informe del 28 de octubre](docs/revision-2026-10-28.md) registra resultados, alcance y límites de la revisión.

```powershell
# Desde apps/backend
npm.cmd run lint
npm.cmd test
npm.cmd run test:integration
npm.cmd run build

# Desde apps/frontend
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test:unit
npm.cmd run build
npm.cmd run test:e2e -- booking-porvenir.spec.ts clinic-visit.spec.ts landing-refresh.spec.ts google-reviews.spec.ts
node tests/support/run-real-tests.mjs documentation.real.spec.ts --project=desktop
```

Las integraciones crean esquemas exclusivos, aplican las migraciones allí y verifican que las huellas de `public` no cambien. El recorrido documental usa 3100/4001, requiere ambas compilaciones y genera WebP sin cuentas reales. El mapa externo se bloquea en ese recorrido. No se fotografían claves, sesiones ni contraseñas.

Las pruebas de interfaz usan respuestas controladas; integración y capturas documentales consultan PostgreSQL real. Son alcances distintos y no certifican producción. [Manifiesto](docs/screenshots/private-captures.json) · [Procedencia](docs/screenshots/README.md).

## Documentación

| Guía | Contenido |
| --- | --- |
| [Reservas y comprobantes](docs/porvenir-booking-and-receipts.md) | PDF, ICS, SMTP y enlaces privados |
| [Accesos, tutores y archivos](docs/porvenir-access-and-tutors.md) | Registro, editor, RUT, previsión y adjuntos |
| [Sección de visita](docs/landing-visit-booking.md) | Ilustración y acceso a reservas |
| [Agenda](docs/appointments.md) | Estados, disponibilidad y operaciones |
| [Demostración](docs/appointments-demo.md) | Datos ficticios y configuración |
| [Gestión clínica](docs/clinical-records.md) | Tutores, pacientes y aislamiento |
| [Consultas](docs/consultations.md) | Historia clínica y rectificaciones |
| [Personal](docs/staff-access.md) | Invitaciones, credenciales y permisos |
| [Sitio público](docs/porvenir-site.md) | Antecedentes del sitio autoadministrable |
| [Reseñas](docs/google-reviews.md) | Configuración y procedencia |
| [Boletín](docs/newsletter.md) | Consentimiento y acuses locales |

Las guías históricas describen sus etapas; para el 27–28 de octubre prevalecen este README y las tres primeras guías.

## Pendientes y límites

- Verificación de correo, recuperación de contraseña y aprobación del registro de personal para producción.
- Vacunación como módulo clínico, inventario, reportes, facturación, hospitalización, recetas estructuradas y firma electrónica.
- Campañas del boletín, confirmación de suscripción, baja pública e invitaciones automáticas por email.
- Carga general de imágenes del sitio, versiones de contenido y ampliación de auditoría.
- CI/CD, despliegue, respaldos y observabilidad.

Los adjuntos clínicos sí están implementados. Vacunación existe como servicio reservable, no como módulo independiente. Las reseñas y fotografías locales son demostrativas y no implican validación de Google. El contacto de WhatsApp está fijado en el componente y debe revisarse antes de publicar un entorno real.

Procedencia visual: [campañas](apps/frontend/public/images/porvenir/campaign/README.md), [visita](apps/frontend/public/images/porvenir/visit/README.md), [acceso](apps/frontend/public/images/porvenir/auth/README.md), [retratos](apps/frontend/public/images/reviews/portraits/README.md) y [agendamiento](apps/frontend/public/images/booking/sources.md).

Git excluye secretos, dependencias, compilaciones, resultados y archivos de trabajo. Abrir un pull request conserva la propuesta y no implica fusionarla con `main`.

Autor: **Yerko Barrera** · **YB Veltrix Solutions** · 2026.
