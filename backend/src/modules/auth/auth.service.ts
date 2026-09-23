import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateSecret, generateURI, verifySync } from 'otplib';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import {
  UnauthorizedError,
  ConflictError,
  BadRequestError,
  NotFoundError,
  ForbiddenError
} from '../../shared/errors.js';
import { firmarAccessToken, firmarRefreshToken } from '../../middlewares/auth.js';
import type { TokenCargos } from '../../shared/types.js';
import { encolarCorreo } from '../../shared/mail.js';
import type { Role } from '@prisma/client';

const ROLES_AUTORREGISTRO: Role[] = ['COMPRADOR', 'PROVEEDOR', 'ASISTENTE'];
const ROLES_MFA: Role[] = ['ADMIN', 'COMITE'];
const OTP_VALIDEZ_MS = 24 * 60 * 60 * 1000;
const BLOQUEO_MS = 15 * 60 * 1000;

function generarOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Token de un solo propósito: prueba que la contraseña fue validada antes de pedir el MFA. */
function firmarMfaPendiente(userId: string): string {
  return jwt.sign({ sub: userId, mfaPendiente: true }, env.JWT_SECRET, {
    expiresIn: '5m',
    issuer: 'eventos-sena-api'
  });
}

function verificarMfaPendiente(token: string): string {
  const cargos = jwt.verify(token, env.JWT_SECRET, { issuer: 'eventos-sena-api' }) as {
    sub: string;
    mfaPendiente?: boolean;
  };
  if (!cargos.mfaPendiente) throw new UnauthorizedError('Token MFA inválido.');
  return cargos.sub;
}

type LoginContexto = { ip?: string; userAgent?: string };

export async function registrarUsuario(datos: {
  documentNumber: string;
  documentType?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  rol: Role;
  acceptedDataPolicy: boolean;
}) {
  if (!ROLES_AUTORREGISTRO.includes(datos.rol)) {
    throw new ForbiddenError('Los roles institucionales solo pueden ser asignados por un Administrador.');
  }
  if (!datos.acceptedDataPolicy) {
    throw new BadRequestError('Debes aceptar la política de tratamiento de datos (Ley 1581 de 2012).');
  }

  const existeDocumento = await prisma.user.findUnique({ where: { documentNumber: datos.documentNumber } });
  if (existeDocumento) {
    throw new ConflictError('Ese número de identificación ya está registrado.');
  }
  const existeCorreo = await prisma.user.findUnique({ where: { email: datos.email } });
  if (existeCorreo) {
    throw new ConflictError('Ese correo electrónico ya está registrado.');
  }

  const passwordHash = await bcrypt.hash(datos.password, 10);
  const otp = generarOtp();

  const user = await prisma.user.create({
    data: {
      documentNumber: datos.documentNumber,
      documentType: datos.documentType ?? 'CC',
      email: datos.email,
      passwordHash,
      firstName: datos.firstName,
      lastName: datos.lastName,
      phone: datos.phone,
      dataPolicyAcceptedAt: new Date(),
      emailOtp: otp,
      emailOtpExpiresAt: new Date(Date.now() + OTP_VALIDEZ_MS),
      roles: { create: { role: datos.rol } }
    }
  });

  await encolarCorreo({
    to: datos.email,
    subject: 'Verifica tu correo - Fondo Emprender SENA',
    template: 'verificar_cuenta',
    payload: { codigo: otp },
    createdById: user.id
  });

  return { id: user.id, correo: user.email };
}

export async function verificarCorreo(datos: { email: string; otp: string }) {
  const user = await prisma.user.findUnique({ where: { email: datos.email } });
  if (!user) throw new NotFoundError('No existe una cuenta con ese correo.');

  if (user.emailVerifiedAt) return { ok: true };

  if (!user.emailOtp || !user.emailOtpExpiresAt || user.emailOtpExpiresAt < new Date()) {
    throw new BadRequestError('El código de verificación expiró. Solicita uno nuevo.');
  }
  if (user.emailOtp !== datos.otp) {
    throw new BadRequestError('El código de verificación es incorrecto.');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date(), emailOtp: null, emailOtpExpiresAt: null }
  });

  return { ok: true };
}

export async function reenviarCodigoVerificacion(correo: string) {
  const user = await prisma.user.findUnique({ where: { email: correo } });
  if (!user) throw new NotFoundError('No existe una cuenta con ese correo.');
  if (user.emailVerifiedAt) return { ok: true, mensaje: 'El correo ya fue verificado.' };

  const otp = generarOtp();
  await prisma.user.update({
    where: { id: user.id },
    data: { emailOtp: otp, emailOtpExpiresAt: new Date(Date.now() + OTP_VALIDEZ_MS) }
  });
  await encolarCorreo({
    to: user.email,
    subject: 'Nuevo código de verificación - Fondo Emprender SENA',
    template: 'verificar_cuenta',
    payload: { codigo: otp },
    createdById: user.id
  });
  return { ok: true };
}

