# Personal, permisos y equipo público

Pawly conserva sus membresías por clínica. El rol de membresía, el cargo público,
las credenciales profesionales y los permisos efectivos son datos independientes.
La portada actual sigue vinculada a la clínica configurada por `WEBSITE_CLINIC_ID`;
este módulo no añade un sistema de dominios o sitios públicos por tenant.

| Rol | Acceso inicial a módulos existentes |
| --- | --- |
| OWNER | Administración, personal, publicación y delegación de permisos críticos. No cambia su propio acceso ni transfiere propiedad desde este módulo. |
| ADMIN / CLINIC_DIRECTOR | Administración operativa y gestión de trabajadores de nivel operativo. No modifican propietarios, administradores o directores; no conceden permisos críticos ni capacidades que no poseen. |
| VETERINARIAN | Pacientes, tutores y agenda. Las facultades médicas requieren verificación y autorización independiente. |
| RECEPTIONIST | Tutores, registro y actualización administrativa de pacientes, agenda y estados administrativos. Sin notas ni historias clínicas. |
| VET_TECHNICIAN | Resumen administrativo de pacientes y agenda de pacientes asignados. Sin diagnósticos, recetas ni historia clínica completa. |
| PET_GROOMER | Resumen administrativo de pacientes asignados. No se presenta una agenda médica como agenda de peluquería. |

Las invitaciones nuevas de veterinarios, técnicos y estilistas usan alcance
`ASSIGNED`; las membresías anteriores mantienen `CLINIC`. El propietario puede
ajustarlo. Las asignaciones explícitas y las citas/consultas a cargo establecen la
relación de atención. Retirar una asignación explícita no borra esa relación histórica.

## Uso

- **Personal y Accesos:** `/app/clinicas/:clinicId/personal`.
- Invitar genera un enlace privado, válido durante 48 horas y de un solo uso.
  **No se envía correo.** Se guarda únicamente el hash del token. El enlace usa un
  fragmento, que la página elimina al leerlo; no se incluye en solicitudes GET.
- **Activación:** `/activar-acceso`. Una identidad nueva elige contraseña; una ya
  existente confirma la actual, sin restablecerla ni cambiar otras membresías.
- El formulario administrativo separa perfil, acceso, revisión de credencial,
  publicación, asignación de pacientes y estado. Los cambios requieren motivo y
  versión vigente; las operaciones sensibles conservan auditoría.
- **Mi perfil público:** `/app/clinicas/:clinicId/mi-perfil`. El trabajador revisa el
  contenido y presta consentimiento desde su propia sesión. Después un administrador
  con permiso de publicación publica esa instantánea. Retirar consentimiento la oculta.
- La sección pública `/#equipo` consulta `GET /api/website/team`. Solo muestra nombre,
  cargo, especialidad, descripción y fotografía; nunca correos, teléfonos internos,
  registros profesionales, identificadores de membresía ni datos de pacientes.

Si no hay perfiles publicados, se muestra un ejemplo de cinco identidades ficticias,
claramente identificado. No se crean cuentas demostrativas en la base real.
Las imágenes generadas, su procedencia y prompts están en
[`public/images/staff/README.md`](../apps/frontend/public/images/staff/README.md).

## Autorización y concurrencia

`permission-policy.ts` contiene el catálogo API y los valores por rol. Las
concesiones y denegaciones usan `PermissionKey` de Prisma, con validación de DTO y
restricción de contradicciones en PostgreSQL. Los permisos futuros de módulos no
implementados no son concedibles. Denegar prevalece sobre conceder.

Los guards consultan la membresía en cada solicitud. Las escrituras vuelven a
comprobar autoridad y alcance dentro de una transacción READ COMMITTED, tomando
primero el advisory lock compartido de la clínica. Así una solicitud que esperaba
un cambio de permisos ve su estado confirmado antes de escribir. Activar una
contraseña toma además un lock por identidad global. Los nuevos módulos con
escrituras sensibles deben utilizar el mismo patrón.

El frontend recibe los permisos en `/api/clinics/:clinicId/access`, sin deducirlos
del cargo. Revalida al volver a la pestaña y cada 30 segundos mientras está visible;
solo los cambios efectivos de acceso descartan el formulario actual. El backend
bloquea una operación revocada desde la siguiente solicitud, sin esperar ese intervalo.

La auditoría es append-only, protegida por trigger. El listado muestra los últimos
100 cambios; no hay exportación o paginación histórica implementada todavía.

## Credenciales y límites

OWNER, ADMIN y CLINIC_DIRECTOR no adquieren facultades médicas por administrar.
Un revisor distinto, con `credentials:verify`, debe documentar la comprobación y
autorizar la práctica. No hay conexión con un registro profesional oficial.
Para habilitar al propietario, este puede delegar la revisión a otro integrante
de confianza; para la revisión desde la interfaz se conceden `staff:read` y
`credentials:verify`. No existe auto-verificación. Ese permiso crítico solo lo concede OWNER.

La migración `20261022010000_clinic_staff_access` es aditiva y se aplicó localmente
con autorización explícita. No verifica automáticamente usuarios anteriores.

Pendientes reales: envío/verificación de correo, recuperación de contraseña,
carga de retratos propios, disponibilidad laboral, hospitalización y tareas de
enfermería, servicios de peluquería, inventario, caja, pagos, recetas y vacunación.
La publicación ofrece avatar o imágenes ilustrativas de muestra. Las nuevas
cuentas siguen sujetas al bloqueo de login sin correo verificado en producción.
