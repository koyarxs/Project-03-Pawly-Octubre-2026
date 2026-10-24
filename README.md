# Pawly

Pawly es un proyecto personal de sitio veterinario autoadministrable y gestión interna, construido con Next.js, NestJS, Prisma y PostgreSQL. Incluye autenticación, personal, agenda, tutores, pacientes, consultas e historia clínica, con datos y permisos aislados por clínica. El sitio público corresponde a **Clínica Veterinaria Porvenir**. No hay contratación ni administración de suscripciones implementada.

Modalidad actual: **proyecto personal con datos ficticios**. La clínica Porvenir · DEMOSTRACIÓN permite probar reservas y gestión de citas localmente, sin contratar dominio, hosting ni correo. Incluye 12 servicios, tres profesionales ficticios, ocho tutores, ocho mascotas y siete escenarios de citas. La cuenta propietaria puede ensayar los estados con permisos simulados exclusivos del tenant local; no se verifican credenciales ficticias ni se habilita esa autoridad en producción. [Guía de demostración](docs/appointments-demo.md) y [verificaciones](docs/appointments-progress.md).

## Estado actual

Actualizado: **24 de octubre de 2026**. Alcance del sitio: [Porvenir](docs/porvenir-site.md). Roles, cargos y perfiles públicos: [Personal y Accesos](docs/staff-access.md).

El estado se describe por funcionalidades verificables, sin porcentajes de avance. Contratos y pruebas: [gestión clínica](docs/clinical-records.md) y [agenda](docs/appointments.md) y [consultas e historia clínica](docs/consultations.md).

| Área | Implementado | Pendiente |
| --- | --- | --- |
| Sitio público | Portada con carrusel, galería de mascotas, perfiles del equipo, testimonios ilustrativos, mapa, footer y marca Porvenir | Continuar ajustes de contenido y accesibilidad |
| Administración web | Borrador, vista previa privada, publicación y retirada por propietario/administración | Carga de archivos propios y versiones históricas de contenido |
| Personal y Accesos | Invitaciones por enlace, cargos, permisos efectivos, suspensión, revisión manual de credenciales, auditoría y perfiles publicados con consentimiento | Correo externo para invitaciones y retratos propios |
| Agendamiento público | Servicios, médico con miniatura, disponibilidad real, solicitud, comprobante privado, reprogramación y cancelación | Personalizar los datos ficticios desde la administración |
| Agenda interna | Vistas diaria, semanal y mensual; filtros, estados, historial, horarios, excepciones y prevención de solapamientos | Ampliaciones según retroalimentación |
| Boletín y notificaciones | Registro con consentimiento y acuses locales; cola de notificaciones de reservas y recordatorios con Mailpit | Campañas, confirmación de correo y baja pública |
| Frontend | Sitio de Porvenir, acceso privado, dashboard con datos reales y módulos clínicos con diseño compartido | Vacunación, inventario y reportes |
| Backend | NestJS modular, sesiones, permisos, gestión clínica y contenido público separado de los borradores | Correo verificado y recuperación de contraseña |
| Persistencia | PostgreSQL 17, Prisma, migraciones versionadas y FK multi-clínica | Respaldos y operación de producción |
| Calidad | TypeScript, ESLint, builds, unitarias, integración PostgreSQL y Playwright | CI/CD, despliegue y cobertura de módulos futuros |

La portada no ofrece suscripciones ni contratación. El registro de clínicas permanece disponible solo en desarrollo. El acceso privado usa datos de la API real. Guardar un borrador no modifica la publicación. Las APIs públicas excluyen borradores, datos de autenticación y registros clínicos. El equipo se publica por separado con consentimiento; los perfiles de ejemplo y sus retratos generados se identifican como ficticios.

### Agendar una cita

El botón **Agendar cita** abre `/agendar-cita`. El portal presenta fotografía veterinaria, personajes originales de Pawly con animación suave y accesos rápidos a los servicios configurados. El flujo permite elegir servicio, profesional, fecha y hora, ingresar datos del tutor y mascota y revisar la solicitud. La selección de profesionales respeta los servicios asignados; no ofrece la opción «Sin preferencia».