export async function login(datos: { email: string; password: string }, ctx: LoginContexto) {
  const user = await prisma.user.findUnique({ where: { email: datos.email } });
  if (!user) {
    throw new UnauthorizedError('Credenciales incorrectas.');
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const falta = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000 / 60);
    throw new UnauthorizedError(`La cuenta está bloqueada temporalmente. Intenta en ${falta} min.`);
  }
  if (user.status === 'SUSPENDIDO') {
    throw new UnauthorizedError('La cuenta está suspendida. Contacta al administrador.');
  }
  if (!user.emailVerifiedAt) {
    throw new UnauthorizedError('Debes verificar tu correo antes de ingresar.');
  }

  const esValida = await bcrypt.compare(datos.password, user.passwordHash);
  if (!esValida) {
    const intentos = user.failedLoginAttempts + 1;
    const data: { failedLoginAttempts: number; lockedUntil?: Date | null } = { failedLoginAttempts: intentos };
    if (intentos >= 5) {
      data.failedLoginAttempts = 0;
      data.lockedUntil = new Date(Date.now() + BLOQUEO_MS);
    }
    await prisma.user.update({ where: { id: user.id }, data });
    throw new UnauthorizedError('Credenciales incorrectas.');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null }
  });

  const esInstitucional = ROLES_MFA.includes(user.activeRole);
  if (esInstitucional && !user.mfaEnabled) {
    throw new UnauthorizedError('Debes configurar el segundo factor (MFA) antes de ingresar.');
  }
  if (esInstitucional) {
    return {
      ok: true,
      requiereMfa: true,
      tokenMfa: firmarMfaPendiente(user.id)
    };
  }

  await registrarAcceso(user.id, ctx);
  const tokens = await emitirTokens(user.id, user.activeRole);
  return { ok: true, requiereMfa: false, ...tokens };
}

export async function verificarMfa(datos: { tokenMfa: string; codigo: string }, ctx: LoginContexto) {
  const userId = verificarMfaPendiente(datos.tokenMfa);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.mfaSecret || !user.mfaEnabled) {
    throw new UnauthorizedError('El segundo factor no está configurado.');
  }

  const resultado = verifySync({ secret: user.mfaSecret, token: datos.codigo, epochTolerance: [30, 30] });
  if (!resultado.valid) {
    throw new UnauthorizedError('El código MFA es incorrecto o expiró.');
  }

  await registrarAcceso(user.id, ctx);
  const tokens = await emitirTokens(user.id, user.activeRole);
  return { ok: true, ...tokens };
}

export async function emitirTokens(userId: string, activeRole: Role) {
  const roles = (await prisma.userRole.findMany({ where: { userId } })).map((r) => r.role);
  const cargos: TokenCargos = { sub: userId, roles, activeRole, mfa: true };
  const refreshToken = firmarRefreshToken(userId);
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });
  return { accessToken: firmarAccessToken(cargos), refreshToken };
}

async function registrarAcceso(userId: string, ctx: LoginContexto) {
  await prisma.accessLog.create({
    data: { userId, ip: ctx.ip ?? 'desconocido', userAgent: ctx.userAgent }
  });
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
}

export async function renovarSesion(refreshToken: string) {
  let cargos: { sub: string };
  try {
    cargos = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET, { issuer: 'eventos-sena-api' }) as { sub: string };
  } catch {
    throw new UnauthorizedError('La sesión expiró. Vuelve a iniciar sesión.');
  }

  const ref = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: true }
  });
  if (!ref || ref.revokedAt || ref.expiresAt < new Date() || ref.userId !== cargos.sub) {
    throw new UnauthorizedError('La sesión expiró. Vuelve a iniciar sesión.');
  }

  const inactivo = ref.lastUsedAt && Date.now() - ref.lastUsedAt.getTime() > 30 * 60 * 1000;
  if (inactivo) {
    await prisma.refreshToken.update({ where: { id: ref.id }, data: { revokedAt: new Date() } });
    throw new UnauthorizedError('La sesión expiró por inactividad (30 minutos).');
  }

  await prisma.refreshToken.update({
    where: { id: ref.id },
    data: { lastUsedAt: new Date(), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
  });

  const roles = (await prisma.userRole.findMany({ where: { userId: ref.user.id } })).map((r) => r.role);
  const cargosAcceso: TokenCargos = {
    sub: ref.user.id,
    roles,
    activeRole: ref.user.activeRole,
    mfa: true
  };
  return { accessToken: firmarAccessToken(cargosAcceso), refreshToken };
}

export async function cerrarSesion(refreshToken: string) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() }
  });
  return { ok: true };
}

export async function recuperarContrasena(correo: string) {
  const user = await prisma.user.findUnique({ where: { email: correo } });
  if (!user) return { ok: true };
  const token = crypto.randomBytes(32).toString('hex');
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000) }
  });
  await encolarCorreo({
    to: user.email,
    subject: 'Recuperación de contraseña - Fondo Emprender SENA',
    template: 'recuperar_contrasena',
    payload: { enlace: `${env.APP_URL}/restablecer-clave?token=${token}` },
    createdById: user.id
  });
  return { ok: true };
}

export async function restablecerContrasena(datos: { token: string; nuevaPassword: string }) {
  const user = await prisma.user.findFirst({
    where: { resetToken: datos.token, resetTokenExpiresAt: { gt: new Date() } }
  });
  if (!user) throw new BadRequestError('El enlace de recuperación expiró o es inválido.');

  const passwordHash = await bcrypt.hash(datos.nuevaPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiresAt: null }
  });
  await prisma.refreshToken.updateMany({ where: { userId: user.id }, data: { revokedAt: new Date() } });
  return { ok: true };
}

export async function registrarMfa(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('Usuario no encontrado.');
  if (user.mfaEnabled) throw new BadRequestError('El MFA ya está configurado.');

  const secret = generateSecret();
  const otpauth = generateURI({ issuer: 'Fondo Emprender SENA', label: user.email, secret });
  await prisma.user.update({ where: { id: user.id }, data: { mfaSecret: secret } });
  return { secret, otpauth };
}

export async function confirmarMfa(userId: string, codigo: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.mfaSecret) throw new BadRequestError('Configura el MFA primero.');

  const resultado = verifySync({ secret: user.mfaSecret, token: codigo, epochTolerance: [30, 30] });
  if (!resultado.valid) throw new BadRequestError('El código MFA de confirmación es incorrecto.');

  await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: true } });
  return { ok: true };
}