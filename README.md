# Pawly

Plataforma de gestión veterinaria en desarrollo para clínicas y profesionales en Chile. Incluye una landing pública y la infraestructura inicial del futuro sistema privado.

## Estado y porcentaje de avance

Actualizado: 11 de octubre de 2026.

**Avance estimado del producto inicial: 30 %.** Es una estimación de planificación, no una medición de funcionalidades entregadas. Se calcula con seis áreas de igual peso: landing (90 %), infraestructura local (90 %), acceso y permisos (0 %), pacientes y tutores (0 %), agenda y fichas (0 %) e inventario (0 %). Debe revisarse al definir los requisitos del sistema privado.

| Área | Implementado | Pendiente |
| --- | --- | --- |
| Landing | Identidad Pawly, navegación responsive, carrusel automático de 15 fotos, notebook conceptual, recorrido visual de atención, funcionalidades, soluciones, oferta comercial provisional, FAQ y contacto | Revisión final, dominio y recepción real de solicitudes |
| Demostración | Dashboard, agenda, pacientes y ficha clínica con datos ficticios | Funcionalidades reales y conexión a la API |
| Frontend | Componentes reutilizables, responsive, accesibilidad básica, movimiento reducido, metadatos y vista previa social | Sistema privado y revisión adicional de accesibilidad |
| Backend | NestJS, configuración validada, CORS, ValidationPipe, puerto 3001 y GET /api/health | Autenticación, permisos y módulos de negocio |
| Persistencia | PostgreSQL 17 Alpine en Compose, volumen persistente, healthcheck, esquema inicial y PrismaService | Modelos de negocio, migraciones revisadas y respaldos |
| Calidad | TypeScript, ESLint, build, prueba unitaria de salud y suite Playwright | CI/CD, despliegue y pruebas de funcionalidades futuras |

El inicio de sesión es informativo. El formulario **descarga una solicitud local y no la envía**. Las vistas del producto son demostraciones conceptuales; no representan módulos operativos, clientes existentes ni precios aprobados.

## Tecnologías

| Capa | Tecnologías |
| --- | --- |
| Frontend | Next.js 16.3.5, React 19.2.8, TypeScript 5.9.3 y Tailwind CSS 4.3.3 |
| Componentes | Radix Slot, configuración shadcn/ui, CVA, clsx y tailwind-merge |
| Iconos y animación | Lucide React 1.55.0 y Motion 14.1.0 |
| Backend | NestJS 11.2.7, TypeScript estricto, Express, ConfigModule, Joi, class-validator y class-transformer |
| Persistencia | PostgreSQL 17 Alpine y Prisma / Prisma Client 6.19.3 |
| Entorno | Node.js, npm, Docker y Docker Compose; se recomienda Node.js 22 LTS como entorno común |
| Verificación | ESLint 9, Jest, Supertest y Playwright |

Cada aplicación tiene su propio package.json y package-lock.json.

## Estructura

```text
apps/
  frontend/            Frontend Next.js y landing
    src/app/           Página pública, estilos y acceso informativo
    src/components/    Header, carrusel, demos y formulario
    public/images/     Fotografías y registro de licencias
    tests/             Pruebas Playwright
  backend/             Backend NestJS
    src/health/        Endpoint de salud
    src/prisma/        Servicio y módulo de conexión
    prisma/            Esquema inicial sin modelos de negocio
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

El esquema Prisma no contiene modelos de negocio. No ejecutar migraciones ni db push para esta base inicial. El backend inicia sin exigir una conexión inmediata a PostgreSQL. `GET /api/health` comprueba que el servidor responde; `GET /api/health/ready` consulta PostgreSQL y devuelve 503 con instrucciones cuando no está disponible. Las operaciones con datos requieren la base conectada. `npm ci` genera automáticamente Prisma Client.

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

1. Terminar revisión visual y contenido, configurar dominio y recepción real de contacto.
2. Definir alcance del sistema privado, roles y separación de datos entre clínicas.
3. Implementar autenticación y permisos con pruebas de seguridad.
4. Incorporar pacientes y tutores; después agenda e historia clínica.
5. Añadir inventario con modelos y migraciones revisadas, preservando datos.
6. Preparar CI/CD, despliegue, observabilidad y respaldos antes de uso comercial.

## Recursos y seguridad

Fotografías referenciales con fuentes y licencia Pexels registradas en `apps/frontend/public/images/sources.json`. No representan clientes ni recomendaciones de Pawly.

Git excluye variables locales, dependencias, compilaciones y resultados de pruebas. Los archivos .env.example son plantillas y no deben contener credenciales reales.

Autor: Yerko Barrera · 2026.
