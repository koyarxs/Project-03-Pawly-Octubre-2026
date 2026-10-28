// Explicit local provisioning. Does not overwrite accounts or verify medical credentials.
const { PrismaClient, PermissionKey } = require('@prisma/client');
const { randomBytes } = require('node:crypto');
const argon2 = require('argon2');
const fs = require('node:fs');
const path = require('node:path');
async function main() {
  if (process.env.NODE_ENV !== 'development' || !['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error('Local development database required');
  const clinicId = process.env.WEBSITE_CLINIC_ID;
  if (!clinicId) throw new Error('WEBSITE_CLINIC_ID required');
  const db = new PrismaClient();
  const dir = path.resolve('../../tmp'); fs.mkdirSync(dir,{recursive:true});
  const output = path.join(dir,'porvenir-cuentas.json');
  if (fs.existsSync(output)) throw new Error('Account file already exists; refusing to overwrite credentials');
  const specs = [
    ['editor.web','Editor del sitio web','RECEPTIONIST',null],
    ['administracion','Administración Porvenir','ADMIN','CLINIC_DIRECTOR'],
    ['recepcion','Recepción Porvenir','RECEPTIONIST','RECEPTIONIST'],
    ['veterinaria','Medicina Veterinaria','VETERINARIAN','VETERINARIAN'],
    ['asistencia','Asistencia Veterinaria','VET_TECHNICIAN','VET_TECHNICIAN'],
    ['peluqueria','Peluquería Veterinaria','PET_GROOMER','PET_GROOMER'],
  ];
  const accounts=[];
  try {
    for(const [local,name,role,job] of specs) {
      const email=`${local}@porvenir.local`;
      if(await db.user.findUnique({where:{normalizedEmail:email}})) throw new Error(`Account already exists: ${email}`);
      const password=randomBytes(21).toString('base64url');
      accounts.push({email,password,name,role,job,passwordHash:await argon2.hash(password,{type:argon2.argon2id,memoryCost:19456,timeCost:2,parallelism:1})});
    }
    await db.$transaction(async tx=>{
      for(const account of accounts){
        const user=await tx.user.create({data:{name:account.name,email:account.email,normalizedEmail:account.email,passwordHash:account.passwordHash}});
        const editor=account.email.startsWith('editor.web@');
        const member=await tx.clinicMembership.create({data:{clinicId,userId:user.id,role:account.role,permissionDenials:editor?Object.values(PermissionKey).filter(key=>key!=='CLINIC_READ'):[]}});
        account.membershipId=member.id;
        if(account.job) await tx.staffProfile.create({data:{clinicId,membershipId:member.id,displayName:account.name,job:account.job}});
      }
    });
    const editor=accounts.find(a=>a.email.startsWith('editor.web@'));
    let env=fs.readFileSync('.env','utf8');
    env=env.replace(/^WEBSITE_EDITOR_MEMBERSHIP_ID=.*\r?\n?/gm,'');
    fs.writeFileSync('.env',`${env.trimEnd()}\nWEBSITE_EDITOR_MEMBERSHIP_ID=${editor.membershipId}\n`);
    fs.writeFileSync(output,JSON.stringify({login:'http://localhost:3000/iniciar-sesion',clinicId,notes:'Cuentas locales. El profesional debe tener sus credenciales verificadas por el propietario para acceder a consultas y documentos clínicos.',accounts:accounts.map(({passwordHash,...account})=>account)},null,2));
    console.log(JSON.stringify({created:accounts.length,credentialsFile:output,editor:editor.email}));
  } finally {await db.$disconnect();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
