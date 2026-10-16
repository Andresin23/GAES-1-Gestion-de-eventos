import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { supabaseAdmin, type ClaimsSupabase } from '../config/supabase.js';
import { UnauthorizedError, ForbiddenError } from '../shared/errors.js';
import type { Role } from '@prisma/client';

/**
 * Lee los claims de un JWT ya validado. Solo se usa para extraer `aal`, que
 * indica si la sesion completo el segundo factor (aal2) o no (aal1).
 */
function leerClaims(token: string): Partial<ClaimsSupabase> {
  const [, payload] = token.split('.');
  if (!payload) return {};
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as ClaimsSupabase;
}

/**
 * Valida el access token de Supabase contra el servidor de Auth y devuelve el
 * usuario junto con el nivel de garantia de la sesion.
 */
export async function verificarTokenSupabase(token: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    throw new UnauthorizedError('El token de acceso expiró o es inválido.');
  }

  const claims = leerClaims(token);
  return {
    authId: data.user.id,
    correo: data.user.email ?? '',
    aal: claims.aal ?? 'aal1',
    mfaVerificado: claims.aal === 'aal2'
  };
}

export async function authRequerido(req: Request, _res: Response, next: NextFunction) {
  const encabezado = req.headers.authorization;
  if (!encabezado?.startsWith('Bearer ')) {
    next(new UnauthorizedError('Se requiere un token de acceso válido.'));
    return;
  }

  const token = encabezado.slice(7).trim();

  try {
    // Soporte para tokens de prueba en ambiente de desarrollo local
    if (env.NODE_ENV !== 'production' && token.startsWith('JWT-SENA-MOCK-')) {
      const perfilMock = await prisma.user.findFirst({
        where: {
          OR: [
            { activeRole: 'OPERADOR' },
            { roles: { some: { role: 'OPERADOR' } } },
            { activeRole: 'ADMIN' },
            { roles: { some: { role: 'ADMIN' } } }
          ]
        },
        include: { roles: true }
      });
      if (perfilMock) {
        req.auth = {
          id: perfilMock.id,
          roles: perfilMock.roles.map((r) => r.role),
          activeRole: perfilMock.activeRole,
          mfaVerificado: true
        };
        next();
        return;
      }
    }

    const sesion = await verificarTokenSupabase(token);

    const perfil = await prisma.user.findUnique({
      where: { authId: sesion.authId },
      include: { roles: true }
    });

    if (!perfil) {
      next(new ForbiddenError('Tu cuenta de Supabase no tiene un perfil asociado en el sistema.'));
      return;
    }
    if (perfil.status === 'SUSPENDIDO') {
      next(new ForbiddenError('La cuenta está suspendida. Contacta al administrador.'));
      return;
    }
    if (perfil.status === 'ELIMINADO') {
      next(new ForbiddenError('La cuenta fue eliminada.'));
      return;
    }

    req.auth = {
      id: perfil.id,
      roles: perfil.roles.map((r) => r.role),
      activeRole: perfil.activeRole,
      mfaVerificado: sesion.mfaVerificado
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...rolesPermitidos: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      next(new UnauthorizedError('No autenticado.'));
      return;
    }

    const activo = req.auth.activeRole;
    const roles = req.auth.roles;
    const tieneRol = rolesPermitidos.includes(activo) || rolesPermitidos.some((r) => roles.includes(r));
    if (!tieneRol) {
      next(new ForbiddenError('Tu rol activo no tiene permiso para esta acción.'));
      return;
    }

    const requiereMfa = (activo === 'ADMIN' || activo === 'COMITE') && env.NODE_ENV === 'production';
    if (requiereMfa && !req.auth.mfaVerificado) {
      next(new ForbiddenError('Se requiere el segundo factor (MFA) para esta acción.'));
      return;
    }

    next();
  };
}