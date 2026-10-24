# Retratos de testimonios de demostración

Seis identidades ficticias generadas con `image_gen` integrada: Catalina Fuentes,
Rodrigo Mella, Isabel Arancibia, Andrés Salinas, Paula Vergara y Felipe Rojas.
Los nombres, cargos y estrellas de las tarjetas son ejemplos editoriales. No
representan clientes, profesionales reales ni reseñas procedentes de Google.

Archivos: `catalina.webp`, `rodrigo.webp`, `isabel.webp`, `andres.webp`,
`paula.webp`, `felipe.webp`. Retratos cuadrados de 320 px, WebP calidad 84,
optimizados mediante Sharp. Los originales generados se conservan fuera del
repositorio. Los prompts completos se conservan en `prompts.json`.

Se solicitaron rostros claramente distintos, vestuario profesional, luz natural,
contexto chileno y ausencia de marcas, instituciones, diplomas o personas reales.
No se reutilizan retratos del equipo clínico.

## Revisión fotográfica inspirada en la referencia

Se conservan los seis retratos anteriores y se añaden siete imágenes originales:
`stories-header.webp` y `{catalina,rodrigo,isabel,andres,paula,felipe}-story.webp`.
Se generaron con `image_gen` integrada; cada escena usa el retrato del personaje
como referencia para conservar su identidad. La cabecera es una escena ficticia
independiente y no reproduce la foto de referencia. Prompts: `story-prompts.json`.

Cabecera optimizada a un ancho máximo de 1920 px; escenas a 1000 px, proporción
original y WebP calidad 84. No se modifican los originales generados ni las fotos
anteriores. Las escenas muestran a cada persona con la especie de su relato en
una ambientación chilena. Solo acompañan a los testimonios de demostración;
no se añaden a reseñas de Google ni a testimonios reales publicados.

Los marcos tipo recuerdo son HTML/CSS y reutilizan las fotografías ilustrativas
`porvenir/cat.webp` y `porvenir/dog.webp`. No se presentan como pacientes reales.
