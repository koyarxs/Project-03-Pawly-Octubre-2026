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
| Web | Next.js 16.3.5, React 19.2.8, TypeScript 5.9.3 y Tailwind CSS 4.3.3 |
| Componentes | Radix Slot, configuración shadcn/ui, CVA, clsx y tailwind-merge |
| Iconos y animación | Lucide React 1.55.0 y Motion 14.1.0 |
| API | NestJS 11.2.7, TypeScript estricto, Express, ConfigModule, Joi, class-validator y class-transformer |
| Persistencia | PostgreSQL 17 Alpine y Prisma / Prisma Client 6.19.3 |
| Entorno | Node.js, npm, Docker y Docker Compose; se recomienda Node.js 22 LTS como entorno común |
| Verificación | ESLint 9, Jest, Supertest y Playwright |

Cada aplicación tiene su propio package.json y package-lock.json.

## Estructura

```text
apps/
  web/                 Frontend Next.js y landing
    src/app/           Página pública, estilos y acceso informativo
    src/components/    Header, carrusel, demos y formulario
    public/images/     Fotografías y registro de licencias
    tests/             Pruebas Playwright
  api/                 Backend NestJS
    src/health/        Endpoint de salud
    src/prisma/        Servicio y módulo de conexión
    prisma/            Esquema inicial sin modelos de negocio
docker-compose.yml     PostgreSQL local
.env.example           Plantilla de entorno para PostgreSQL
```

## Ejecutar en desarrollo

Preparar los archivos locales a partir de `.env.example`, `apps/api/.env.example` y `apps/web/.env.example`. Guardarlos como `.env`, `apps/api/.env` y `apps/web/.env.local`. Usar una contraseña propia y mantener estos archivos fuera de Git.

Revisar contenedores y puertos antes de iniciar servicios. PostgreSQL usa `POSTGRES_PORT` (5433 por defecto). Si se cambia, actualizar también DATABASE_URL. No detener servicios de otros proyectos ni eliminar volúmenes.

Desde la raíz:

```bash
docker compose up -d postgres
docker compose ps
```

API, en una terminal:

```bash
cd apps/api
npm ci
npm run prisma:generate
npm run start:dev
```

Web, en otra terminal:

```bash
cd apps/web
npm ci
npm run dev
```

Web: http://localhost:3000. API: http://localhost:3001/api/health. Configurar `NEXT_PUBLIC_API_URL=http://localhost:3001/api` y CORS_ORIGINS con el origen de la web. Si 3000 está ocupado, elegir otro puerto y actualizar CORS. En PowerShell usar npm.cmd si la política local bloquea npm.ps1.

El esquema Prisma no contiene modelos de negocio. No ejecutar migraciones ni db push para esta base inicial. El endpoint de salud informa el estado básico de la API, no comprueba exhaustivamente la base de datos.

## Validaciones

Desde apps/web:

```bash
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Playwright usa un servidor de producción temporal en 3100: requiere build previo y ese puerto libre. En Windows usa Edge instalado; en otros entornos requiere Chromium de Playwright. Los resultados se guardan en .next/qa y no se versionan.

Desde apps/api:

```bash
npm run lint
npm run test
npm run build
```

Verificaciones recientes del frontend: TypeScript, ESLint y build aprobados; suite completa de 18 pruebas aprobada antes de los últimos ajustes visuales y 4 pruebas focalizadas de enlaces, responsive y composición aprobadas después. Backend: build y prueba unitaria de salud aprobados al preparar esta entrega. Falta definir metadataBase con el dominio público definitivo para las imágenes sociales. Estos resultados no certifican un despliegue ni la disponibilidad actual de PostgreSQL.

## Próximos pasos

1. Terminar revisión visual y contenido, configurar dominio y recepción real de contacto.
2. Definir alcance del sistema privado, roles y separación de datos entre clínicas.
3. Implementar autenticación y permisos con pruebas de seguridad.
4. Incorporar pacientes y tutores; después agenda e historia clínica.
5. Añadir inventario con modelos y migraciones revisadas, preservando datos.
6. Preparar CI/CD, despliegue, observabilidad y respaldos antes de uso comercial.

## Recursos y seguridad

Fotografías referenciales con fuentes y licencia Pexels registradas en `apps/web/public/images/sources.json`. No representan clientes ni recomendaciones de Pawly.

Git excluye variables locales, dependencias, compilaciones y resultados de pruebas. Los archivos .env.example son plantillas y no deben contener credenciales reales.

Autor: Yerko Barrera · 2026.
