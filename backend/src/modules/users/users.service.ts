import bcrypt from 'bcryptjs';
import { prisma } from '../../config/db.js';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ForbiddenError
} from '../../shared/errors.js';
import { registrarAuditoria } from '../../shared/audit.js';
import type { Role, Prisma } from '@prisma/client';

export async function listarUsuarios(filtros: { q?: string; rol?: Role; estado?: string; pagina?: number; limite?: number }) {
  const pagina = filtros.pagina ?? 1;
  const limite = Math.min(filtros.limite ?? 20, 100);

  const where: Prisma.UserWhereInput = {
    anonymizedAt: null,
    ...(filtros.rol ? { roles: { some: { role: filtros.rol } } } : {}),
    ...(filtros.estado ? { status: filtros.estado as Prisma.UserWhereInput['status'] } : {}),
    ...(filtros.q
      ? {
          OR: [
            { documentNumber: { contains: filtros.q, mode: 'insensitive' } },
            { email: { contains: filtros.q, mode: 'insensitive' } },
            { firstName: { contains: filtros.q, mode: 'insensitive' } },
            { lastName: { contains: filtros.q, mode: 'insensitive' } }
          ]
        }
      : {})
  };

  const [total, usuarios] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: { roles: true, buyerProfile: true, providerProfile: true },
      orderBy: { createdAt: 'desc' },
      skip: (pagina - 1) * limite,
      take: limite
    })
  ]);

  return {
    total,
    pagina,
    limite,
    usuarios: usuarios.map((u) => ({
      id: u.id,
      documento: u.documentNumber,
      documentoTipo: u.documentType,
      correo: u.email,
      nombres: `${u.firstName} ${u.lastName}`.trim(),
      telefono: u.phone,
      roles: u.roles.map((r) => r.role),
      rolActivo: u.activeRole,
      estado: u.status,
      correoVerificado: Boolean(u.emailVerifiedAt),
      mfaActivo: u.mfaEnabled,
      creadoEn: u.createdAt,
      empresa: u.buyerProfile?.companyName ?? u.providerProfile?.ventureName ?? null
    }))
  };
}

export async function obtenerUsuario(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      roles: true,
      buyerProfile: true,
      providerProfile: true,
      operatorAssigns: { include: { event: { select: { id: true, name: true } } } }
    }
  });
  if (!user) throw new NotFoundError('Usuario no encontrado.');
  return user;
}

export async function crearUsuarioAdmin(datos: {
  documentNumber: string;
  documentType?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roles: Role[];
  activeRole?: Role;
  creadorId: string;
}) {
  const documentoDuplicado = await prisma.user.findUnique({ where: { documentNumber: datos.documentNumber } });
  if (documentoDuplicado) throw new ConflictError('Ese número de identificación ya está registrado.');
  const correoDuplicado = await prisma.user.findUnique({ where: { email: datos.email } });
  if (correoDuplicado) throw new ConflictError('Ese correo ya está registrado.');

  const rolesValidos = Array.from(new Set(datos.roles));
  const activeRole = datos.activeRole ?? rolesValidos[0];

  const user = await prisma.user.create({
    data: {
      documentNumber: datos.documentNumber,
      documentType: datos.documentType ?? 'CC',
      email: datos.email,
      passwordHash: await bcrypt.hash(datos.password, 10),
      firstName: datos.firstName,
      lastName: datos.lastName,
      phone: datos.phone,
      emailVerifiedAt: new Date(),
      dataPolicyAcceptedAt: new Date(),
      activeRole,
      roles: { create: rolesValidos.map((role) => ({ role })) }
    }
  });

  await registrarAuditoria({
    userId: datos.creadorId,
    action: 'USUARIO_CREADO',
    entity: 'User',
    entityId: user.id,
    detail: { roles: rolesValidos }
  });

  return user;
}

export async function editarUsuarioAdmin(
  id: string,
  datos: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    documentType?: string;
    roles?: Role[];
    activeRole?: Role;
    password?: string;
    editorId: string;
  }
) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('Usuario no encontrado.');

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: {
        ...(datos.firstName ? { firstName: datos.firstName } : {}),
        ...(datos.lastName ? { lastName: datos.lastName } : {}),
        ...(datos.phone !== undefined ? { phone: datos.phone } : {}),
        ...(datos.documentType ? { documentType: datos.documentType } : {}),
        ...(datos.activeRole ? { activeRole: datos.activeRole } : {}),
        ...(datos.password ? { passwordHash: await bcrypt.hash(datos.password, 10) } : {})
      }
    });

    if (datos.roles) {
      const rolesValidos = Array.from(new Set(datos.roles));
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.createMany({ data: rolesValidos.map((role) => ({ userId: id, role })) });
      if (datos.activeRole && !rolesValidos.includes(datos.activeRole)) {
        await tx.user.update({ where: { id }, data: { activeRole: rolesValidos[0] ?? 'ASISTENTE' } });
      }
    }
  });

  await registrarAuditoria({
    userId: datos.editorId,
    action: 'USUARIO_EDITADO',
    entity: 'User',
    entityId: id,
    detail: { roles: datos.roles, activeRole: datos.activeRole }
  });

  return prisma.user.findUnique({
    where: { id },
    include: { roles: true }
  });
}

