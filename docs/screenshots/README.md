# Capturas de Project-03 · Pawly

Actualización del **28 de octubre de 2026**. El manifiesto `private-captures.json` registra las capturas nuevas tanto públicas como privadas, generadas por `tests/documentation.real.spec.ts`.

- Next.js en 3100 y NestJS en 4001, con PostgreSQL real en un esquema temporal exclusivo.
- Usuarios, pacientes, tutores, consultas y citas ficticios; no se utilizan cuentas reales.
- Escritorio 1440 × 1000 y móvil 390 × 844; páginas completas y secciones pueden tener otra altura.
- WebP calidad 90; sin alterar métricas, nombres ni contenido mediante edición de imagen.
- No se capturan contraseñas, cookies, claves privadas de reserva ni credenciales.
- Los UUID de las rutas se sustituyen por `:id` en el manifiesto.
- El mapa externo se bloquea durante este recorrido y no se captura como evidencia de Google Maps.
- La portada utiliza el contenido editorial de respaldo, sin publicar un borrador en una clínica real.
- La limpieza usa `RESTRICT` y comprueba que estructura y huellas de filas de `public` permanezcan intactas.

Desde `apps/frontend`, con ambos proyectos compilados y PostgreSQL disponible:

```powershell
node tests/support/run-real-tests.mjs documentation.real.spec.ts --project=desktop
```

Las imágenes antiguas que no figuran en el manifiesto nuevo y `public-captures.json` corresponden a la documentación del 24 de octubre; se conservan como antecedentes, no como capturas actualizadas. El README principal utiliza la selección nueva. El script público antiguo se conserva como herramienta histórica; sus selectores deben adaptarse si se vuelve a utilizar.

Los retratos y opiniones locales son material de demostración. Las capturas no acreditan integrantes de la clínica, atenciones reales ni opiniones verificadas por Google.
