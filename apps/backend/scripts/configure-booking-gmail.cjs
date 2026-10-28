const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { randomBytes } = require('node:crypto');

function configureGmail(email, password, filename) {
  if (!/^[^\s@]+@gmail\.com$/i.test(email)) throw new Error('Indica una direccion Gmail valida.');
  const key = password.replaceAll(' ', '');
  if (!/^[a-zA-Z0-9]{16}$/.test(key)) throw new Error('La contrasena de aplicacion debe tener 16 caracteres.');
  let contents = fs.readFileSync(filename, 'utf8');
  const settings = { MAIL_MODE: 'smtp', MAIL_HOST: 'smtp.gmail.com', MAIL_PORT: '587', MAIL_SECURE: 'false', MAIL_USER: email, MAIL_FROM: email, MAIL_PASSWORD: key };
  if (!/^BOOKING_LINK_SECRET=.+$/m.test(contents)) settings.BOOKING_LINK_SECRET = randomBytes(48).toString('base64url');
  for (const [name, value] of Object.entries(settings)) {
    const pattern = new RegExp(`^${name}=.*$`, 'm');
    contents = pattern.test(contents) ? contents.replace(pattern, `${name}=${value}`) : `${contents.trimEnd()}\n${name}=${value}\n`;
  }
  fs.writeFileSync(filename, contents, { encoding: 'utf8', mode: 0o600 });
}
function hiddenPassword() {
  if (!process.stdin.isTTY) throw new Error('Ejecuta este comando en una terminal interactiva.');
  return new Promise((accept, reject) => {
    let value = '';
    process.stdout.write('Contrasena de aplicacion de Gmail (entrada oculta): ');
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const cleanup = () => { process.stdin.removeListener('keypress', press); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); };
    const press = (text, key = {}) => {
      if (key.ctrl && key.name === 'c') { cleanup(); reject(new Error('Configuracion cancelada.')); }
      else if (key.name === 'return' || key.name === 'enter') { cleanup(); accept(value); }
      else if (key.name === 'backspace') value = value.slice(0, -1);
      else if (text && /^[a-zA-Z0-9 ]+$/.test(text)) value += text;
    };
    process.stdin.on('keypress', press);
  });
}
async function main() {
  const filename = path.resolve(__dirname, '../.env');
  const contents = fs.readFileSync(filename, 'utf8');
  const email = process.argv[2] || contents.match(/^MAIL_USER=(.+)$/m)?.[1].trim();
  if (!email) throw new Error('Indica tu correo Gmail como argumento.');
  const password = await hiddenPassword();
  configureGmail(email, password, filename);
  console.log('Gmail configurado en .env. Reinicia el backend para activar los envios de reservas.');
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { configureGmail };
