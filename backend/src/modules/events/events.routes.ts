import { z } from 'zod';
import { Router, type Request, Response } from 'express';
import { validar } from '../../middlewares/validate.js';
import { authRequerido, requireRole } from '../../middlewares/auth.js';
import { prisma } from '../../config/db.js';
import { paramTexto } from '../../shared/types.js';
import * as servicio from './events.service.js';

const modalidad = z.enum(['PRESENCIAL', 'VIRTUAL', 'HIBRIDO']);
const estado = z.enum(['BORRADOR', 'APROBADO', 'PUBLICADO', 'CANCELADO']);

const esquemaCrearEvento = z.object({
  name: z.string().min(3, 'Escribe el nombre del evento.'),
  description: z.string().min(10, 'La descripción es muy corta.'),
  categoryId: z.string().min(1),
  modality: modalidad,
  date: z.string().min(1, 'Selecciona la fecha del evento.'),
  timeText: z.string().min(1, 'Indica el horario.'),
  location: z.string().min(2, 'Indica el lugar.'),
  budgetEstimateCOP: z.number().int().nonnegative().optional(),
  coverImageUrl: z.string().url().optional()
});

const esquemaEditarEvento = z.object({
  name: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  categoryId: z.string().min(1).optional(),
  modality: modalidad.optional(),
  date: z.string().min(1).optional(),
  timeText: z.string().min(1).optional(),
  location: z.string().min(2).optional(),
  budgetEstimateCOP: z.number().int().nonnegative().optional(),
  coverImageUrl: z.string().url().nullable().optional(),
  visibilityStart: z.coerce.date().optional(),
  visibilityEnd: z.coerce.date().optional(),
  businessRoundEnabled: z.boolean().optional(),
  appointmentDurationMin: z.number().int().min(5).max(180).optional(),
  maxAppointmentsPerDay: z.number().int().min(1).max(100).optional()
});

const esquemaId = z.object({ id: z.string().min(1) });
const esquemaSubEventoId = z.object({ id: z.string().min(1), subEventoId: z.string().min(1) });

const esquemaListar = z.object({
  mes: z.coerce.number().int().min(1).max(12).optional(),
  anio: z.coerce.number().int().optional(),
  categoria: z.string().optional(),
  modalidad: modalidad.optional(),
  q: z.string().optional(),
  estado: estado.optional()
});

const esquemaDevolver = z.object({ comentario: z.string().min(5, 'Escribe el comentario de justificación.') });
const esquemaCancelar = z.object({ motivo: z.string().min(5, 'Escribe el motivo de la cancelación.') });

const esquemaPublicar = z.object({
  visibilityStart: z.string().min(1),
  visibilityEnd: z.string().min(1)
});

const esquemaSubEvento = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  modality: modalidad,
  location: z.string().optional(),
  capacity: z.number().int().min(1, 'El aforo debe ser al menos 1.'),
  registrationDeadline: z.string().min(1)
});

const esquemaEditarSubEvento = z.object({
  name: z.string().min(3).optional(),
  description: z.string().nullable().optional(),
  date: z.string().min(1).optional(),
  startTime: z.string().min(1).optional(),
  endTime: z.string().min(1).optional(),
  modality: modalidad.optional(),
  location: z.string().nullable().optional(),
  capacity: z.number().int().min(1).optional(),
  registrationDeadline: z.string().min(1).optional()
});

const esquemaOperador = z.object({ operadorId: z.string().min(1) });

const esquemaCategoria = z.object({ nombre: z.string().min(3) });

function contexto(req: Request) {
  return {
    userId: req.auth!.id,
    activeRole: req.auth!.activeRole,
    ip: obtenerIp(req)
  };
}

function obtenerIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  return typeof fwd === 'string' ? fwd.split(',')[0].trim() : req.ip ?? 'desconocido';
}

export const routerEventos = Router();

routerEventos.get('/publicos', validar(esquemaListar, 'query'), async (req: Request, res: Response) => {
  const eventos = await servicio.listarEventosPublicos(req.query as never);
  res.json({ ok: true, eventos });
});

routerEventos.get('/categorias', async (_req: Request, res: Response) => {
  res.json({ ok: true, categorias: await servicio.obtenerCategorias() });
});

routerEventos.get('/', authRequerido, requireRole('ADMIN', 'COMITE'), validar(esquemaListar, 'query'), async (req: Request, res: Response) => {
  const eventos = await servicio.listarEventos(req.query as never, true);
  res.json({ ok: true, eventos });
});

routerEventos.get('/operador', authRequerido, requireRole('OPERADOR'), async (req: Request, res: Response) => {
  const asignaciones = await prismaFindOperador(req.auth!.id);
  res.json({ ok: true, eventos: asignaciones });
});

async function prismaFindOperador(operadorId: string) {
  const registros = await prisma.operatorAssignment.findMany({
    where: { operatorId: operadorId },
    include: {
      event: {
        include: {
          subEvents: true,
          category: true
        }
      }
    }
  });

  return registros.map((r) => ({
    id: r.event.id,
    nombre: r.event.name,
    descripcion: r.event.description,
    categoria: r.event.category.name,
    modalidad: r.event.modality,
    fecha: r.event.date.toISOString().slice(0, 10),
    hora: r.event.timeText,
    lugar: r.event.location,
    subEventos: r.event.subEvents.map((s) => ({
      id: s.id,
      nombre: s.name,
      fecha: s.date.toISOString().slice(0, 10),
      capacidad: s.capacity,
      lapso: `${s.startTime.toISOString().slice(11, 16)} - ${s.endTime.toISOString().slice(11, 16)}`
    }))
  }));
}

