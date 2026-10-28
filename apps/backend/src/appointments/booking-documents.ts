import PDFDocument from "pdfkit";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export type ReservationDocument = {
  reference: string; version: number; status: string; clinicName: string; clinicSlug: string;
  address: string; phone: string; timezone: string; service: string; professional: string;
  startsAt: Date; endsAt: Date; ownerName: string; email: string; petName: string; species: string;
  managementUrl: string; managementKey?: string;
  preview?: boolean;
};
export const reservationStates: Record<string, string> = {
  PENDING: "Solicitud pendiente de confirmación", CONFIRMED: "Hora confirmada", CONVERTED: "Hora confirmada",
  CANCELLED: "Reserva cancelada", REJECTED: "Solicitud no aprobada", COMPLETED: "Atención realizada", NO_SHOW: "Atención no realizada",
};
export const confirmedReservation = (status: string) => ["CONFIRMED", "CONVERTED"].includes(status);
export function emailManagementKey(row: { id: string; clinicId: string; tokenHash: string }, secret?: string): string | undefined {
  return secret && secret.length >= 32 ? createHmac("sha256", secret).update(`booking-management:v1:${row.clinicId}:${row.id}:${row.tokenHash}`).digest("base64url") : undefined;
}
export function reservationCredential(row: { id: string; clinicId: string; tokenHash: string }, token: string, secret?: string) {
  const hashed = createHash("sha256").update(token).digest("hex");
  if (timingSafeEqual(Buffer.from(hashed), Buffer.from(row.tokenHash))) return true;
  const signed = emailManagementKey(row, secret);
  return !!signed && token.length === signed.length && timingSafeEqual(Buffer.from(token), Buffer.from(signed));
}
export function bookingLogo(): string | undefined {
  return [resolve(process.cwd(), "../frontend/public/images/brand/porvenir-logo.png"), resolve(process.cwd(), "apps/frontend/public/images/brand/porvenir-logo.png")].find(existsSync);
}
export function reservationWhen(data: ReservationDocument) {
  return {
    date: new Intl.DateTimeFormat("es-CL", { timeZone: data.timezone, dateStyle: "full" }).format(data.startsAt),
    time: new Intl.DateTimeFormat("es-CL", { timeZone: data.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(data.startsAt),
  };
}
export async function reservationPdf(data: ReservationDocument): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 44, info: { Title: `Comprobante de reserva - ${data.clinicName}`, Author: data.clinicName }, bufferPages: true });
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((accept, reject) => { doc.on("data", (chunk: Buffer) => chunks.push(chunk)); doc.on("end", () => accept(Buffer.concat(chunks))); doc.on("error", reject); });
  const width = 507, green = "#244B38", muted = "#747D6A";
  doc.rect(0, 0, doc.page.width, 8).fill(green);
  const logo = bookingLogo();
  if (logo) doc.image(logo, 44, 30, { fit: [210, 70] });
  else doc.font("Helvetica-Bold").fontSize(18).fillColor(green).text(data.clinicName, 44, 44, { width });
  doc.font("Helvetica").fontSize(9).fillColor(muted).text(data.preview ? "VISTA PREVIA DEL COMPROBANTE" : "COMPROBANTE DE RESERVA", 325, 55, { width: 226, align: "right" });
  const when = reservationWhen(data);
  doc.roundedRect(44, 119, width, 119, 10).fill("#EEF2E5");
  doc.font("Helvetica-Bold").fontSize(10).fillColor(green).text(reservationStates[data.status] || "Estado de la reserva", 64, 137, { width: 467 });
  doc.font("Helvetica-Bold").fontSize(19).text(when.date, 64, 161, { width: 467 });
  doc.font("Helvetica").fontSize(13).text(`${when.time} hrs.  |  ${Math.round((data.endsAt.valueOf() - data.startsAt.valueOf()) / 60000)} minutos`, 64, 190, { width: 467 });
  doc.fontSize(8).fillColor(muted).text(`Horario de la clínica: ${data.timezone}`, 64, 215, { width: 467 });
  let y = 265;
  const row = (label: string, value: string) => {
    doc.font("Helvetica").fontSize(11).fillColor(green);
    const height = doc.heightOfString(value || "Por confirmar", { width: 370, lineGap: 3 });
    if (y + Math.max(29, height + 14) > 735) { doc.addPage(); y = 55; }
    doc.font("Helvetica").fontSize(9).fillColor(muted).text(label.toUpperCase(), 44, y, { width: 120 });
    doc.font("Helvetica").fontSize(11).fillColor(green);
    doc.text(value || "Por confirmar", 181, y - 2, { width: 370, lineGap: 3 });
    y += Math.max(29, height + 14);
    doc.moveTo(44, y).lineTo(551, y).lineWidth(.5).strokeColor("#E2E7D9").stroke();
    y += 15;
  };
  row("Atención", data.service); row("Profesional", data.professional); row("Paciente", `${data.petName} (${data.species})`);
  row("Tutor", data.ownerName); row("Correo", data.email); row("Dirección", data.address || "Consulta la ubicación con la clínica.");
  if (y + 210 > 750) { doc.addPage(); y = 55; }
  doc.font("Helvetica-Bold").fontSize(10).fillColor(green).text("PREPARA SU VISITA", 44, y + 4, { width });
  const preparation = data.status === "PENDING"
    ? "Esta solicitud necesita la aprobación del equipo. Consulta su estado antes de acudir. Conserva este comprobante para gestionar la reserva."
    : confirmedReservation(data.status)
      ? "Llega con unos minutos de anticipación. Lleva el carnet de vacunas y los antecedentes que tengas disponibles. Para indicaciones específicas de esta atención, consulta previamente al equipo."
      : "Este comprobante refleja el estado actual de tu reserva. Si necesitas una nueva atención, consulta la disponibilidad con la clínica.";
  doc.font("Helvetica").fontSize(9).fillColor(muted).text(preparation, 44, y + 25, { width, lineGap: 4 });
  y = Math.max(y + 90, doc.y + 22);
  doc.roundedRect(44, y, 240, 35, 6).fill(green);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("white").text("Gestionar mi reserva", 54, y + 12, { width: 220, align: "center", link: data.managementUrl });
  if (data.address) {
    doc.roundedRect(301, y, 250, 35, 6).fill("#EEF2E5");
    doc.fillColor(green).text("Cómo llegar", 311, y + 12, { width: 230, align: "center", link: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(data.address)}` });
  }
  doc.font("Helvetica").fontSize(8).fillColor(muted).text(`Referencia: ${data.reference}`, 44, y + 49, { width });
  if (data.managementKey) doc.text(`Clave privada de gestión: ${data.managementKey}`, 44, y + 63, { width });
  doc.fontSize(8).text("Conserva este documento y su enlace de gestión en privado.", 44, y + 80, { width });
  const pages = doc.bufferedPageRange();
  for (let page = pages.start; page < pages.start + pages.count; page++) {
    doc.switchToPage(page);
    doc.moveTo(44, 765).lineTo(551, 765).strokeColor("#E2E7D9").stroke();
    doc.font("Helvetica").fontSize(7).fillColor(muted).text(`${data.clinicName.slice(0, 100)}${data.phone ? `  |  ${data.phone}` : ""}  -  ${page + 1}/${pages.count}`, 44, 778, { width, align: "center", lineBreak: false });
  }
  doc.end();
  return result;
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
export function reservationEmail(data: ReservationDocument, heading?: string) {
  const e = escapeHtml, when = reservationWhen(data), status = heading || reservationStates[data.status] || "Actualización de tu reserva";
  const details = [["Paciente", `${data.petName} (${data.species})`], ["Tutor", data.ownerName], ["Atención", data.service], ["Profesional", data.professional], ["Dirección", data.address || "Consulta la ubicación con la clínica."]];
  const stateNote = data.status === "PENDING" ? "Tu solicitud fue recibida y necesita la aprobación del equipo. Todavía no es una cita confirmada." : confirmedReservation(data.status) ? "Tu hora está confirmada. Te esperamos para acompañar el cuidado de tu mascota." : "Revisa el estado actualizado de tu reserva. Puedes consultar las opciones disponibles desde su enlace de gestión.";
  const action = (label: string, value: string) => `<a href="${e(value)}" style="display:inline-block;padding:13px 20px;margin:5px 8px 5px 0;background:#244b38;color:#fff;text-decoration:none;border-radius:6px;font-size:13px">${label}</a>`;
  return {
    subject: `${status} | ${data.clinicName}`,
    text: `${status}\n${data.clinicName}\n\n${stateNote}\nFecha: ${when.date}, ${when.time} (${data.timezone})\n${details.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\nReferencia: ${data.reference}\nGestionar reserva: ${data.managementUrl}\n\nAdjuntamos tu comprobante en PDF. Conserva el documento y el enlace de gestión en privado.`,
    html: `<!doctype html><html lang="es"><body style="margin:0;background:#f3f4ed;font-family:Arial,sans-serif;color:#294531"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:28px 12px"><table role="presentation" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;margin:auto;background:#fffefa;border-top:5px solid #244b38"><tr><td style="padding:28px 32px"><img src="cid:porvenir-logo" width="230" alt="${e(data.clinicName)}" style="display:block;max-width:100%;height:auto"><h1 style="font-size:24px;font-weight:500;margin:28px 0 12px">${e(status)}</h1><p style="font-size:13px;line-height:1.8;color:#75806c">${e(stateNote)}</p><div style="padding:22px;margin:24px 0;background:#edf2e4;border-radius:8px"><p style="margin:0;font-size:18px;line-height:1.5">${e(when.date)}</p><p style="margin:8px 0 0;font-size:24px;color:#244b38">${e(when.time)} hrs.</p><p style="font-size:11px;color:#75806c;margin:9px 0 0">Horario de la clínica · ${e(data.timezone)}</p></div><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${details.map(([label, value]) => `<tr><td style="padding:13px 0;border-bottom:1px solid #e6eadf;font-size:12px;color:#7a836f;width:100px;vertical-align:top">${e(label!)}</td><td style="padding:13px 0;border-bottom:1px solid #e6eadf;font-size:13px;line-height:1.6">${e(value!)}</td></tr>`).join("")}</table><p style="font-size:12px;line-height:1.8;color:#75806c;margin-top:25px">Adjuntamos tu comprobante en PDF.${confirmedReservation(data.status) ? " También puedes añadir esta cita a tu calendario con el archivo adjunto." : ""}</p><div>${action("Gestionar mi reserva", data.managementUrl)}${data.address ? action("Cómo llegar", `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(data.address)}`) : ""}</div><p style="margin-top:23px;font-size:11px;color:#8c947f;line-height:1.8">Referencia: ${e(data.reference)}<br>Tu enlace de gestión es privado. Consérvalo para consultar, reprogramar o cancelar según las condiciones de la reserva.</p><p style="border-top:1px solid #e6eadf;padding-top:20px;font-size:11px;color:#8c947f">${e(data.clinicName)}${data.phone ? ` · ${e(data.phone)}` : ""}<br>Conectados por su bienestar.</p></td></tr></table></td></tr></table></body></html>`,
  };
}

function foldIcs(line: string) {
  let current = "", result = "";
  for (const character of line) {
    if (Buffer.byteLength(current + character, "utf8") > 73) { result += `${current}\r\n `; current = ""; }
    current += character;
  }
  return result + current;
}
export function reservationCalendar(data: ReservationDocument, organizer?: string, cancelled = false) {
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const text = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r/g, "").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const method = cancelled ? "CANCEL" : organizer ? "REQUEST" : "PUBLISH";
  const safeEmail = (email: string) => email.replace(/[\r\n"<>;,]/g, "");
  const description = text([`Profesional: ${data.professional}`, `Referencia: ${data.reference}`, "Consulta tu comprobante para gestionar la reserva."].join("\n"));
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Porvenir//Agenda veterinaria//ES", "CALSCALE:GREGORIAN", `METHOD:${method}`, "BEGIN:VEVENT", `UID:${data.reference}@porvenir`, `SEQUENCE:${data.version}`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(data.startsAt)}`, `DTEND:${stamp(data.endsAt)}`, `SUMMARY:${text(`${data.service} - ${data.clinicName}`)}`, `LOCATION:${text(data.address || data.clinicName)}`, `DESCRIPTION:${description}`, `STATUS:${cancelled ? "CANCELLED" : confirmedReservation(data.status) ? "CONFIRMED" : "TENTATIVE"}`, ...(organizer ? [`ORGANIZER:mailto:${safeEmail(organizer)}`, `ATTENDEE;RSVP=TRUE:mailto:${safeEmail(data.email)}`] : []), "END:VEVENT", "END:VCALENDAR"];
  return `${lines.map(foldIcs).join("\r\n")}\r\n`;
}
