# Retratos de demostración

> Proyecto 03 | [Project-03-Pawly-Octubre-2026](https://github.com/koyarxs/Project-03-Pawly-Octubre-2026)

La sección pública utiliza ahora `director-demo-v2.webp`, `veterinarian-demo-v2.webp`, `technician-demo-v2.webp`, `reception-demo-v2.webp` y `groomer-demo-v2.webp`: cinco nuevos retratos cuadrados de 640 px, WebP calidad 86, preparados para recortes circulares. Los originales anteriores se conservan. Las claves de perfil no cambian y no se modifican usuarios ni registros de la base de datos.

Dirección visual de la revisión: hombre mayor con barba canosa y lentes; mujer afro-latina de pelo rizado corto y bata blanca; mujer joven pelirroja con pecas y uniforme lavanda; hombre de rasgos asiáticos, pelo negro y camisa azul con cárdigan; mujer madura con pelo pixie y delantal terracota. Se solicitaron diferencias claras de edad, rostro, peinado y vestuario, con luz natural y fondos cálidos coherentes. Todas son identidades generadas ficticias.

El borde de trazo orgánico y su animación son SVG/CSS de la interfaz, independientes del retrato. La preferencia de movimiento reducido desactiva la animación.

Cinco identidades completamente ficticias. Imágenes generadas con la herramienta
integrada `image_gen` para Pawly el 22 de octubre de 2026. No representan a
trabajadores reales ni acreditan una profesión. La interfaz muestra siempre la
indicación «Imagen generada · ilustrativa» cuando utiliza estos recursos.

Archivos: `director-demo.webp`, `veterinarian-demo.webp`,
`technician-demo.webp`, `reception-demo.webp`, `groomer-demo.webp`.
Conversión WebP a 640 × 800 px, calidad 83, mediante Sharp ya incluido en Next.js.

Prompt común utilizado para cada retrato:

> Generate one professional editorial portrait photograph for a clearly labeled
> demo veterinary website. [Subject below]. Entirely invented person, no real
> identity. Vertical 4:5 composition, head and upper torso, subject centered,
> natural window light, clean softly blurred cream and sage veterinary clinic
> background, realistic skin texture, restrained premium healthcare website
> aesthetic, no props, no text, no logo, no watermark.

Sujetos de cada prompt:

- Director: fictional Latin American man aged 42, warm confident smile, dark hair
  with subtle grey, olive veterinary scrubs, no lab coat, director of a small
  animal clinic.
- Veterinaria: fictional Latin American woman aged 34, chestnut hair tied back,
  warm confident smile, muted sage veterinary scrubs, veterinarian.
- Técnica: fictional Latin American woman aged 29, dark wavy tied-back hair,
  warm friendly smile, muted sage veterinary nurse scrubs.
- Recepción: fictional Latin American man aged 30, short dark hair, friendly
  approachable smile, cream smart-casual shirt, veterinary clinic receptionist.
- Peluquería: fictional Latin American woman aged 31, shoulder-length dark hair,
  cheerful calm smile, muted sage grooming apron over cream shirt, pet groomer.

Cada prompt terminó con: `This is the [director/veterinarian/technician/reception/groomer]
portrait asset for the Pawly project.`

Los originales se conservaron fuera del repositorio. Estas imágenes optimizadas
son las únicas que consume la aplicación. No se generan usuarios a partir de ellas.

## Ampliación a nueve perfiles

Se añaden `surgeon-demo-v2.webp`, `internist-demo-v2.webp`, `trauma-demo-v2.webp` y `exotics-demo-v2.webp` (640 × 640, WebP calidad 86). Los nueve perfiles se distribuyen en cinco y cuatro, con la última fila centrada; en pantallas menores se reorganizan sin desbordamiento. El fondo usa ondas suaves, follaje de línea y huellas en SVG/CSS.

Herramienta: `image_gen` integrada. Prompt común: “Use case: photorealistic-natural. Square editorial portrait for fictional veterinary team demo website. One wholly fictional person, centered head and shoulders, entire head visible with generous space above hair, facing camera warm natural smile. Bright softly blurred modern veterinary office, sage cream palette, natural daylight, realistic skin texture, premium authentic photography. No text, logos, watermark, animals or other people. Distinct identity:”. Variantes:

- Cirugía: Chilean man age 32, dark olive skin, shaved head, clean shaven, broad face, navy surgical scrubs.
- Medicina interna: Chilean woman age 52, warm medium skin, shoulder-length wavy dark hair, rectangular burgundy glasses, cream coat over plum blouse.
- Traumatología: Chilean man age 42, fair skin, long blond hair tied back, short blond beard, slate blue scrubs, angular face.
- Exóticos: Chilean woman age 29, indigenous Andean facial features, tan skin, straight black bob with bangs, forest green scrub top.

Los títulos de estas especialidades solo ilustran la presentación pública de ejemplo: no crean roles, credenciales ni usuarios. Si existen perfiles publicados, se muestran únicamente esos perfiles, sin completar con identidades ficticias.
