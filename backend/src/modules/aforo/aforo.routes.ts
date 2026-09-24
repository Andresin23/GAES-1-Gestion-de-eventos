import { z } from 'zod';
import { Router, type Request, Response } from 'express';
import { validar } from '../../middlewares/validate.js';
import { authRequerido, requireRole } from '../../middlewares/auth.js';
import { paramTexto } from '../../shared/types.js';
import * as servicio from './aforo.service.js';

const esquemaId = z.object({ id: z.string().min(1) });

const esquemaValidarQR = z.object({
  codigo: z.string().min(1, 'Envía el código QR o el documento.'),
  subEventoId: z.string().optional()
});

const esquemaRegistroManual = z.object({
  documento: z.string().min(3, 'Escribe el número de documento.'),
  subEventoId: z.string().min(1)
});

const esquemaWalkIn = z.object({
  subEventoId: z.string().min(1),
  nombre: z.string().min(2, 'Escribe el nombre de la persona.'),
  documento: z.string().optional(),
  correo: z.string().email().optional()
});

function obtenerIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  return typeof fwd === 'string' ? fwd.split(',')[0].trim() : req.ip ?? 'desconocido';
}

function contexto(req: Request): servicio.OperadorCtx {
  return {
    userId: req.auth!.id,
    activeRole: req.auth!.activeRole,
    ip: obtenerIp(req)
  };
}

export const routerAforo = Router();

routerAforo.use(authRequerido, requireRole('OPERADOR', 'ADMIN'));

routerAforo.post('/validar-qr', validar(esquemaValidarQR), async (req: Request, res: Response) => {
  const resultado = await servicio.validarQR(req.body, contexto(req));
  res.json({ ok: resultado.valido, ...resultado });
});

routerAforo.post('/registro-manual', validar(esquemaRegistroManual), async (req: Request, res: Response) => {
  const resultado = await servicio.registroManual(req.body, contexto(req));
  res.json({ ok: resultado.valido, ...resultado });
});

routerAforo.post('/walk-in', validar(esquemaWalkIn), async (req: Request, res: Response) => {
  const resultado = await servicio.walkIn(req.body, contexto(req));
  res.json({ ok: resultado.valido, ...resultado });
});

routerAforo.get('/sub-eventos/:id/ocupacion', validar(esquemaId, 'params'), async (req: Request, res: Response) => {
  const resultado = await servicio.ocupacionSubEvento(paramTexto(req), contexto(req));
  res.json({ ok: true, ...resultado });
});

routerAforo.get('/sub-eventos/:id/escarapelas', validar(esquemaId, 'params'), async (req: Request, res: Response) => {
  const resultado = await servicio.escarapelasSubEvento(paramTexto(req), contexto(req));
  res.json({ ok: true, ...resultado });
});