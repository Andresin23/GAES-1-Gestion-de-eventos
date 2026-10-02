import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { supabaseAdmin, supabasePublico } from '../../config/supabase.js';
import {
  UnauthorizedError,
  ConflictError,
  BadRequestError,
  NotFoundError,
  ForbiddenError
} from '../../shared/errors.js';
import type { Role } from '@prisma/client';

const ROLES_AUTORREGISTRO: Role[] = ['COMPRADOR', 'PROVEEDOR', 'ASISTENTE'];
const ROLES_MFA: Role[] = ['ADMIN', 'COMITE'];
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;

type LoginContexto = { ip?: string; userAgent?: string };

/**
 * Traduce los errores de Supabase a mensajes que el usuario final entienda.
 */
function traducirErrorAuth(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes('email not confirmed')) return 'Debes verificar tu correo antes de ingresar.';
  if (m.includes('invalid login credentials')) return 'Credenciales incorrectas.';
  if (m.includes('email rate limit') || m.includes('too many')) {
    return 'Demasiados intentos. Espera un momento antes de volver a intentarlo.';
  }
  if (m.includes('user already registered')) return 'Ese correo ya está registrado.';
  if (m.includes('password should be')) return 'La contraseña es demasiado débil.';
  return mensaje;
}

async function registrarAcceso(userId: string, ctx: LoginContexto) {
  await prisma.accessLog.create({
    data: { userId, ip: ctx.ip ?? 'desconocido', userAgent: ctx.userAgent }
  });
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
}

/** Mantiene sincronizado el espejo del correo verificado que vive en auth.users. */
async function sincronizarVerificacion(userId: string, authId: string) {
  const { data } = await supabaseAdmin.auth.admin.getUserById(authId);
  if (!data.user) return;
  const verificado = Boolean(data.user.email_confirmed_at);
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: verificado ? new Date() : null }
  });
}

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

  // Supabase crea la cuenta y envia el correo de verificacion por su cuenta.
  const { data: creado, error } = await supabaseAdmin.auth.admin.createUser({
    email: datos.email,
    password: datos.password,
    email_confirm: false,
    user_metadata: {
      document_number: datos.documentNumber,
      document_type: datos.documentType ?? 'CC',
      first_name: datos.firstName,
      last_name: datos.lastName,
      phone: datos.phone ?? null
    }
  });

  if (error || !creado.user) {
    throw new ConflictError(traducirErrorAuth(error?.message ?? 'No se pudo crear la cuenta.'));
  }

  const user = await prisma.user.create({
    data: {
      authId: creado.user.id,
      documentNumber: datos.documentNumber,
      documentType: datos.documentType ?? 'CC',
      email: datos.email,
      firstName: datos.firstName,
      lastName: datos.lastName,
      phone: datos.phone,
      dataPolicyAcceptedAt: new Date(),
      roles: { create: { role: datos.rol } }
    }
  });

  return { id: user.id, correo: user.email };
}

export async function verificarCorreo(datos: { email: string; otp: string }) {
  const { error } = await supabasePublico.auth.verifyOtp({
    email: datos.email,
    token: datos.otp,
    type: 'email'
  });

  if (error) {
    throw new BadRequestError(traducirErrorAuth(error.message));
  }

  const perfil = await prisma.user.findUnique({ where: { email: datos.email } });
  if (perfil?.authId) {
    await sincronizarVerificacion(perfil.id, perfil.authId);
  }

  return { ok: true };
}

export async function reenviarCodigoVerificacion(correo: string) {
  const perfil = await prisma.user.findUnique({ where: { email: correo } });
  if (!perfil) return { ok: true };
  if (perfil.emailVerifiedAt) return { ok: true, mensaje: 'El correo ya fue verificado.' };

  // `signup` es el tipo que Supabase acepta para reenviar el correo de verificacion.
  const { error } = await supabasePublico.auth.resend({ type: 'signup', email: correo });
  if (error) {
    throw new BadRequestError(traducirErrorAuth(error.message));
  }
  return { ok: true };
}