routerEventos.get('/:id', authRequerido, requireRole('ADMIN', 'COMITE', 'OPERADOR', 'COMPRADOR', 'PROVEEDOR', 'ASISTENTE'), validar(esquemaId, 'params'), async (req: Request, res: Response) => {
  const evento = await servicio.obtenerEvento(paramTexto(req));
  res.json({ ok: true, evento });
});

routerEventos.post('/', authRequerido, requireRole('ADMIN'), validar(esquemaCrearEvento), async (req: Request, res: Response) => {
  const evento = await servicio.crearEvento(req.body, contexto(req));
  res.status(201).json({ ok: true, mensaje: 'Evento creado en Borrador.', evento });
});

routerEventos.patch('/:id', authRequerido, requireRole('ADMIN'), validar(esquemaId, 'params'), validar(esquemaEditarEvento), async (req: Request, res: Response) => {
  const evento = await servicio.editarEvento(paramTexto(req), req.body, contexto(req));
  res.json({ ok: true, mensaje: 'Evento actualizado.', evento });
});

routerEventos.post('/:id/revision', authRequerido, requireRole('ADMIN'), validar(esquemaId, 'params'), async (req: Request, res: Response) => {
  const resultado = await servicio.enviarARevision(paramTexto(req), contexto(req));
  res.json(resultado);
});

routerEventos.post('/:id/aprobar', authRequerido, requireRole('COMITE'), validar(esquemaId, 'params'), async (req: Request, res: Response) => {
  await servicio.aprobarEvento(paramTexto(req), contexto(req));
  res.json({ ok: true, mensaje: 'Evento aprobado por el Comité.' });
});

routerEventos.post('/:id/devolver', authRequerido, requireRole('COMITE'), validar(esquemaId, 'params'), validar(esquemaDevolver), async (req: Request, res: Response) => {
  await servicio.devolverEvento(paramTexto(req), req.body, contexto(req));
  res.json({ ok: true, mensaje: 'Evento devuelto a Borrador.' });
});

routerEventos.post('/:id/publicar', authRequerido, requireRole('ADMIN'), validar(esquemaId, 'params'), validar(esquemaPublicar), async (req: Request, res: Response) => {
  const resultado = await servicio.publicarEvento(paramTexto(req), req.body, contexto(req));
  res.json(resultado);
});

routerEventos.post('/:id/cancelar', authRequerido, requireRole('ADMIN'), validar(esquemaId, 'params'), validar(esquemaCancelar), async (req: Request, res: Response) => {
  const resultado = await servicio.cancelarEvento(paramTexto(req), req.body, contexto(req));
  res.json(resultado);
});

routerEventos.post('/:id/duplicar', authRequerido, requireRole('ADMIN'), validar(esquemaId, 'params'), async (req: Request, res: Response) => {
  const copia = await servicio.duplicarEvento(paramTexto(req), contexto(req));
  res.status(201).json({ ok: true, mensaje: 'Evento duplicado en Borrador.', evento: copia });
});

routerEventos.post('/:id/sub-eventos', authRequerido, requireRole('ADMIN'), validar(esquemaId, 'params'), validar(esquemaSubEvento), async (req: Request, res: Response) => {
  const sub = await servicio.crearSubEvento(paramTexto(req), req.body, contexto(req));
  res.status(201).json({ ok: true, mensaje: 'Sub-evento creado.', subEvento: sub });
});

routerEventos.patch('/:id/sub-eventos/:subEventoId', authRequerido, requireRole('ADMIN'), validar(esquemaSubEventoId, 'params'), validar(esquemaEditarSubEvento), async (req: Request, res: Response) => {
  const sub = await servicio.editarSubEvento(paramTexto(req), paramTexto(req, 'subEventoId'), req.body, contexto(req));
  res.json({ ok: true, mensaje: 'Sub-evento actualizado.', subEvento: sub });
});

routerEventos.post('/:id/operadores', authRequerido, requireRole('ADMIN'), validar(esquemaId, 'params'), validar(esquemaOperador), async (req: Request, res: Response) => {
  const resultado = await servicio.asignarOperador(paramTexto(req), req.body.operadorId, contexto(req));
  res.json({ ok: true, mensaje: 'Operador asignado.', asignaciones: resultado });
});

routerEventos.delete('/:id/operadores', authRequerido, requireRole('ADMIN'), validar(esquemaId, 'params'), validar(esquemaOperador), async (req: Request, res: Response) => {
  const resultado = await servicio.eliminarOperador(paramTexto(req), req.body.operadorId, contexto(req));
  res.json({ ...resultado, mensaje: 'Operador eliminado del evento.' });
});

routerEventos.post('/categorias', authRequerido, requireRole('ADMIN'), validar(esquemaCategoria), async (req: Request, res: Response) => {
  const categoria = await servicio.crearCategoria(req.body.nombre, contexto(req));
  res.status(201).json({ ok: true, mensaje: 'Categoría creada.', categoria });
});