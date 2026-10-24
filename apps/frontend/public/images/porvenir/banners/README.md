# Banners editoriales de Porvenir

La versión activa usa los archivos `*-v3.webp`: titulares pequeños y subtítulos discretos, nuevamente reducidos respecto de la versión v2 tras la revisión del usuario. La composición móvil de perro y gato muestra completas las patas, con margen inferior. Las imágenes anteriores se conservan como fuentes de la revisión; no se utilizan en el carrusel. Cada revisión usa una ruta distinta para evitar que la caché conserve un diseño anterior.

Seis composiciones originales generadas con la herramienta de imágenes de OpenAI el 22 de octubre de 2026, a partir de las referencias visuales del usuario. No son fotografías descargadas de otras clínicas ni representan instalaciones, personal o pacientes reales.

Tres mensajes con variantes panorámica (1942 × 809) y móvil (1122 × 1402):

- Perro mestizo y gato: «Cuidarlos es quererlos. Cada día cuenta a su lado.»
- Conejo y cobayo: «Pequeños compañeros. Grandes vínculos. Su bienestar también importa.»
- Ninfa y periquito: «Cada vida tiene su encanto. Un vínculo que merece cuidado.»

Dirección visual: composición fotográfica con animales recortados, tipografía integrada, verdes profundos y salvia, marfil, formas orgánicas y sombras suaves. Exportación WebP calidad 88; entre 130 y 235 KiB por archivo.

`website-banners.ts` conserva los mensajes como texto alternativo. El navegador elige una única variante mediante `<picture>`, sin recortar las letras. Los mensajes incrustados se cambian sustituyendo las imágenes; el editor permite seleccionar y ordenar las piezas existentes. Los identificadores anteriores se conservan para respetar el contenido guardado. Estos banners no confirman disponibilidad de atención de especies.

Referencia investigada de composición multiespecie: https://hamburg-berne.karriere.vet/ (solo inspiración; no se descargó ni reutilizó su arte).
