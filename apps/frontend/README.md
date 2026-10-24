# Pawly — Frontend

Next.js 16.3.5, React 19 y TypeScript. Sitio público autoadministrable de Clínica Veterinaria Porvenir y gestión interna con autenticación, dashboard, agenda, tutores, pacientes e historia clínica. Sin planes ni contratación SaaS.

## Desarrollo

Configurar `.env.local` a partir de `.env.example`. Usar `NEXT_PUBLIC_API_URL=http://localhost:3001/api` y `SITE_URL=http://localhost:3000`. Desde esta carpeta: `npm.cmd ci` y `npm.cmd run dev`. No iniciar otra instancia si Pawly ya ocupa 3000; las comprobaciones de producción usan 3100 y pueden coexistir con el servidor de desarrollo.

El backend debe permitir el origen exacto en CORS. Mantener `localhost` en ambos servicios para las cookies SameSite=Lax. Las llamadas privadas usan cookies HttpOnly gestionadas por Nest, `credentials: include`, `no-store` y CSRF en escrituras; no se almacenan credenciales ni tokens en localStorage/sessionStorage. En producción se requiere HTTPS y proxy del mismo origen; el registro público continúa bloqueado mientras falta verificación de correo. La recuperación de contraseña no está implementada.

## Rutas

| Ruta | Contenido |
| --- | --- |
| `/` | Contenido publicado; sin publicación, diseño editorial con aviso de preparación |
| `/iniciar-sesion` | Acceso del personal |
| `/app` | Selector de clínicas autorizadas |
| `/app/clinicas/:clinicId/dashboard` | Indicadores reales de API, con carga, errores y restricciones por rol |
| `/app/clinicas/:clinicId/tutores` y `/pacientes` | Directorios, fichas y formularios |
| `/app/clinicas/:clinicId/agenda` | Citas diarias/semanales, estados y reprogramación |
| `/app/clinicas/:clinicId/consultas` | Borradores, finalización y rectificaciones clínicas |
| `/app/clinicas/:clinicId/sitio-web` | Editor, vista previa privada y publicación según `clinic:manage` |
| `/app/clinicas/:clinicId/personal` | Personal, invitaciones, permisos, credenciales y publicación consentida |
| `/app/clinicas/:clinicId/mi-perfil` | Revisión del perfil público y consentimiento del trabajador |
| `/activar-acceso` | Aceptación de invitación mediante enlace privado de un solo uso |

El workspace valida sesión y permisos efectivos antes de mostrar datos; revalida al regresar a la pestaña y mientras está visible. Un 401 redirige al acceso; fallos transitorios ofrecen reintento. Cambiar la URL o la selección no concede permisos. Los módulos sin implementación se identifican como pendientes en el dashboard, sin enlaces operativos. El diseño comparte `design-tokens.css` y componentes de `ui/workspace-ui` sin sustituir los permisos del backend. Consulta [la matriz de acceso y sus límites](../../docs/staff-access.md).

Contratos: [sitio de Porvenir](../../docs/porvenir-site.md), [gestión clínica](../../docs/clinical-records.md), [agenda](../../docs/appointments.md) y [consultas](../../docs/consultations.md). Fotografías y carrusel: [sitio público](../../docs/landing.md).

## Verificación

Desde esta carpeta:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:unit
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run test:e2e:real
```

Unitarias: runner de Node 24 con transformación TypeScript. Playwright: Edge instalado en Windows, escritorio y móvil, servidor de producción propio en 3100. Requiere build previo. Las pruebas controladas simulan respuestas únicamente dentro de tests para errores, concurrencia, roles y estados. Evidencias en `.next/qa`, excluidas de Git; un nuevo build puede limpiarlas.

La suite real requiere build del backend y la base local `pawly` en loopback:5433/public, fuera de producción. Reserva 4001 para Nest y 3100 para Next, sin detener ni reutilizar otros servicios. Cada spec/viewport crea un esquema aleatorio `pawly_frontend_test_<uuid>`, comprueba la conexión y aplica las migraciones solo allí. Los fixtures son ficticios, con correos `example.invalid`. Selección por spec: `npm.cmd run test:e2e:real -- website.real.spec.ts`; por tamaño, añadir `--project=mobile` o `--project=desktop` para repetir únicamente los casos afectados.

El navegador redirige únicamente el transporte compilado hacia la API aislada; no simula respuestas en esta suite. Next recibe `WEBSITE_SERVER_API_URL` para consultar el mismo backend aislado. Se prueban cookies, CORS, CSRF, permisos, persistencia y aislamiento reales. Al terminar, el runner espera el cierre de Nest, elimina exclusivamente objetos conocidos de su esquema con `RESTRICT` y compara estructura y huellas de todas las filas de `public`. Un fallo de limpieza o cambio en `public` hace fallar el comando. Una interrupción forzada puede dejar el esquema temporal para revisión; no se limpian esquemas de otras ejecuciones.
