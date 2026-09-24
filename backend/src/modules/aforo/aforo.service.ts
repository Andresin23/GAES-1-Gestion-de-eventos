import { prisma } from '../../config/db.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors.js';
import { registrarAuditoria } from '../../shared/audit.js';
import { generarImagenQR } from '../../shared/qr.js';
import { crearRegistroConQR } from '../registrations/registrations.service.js';
import type { Registration, Role } from '@prisma/client';

export type TicketValidacion = {
  asistenteNombre: string;
  asistenteDocumento: string | null;
  correo: string | null;
  qrCode: string;
  eventoId: string;
  eventoNombre: string;
  subEventoId: string;
  subEventoNombre: string;
  subEventoLugar: string | null;
};

export type Ocupacion = {
  inscritos: number;
  asistentes: number;
  listaEspera: number;
  capacidad: number;
  disponibles: number;
  porcentaje: number;
};

export type ResultadoValidacion =
  | {
      valido: true;
      codigoEstado: 'APROBADO';
      mensaje: string;
      ticket: TicketValidacion;
      ocupacion: Ocupacion;
    }
  | {
      valido: false;
      codigoEstado: 'NO_ENCONTRADO' | 'DUPLICADO' | 'OTRO_SUBEVENTO' | 'CANCELADO' | 'SIN_CUPO' | 'AFORO_LLENO';
      mensaje: string;
      ticket?: TicketValidacion;
      ocupacion?: Ocupacion;
    };

export type OperadorCtx = {
  userId: string;
  activeRole: Role;
  ip?: string;
};

type RegistroCompleto = Registration & {
  user: { firstName: string; lastName: string; documentNumber: string; email: string } | null;
  subEvent: {
    id: string;
    name: string;
    location: string | null;
    event: { id: string; name: string };
  };
};

function construirTicket(reg: RegistroCompleto): TicketValidacion {
  const esInvitado = reg.isGuest;
  return {
    asistenteNombre: esInvitado
      ? reg.guestName ?? 'Invitado especial'
      : [reg.user?.firstName, reg.user?.lastName].filter(Boolean).join(' ').trim() || 'Registrado',
    asistenteDocumento: esInvitado ? reg.guestDocument : reg.user?.documentNumber ?? null,
    correo: esInvitado ? null : reg.user?.email ?? null,
    qrCode: reg.qrCode,
    eventoId: reg.subEvent.event.id,
    eventoNombre: reg.subEvent.event.name,
    subEventoId: reg.subEvent.id,
    subEventoNombre: reg.subEvent.name,
    subEventoLugar: reg.subEvent.location
  };
}

async function verificarAccesoOperador(operadorId: string, rolActivo: Role, eventoId: string): Promise<void> {
  if (rolActivo === 'ADMIN') return;
  const asignacion = await prisma.operatorAssignment.findFirst({
    where: { operatorId: operadorId, eventId: eventoId }
  });
  if (!asignacion) {
    throw new ForbiddenError('No tienes asignado el control de acceso de este evento (RF-27).');
  }
}

export async function calcularOcupacion(subEventId: string): Promise<Ocupacion> {
  const sub = await prisma.subEvent.findUnique({ where: { id: subEventId }, select: { capacity: true } });
  const capacidad = sub?.capacity ?? 0;
  const [inscritos, asistentes, listaEspera] = await Promise.all([
    prisma.registration.count({ where: { subEventId, status: { in: ['INSCRITO', 'ASISTIO'] } } }),
    prisma.registration.count({ where: { subEventId, status: 'ASISTIO' } }),
    prisma.registration.count({ where: { subEventId, status: 'LISTA_ESPERA' } })
  ]);
  return {
    inscritos,
    asistentes,
    listaEspera,
    capacidad,
    disponibles: Math.max(0, capacidad - inscritos),
    porcentaje: capacidad > 0 ? Math.round((inscritos / capacidad) * 100) : 0
  };
}

async function registrarIngreso(
  reg: RegistroCompleto,
  operadorId: string,
  operador: OperadorCtx
): Promise<ResultadoValidacion> {
  const actualizado = await prisma.registration.updateMany({
    where: { id: reg.id, status: 'INSCRITO' },
    data: { status: 'ASISTIO', checkedInAt: new Date(), checkedInById: operadorId }
  });

  if (actualizado.count === 0) {
    return {
      valido: false,
      codigoEstado: 'DUPLICADO',
      mensaje: 'ACCESO DENEGADO: el pase ya fue utilizado. El ingreso es de un solo uso (RF-57/RF-58).',
      ticket: construirTicket(reg)
    };
  }

  await registrarAuditoria({
    userId: operador.userId,
    action: 'ACCESO_QR_VALIDO',
    entity: 'Registration',
    entityId: reg.id,
    detail: { qrCode: reg.qrCode, subEventoId: reg.subEvent.id },
    ip: operador.ip
  });

  return {
    valido: true,
    codigoEstado: 'APROBADO',
    mensaje: 'INGRESO APROBADO: el QR es válido y de primer uso. Bienvenido(a).',
    ticket: construirTicket(reg),
    ocupacion: await calcularOcupacion(reg.subEvent.id)
  };
}