export async function suspenderUsuario(id: string, editorId: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('Usuario no encontrado.');
  if (user.status === 'ELIMINADO') throw new BadRequestError('La cuenta fue eliminada.');

  await prisma.user.update({ where: { id }, data: { status: 'SUSPENDIDO' } });
  await prisma.refreshToken.updateMany({ where: { userId: id }, data: { revokedAt: new Date() } });
  await registrarAuditoria({ userId: editorId, action: 'USUARIO_SUSPENDIDO', entity: 'User', entityId: id });
  return { ok: true };
}

export async function activarUsuario(id: string, editorId: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('Usuario no encontrado.');
  if (user.status === 'ELIMINADO') throw new BadRequestError('La cuenta fue eliminada.');

  await prisma.user.update({ where: { id }, data: { status: 'ACTIVO' } });
  await registrarAuditoria({ userId: editorId, action: 'USUARIO_REACTIVADO', entity: 'User', entityId: id });
  return { ok: true };
}

export async function eliminarCuentaAdmin(id: string, editorId: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('Usuario no encontrado.');
  if (user.status === 'ELIMINADO') throw new ConflictError('La cuenta ya fue eliminada.');

  await prisma.user.update({
    where: { id },
    data: {
      status: 'ELIMINADO',
      firstName: 'Usuario',
      lastName: 'Anonimizado',
      email: `anonimo-${Date.now()}@eventos-sena.local`,
      phone: null,
      anonymizedAt: new Date()
    }
  });
  await prisma.refreshToken.updateMany({ where: { userId: id }, data: { revokedAt: new Date() } });
  await registrarAuditoria({ userId: editorId, action: 'USUARIO_ELIMINADO', entity: 'User', entityId: id });
  return { ok: true };
}

export async function eliminarMiCuenta(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      status: 'ELIMINADO',
      firstName: 'Usuario',
      lastName: 'Anonimizado',
      email: `anonimo-${Date.now()}@eventos-sena.local`,
      phone: null,
      anonymizedAt: new Date()
    }
  });
  await prisma.refreshToken.updateMany({ where: { userId }, data: { revokedAt: new Date() } });
  await registrarAuditoria({ userId, action: 'CUENTA_ELIMINADA', entity: 'User', entityId: userId });
  return { ok: true };
}

export async function actualizarPerfil(
  userId: string,
  datos: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    activeRole?: Role;
    comprador?: { nit: string; companyName: string; economicSector: string; website?: string; description?: string };
    proveedor?: {
      ventureName: string;
      economicSector: string;
      description?: string;
      portfolioPdfUrl?: string;
      socialLinks?: string[];
    };
  }
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('Usuario no encontrado.');
  if (user.status === 'ELIMINADO') throw new ForbiddenError('La cuenta fue eliminada.');

  return prisma.$transaction(async (tx) => {
    if (datos.firstName || datos.lastName || datos.phone !== undefined || datos.activeRole) {
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(datos.firstName ? { firstName: datos.firstName } : {}),
          ...(datos.lastName ? { lastName: datos.lastName } : {}),
          ...(datos.phone !== undefined ? { phone: datos.phone } : {}),
          ...(datos.activeRole ? { activeRole: datos.activeRole } : {})
        }
      });
    }

    if (datos.comprador) {
      const rolComprador = await tx.userRole.findUnique({ where: { userId_role: { userId, role: 'COMPRADOR' } } });
      if (!rolComprador) throw new BadRequestError('No tienes el rol de Comprador activo.');
      await tx.buyerProfile.upsert({
        where: { userId },
        update: datos.comprador,
        create: { userId, ...datos.comprador }
      });
    }

    if (datos.proveedor) {
      const rolProveedor = await tx.userRole.findUnique({ where: { userId_role: { userId, role: 'PROVEEDOR' } } });
      if (!rolProveedor) throw new BadRequestError('No tienes el rol de Proveedor activo.');
      await tx.providerProfile.upsert({
        where: { userId },
        update: datos.proveedor,
        create: { userId, ...datos.proveedor }
      });
    }

    const [usuario, perfiles] = await Promise.all([
      tx.user.findUniqueOrThrow({ where: { id: userId }, include: { roles: true } }),
      Promise.all([
        tx.buyerProfile.findUnique({ where: { userId } }),
        tx.providerProfile.findUnique({ where: { userId } })
      ])
    ]);

    return { usuario, comprador: perfiles[0], proveedor: perfiles[1] };
  });
}

export async function obtenerRolesDisponibles(): Promise<Role[]> {
  const roles = await prisma.userRole.findMany({ distinct: ['role'] });
  return roles.map((r) => r.role);
}