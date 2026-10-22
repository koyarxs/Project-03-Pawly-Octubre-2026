# Sitio autoadministrable de Porvenir

Pawly sirve a una veterinaria: sitio público y gestión interna de agenda, tutores, pacientes y consultas. Conserva los permisos y el aislamiento por clínica existentes. No incluye planes ni contratación SaaS.

## Configuración y acceso

El backend requiere `WEBSITE_CLINIC_ID` con el UUID de una clínica existente y activa. `WEBSITE_PUBLIC_NAME` define el nombre inicial del borrador, sin renombrar la clínica interna. Los valores concretos de la vinculación local autorizada permanecen en el archivo de entorno ignorado.

Ingresar por `/iniciar-sesion`, seleccionar la clínica y abrir **Sitio web** en la navegación privada. Solo OWNER y ADMIN de la clínica configurada pueden administrar el contenido. Registrar otra clínica no concede acceso al sitio. El acceso directo sin permisos tampoco solicita el borrador.

El editor permite cambiar nombre público, portada, selección de fotografías de biblioteca, servicios, presentación, contacto y horarios; las secciones opcionales se pueden ocultar. No hay carga de archivos ni edición HTML.

## Borrador y publicación

1. Editar el contenido y guardar el borrador.
2. Revisar la vista previa privada, que también admite cambios todavía no guardados.
3. Publicar mediante confirmación explícita. Se publica el último borrador guardado; se exige un medio de contacto y contenido completo para las secciones habilitadas.

Guardar posteriormente no cambia el sitio publicado. Retirar la publicación requiere confirmación y conserva el borrador. Sin publicación, `/` presenta una pantalla de preparación y acceso al personal. No se crean servicios, horarios ni contactos reales automáticamente.

Cada escritura envía una versión. Un conflicto devuelve 409 y conserva el texto local para revisarlo, sin sobrescribir silenciosamente a otro editor. No se guarda un historial completo de versiones del contenido en esta entrega.

## API y seguridad

| Método y ruta | Acceso |
| --- | --- |
| `GET /api/website` | Público: únicamente contenido publicado y fecha de publicación |
| `GET /api/clinics/:clinicId/website` | OWNER/ADMIN: borrador y estado |
| `PATCH /api/clinics/:clinicId/website` | Guardar borrador con versión |
| `POST /api/clinics/:clinicId/website/publish` | Publicar versión guardada |
| `POST /api/clinics/:clinicId/website/unpublish` | Retirar publicación |

Las rutas privadas reutilizan sesión, membresía, permiso `clinic:manage`, validación de origen y CSRF. Las transacciones comprueban que usuario, clínica y membresía continúen activos. Las respuestas usan `no-store`. El endpoint público no devuelve borradores, autores ni datos clínicos y omite las cookies del navegador. Los textos se renderizan sin HTML arbitrario; las fotografías se limitan a identificadores de recursos locales.

El renderizado público de Next consulta la API también en servidor para obtener contenido y metadatos. Usa `NEXT_PUBLIC_API_URL`; el override opcional `WEBSITE_SERVER_API_URL` se reserva al servidor y permite conectar las pruebas aisladas sin cambiar la URL compilada del navegador.

## Persistencia y pruebas

La migración aditiva `20261021010000_veterinary_website` crea `VeterinaryWebsite`, su índice único y restricciones de borrador, versión, publicación y autoría en la misma clínica. No inserta contenido ni modifica filas existentes. Aplicar migraciones en bases con datos requiere autorización; no usar `migrate reset` ni `db push`.

La integración backend prueba privacidad, publicación, validación, concurrencia, permisos, clínica ajena, suspensión y retirada. Playwright cubre el editor, vista previa, foco, errores, cambio de rol y tamaños móviles. `website.real.spec.ts` recorre el flujo completo contra Nest y PostgreSQL en un esquema nuevo exclusivo de QA; comprueba que `public` permanezca intacto y elimina únicamente su esquema con `RESTRICT`.

Verificación local del 21 de octubre de 2026: TypeScript, ESLint y builds de ambas aplicaciones; 82 unitarias y 70 integraciones backend; 9 unitarias frontend, 169 escenarios controlados de navegador verificados entre la suite y la reejecución de módulos, y 12 recorridos con Nest/PostgreSQL reales. El gesto táctil se omite únicamente en el proyecto de escritorio. Revisión visual a 320, 375, 768, 1024 y 1440 px sin desbordamientos. La corrección del identificador duplicado de Diagnóstico pasó en escritorio y móvil.

La migración se aplicó a la base local con autorización expresa después de las pruebas. Se verificaron checksum, índices, cuatro CHECK y tres FK; estructura y huellas de todas las filas preexistentes permanecieron iguales. La tabla del sitio quedó vacía: no se publicó contenido automáticamente. Esta evidencia describe el entorno local, no un despliegue.

## Límites

Contacto y horarios deben ser completados por la veterinaria. No hay reserva pública de citas, envío de formularios de contacto, carga de imágenes, correo automático ni editor de páginas arbitrarias. La agenda interna y los registros clínicos conservan sus contratos; el contenido web no los modifica. Antes de producción faltan dominio, TLS, respaldos, monitoreo y los controles operativos correspondientes.