export async function validarQR(
  datos: { codigo: string; subEventoId?: string },
  operador: OperadorCtx
): Promise<ResultadoValidacion> {
  const reg = await prisma.registration.findUnique({
    where: { qrCode: datos.codigo.trim() },
    include: {
      user: { select: { firstName: true, lastName: true, documentNumber: true, email: true } },
      subEvent: { include: { event: { select: { id: true, name: true } } } }
    }
  });

  if (!reg) {
    return { valido: false, codigoEstado: 'NO_ENCONTRADO', mensaje: 'QR no registrado en la plataforma.' };
  }

  await verificarAccesoOperador(operador.userId, operador.activeRole, reg.subEvent.event.id);

  if (datos.subEventoId && reg.subEventId !== datos.subEventoId) {
    return {
      valido: false,
      codigoEstado: 'OTRO_SUBEVENTO',
      mensaje: `ACCESO DENEGADO: este pase pertenece a otro sub-evento (${reg.subEvent.name}).`,
      ticket: construirTicket(reg)
    };
  }

  if (reg.status === 'CANCELADO') {
    return {
      valido: false,
      codigoEstado: 'CANCELADO',
      mensaje: 'Este pase fue cancelado; no permite el ingreso.',
      ticket: construirTicket(reg)
    };
  }

  if (reg.status === 'LISTA_ESPERA') {
    return {
      valido: false,
      codigoEstado: 'SIN_CUPO',
      mensaje: 'Esta persona está en lista de espera; aún no tiene cupo para ingresar.',
      ticket: construirTicket(reg)
    };
  }

  if (reg.status === 'ASISTIO') {
    return {
      valido: false,
      codigoEstado: 'DUPLICADO',
      mensaje: 'ACCESO DENEGADO: el pase ya fue utilizado. El ingreso es de un solo uso (RF-57/RF-58).',
      ticket: construirTicket(reg)
    };
  }

  return registrarIngreso(reg, operador.userId, operador);
}

export async function registroManual(
  datos: { documento: string; subEventoId: string },
  operador: OperadorCtx
): Promise<ResultadoValidacion> {
  const subEvento = await prisma.subEvent.findUnique({
    where: { id: datos.subEventoId },
    include: { event: { select: { id: true, name: true } } }
  });
  if (!subEvento) throw new NotFoundError('Sub-evento no encontrado.');

  await verificarAccesoOperador(operador.userId, operador.activeRole, subEvento.event.id);

  const documento = datos.documento.trim();
  const reg = await prisma.registration.findFirst({
    where: {
      subEventId: subEvento.id,
      status: { in: ['INSCRITO', 'LISTA_ESPERA', 'ASISTIO'] },
      OR: [{ user: { documentNumber: documento } }, { guestDocument: documento }]
    },
    include: {
      user: { select: { firstName: true, lastName: true, documentNumber: true, email: true } },
      subEvent: { include: { event: { select: { id: true, name: true } } } }
    }
  });

  if (!reg) {
    return {
      valido: false,
      codigoEstado: 'NO_ENCONTRADO',
      mensaje: `Documento ${documento} no está inscrito a este sub-evento.`
    };
  }

  if (reg.status === 'ASISTIO') {
    return {
      valido: false,
      codigoEstado: 'DUPLICADO',
      mensaje: 'ACCESO DENEGADO: este documento ya registró su ingreso. Es de un solo uso (RF-59).',
      ticket: construirTicket(reg)
    };
  }

  if (reg.status === 'LISTA_ESPERA') {
    return {
      valido: false,
      codigoEstado: 'SIN_CUPO',
      mensaje: 'Esta persona está en lista de espera; aún no tiene cupo.',
      ticket: construirTicket(reg)
    };
  }

  await registrarAuditoria({
    userId: operador.userId,
    action: 'ACCESO_MANUAL_DOCUMENTO',
    entity: 'Registration',
    entityId: reg.id,
    detail: { documento },
    ip: operador.ip
  });

  return registrarIngreso(reg, operador.userId, operador);
}

