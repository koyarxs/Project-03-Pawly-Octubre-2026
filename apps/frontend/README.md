# 🐾 Pawly — Frontend

Frontend de **Pawly**, plataforma para la gestión integral del bienestar de mascotas.

## 🛠️ Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- ESLint
- App Router

## 📁 Ubicación

El frontend se encuentra dentro de la estructura principal del proyecto:

```text
apps/frontend/
├── public/
├── src/
│   └── app/
├── package.json
├── tsconfig.json
├── next.config.ts
└── eslint.config.mjs
```

## Desarrollo

Desde `apps/frontend`, ejecutar `npm ci` y `npm run dev`. Copiar `.env.example` a `.env.local` para configurar la URL del backend y el dominio del sitio. La guía completa y las verificaciones están en el [README principal](../../README.md).

## Autenticación y Workspace

`/registrarse` crea un responsable, una clínica y su membresía OWNER mediante la API real. La confirmación de contraseña se valida localmente y no se envía; las contraseñas no se recortan. Solo se presenta éxito tras una respuesta válida de la API. El registro no inicia sesión automáticamente. `/iniciar-sesion` autentica y navega a `/app`. El Workspace comprueba `/auth/me` antes de mostrar perfil o clínicas, verifica cada selección con `/clinics/:clinicId/access` y cierra la sesión mediante `/auth/logout`. No contiene pacientes, inventario, consultas ni agenda.

Las páginas usan los colores, Geist y marca existentes, con CSS limitado a `.pawly-auth` y `.pawly-workspace`. La landing y sus componentes permanecen intactos. El acceso anterior era informativo y ahora contiene el formulario funcional.

### Conexión con la API

Configurar `NEXT_PUBLIC_API_URL=http://localhost:3001/api` antes del build; Next incorpora las variables públicas al JavaScript generado. `SITE_URL=http://localhost:3000` configura los metadatos. El backend debe estar disponible con `CORS_ORIGINS` incluyendo exactamente `http://localhost:3000` para desarrollo. La configuración existente ya lo permite.

Las llamadas se hacen desde el navegador, sin BFF ni endpoints adicionales. Usan `credentials: "include"`, `cache: "no-store"` y, en POST, JSON y `X-Pawly-CSRF: 1`. El navegador genera `Origin`; no se falsifica desde el frontend. Las cookies HttpOnly las crea, valida y elimina exclusivamente Nest. No se guardan tokens ni contraseñas en localStorage/sessionStorage, ni se leen tokens desde JavaScript.

Usar el mismo hostname en ambos servicios: `localhost` con `localhost`, no frontend en `127.0.0.1` y API en `localhost`. Compartir hostname permite las cookies SameSite=Lax entre puertos. Para producción, servir Next y `/api` mediante un reverse proxy HTTPS del mismo origen y construir con `NEXT_PUBLIC_API_URL=/api`; esta implementación no admite cookies entre sitios distintos. No se requieren cambios del backend. Configurar explícitamente su `NODE_ENV=production`, TLS y el origen HTTPS exacto.

El registro público continúa deshabilitado en producción mientras falta verificación de correo: el frontend presenta un mensaje seguro ante 503. Los usuarios no verificados reciben el error genérico de login del backend. No hay recuperación de contraseña ni verificación de correo en esta versión.

### Seguridad y estados

El HTML de `/app` contiene únicamente la pantalla de comprobación; no obtiene ni serializa datos privados en el servidor. Ante 401 redirige únicamente a `/iniciar-sesion`. Un fallo de red o 5xx presenta reintento, sin bucles ni falsa pérdida de sesión. No se aceptan destinos de redirección proporcionados por URL. La sesión se vuelve a comprobar al regresar a la pestaña o restaurar la página desde la caché del navegador. Una respuesta de acceso antigua se cancela al cambiar la selección. La selección de clínica es temporal, se verifica contra el servidor y no otorga permisos por sí sola.

Los formularios presentan errores asociados a cada campo, foco accesible, mostrar/ocultar contraseña, carga y bloqueo de envíos duplicados. Los errores de API se traducen a mensajes definidos por estado; no se muestran cuerpos internos ni se registran credenciales. Las respuestas exitosas se validan antes de usarlas. Cerrar sesión solo navega al login cuando Nest confirma logout o indica que la sesión ya no existe; ante otros fallos permite reintentar.

### Verificación

- `npm run typecheck`, `npm run lint`, `npm run build`.
- `npm run test:e2e`: suite Playwright con Edge en Windows, escritorio y móvil. Incluye landing y pruebas de autenticación con respuestas controladas para validación, 400/401/403/409/429/503, errores de conexión, acceso denegado, logout fallido, estados vacíos y protección previa a la sesión. Estos mocks existen solo en los tests.
- `npm run test:e2e:real`: flujo de navegador contra Nest y PostgreSQL reales. Requiere dependencias y build del backend (`cd ../backend && npm run build`) y build del frontend con API `http://localhost:3001/api`. Reservar puertos 3001 y 3100 para esta ejecución; no reutiliza servicios ajenos.

La verificación real exige la base local `pawly` en loopback:5433/public y un entorno distinto de producción. Su proceso crea un esquema nuevo `pawly_frontend_test_<uuid>` sin reutilizar ninguno existente; comprueba el esquema tanto en Prisma de pruebas como en la API, aplica las migraciones existentes únicamente allí y configura CORS para `http://localhost:3100`. Las cuentas son fixtures identificadas como QA, con correos `example.invalid`. Comprueba persistencia tras recarga, cookie HttpOnly/SameSite, ausencia de tokens en almacenamiento del navegador, rechazo de una clínica ajena, CSRF y revocación al salir.

El runner espera el cierre de la API, elimina exclusivamente tablas/tipos conocidos y el esquema propio con `RESTRICT`, sin `CASCADE`, y compara estructura y huellas de todas las filas de las tablas de `public` con una captura inicial de solo lectura. Un fallo de limpieza o cambio en `public` hace fallar el comando. Una interrupción forzada del proceso podría dejar su esquema temporal pendiente de revisión; no limpia esquemas de otras ejecuciones. Screenshots y trazas se guardan en `.next/qa`, excluido de Git, y contienen únicamente datos de pruebas.
