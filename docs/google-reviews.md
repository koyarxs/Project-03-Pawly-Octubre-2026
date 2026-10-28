# Testimonios y Google Maps

La landing muestra hasta seis comentarios con foto circular, nombre, estrellas y texto. En escritorio se organizan en dos filas de tres, con el logo de Google y el enlace para escribir una reseña en una columna a la izquierda, alineada con la primera fila. En celular se deslizan por pares en dos filas, usando flechas, indicadores, teclado o gestos táctiles. No hay reproducción automática.

Se priorizan las reseñas obtenidas de Google Places; si no hay conexión configurada se muestran los testimonios publicados o seis comentarios iniciales del proyecto. Estos no se atribuyen a Google. No se mezclan reseñas de Google con comentarios iniciales ni se inventan valoraciones para testimonios publicados. Una ficha Google sin reseñas permanece vacía.

Las fotos iniciales son retratos fotográficos descargados de Pexels, con fuentes en `public/images/reviews/portraits/README.md`. Las fotos recibidas de Google usan `authorAttribution.photoUri`. Si falta una foto se usa un retrato local de presentación. No se cargan las antiguas escenas o retratos generados por IA. Se conservan los enlaces originales, puntuaciones bajas y avisos de traducción de Google. La puntuación y el número agregado de opiniones solo aparecen cuando los proporciona el servicio.

## Configuración

En `apps/frontend/.env.local`, excluido de Git:

```dotenv
GOOGLE_PLACES_API_KEY=<clave de Places API New>
GOOGLE_PLACE_ID=<identificador de la ficha de la clínica>
```

Reiniciar Next después de configurar las variables. La clave permanece en el servidor. El adaptador `GET /api/google-reviews` consulta una ficha fija, limita las solicitudes y no guarda reseñas en la base de datos ni en caché.

El botón **Escribir una reseña** utiliza `googleMapsLinks.writeAReviewUri`, suministrado por Places, para abrir el formulario de Google en otra pestaña. La autenticación y publicación se hacen en Google. Sin ese enlace se conserva el mapa actual, construido a partir de la dirección configurada; una dirección por sí sola no identifica una ficha comercial.

Las pruebas usan respuestas simuladas sin consumir la API. Cubren tarjetas, enlaces seguros, comentarios vacíos, fallos del proveedor, texto sin ejecutar HTML, controles del carrusel y alineación de portada con logo en todos los anchos.

[Documentación oficial de enlaces de Google Maps](https://developers.google.com/maps/documentation/places/web-service/maps-links).
