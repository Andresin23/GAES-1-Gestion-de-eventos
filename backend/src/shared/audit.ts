import { prisma } from '../config/db.js';
import type { Prisma } from '@prisma/client';

type DatosAuditoria = {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  detail?: Prisma.InputJsonValue;
  ip?: string | null;
};

export async function registrarAuditoria(datos: DatosAuditoria): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: datos.userId,
      action: datos.action,
      entity: datos.entity,
      entityId: datos.entityId ?? '',
      detail: datos.detail ?? undefined,
      ip: datos.ip ?? undefined
    }
  });
}