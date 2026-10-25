# Galerías de historias del equipo

> Proyecto 03 | [Project-03-Pawly-Octubre-2026](https://github.com/koyarxs/Project-03-Pawly-Octubre-2026)

27 escenas ficticias: tres por cada uno de los nueve perfiles de demostración.
Generadas con la herramienta integrada `image_gen`, usando el retrato `*-demo-v2.webp`
correspondiente como referencia de identidad. Son ambientaciones ilustrativas de
Chile, principalmente de la Región de Valparaíso; no documentan personas,
instalaciones, pacientes, instituciones ni actividades reales de la clínica.

Archivos: `{director,veterinarian,surgeon,internist,trauma,technician,reception,groomer,exotics}-{1,2,3}.webp`.
Optimización con Sharp: ancho máximo 1200 px, proporción original, WebP calidad 82.
Los originales generados se conservan fuera del repositorio.

Los textos se encuentran en `src/lib/team-profile-stories.ts`. La formación es
ficticia, no se atribuyen títulos a universidades reales y se distinguen las
funciones clínicas, técnicas y administrativas. Las fichas publicadas desde el
backend no reciben estas historias ni galerías, aunque coincida la clave de una
imagen ilustrativa. No se crean usuarios ni se modifica la base de datos.

La ficha se abre desde «Ver perfil», conserva las tarjetas compactas, bloquea
el desplazamiento del fondo mientras está abierta y permite cerrar con Escape.
Incluye retrato, historia, recorrido formativo, enfoque de cuidado y tres fotos
con miniaturas, navegación y descripciones. Las fotos se solicitan al abrir el
perfil, sin descargar las 27 imágenes en la landing inicial.

El conjunto completo de prompts se documenta en `prompts.json`.
