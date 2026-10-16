import { z } from 'zod';
import { Router, type Request, Response } from 'express';
import multer from 'multer';
import { validar } from '../../middlewares/validate.js';
import { authRequerido, requireRole } from '../../middlewares/auth.js';
import { BadRequestError } from '../../shared/errors.js';
import * as servicio from './registrations.service.js';

const esquemaId = z.object({ id: z.string().min(1) });

const cargaArchivo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'text/csv' && !file.originalname.toLowerCase().endsWith('.csv')) {
      cb(new BadRequestError('Solo se permiten archivos CSV.'));
      return;
    }
    cb(null, true);
  }
});

export const routerInscripciones = Router();

routerInscripciones.get(
  '/sub-eventos/:id',
  authRequerido,
  requireRole('OPERADOR', 'ADMIN', 'COMITE'),
  validar(esquemaId, 'params'),
  async (req: Request, res: Response) => {
    const inscritos = await servicio.listarInscritosSubEvento(req.params.id);
    res.json({ ok: true, inscritos, total: inscritos.length });
  }
);

routerInscripciones.post(
  '/sub-eventos/:id/inscripciones',
  authRequerido,
  validar(esquemaId, 'params'),
  async (req: Request, res: Response) => {
    const resultado = await servicio.inscribirseSubEvento(req.auth!.id, req.params.id);
    res.status(201).json(resultado);
  }
);

routerInscripciones.delete(
  '/sub-eventos/:id/inscripciones',
  authRequerido,
  validar(esquemaId, 'params'),
  async (req: Request, res: Response) => {
    const resultado = await servicio.cancelarMiInscripcion(req.auth!.id, req.params.id);
    res.json(resultado);
  }
);

routerInscripciones.post(
  '/sub-eventos/:id/invitados',
  authRequerido,
  requireRole('ADMIN'),
  validar(esquemaId, 'params'),
  validar(
    z.object({ nombre: z.string().min(2), documento: z.string().min(5), correo: z.string().email().optional() })
  ),
  async (req: Request, res: Response) => {
    const resultado = await servicio.inscribirInvitadoEspecial(req.params.id, req.body, req.auth!.id);
    res.status(201).json(resultado);
  }
);

routerInscripciones.post(
  '/sub-eventos/:id/preinscritos-csv',
  authRequerido,
  requireRole('ADMIN'),
  validar(esquemaId, 'params'),
  cargaArchivo.single('archivo'),
  async (req: Request, res: Response) => {
    if (!req.file) throw new BadRequestError('Adjunta un archivo CSV.');
    const resultado = await servicio.preinscripcionCSV(req.params.id, req.file.buffer, req.auth!.id);
    res.status(201).json(resultado);
  }
);

routerInscripciones.get('/mis-inscripciones', authRequerido, async (req: Request, res: Response) => {
  const resultado = await servicio.listarMisInscripciones(req.auth!.id);
  res.json({ ok: true, inscripciones: resultado });
});

/**
 * Registro e inscripción pública a eventos desde el calendario web (GAES-1).
 */
routerInscripciones.post('/', async (req: Request, res: Response) => {
  const { eventoId, subEventoId, nombre, documento, correo, rol } = req.body;
  if (!eventoId || !nombre || !documento || !correo) {
    throw new BadRequestError('Faltan campos obligatorios para la inscripción (evento, nombre, documento, correo).');
  }

  const resultado = await servicio.inscribirseEventoGeneral({
    eventoId: String(eventoId),
    subEventoId: subEventoId ? String(subEventoId) : undefined,
    nombre: String(nombre),
    documento: String(documento),
    correo: String(correo),
    rol: rol ? String(rol) : undefined
  });

  res.status(201).json(resultado);
});

/**
 * Router específico para el módulo de control de aforo en puerta (GAES-1).
 */
export const routerAforo = Router();

/**
 * Endpoint de validación y control de aforo por lectura de QR en portería (RF-37).
 * POST /api/v1/aforo/validar-qr
 * Protegido para el rol OPERADOR o ADMIN.
 * Actualiza checkedInAt = NOW() y checkedInById = operadorId en Supabase al escanear.
 */
const manejarValidacionQR = async (req: Request, res: Response) => {
  const { codigoQR } = req.body;
  if (!codigoQR || typeof codigoQR !== 'string') {
    res.status(400).json({ valido: false, mensaje: 'Código QR o documento no proporcionado.' });
    return;
  }

  const operadorId = req.auth?.id;
  const resultado = await servicio.validarCheckInQR(codigoQR, operadorId);
  res.json(resultado);
};

routerAforo.post('/validar-qr', authRequerido, requireRole('OPERADOR', 'ADMIN'), manejarValidacionQR);
routerInscripciones.post('/validar-qr', authRequerido, requireRole('OPERADOR', 'ADMIN'), manejarValidacionQR);