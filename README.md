# Pawly

Sitio autoadministrable de **Clínica Veterinaria Porvenir**, acompañado por la gestión interna de Pawly: autenticación, agenda, tutores, pacientes, consultas e historia clínica. El producto se orienta a una veterinaria, sin planes ni contratación SaaS. Se conserva el aislamiento por clínica y rol de los registros existentes.

## Estado actual

Actualizado: 21 de octubre de 2026. Alcance del sitio y administración: [Porvenir](docs/porvenir-site.md).

El estado se describe por funcionalidades verificables, sin porcentajes de avance. Contratos y pruebas: [gestión clínica](docs/clinical-records.md) y [agenda](docs/appointments.md) y [consultas e historia clínica](docs/consultations.md).

| Área | Implementado | Pendiente |
| --- | --- | --- |
| Sitio público | Contenido publicado de la veterinaria: portada, fotografías, servicios, presentación, horarios y contacto | Completar información real y definir dominio |
| Administración web | Borrador, vista previa privada, publicación y retirada por propietario/administración | Carga de archivos propios y versiones históricas de contenido |
| Frontend | Sitio de Porvenir, acceso privado, dashboard con datos reales y módulos clínicos con diseño compartido | Vacunación, inventario y reportes |
| Backend | NestJS modular, sesiones, permisos, gestión clínica y contenido público separado de los borradores | Correo verificado y recuperación de contraseña |
| Persistencia | PostgreSQL 17, Prisma, migraciones versionadas y FK multi-clínica | Respaldos y operación de producción |
| Calidad | TypeScript, ESLint, builds, unitarias, integración PostgreSQL y Playwright | CI/CD, despliegue y cobertura de módulos futuros |

El sitio no ofrece suscripciones ni alta pública de clínicas. El acceso privado usa datos de la API real. Guardar un borrador no modifica la publicación. El endpoint público nunca devuelve borradores, autores ni datos clínicos. Las fotografías de biblioteca son ilustrativas, no representan al equipo real.

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
    src/appointments/  Citas, conflictos e historial
    src/website/       Borrador y publicación del sitio de una clínica configurada
    src/prisma/        Servicio y módulo de conexión
    prisma/            Modelos y migraciones versionadas
docker-compose.yml     PostgreSQL local
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
3. Gestión de integrantes y disponibilidad laboral de profesionales.
4. Reportes y necesidades administrativas de la veterinaria.
5. CI/CD, despliegue, observabilidad y respaldos antes del uso comercial.

## Recursos y seguridad

Fotografías ilustrativas con fuentes y licencia Pexels registradas en `apps/frontend/public/images/pawly-2-sources.json` y `landing-sources.json`. No representan pacientes, integrantes ni recomendaciones de la veterinaria.

Git excluye variables locales, dependencias, compilaciones y resultados de pruebas. Los archivos .env.example son plantillas y no deben contener credenciales reales.

Autor: Yerko Barrera · 2026.
