import { z } from 'zod';
import { Router, type Request, Response } from 'express';
import { validar } from '../../middlewares/validate.js';
import { authRequerido } from '../../middlewares/auth.js';
import { serializarUsuario } from '../../shared/types.js';
import { prisma } from '../../config/db.js';
import * as servicio from './auth.service.js';

const rolRegistro = z.enum(['COMPRADOR', 'PROVEEDOR', 'ASISTENTE']);

const esquemaRegistro = z.object({
  documentNumber: z.string().min(5, 'Número de identificación inválido.'),
  documentType: z.enum(['CC', 'CE', 'NIT', 'TI']).default('CC'),
  email: z.string().email('Correo electrónico inválido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  firstName: z.string().min(2, 'Escribe tu primer nombre.'),
  lastName: z.string().min(2, 'Escribe tu apellido.'),
  phone: z.string().regex(/^\+?57?\d{7,10}$/, 'Teléfono inválido. Usa el indicativo +57.').optional(),
  rol: rolRegistro,
  acceptedDataPolicy: z.literal(true, { errorMap: () => ({ message: 'Debes aceptar la política de datos.' }) })
});

const esquemaVerificarCorreo = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'El código tiene 6 dígitos.')
});

const esquemaLogin = z.object({
  email: z.string().email('Correo electrónico inválido.'),
  password: z.string().min(1, 'Escribe tu contraseña.')
});

const esquemaMfa = z.object({
  tokenMfa: z.string().min(1),
  codigo: z.string().length(6, 'El código MFA tiene 6 dígitos.')
});

const esquemaRefresh = z.object({ refreshToken: z.string().min(1) });

const esquemaRecuperar = z.object({ email: z.string().email() });

const esquemaRestablecer = z.object({
  token: z.string().min(1),
  nuevaPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.')
});

const esquemaReenviarCodigo = z.object({ email: z.string().email() });

const esquemaConfirmarMfa = z.object({ codigo: z.string().length(6, 'El código MFA tiene 6 dígitos.') });

function obtenerIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  return typeof fwd === 'string' ? fwd.split(',')[0].trim() : req.ip ?? 'desconocido';
}

export const routerAuth = Router();

routerAuth.post('/registro', validar(esquemaRegistro), async (req: Request, res: Response) => {
  const resultado = await servicio.registrarUsuario(req.body);
  res.status(201).json({ ok: true, mensaje: 'Cuenta creada. Revisa tu correo para verificar.', resultado });
});

routerAuth.post('/verificar-email', validar(esquemaVerificarCorreo), async (req: Request, res: Response) => {
  const resultado = await servicio.verificarCorreo(req.body);
  res.json({ ...resultado, mensaje: 'Correo verificado correctamente.' });
});

routerAuth.post('/reenviar-codigo', validar(esquemaReenviarCodigo), async (req: Request, res: Response) => {
  const resultado = await servicio.reenviarCodigoVerificacion(req.body.email);
  res.json({ ...resultado, mensaje: 'Si el correo existe, recibirás un nuevo código.' });
});

routerAuth.post('/login', validar(esquemaLogin), async (req: Request, res: Response) => {
  const resultado = await servicio.login(req.body, { ip: obtenerIp(req), userAgent: req.headers['user-agent'] });
  res.json(resultado);
});

routerAuth.post('/mfa/verificar', validar(esquemaMfa), async (req: Request, res: Response) => {
  const resultado = await servicio.verificarMfa(req.body, { ip: obtenerIp(req), userAgent: req.headers['user-agent'] });
  res.json(resultado);
});

routerAuth.post('/mfa/registrar', authRequerido, async (req: Request, res: Response) => {
  if (!req.auth) return;
  const institucional = req.auth.roles.some((r) => r === 'ADMIN' || r === 'COMITE');
  if (!institucional) {
    res.status(403).json({ mensaje: 'El MFA solo aplica para Administrador y Comité Directivo.', errores: [] });
    return;
  }
  const resultado = await servicio.registrarMfa(req.auth.id);
  res.json({ ok: true, ...resultado });
});

routerAuth.post('/mfa/confirmar', authRequerido, validar(esquemaConfirmarMfa), async (req: Request, res: Response) => {
  if (!req.auth) return;
  const resultado = await servicio.confirmarMfa(req.auth.id, req.body.codigo);
  res.json({ ...resultado, mensaje: 'MFA configurado correctamente.' });
});

routerAuth.post('/refresh', validar(esquemaRefresh), async (req: Request, res: Response) => {
  const resultado = await servicio.renovarSesion(req.body.refreshToken);
  res.json({ ok: true, ...resultado });
});

routerAuth.post('/logout', validar(esquemaRefresh), async (req: Request, res: Response) => {
  const resultado = await servicio.cerrarSesion(req.body.refreshToken);
  res.json({ ...resultado, mensaje: 'Sesión cerrada.' });
});

routerAuth.post('/recuperar', validar(esquemaRecuperar), async (req: Request, res: Response) => {
  await servicio.recuperarContrasena(req.body.email);
  res.json({ ok: true, mensaje: 'Si el correo existe, recibirás un enlace para restablecer la contraseña.' });
});

routerAuth.post('/restablecer', validar(esquemaRestablecer), async (req: Request, res: Response) => {
  const resultado = await servicio.restablecerContrasena(req.body);
  res.json({ ...resultado, mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
});

routerAuth.get('/perfil', authRequerido, async (req: Request, res: Response) => {
  if (!req.auth) return;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth.id } });
  res.json({ ok: true, usuario: serializarUsuario(user) });
});