Los horarios se consultan en PostgreSQL y se vuelven a validar al reservar. Las fechas se almacenan en UTC y se muestran según la zona de la clínica, inicialmente `America/Santiago`. La reserva entrega una referencia y clave privada para consultar, reprogramar o cancelar; el portal no busca fichas clínicas por correo. La confirmación de una solicitud y su vinculación a pacientes/tutores existentes se realizan desde el espacio privado con los permisos correspondientes.

En el proyecto local se incluyen 12 servicios editables, tres médicos ficticios con retratos distintos y horarios de ejemplo. El administrador puede configurar servicios, duraciones, asignaciones, horarios individuales y excepciones sin modificar código. Los perfiles ficticios no acreditan credenciales ni se habilitan para producción. [Funcionamiento y pruebas de agenda](docs/appointments-progress.md).

### Correo local y reseñas

Mailpit permite revisar los mensajes de prueba en **http://localhost:8025**, sin entregarlos a direcciones externas. El boletín registra solicitudes con consentimiento y genera acuses locales; no implementa campañas de novedades. La configuración predeterminada mantiene el correo desactivado. [Configuración del boletín](docs/newsletter.md).

Las reseñas de ejemplo se distinguen de las reseñas reales. La integración opcional con Google requiere una ficha y configuración propia del servidor; no se activa al clonar el repositorio. [Reseñas y estados disponibles](docs/google-reviews.md). El chatbot de IA fue retirado y no forma parte de la aplicación activa; se conserva su migración histórica para mantener la secuencia de la base.

## Tecnologías

| Capa | Tecnologías |
| --- | --- |
| Frontend | Next.js 16.3.5, React 19.2.8, TypeScript 5.9.3 y Tailwind CSS 4.3.3 |
| Componentes | Radix Slot, configuración shadcn/ui, CVA, clsx y tailwind-merge |
| Iconos y animación | Lucide React 1.55.0 y Motion 14.1.0 |
| Backend | NestJS 11.2.7, TypeScript estricto, Express, ConfigModule, Joi, class-validator y class-transformer |
| Persistencia | PostgreSQL 17 Alpine y Prisma / Prisma Client 6.19.3 |
| Entorno | Node.js 24, npm, Docker y Docker Compose; las pruebas unitarias frontend utilizan transformación TypeScript de Node 24 |
| Verificación | ESLint 9, Jest, Supertest y Playwright |

Cada aplicación tiene su propio package.json y package-lock.json.

## Estructura

```text
apps/
  frontend/            Frontend Next.js y landing
    src/app/           Landing, autenticación y rutas privadas por clínica
    src/components/    Sitio público, editor y módulos privados
    public/images/     Fotografías y registro de licencias
    tests/             Pruebas Playwright
  backend/             Backend NestJS
    src/health/        Salud del servidor y disponibilidad de PostgreSQL
    src/auth/          Registro y autenticación
    src/authorization/ Permisos y aislamiento por membresía
    src/clinical/      Tutores y pacientes
    src/appointments/  Citas, reservas públicas, disponibilidad y notificaciones
    src/staff/         Equipo, credenciales, invitaciones y auditoría
    src/website/       Borrador y publicación del sitio de una clínica configurada
    src/prisma/        Servicio y módulo de conexión
    prisma/            Modelos y migraciones versionadas
docker-compose.yml     PostgreSQL local y Mailpit opcional
.env.example           Plantilla de entorno para PostgreSQL
```

## Ejecutar en desarrollo

Preparar los archivos locales a partir de `.env.example`, `apps/backend/.env.example` y `apps/frontend/.env.example`. Guardarlos como `.env`, `apps/backend/.env` y `apps/frontend/.env.local`. Usar una contraseña propia y mantener estos archivos fuera de Git.

Revisar contenedores y puertos antes de iniciar servicios. PostgreSQL usa `POSTGRES_PORT` (5433 por defecto). Si se cambia, actualizar también DATABASE_URL. No detener servicios de otros proyectos ni eliminar volúmenes.

Desde la raíz:

```bash
docker compose up -d postgres
docker compose ps
```

