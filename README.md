# Pawly

Plataforma de gestión veterinaria en desarrollo para clínicas y profesionales en Chile. Incluye landing pública, autenticación, workspace multi-clínica, tutores, pacientes y agenda veterinaria.

## Estado actual

Actualizado: 18 de octubre de 2026.

El estado se describe por funcionalidades verificables, sin porcentajes de avance. Contratos y pruebas: [gestión clínica](docs/clinical-records.md) y [agenda](docs/appointments.md).

| Área | Implementado | Pendiente |
| --- | --- | --- |
| Landing | Identidad Pawly, navegación responsive, carrusel automático de 15 fotos, notebook conceptual, recorrido visual de atención, funcionalidades, soluciones, oferta comercial provisional, FAQ y contacto | Revisión final, dominio y recepción real de solicitudes |
| Demostración pública | Vistas promocionales con datos ficticios, separadas del sistema privado | Revisión de contenido comercial |
| Frontend | Landing, autenticación, workspace, tutores, pacientes y agenda diaria/semanal | Consultas, vacunación, inventario, reportes y suscripciones |
| Backend | NestJS modular, sesiones, autorización por clínica/rol, gestión clínica y agenda con historial | Correo verificado, recuperación de contraseña y módulos restantes |
| Persistencia | PostgreSQL 17, Prisma, migraciones versionadas y FK multi-clínica | Respaldos y operación de producción |
| Calidad | TypeScript, ESLint, builds, unitarias, integración PostgreSQL y Playwright | CI/CD, despliegue y cobertura de módulos futuros |

El acceso privado usa datos de la API real. El formulario público de demo **descarga una solicitud local y no la envía**. Las vistas promocionales del producto son demostraciones conceptuales; no representan clientes existentes ni precios aprobados.

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
    src/components/    Header, carrusel, demos y formulario
    public/images/     Fotografías y registro de licencias
    tests/             Pruebas Playwright
  backend/             Backend NestJS
    src/health/        Salud del servidor y disponibilidad de PostgreSQL
    src/auth/          Registro y autenticación
    src/authorization/ Permisos y aislamiento por membresía
    src/clinical/      Tutores y pacientes
    src/appointments/  Citas, conflictos e historial
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

Configurar `SITE_URL` en `apps/frontend/.env.local` con el dominio público al desplegar; en desarrollo usa `http://localhost:3000` para las imágenes sociales. El prefijo HTTP `/api` y `NEXT_PUBLIC_API_URL` se conservan porque identifican la interfaz HTTP, no las carpetas de las aplicaciones.

## Validaciones

Desde apps/frontend:

```bash
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Playwright usa un servidor de producción temporal en 3100: requiere build previo y ese puerto libre. En Windows usa Edge instalado; en otros entornos requiere Chromium de Playwright. Los resultados se guardan en .next/qa y no se versionan.

Desde apps/backend:

```bash
npm run lint
npm run test
npm run build
```

Verificación del 14 de octubre de 2026: frontend con TypeScript, ESLint, build y 20 pruebas Playwright aprobados en escritorio y móvil. Backend con ESLint, build y tres pruebas unitarias aprobados; comprobaciones HTTP de arranque sin PostgreSQL, CORS, salud 200 y disponibilidad 503. La disponibilidad 200 también se verificó con PostgreSQL real en una base temporal aislada. El PostgreSQL configurado para desarrollo en el puerto 5433 sigue requiriendo iniciarse; estas pruebas no certifican un despliegue.

## Próximos pasos

1. Verificación de correo y recuperación de contraseña; el registro público permanece bloqueado en producción.
2. Consultas e historia de atenciones, vacunación e inventario.
3. Gestión de integrantes y disponibilidad laboral de profesionales.
4. Reportes, facturación y suscripciones.
5. Recepción real de contacto, CI/CD, despliegue, observabilidad y respaldos antes del uso comercial.

## Recursos y seguridad

Fotografías referenciales con fuentes y licencia Pexels registradas en `apps/frontend/public/images/sources.json`. No representan clientes ni recomendaciones de Pawly.

Git excluye variables locales, dependencias, compilaciones y resultados de pruebas. Los archivos .env.example son plantillas y no deben contener credenciales reales.

Autor: Yerko Barrera · 2026.
