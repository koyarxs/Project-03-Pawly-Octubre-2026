# Reseñas de la landing

La sección `#testimonios` utiliza tres fuentes independientes, sin mezclarlas:

- Google Places API (New), cuando está configurada y responde correctamente.
- Testimonios publicados desde el editor del sitio, cuando no hay conexión a Google.
- Seis tarjetas ficticias identificadas como demostración, si no hay testimonios publicados.

Una ficha de Google sin opiniones muestra un estado vacío, sin añadir ejemplos.
Los testimonios propios no reciben puntuaciones ni cargos inventados. Los cargos
profesionales solo forman parte de los ejemplos. No se genera marcado SEO de
valoraciones con datos ficticios.

## Configuración local pendiente

En `apps/frontend/.env.local`, fuera de Git:

```dotenv
GOOGLE_PLACES_API_KEY=<clave restringida de Places API New>
GOOGLE_PLACE_ID=<identificador de la ficha real de la clínica>
```

La dirección `C. Veinticinco 26, Valparaíso` permite construir el enlace público
a Maps, pero no confirma por sí sola qué ficha de negocio corresponde a la
clínica. No se elige una ficha ni se inventan opiniones a partir de una dirección.
No se han añadido credenciales ni habilitado servicios de pago automáticamente.
Google requiere proyecto, API habilitada y facturación; las cuotas se configuran
en Google Cloud. Reiniciar solamente la instancia de Next.js tras configurar las
variables. No usar `NEXT_PUBLIC_` para la clave.

## Implementación

`GET /api/google-reviews` en Next.js es un adaptador de presentación para el
proveedor externo; no cambia las APIs clínicas de NestJS ni la base de datos.
La solicitud utiliza una ficha fija del servidor, idioma español, región CL,
campos limitados y timeout de 8 segundos. No acepta URLs ni claves del visitante.
No registra errores o respuestas sin filtrar del proveedor ni devuelve la clave.

Sin variables devuelve `not-configured` sin llamar a Google. La respuesta y el
fetch usan `no-store`; no se guardan reseñas en Prisma, archivos ni caché. Para
esta instancia local, se permiten como máximo 10 solicitudes al proveedor por
minuto y una simultánea. Antes de un despliegue con múltiples instancias se
requiere limitar también en el proxy y establecer cuotas de Google Cloud.

La consulta se inicia al entrar la sección en pantalla, nunca en la vista previa
del editor. Se conservan puntuaciones bajas, texto completo, autor, avatar,
enlaces originales, orden por relevancia y aviso de traducción. Las estrellas
admiten fracciones. La atribución `Google Maps` se muestra solo con contenido de
Google. Places devuelve hasta cinco reseñas: el diseño admite seis o más
testimonios propios, sin completar datos de Google con personas ficticias.

El carrusel muestra tres tarjetas en escritorio, dos en tablet y una en móvil.
Incluye flechas, indicadores, teclado, avance cada siete segundos, pausa al
interactuar y respeto a movimiento reducido. Los retratos ficticios y prompts
están en `apps/frontend/public/images/reviews/`.

Pruebas unitarias: proveedor simulado, ausencia de credenciales, URLs inseguras,
fallos, atribución y conservación de puntuaciones. Pruebas de navegador: seis
ejemplos, imágenes, navegación, tamaños, autoplay, fuentes reales simuladas,
estado vacío, fallo de conexión y textos seguros. No hacen solicitudes de pago.

Referencias oficiales:

- [Place Details](https://developers.google.com/maps/documentation/places/web-service/place-details)
- [Máximo de cinco reseñas](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places)
- [Atribuciones y políticas](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Facturación y cuotas](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)

Antes de activar la integración en un sitio público, completar los términos y
la política de privacidad exigidos por Google Maps Platform. La implementación
local preparada no equivale a una conexión real ni a una publicación comercial.
