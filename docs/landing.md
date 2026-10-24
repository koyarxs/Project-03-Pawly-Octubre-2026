# Sitio público

La ruta `/` presenta a Clínica Veterinaria Porvenir. El componente activo es `components/website/public-website.tsx`, que comparte el renderizador `clinic-website.tsx` con la vista previa privada. Los datos administrados proceden exclusivamente de la versión publicada en la API. Sin publicación se muestra el diseño editorial base, la dirección proporcionada por el propietario y un aviso de preparación; nunca se consulta ni se presenta el borrador. El editor y su configuración se describen en [Porvenir](porvenir-site.md).

La anterior landing comercial y sus capturas de producto se conservan en el repositorio como antecedentes, pero no forman parte de la ruta pública. No hay planes SaaS, contratación de clínicas, solicitud de demo ni formularios que simulen envíos.

## Imágenes e interacción

Las fotografías son WebP locales con licencia Pexels, autores y fuentes en `apps/frontend/public/images/porvenir-sources.json`, `pawly-2-sources.json` y `landing-sources.json`. Son ilustrativas: no representan al equipo ni a pacientes de Porvenir. Se sirven con `next/image`, tamaños declarados y carga diferida salvo la imagen principal. La biblioteca permite seleccionar imágenes existentes; no admite cargas nuevas.

El carrusel compartido mantiene espacio reservado, botones de al menos 44 px, control de pausa y navegación manual o táctil. Pausa al recibir foco, al pasar el puntero, al ocultarse o salir del viewport. Una pausa manual persiste. Respeta movimiento reducido; no usa librerías adicionales.

Las secciones opcionales solo aparecen cuando están habilitadas y completas. Contacto usa enlaces de teléfono, correo, WhatsApp y mapa construidos a partir de los valores configurados. No reserva citas públicas ni envía mensajes automáticamente. El menú móvil admite teclado y Escape. Los metadatos y el contenido inicial se obtienen en servidor, sin cachear borradores ni datos privados.

El diseño combina crema, verde profundo y coral, tipografía editorial, una portada con carrusel y efectos discretos que respetan movimiento reducido. La galería interactiva presenta cinco categorías: perros, gatos, conejos, cobayos y aves, con razas o especie identificadas como referencia ilustrativa. No anuncia atención de especies no confirmada por la clínica.

La sección de testimonios muestra tres ejemplos ficticios rotulados de forma visible, autorizados por el propietario para demostrar el diseño. No atribuye puntuaciones ni experiencias reales a esos ejemplos. Los testimonios publicados desde el editor reemplazan íntegramente la demostración y se renderizan como texto seguro.

La ubicación inicial proporcionada por el propietario es **C. Veinticinco 26, Valparaíso**. Una dirección publicada en el editor tiene prioridad. El mapa de Google se solicita únicamente al pulsar **Explorar mapa** y conserva un enlace externo alternativo; sin dirección no se inventan coordenadas ni se carga un mapa. El fondo previo es una ilustración, no cartografía real. No requiere clave de API ni dependencias nuevas.

## Verificación

`landing.spec.ts`, `landing-refresh.spec.ts`, `module-explorer.spec.ts` y `carousel.spec.ts` cubren contenido, ausencia de servicios inventados, textos sin HTML ejecutable, navegación, foco, movimiento reducido, imágenes locales, las cinco mascotas, etiquetas de demostración, carga explícita del mapa y responsive desde 320 px. `website-editor.spec.ts` cubre borrador, testimonios, vista previa y publicación; `website.real.spec.ts` verifica el flujo con Nest/PostgreSQL aislados.

Desde `apps/frontend`, ejecutar TypeScript, ESLint, unitarias, build y Playwright siguiendo su [README](../apps/frontend/README.md). Las comprobaciones automatizadas de accesibilidad y responsive no equivalen a una certificación WCAG ni a mediciones de Core Web Vitals en producción.