export async function walkIn(
  datos: { subEventoId: string; nombre: string; documento?: string; correo?: string },
  operador: OperadorCtx
): Promise<ResultadoValidacion> {
  const subEvento = await prisma.subEvent.findUnique({
    where: { id: datos.subEventoId },
    include: { event: { select: { id: true, name: true } } }
  });
  if (!subEvento) throw new NotFoundError('Sub-evento no encontrado.');

  await verificarAccesoOperador(operador.userId, operador.activeRole, subEvento.event.id);

  const ocupacion = await calcularOcupacion(subEvento.id);
  if (ocupacion.disponibles <= 0) {
    return {
      valido: false,
      codigoEstado: 'AFORO_LLENO',
      mensaje: 'El aforo del sub-evento está lleno; no se puede registrar un walk-in (RF-61).',
      ocupacion
    };
  }

  let userId: string | undefined;
  if (datos.documento) {
    const existente = await prisma.user.findUnique({ where: { documentNumber: datos.documento.trim() } });
    if (existente) {
      userId = existente.id;
      const yaInscrito = await prisma.registration.findFirst({
        where: { subEventId: subEvento.id, userId: existente.id, status: { in: ['INSCRITO', 'LISTA_ESPERA', 'ASISTIO'] } }
      });
      if (yaInscrito) {
        return {
          valido: false,
          codigoEstado: 'DUPLICADO',
          mensaje: 'Esta persona ya tiene una inscripción activa en este sub-evento.'
        };
      }
    }
  }

  let qrCreado = '';
  await prisma.$transaction(async (tx) => {
    const qr = await crearRegistroConQR(
      subEvento.id,
      {
        userId,
        isGuest: userId === undefined,
        guestName: userId === undefined ? datos.nombre : undefined,
        guestDocument: userId === undefined ? datos.documento?.trim() : undefined
      },
      tx
    );
    qrCreado = qr;
    await tx.registration.update({
      where: { qrCode: qr },
      data: { status: 'ASISTIO', checkedInAt: new Date(), checkedInById: operador.userId }
    });
  });

  const reg = await prisma.registration.findUnique({
    where: { qrCode: qrCreado },
    include: {
      user: { select: { firstName: true, lastName: true, documentNumber: true, email: true } },
      subEvent: { include: { event: { select: { id: true, name: true } } } }
    }
  });

  if (!reg) throw new NotFoundError('No se pudo crear el registro de walk-in.');

  await registrarAuditoria({
    userId: operador.userId,
    action: 'WALK_IN_REGISTRADO',
    entity: 'Registration',
    entityId: reg.id,
    detail: { nombre: datos.nombre, documento: datos.documento ?? null },
    ip: operador.ip
  });

  return {
    valido: true,
    codigoEstado: 'APROBADO',
    mensaje: 'Walk-in registrado: la persona quedó inscrita y con ingreso asistido confirmado.',
    ticket: construirTicket(reg),
    ocupacion: await calcularOcupacion(subEvento.id)
  };
}

export async function ocupacionSubEvento(subEventoId: string, operador: OperadorCtx): Promise<{ ocupacion: Ocupacion }> {
  const subEvento = await prisma.subEvent.findUnique({
    where: { id: subEventoId },
    include: { event: { select: { id: true } } }
  });
  if (!subEvento) throw new NotFoundError('Sub-evento no encontrado.');
  await verificarAccesoOperador(operador.userId, operador.activeRole, subEvento.event.id);

  return { ocupacion: await calcularOcupacion(subEventoId) };
}

export async function escarapelasSubEvento(subEventoId: string, operador: OperadorCtx) {
  const subEvento = await prisma.subEvent.findUnique({
    where: { id: subEventoId },
    include: { event: { select: { id: true, name: true } } }
  });
  if (!subEvento) throw new NotFoundError('Sub-evento no encontrado.');
  await verificarAccesoOperador(operador.userId, operador.activeRole, subEvento.event.id);

  const registros = await prisma.registration.findMany({
    where: { subEventId: subEventoId, status: { in: ['INSCRITO', 'ASISTIO'] } },
    include: {
      user: { select: { firstName: true, lastName: true, documentNumber: true } }
    },
    orderBy: [{ createdAt: 'asc' }]
  });

  const conQr = await Promise.all(
    registros.map(async (r) => ({
      nombre: r.isGuest ? r.guestName : [r.user?.firstName, r.user?.lastName].filter(Boolean).join(' ').trim(),
      documento: r.isGuest ? r.guestDocument : r.user?.documentNumber,
      estado: r.status,
      qrCode: r.qrCode,
      qrImage: await generarImagenQR(r.qrCode)
    }))
  );

  return { evento: subEvento.event.name, subEvento: subEvento.name, escarapelas: conQr };
}