export async function login(datos: { email: string; password: string }, ctx: LoginContexto) {
  const perfil = await prisma.user.findUnique({
    where: { email: datos.email },
    include: { roles: true }
  });

  if (!perfil) {
    throw new UnauthorizedError('Credenciales incorrectas.');
  }
  if (perfil.lockedUntil && perfil.lockedUntil > new Date()) {
    const falta = Math.ceil((perfil.lockedUntil.getTime() - Date.now()) / 1000 / 60);
    throw new UnauthorizedError(`La cuenta está bloqueada temporalmente. Intenta en ${falta} min.`);
  }
  if (perfil.status === 'SUSPENDIDO') {
    throw new UnauthorizedError('La cuenta está suspendida. Contacta al administrador.');
  }
  if (perfil.status === 'ELIMINADO') {
    throw new UnauthorizedError('La cuenta fue eliminada.');
  }

  const { data, error } = await supabasePublico.auth.signInWithPassword({
    email: datos.email,
    password: datos.password
  });

  if (error || !data.session) {
    const intentos = perfil.failedLoginAttempts + 1;
    const update: { failedLoginAttempts: number; lockedUntil?: Date | null } = {
      failedLoginAttempts: intentos
    };
    if (intentos >= MAX_INTENTOS) {
      update.failedLoginAttempts = 0;
      update.lockedUntil = new Date(Date.now() + BLOQUEO_MS);
    }
    await prisma.user.update({ where: { id: perfil.id }, data: update });
    throw new UnauthorizedError(traducirErrorAuth(error?.message ?? 'Credenciales incorrectas.'));
  }

  await prisma.user.update({
    where: { id: perfil.id },
    data: { failedLoginAttempts: 0, lockedUntil: null }
  });
  await sincronizarVerificacion(perfil.id, data.user.id);

  const requiereMfa = ROLES_MFA.includes(perfil.activeRole);
  const mfaVerificado = (() => {
    const [, payload] = (data.session.access_token ?? '').split('.');
    if (!payload) return false;
    try {
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { aal?: string };
      return claims.aal === 'aal2';
    } catch {
      return false;
    }
  })();

  if (requiereMfa && !mfaVerificado) {
    const { data: factores } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId: data.user.id });
    const totp = factores?.factors.find((f) => f.factor_type === 'totp' && f.status === 'verified');
    if (totp) {
      // El segundo factor se resuelve en el navegador con supabase-js; aqui solo
      // se informa que la sesion sigue en aal1.
      return {
        ok: true,
        requiereMfa: true,
        factorId: totp.id,
        mensaje: 'Ingresa el codigo de tu aplicacion de autenticacion.'
      };
    }
    throw new UnauthorizedError('Debes configurar el segundo factor (MFA) antes de ingresar.');
  }

  await registrarAcceso(perfil.id, ctx);

  return {
    ok: true,
    requiereMfa: false,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in,
    usuario: {
      id: perfil.id,
      correo: perfil.email,
      nombres: `${perfil.firstName} ${perfil.lastName}`.trim(),
      documento: perfil.documentNumber,
      rolActivo: perfil.activeRole,
      roles: perfil.roles.map((r) => r.role)
    }
  };
}

export async function renovarSesion(refreshToken: string) {
  const { data, error } = await supabasePublico.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) {
    throw new UnauthorizedError('La sesión expiró. Vuelve a iniciar sesión.');
  }
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in
  };
}

export async function cerrarSesion(accessToken?: string) {
  if (accessToken) {
    await supabaseAdmin.auth.admin.signOut(accessToken, 'global');
  }
  return { ok: true };
}

export async function recuperarContrasena(correo: string) {
  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(correo, {
    redirectTo: `${env.APP_URL}/restablecer-clave.html`
  });
  if (error) {
    throw new BadRequestError(traducirErrorAuth(error.message));
  }
  return { ok: true };
}

/**
 * El enlace de recuperacion genera una sesion de recuperacion en Supabase. El
 * cliente debe enviar ese access token; la API solo valida y cambia la clave.
 */
export async function restablecerContrasena(datos: {
  accessToken: string;
  nuevaPassword: string;
}) {
  const { data, error } = await supabasePublico.auth.getUser(datos.accessToken);
  if (error || !data.user) {
    throw new BadRequestError('El enlace de recuperación expiró o es inválido.');
  }

  const { error: updateErr } = await supabasePublico.auth.updateUser({
    password: datos.nuevaPassword
  });
  if (updateErr) {
    throw new BadRequestError(traducirErrorAuth(updateErr.message));
  }

  if (data.user.id) {
    await supabaseAdmin.auth.admin.signOut(datos.accessToken, 'global');
  }

  return { ok: true };
}

export async function estadoMfa(userId: string) {
  const perfil = await prisma.user.findUnique({ where: { id: userId } });
  if (!perfil) throw new NotFoundError('Usuario no encontrado.');
  if (!perfil.authId) throw new BadRequestError('El usuario no está vinculado a Supabase Auth.');

  const { data, error } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId: perfil.authId });
  if (error) throw new BadRequestError(traducirErrorAuth(error.message));

  const totp = data.factors.find((f) => f.factor_type === 'totp');
  const habilitado = Boolean(totp && totp.status === 'verified');

  if (habilitado !== perfil.mfaEnabled) {
    await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: habilitado } });
  }

  return {
    habilitado,
    factorId: totp?.id ?? null,
    factores: data.factors.map((f) => ({ id: f.id, tipo: f.factor_type, estado: f.status }))
  };
}

/**
 * El enrolamiento real lo hace el navegador con supabase-js (auth.mfa.enroll /
 * challengeAndVerify). Aqui solo se refleja el estado en el perfil.
 */
export async function confirmarMfa(userId: string) {
  const estado = await estadoMfa(userId);
  if (!estado.habilitado) {
    throw new BadRequestError('No hay un factor TOTP verificado en Supabase.');
  }
  return { ok: true, mfaActivo: true };
}