Para capturar correos de prueba, iniciar también `docker compose --profile development up -d mailpit` y revisar la configuración `MAIL_MODE=local` descrita en [el boletín](docs/newsletter.md). No se necesitan credenciales de un proveedor externo.

Backend, en una terminal:

```bash
cd apps/backend
npm ci
npm run prisma:generate
npm run start:dev
```

Frontend, en otra terminal:

```bash
cd apps/frontend
npm ci
npm run dev
```

Frontend: http://localhost:3000. Backend: http://localhost:3001/api/health. Configurar `NEXT_PUBLIC_API_URL=http://localhost:3001/api` y CORS_ORIGINS con el origen de la web. Si 3000 está ocupado, elegir otro puerto y actualizar CORS. En PowerShell usar npm.cmd si la política local bloquea npm.ps1.

`start:dev` evita iniciar otro watcher del backend si ya existe uno o el puerto está ocupado; no detiene procesos. Usa la terminal existente y detén el watcher con Ctrl+C antes de ejecutar `npm run build`, porque Nest limpia `dist` al compilar. Para revisar TypeScript sin interrumpir el servidor usa `npx.cmd --no-install tsc --noEmit --incremental false`. La protección de arranque se comprueba con `npm run test:dev`.

Antes del primer uso, desde `apps/backend`, comprobar `npx.cmd --no-install prisma migrate status`. Las migraciones existentes se aplican con `npx.cmd --no-install prisma migrate deploy`, previa revisión y autorización si la base contiene datos. No utilizar reset ni db push. `GET /api/health` comprueba el servidor; `GET /api/health/ready` consulta PostgreSQL. Las operaciones con datos requieren las migraciones aplicadas. `npm ci` genera automáticamente Prisma Client.

Configurar `SITE_URL` en `apps/frontend/.env.local` con el dominio público al desplegar; en desarrollo usa `http://localhost:3000`. El backend requiere `WEBSITE_CLINIC_ID` para vincular explícitamente el sitio a una clínica existente y admite `WEBSITE_PUBLIC_NAME` como nombre inicial del borrador. Estos valores no modifican los registros clínicos. La configuración concreta local no se versiona.

## Validaciones

Desde apps/frontend:

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run test:e2e
npm run test:e2e:real
```

Playwright usa un servidor de producción temporal en 3100: requiere build previo y ese puerto libre. En Windows usa Edge instalado; en otros entornos requiere Chromium de Playwright. Los resultados se guardan en .next/qa y no se versionan.

Desde apps/backend:

```bash
npm run lint
npm run test
npm run test:integration
npm run build
```

Las integraciones exigen PostgreSQL local en loopback:5433/pawly, fuera de producción. Crean esquemas de prueba exclusivos, aplican allí las migraciones y comprueban que estructura y huellas de las filas de public permanezcan intactas. Playwright real requiere además build del backend y puertos libres 3100/4001. No utiliza ni detiene los servicios de desarrollo 3000/3001. Detalles y selección de pruebas en [frontend](apps/frontend/README.md). Estas verificaciones locales no certifican un despliegue de producción.

## Próximos pasos

1. Verificación de correo y recuperación de contraseña; el registro público permanece bloqueado en producción.
2. Vacunación, inventario y extensión de la historia clínica.
3. Mejoras de experiencia y ampliación de los flujos de personal, disponibilidad y notificaciones según retroalimentación.
4. Reportes y necesidades administrativas de la veterinaria.
5. CI/CD, despliegue, observabilidad y respaldos antes del uso comercial.

## Recursos y seguridad

Fotografías ilustrativas con fuentes y licencia Pexels registradas en `apps/frontend/public/images/pawly-2-sources.json`, `landing-sources.json` y [recursos del agendamiento](apps/frontend/public/images/booking/sources.md). Este último incluye los personajes originales animados de Pawly. No representan pacientes, integrantes ni recomendaciones de la veterinaria.

Git excluye variables locales, dependencias, compilaciones y resultados de pruebas. Los archivos .env.example son plantillas y no deben contener credenciales reales.

Autor: Yerko Barrera · 2026.
