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

const esquemaRefresh = z.object({ refreshToken: z.string().min(1) });

const esquemaLogout = z.object({ accessToken: z.string().min(1).optional() });

const esquemaRecuperar = z.object({ email: z.string().email() });

const esquemaRestablecer = z.object({
  accessToken: z.string().min(1, 'El enlace de recuperación expiró o es inválido.'),
  nuevaPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.')
});

const esquemaReenviarCodigo = z.object({ email: z.string().email() });

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

routerAuth.get('/mfa/estado', authRequerido, async (req: Request, res: Response) => {
  if (!req.auth) return;
  const resultado = await servicio.estadoMfa(req.auth.id);
  res.json({ ok: true, ...resultado });
});

/**
 * El enrolamiento del factor TOTP lo realiza el navegador con supabase-js
 * (auth.mfa.enroll). Este endpoint solo refleja el estado en el perfil.
 */
routerAuth.post('/mfa/confirmar', authRequerido, async (req: Request, res: Response) => {
  if (!req.auth) return;
  const resultado = await servicio.confirmarMfa(req.auth.id);
  res.json({ ...resultado, mensaje: 'MFA configurado correctamente.' });
});

routerAuth.post('/refresh', validar(esquemaRefresh), async (req: Request, res: Response) => {
  const resultado = await servicio.renovarSesion(req.body.refreshToken);
  res.json({ ok: true, ...resultado });
});

routerAuth.post('/logout', validar(esquemaLogout), async (req: Request, res: Response) => {
  const resultado = await servicio.cerrarSesion(req.body.accessToken);
  res.json({ ...resultado, mensaje: 'Sesión cerrada.' });
});

routerAuth.post('/recuperar', validar(esquemaRecuperar), async (req: Request, res: Response) => {
  await servicio.recuperarContrasena(req.body.email);
  res.json({ ok: true, mensaje: 'Si el correo existe, recibirás un enlace para restablecer la contraseña.' });
});

routerAuth.post('/restablecer', validar(esquemaRestablecer), async (req: Request, res: Response) => {
  const resultado = await servicio.restablecerContrasena({
    accessToken: req.body.accessToken,
    nuevaPassword: req.body.nuevaPassword
  });
  res.json({ ...resultado, mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
});

routerAuth.get('/perfil', authRequerido, async (req: Request, res: Response) => {
  if (!req.auth) return;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth.id } });
  res.json({ ok: true, usuario: serializarUsuario(user) });
});