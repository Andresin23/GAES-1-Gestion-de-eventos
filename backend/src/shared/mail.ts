import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import nodemailer from 'nodemailer';

const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
});

export type DatosCorreo = {
  to: string;
  subject: string;
  template: string;
  payload: Record<string, unknown>;
  createdById?: string;
};

export async function encolarCorreo(datos: DatosCorreo): Promise<void> {
  await prisma.emailOutbox.create({
    data: {
      to: datos.to,
      subject: datos.subject,
      template: datos.template,
      payload: datos.payload as never,
      createdById: datos.createdById
    }
  });
}

export async function enviarCorreoAhora(datos: DatosCorreo): Promise<void> {
  const cuerpo = renderizarPlantilla(datos.template, datos.payload);
  await transport.sendMail({
    from: env.SMTP_FROM,
    to: datos.to,
    subject: datos.subject,
    html: cuerpo
  });
}

export function renderizarPlantilla(template: string, payload: Record<string, unknown>): string {
  const base = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#0f2d40;padding:24px} .btn{background:#0f2d40;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block}</style></head><body>{{contenido}}</body></html>`;

  const contenidos: Record<string, string> = {
    verificar_cuenta: `<h2>Verifica tu correo</h2><p>Tu código de verificación es:</p><h1 style="color:#39a900">${String(payload.codigo)}</h1><p>Vence en 24 horas.</p>`,
    recuperar_contrasena: `<h2>Recuperación de contraseña</h2><p>Usa este enlace para restablecer tu contraseña:</p><a class="btn" href="${String(payload.enlace)}">Restablecer contraseña</a><p>El enlace vence en 1 hora.</p>`,
    aviso_comite: `<h2>Evento listo para revisión</h2><p>El evento <strong>${String(payload.evento)}</strong> está listo para el visto bueno del Comité Directivo.</p>`,
    inscripcion_confirmada: `<h2>Inscripción confirmada</h2><p>Te inscribiste a <strong>${String(payload.subEvento)}</strong>.</p><p>Evento: ${String(payload.evento)}</p><p>Fecha: ${String(payload.fecha)}</p>`,
    recordatorio: `<h2>Recordatorio</h2><p>Te recordamos tu inscripción a <strong>${String(payload.subEvento)}</strong> el ${String(payload.fecha)}.</p>`,
    cita_confirmada: `<h2>Cita confirmada</h2><p>Tu cita con <strong>${String(payload.contraparte)}</strong> fue confirmada para ${String(payload.franja)}.</p>`,
    cita_rechazada: `<h2>Cita rechazada</h2><p><strong>${String(payload.contraparte)}</strong> rechazó la solicitud de cita. Puedes solicitar otra franja libre.</p>`,
    evento_cancelado: `<h2>Evento cancelado</h2><p>El evento <strong>${String(payload.evento)}</strong> fue cancelado: ${String(payload.motivo)}</p>`,
    cupo_disponible: `<h2>Tienes cupo asignado</h2><p>Se liberó un cupo en <strong>${String(payload.subEvento)}</strong>. Tu inscripción fue confirmada.</p>`
  };

  const contenido = contenidos[template] ?? `<p>Hola.</p>`;
  return base.replace('{{contenido}}', contenido);
}