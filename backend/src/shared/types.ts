import type { Role, User } from '@prisma/client';

export type TokenCargos = {
  sub: string;
  roles: Role[];
  activeRole: Role;
  mfa?: boolean;
  amr?: 'pwd' | 'mfa';
};

export type Autenticado = {
  id: string;
  roles: Role[];
  activeRole: Role;
  mfaVerificado: boolean;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: Autenticado;
      ip?: string;
    }
  }
}

export function serializarUsuario(u: User): Record<string, unknown> {
  return {
    id: u.id,
    documento: u.documentNumber,
    documentoTipo: u.documentType,
    correo: u.email,
    nombres: `${u.firstName} ${u.lastName}`.trim(),
    primerNombre: u.firstName,
    apellido: u.lastName,
    telefono: u.phone,
    rolActivo: u.activeRole,
    estado: u.status,
    correoVerificado: Boolean(u.emailVerifiedAt),
    mfaActivo: u.mfaEnabled,
    creadoEn: u.createdAt
  };
}