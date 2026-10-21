# Landing pública

La ruta `/` usa `components/marketing/`: contenido renderizado en servidor, menú responsive y selector accesible de capturas como componentes cliente. Estilos aislados en `marketing.module.css` y `product-tour.module.css`, sin cambios a autenticación ni módulos privados. Se mantienen Geist, la marca y las dependencias existentes.

La dirección SaaS toma como referencia la composición de [Schedule de Aceternity](https://ui.aceternity.com/templates/schedule-marketing-template): hero centrado, producto protagonista y tarjetas asimétricas. La implementación es propia de Pawly; no incorpora código ni recursos comerciales de esa plantilla. La navegación flotante, las fotografías veterinarias y los colores conservan la identidad del producto. Los diagramas decorativos explican estados y continuidad clínica; no son controles ni registros reales.

Las dos vistas del producto admiten ampliación mediante diálogo nativo, con desplazamiento de la captura completa, cierre por botón/Escape y retorno del foco. Las animaciones de entrada y transiciones respetan movimiento reducido.

## Contenido y accesos

La página presenta clínicas y permisos, tutores/pacientes, agenda diaria/semanal y consultas/historia clínica implementadas. El registro enlaza a `/registrarse` y el acceso a `/iniciar-sesion`. Se identifica la etapa de desarrollo: el backend aún deshabilita el registro en producción. No hay planes comerciales, cobros ni recepción de solicitudes de demo habilitados.

Las vistas conceptuales, el carrusel de mascotas y el formulario que descargaba una solicitud TXT dejaron de formar parte de la ruta pública. Sus archivos anteriores se conservan; no se reutiliza la información ficticia como estadísticas ni funciones operativas.

## Imágenes

Tres fotografías WebP existentes, de Gustavo Fring y Tima Miroshnichenko, bajo [licencia Pexels](https://www.pexels.com/license/). Originales, autores y ubicaciones en `public/images/landing-sources.json`. Las personas fotografiadas ilustran la práctica veterinaria; no representan clientes ni personal de Pawly.

`product-agenda.webp` y `product-clinical.webp` muestran componentes reales de este repositorio con datos completamente ficticios interceptados en un contexto de navegador nuevo. No se usaron cuentas, sesiones, pacientes ni bases reales. Procedencia y dimensiones en `public/images/product-sources.json`. Deben mantenerse rotuladas como interfaz real con datos de ejemplo y regenerarse al cambiar esas pantallas.

Todas las imágenes se sirven localmente mediante `next/image`, con tamaños declarados, carga diferida y recursos de origen optimizados. El hero es textual y la primera vista del producto aparece inmediatamente debajo. No hay dependencias de imágenes remotas durante la navegación.

## Verificación

Desde `apps/frontend`, usar `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run test:unit`, `npm.cmd run build` y `npm.cmd run test:e2e`. `npm.cmd` funciona en PowerShell sin cambiar su política de ejecución. Next 16.3.5 separa desarrollo en `.next/dev` y producción en `.next`: el build y Playwright en 3100 pueden coexistir con el frontend de VS Code en 3000. No iniciar una segunda instancia de desarrollo ni detener los procesos de las terminales del usuario. El build limpia `.next/qa`; guardar evidencias que deban conservarse en `tmp/` antes de compilar.

Los specs `landing.spec.ts` y `module-explorer.spec.ts` cubren metadatos, destinos reales sin enviar formularios, fotografías/capturas, ampliación/cierre/foco, menú, teclado, movimiento reducido, catálogo y responsive. Las pruebas existentes de autenticación y módulos privados siguen incluidas en la suite. No se requiere migración ni escritura en PostgreSQL para validar este rediseño.
