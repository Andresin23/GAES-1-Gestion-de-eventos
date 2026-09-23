import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../shared/errors.js';
import type { TokenCargos } from '../shared/types.js';
import type { Role } from '@prisma/client';

export function firmarAccessToken(datos: TokenCargos): string {
  return jwt.sign(datos, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: 'eventos-sena-api'
  });
}

export function firmarRefreshToken(sub: string): string {
  return jwt.sign({ sub }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: 'eventos-sena-api'
  });
}

export function verificarAccessToken(token: string): TokenCargos {
  return jwt.verify(token, env.JWT_SECRET, { issuer: 'eventos-sena-api' }) as TokenCargos;
}

export function authRequerido(req: Request, _res: Response, next: NextFunction) {
  const encabezado = req.headers.authorization;
  if (!encabezado?.startsWith('Bearer ')) {
    next(new UnauthorizedError('Se requiere un token de acceso válido.'));
    return;
  }

  const token = encabezado.slice(7).trim();
  try {
    const cargos = verificarAccessToken(token);
    req.auth = {
      id: cargos.sub,
      roles: cargos.roles,
      activeRole: cargos.activeRole,
      mfaVerificado: Boolean(cargos.mfa)
    };
    next();
  } catch (error) {
    next(new UnauthorizedError('El token de acceso expiró o es inválido.'));
  }
}

export function requireRole(...rolesPermitidos: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      next(new UnauthorizedError('No autenticado.'));
      return;
    }

    const activo = req.auth.activeRole;
    if (!rolesPermitidos.includes(activo)) {
      next(new ForbiddenError('Tu rol activo no tiene permiso para esta acción.'));
      return;
    }

    const requiereMfa = activo === 'ADMIN' || activo === 'COMITE';
    if (requiereMfa && !req.auth.mfaVerificado) {
      next(new ForbiddenError('Se requiere el segundo factor (MFA) para esta acción.'));
      return;
    }

    next();
  };
}