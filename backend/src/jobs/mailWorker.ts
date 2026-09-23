import { prisma } from '../config/db.js';
import { renderizarPlantilla } from '../shared/mail.js';
import { env } from '../config/env.js';
import nodemailer from 'nodemailer';

const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
});

/** Procesa un lote de correos pendientes de la cola (RF-76, RNF-51). */
export async function procesarColaCorreo(lote = 25): Promise<number> {
  const pendientes = await prisma.emailOutbox.findMany({
    where: { status: 'PENDIENTE', nextAttemptAt: { lte: new Date() } },
    orderBy: { createdAt: 'asc' },
    take: lote
  });

  let enviados = 0;
  for (const correo of pendientes) {
    try {
      const cuerpo = renderizarPlantilla(correo.template, correo.payload as Record<string, unknown>);
      await transport.sendMail({
        from: env.SMTP_FROM,
        to: correo.to,
        subject: correo.subject,
        html: cuerpo
      });
      await prisma.emailOutbox.update({
        where: { id: correo.id },
        data: { status: 'ENVIADO', sentAt: new Date() }
      });
      enviados += 1;
    } catch (error) {
      const reintentos = correo.attempts + 1;
      await prisma.emailOutbox.update({
        where: { id: correo.id },
        data: {
          attempts: reintentos,
          lastError: String((error as Error)?.message ?? error),
          nextAttemptAt: new Date(Date.now() + Math.min(reintentos, 6) * 60_000)
        }
      });
    }
  }
  return enviados;
}