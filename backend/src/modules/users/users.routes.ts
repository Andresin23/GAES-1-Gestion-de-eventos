import { z } from 'zod';
import { Router, type Request, Response } from 'express';
import { validar } from '../../middlewares/validate.js';
import { authRequerido, requireRole } from '../../middlewares/auth.js';
import * as servicio from './users.service.js';
import { serializarUsuario, paramTexto } from '../../shared/types.js';

const rol = z.enum(['ADMIN', 'COMITE', 'OPERADOR', 'COMPRADOR', 'PROVEEDOR', 'ASISTENTE']);

const esquemaListar = z.object({
  q: z.string().optional(),
  rol: rol.optional(),
  estado: z.enum(['ACTIVO', 'SUSPENDIDO', 'ELIMINADO']).optional(),
  pagina: z.coerce.number().int().min(1).optional(),
  limite: z.coerce.number().int().min(1).max(100).optional()
});

const esquemaCrear = z.object({
  documentNumber: z.string().min(5),
  documentType: z.enum(['CC', 'CE', 'NIT', 'TI']).default('CC'),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().optional(),
  roles: z.array(rol).min(1),
  activeRole: rol.optional()
});

const esquemaEditar = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().nullable().optional(),
  documentType: z.enum(['CC', 'CE', 'NIT', 'TI']).optional(),
  roles: z.array(rol).min(1).optional(),
  activeRole: rol.optional(),
  password: z.string().min(8).optional()
});

const esquemaId = z.object({ id: z.string().min(1) });

const esquemaPerfil = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().nullable().optional(),
  activeRole: rol.optional(),
  comprador: z
    .object({
      nit: z.string().min(5),
      companyName: z.string().min(2),
      economicSector: z.string().min(2),
      website: z.string().url().optional(),
      description: z.string().optional()
    })
    .optional(),
  proveedor: z
    .object({
      ventureName: z.string().min(2),
      economicSector: z.string().min(2),
      description: z.string().optional(),
      portfolioPdfUrl: z.string().url().optional(),
      socialLinks: z.array(z.string().url()).optional()
    })
    .optional()
});

export const routerUsuarios = Router();

routerUsuarios.use(authRequerido);

routerUsuarios.get(
  '/',
  requireRole('ADMIN'),
  validar(esquemaListar, 'query'),
  async (req: Request, res: Response) => {
    const resultado = await servicio.listarUsuarios(req.query as never);
    res.json({ ok: true, ...resultado });
  }
);

routerUsuarios.get(
  '/roles',
  requireRole('ADMIN'),
  async (_req: Request, res: Response) => {
    res.json({ ok: true, roles: await servicio.obtenerRolesDisponibles() });
  }
);

routerUsuarios.get(
  '/:id',
  requireRole('ADMIN'),
  validar(esquemaId, 'params'),
  async (req: Request, res: Response) => {
    const resultado = await servicio.obtenerUsuario(paramTexto(req));
    res.json({ ok: true, usuario: resultado });
  }
);

routerUsuarios.post(
  '/',
  requireRole('ADMIN'),
  validar(esquemaCrear),
  async (req: Request, res: Response) => {
    if (!req.auth) return;
    const resultado = await servicio.crearUsuarioAdmin({ ...req.body, creadorId: req.auth.id });
    res.status(201).json({ ok: true, mensaje: 'Usuario creado.', usuario: serializarUsuario(resultado) });
  }
);

routerUsuarios.patch(
  '/:id',
  requireRole('ADMIN'),
  validar(esquemaId, 'params'),
  validar(esquemaEditar),
  async (req: Request, res: Response) => {
    if (!req.auth) return;
    const resultado = await servicio.editarUsuarioAdmin(paramTexto(req), { ...req.body, editorId: req.auth.id });
    res.json({ ok: true, mensaje: 'Usuario actualizado.', usuario: resultado });
  }
);

routerUsuarios.post(
  '/:id/suspender',
  requireRole('ADMIN'),
  validar(esquemaId, 'params'),
  async (req: Request, res: Response) => {
    if (!req.auth) return;
    const resultado = await servicio.suspenderUsuario(paramTexto(req), req.auth.id);
    res.json({ ...resultado, mensaje: 'Usuario suspendido.' });
  }
);

routerUsuarios.post(
  '/:id/activar',
  requireRole('ADMIN'),
  validar(esquemaId, 'params'),
  async (req: Request, res: Response) => {
    if (!req.auth) return;
    const resultado = await servicio.activarUsuario(paramTexto(req), req.auth.id);
    res.json({ ...resultado, mensaje: 'Usuario reactivado.' });
  }
);

routerUsuarios.delete(
  '/:id',
  requireRole('ADMIN'),
  validar(esquemaId, 'params'),
  async (req: Request, res: Response) => {
    if (!req.auth) return;
    const resultado = await servicio.eliminarCuentaAdmin(paramTexto(req), req.auth.id);
    res.json({ ...resultado, mensaje: 'Cuenta eliminada y datos anonimizados.' });
  }
);

routerUsuarios.patch(
  '/mi-perfil',
  validar(esquemaPerfil),
  async (req: Request, res: Response) => {
    if (!req.auth) return;
    const resultado = await servicio.actualizarPerfil(req.auth.id, req.body);
    res.json({ ok: true, mensaje: 'Perfil actualizado.', perfil: resultado });
  }
);

routerUsuarios.delete(
  '/mi-cuenta',
  async (req: Request, res: Response) => {
    if (!req.auth) return;
    const resultado = await servicio.eliminarMiCuenta(req.auth.id);
    res.json({ ...resultado, mensaje: 'Tu cuenta fue eliminada y tus datos anonimizados.' });
  }
);