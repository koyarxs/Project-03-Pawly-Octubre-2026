"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { AuthError, registerUser, type UserRegistration } from "@/lib/auth";
import { dashboardPath } from "@/lib/workspace";

export function StaffRegistration() {
  const router = useRouter();
  const [values, setValues] = useState({name:"",email:"",password:"",confirmation:"",role:"RECEPTIONIST"});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const lock = useRef(false);
  const update = (key: keyof typeof values, value: string) => {setValues(current=>({...current,[key]:value}));setError("");};
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    if (!values.name.trim()) { setError("Ingresa tu nombre completo."); return; }
    if(values.password !== values.confirmation) {setError("Las contraseñas deben coincidir.");return;}
    lock.current=true;setBusy(true);setError("");
    try {
      const result=await registerUser({name:values.name.trim(),email:values.email.trim(),password:values.password,role:values.role as UserRegistration["role"]});
      router.replace(dashboardPath(result.clinic.id));
    } catch(error) {
      setError(error instanceof AuthError && error.status===409 ? "Este correo ya tiene una cuenta. Inicia sesión o utiliza otro correo." : error instanceof AuthError && error.status===400 ? "Revisa los datos y usa una contraseña de al menos 15 caracteres." : "No pudimos crear tu cuenta. Inténtalo nuevamente.");
      lock.current=false;setBusy(false);
    }
  }
  return <>
    <span className="auth-kicker">CLÍNICA VETERINARIA PORVENIR</span>
    <h1>Crea tu cuenta</h1>
    <p className="auth-intro">Completa tus datos y elige tu cargo para entrar a tu espacio de trabajo.</p>
    <form className="auth-form" onSubmit={(event)=>void submit(event)}>
      <fieldset disabled={busy} style={{border:0,padding:0,margin:0,minWidth:0}}>
        {([ ["name","Nombre completo","text","name"], ["email","Correo electrónico","email","email"] ] as const).map(([key,label,type,autocomplete])=><div className="auth-field" key={key}><label htmlFor={`register-${key}`}>{label}</label><div className="auth-input-wrap"><input id={`register-${key}`} type={type} autoComplete={autocomplete} value={values[key]} onChange={event=>update(key,event.target.value)} required maxLength={key==="name"?120:254} /></div></div>)}
        <div className="auth-field"><label htmlFor="register-role">Cargo</label><div className="auth-input-wrap"><select id="register-role" className="registration-select" value={values.role} onChange={event=>update("role",event.target.value)} required>
          <option value="RECEPTIONIST">Recepción</option><option value="VETERINARIAN">Médico veterinario</option><option value="VET_TECHNICIAN">Técnico veterinario</option><option value="PET_GROOMER">Peluquería canina</option>
        </select></div></div>
        <div className="auth-field"><label htmlFor="register-password">Contraseña</label><div className="auth-input-wrap"><input id="register-password" type={visible?"text":"password"} value={values.password} onChange={event=>update("password",event.target.value)} autoComplete="new-password" minLength={15} maxLength={128} required aria-describedby="register-password-hint" /><button type="button" className="auth-eye" onClick={()=>setVisible(current=>!current)} aria-label={visible?"Ocultar contraseña":"Mostrar contraseña"}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div><p id="register-password-hint" className="auth-hint">Usa al menos 15 caracteres. Puedes elegir una frase fácil de recordar.</p></div>
        <div className="auth-field"><label htmlFor="register-confirmation">Confirmar contraseña</label><div className="auth-input-wrap"><input id="register-confirmation" type={visible?"text":"password"} value={values.confirmation} onChange={event=>update("confirmation",event.target.value)} autoComplete="new-password" minLength={15} maxLength={128} required /></div></div>
        {error && <p className="auth-field-error" role="alert">{error}</p>}
        <button type="submit" className="auth-submit">{busy?<><LoaderCircle size={18} className="auth-spinner"/>Creando cuenta…</>:<>Crear mi cuenta <ArrowRight size={18}/></>}</button>
      </fieldset>
    </form>
    <p className="auth-switch">¿Ya tienes cuenta? <Link href="/iniciar-sesion">Iniciar sesión</Link></p>
  </>;
}
