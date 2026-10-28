require('ts-node/register/transpile-only');
const fs = require('node:fs');
const path = require('node:path');
const { reservationPdf, reservationEmail, bookingLogo } = require('../src/appointments/booking-documents');
(async () => {
  const folder = path.resolve(__dirname, '../../../output/pdf');
  const previews = path.resolve(__dirname, '../../../tmp/booking-preview');
  fs.mkdirSync(folder, { recursive: true });
  fs.mkdirSync(previews, { recursive: true });
  const date = new Date(Date.now() + 3 * 86400000);
  date.setUTCHours(12, 30, 0, 0);
  const data = {
    preview: true, reference: '00000000-0000-4000-8000-000000000001', version: 1, status: 'PENDING',
    clinicName: 'Clínica Veterinaria Porvenir', clinicSlug: 'porvenir', address: 'C. Veinticinco 26, Valparaíso', phone: '+56 9 8210 0670', timezone: 'America/Santiago',
    service: 'Consulta veterinaria general', professional: 'Equipo veterinario Porvenir', startsAt: date, endsAt: new Date(date.valueOf() + 1800000),
    ownerName: 'Tutor de la reserva', email: process.env.MAIL_USER || 'correo@example.invalid', petName: 'Luna', species: 'Gato',
    managementUrl: 'http://localhost:3000/agendar-cita', managementKey: 'Vista previa - no corresponde a una reserva',
  };
  fs.writeFileSync(path.join(folder, 'comprobante-porvenir-vista-previa.pdf'), await reservationPdf(data));
  const email = reservationEmail(data);
  const logo = bookingLogo();
  fs.writeFileSync(path.join(previews, 'correo.html'), logo ? email.html.replace('cid:porvenir-logo', `data:image/png;base64,${fs.readFileSync(logo).toString('base64')}`) : email.html);
  console.log('Vista previa PDF y correo guardados; no se crea ni se envia ninguna reserva.');
})();
