import { prisma } from '../../config/db.js';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
  ForbiddenError
} from '../../shared/errors.js';
import { registrarAuditoria } from '../../shared/audit.js';
import { validarTransicion, validarComentarioObligatorio } from '../../shared/eventStates.js';
import { encolarCorreo } from '../../shared/mail.js';
import type { EventStatus, Modality, SubEvent, Role, Prisma } from '@prisma/client';

export type TransicionUsuario = {
  userId: string;
  activeRole: Role;
  ip?: string;
};

function esAdmin(user: TransicionUsuario): boolean {
  return user.activeRole === 'ADMIN';
}

function esComite(user: TransicionUsuario): boolean {
  return user.activeRole === 'COMITE';
}

export async function listarEventosPublicos(filtros: {
  mes?: number;
  anio?: number;
  categoria?: string;
  modalidad?: Modality;
  q?: string;
}) {
  const now = new Date();
  const inicioMes = filtros.mes
    ? new Date(filtros.anio ?? now.getFullYear(), filtros.mes - 1, 1)
    : null;
  const finMes = inicioMes
    ? new Date(inicioMes.getFullYear(), inicioMes.getMonth() + 1, 1)
    : null;

  const where: Prisma.EventWhereInput = {
    status: 'PUBLICADO',
    visibilityStart: { lte: now },
    visibilityEnd: { gte: now },
    ...(inicioMes && finMes ? { date: { gte: inicioMes, lt: finMes } } : {}),
    ...(filtros.categoria ? { category: { slug: filtros.categoria } } : {}),
    ...(filtros.modalidad ? { modality: filtros.modalidad } : {}),
    ...(filtros.q
      ? { OR: [{ name: { contains: filtros.q, mode: 'insensitive' } }, { description: { contains: filtros.q, mode: 'insensitive' } }, { location: { contains: filtros.q, mode: 'insensitive' } }] }
      : {})
  };

  const eventos = await prisma.event.findMany({
    where,
    include: {
      category: true,
      subEvents: {
        orderBy: { date: 'asc' },
        include: { _count: { select: { registrations: { where: { status: { in: ['INSCRITO', 'ASISTIO'] } } } } } }
      }
    },
    orderBy: { date: 'asc' }
  });

  return eventos.map((ev) => ({
    id: ev.id,
    nombre: ev.name,
    descripcion: ev.description,
    categoria: ev.category.name,
    categoriaSlug: ev.category.slug,
    modalidad: ev.modality,
    fecha: ev.date.toISOString().slice(0, 10),
    hora: ev.timeText,
    lugar: ev.location,
    estado: ev.status,
    imagen: ev.coverImageUrl,
    ruedaActiva: ev.businessRoundEnabled,
    subEventos: ev.subEvents.map((s) => ({
      id: s.id,
      nombre: s.name,
      descripcion: s.description,
      fecha: s.date.toISOString().slice(0, 10),
      horaInicio: s.startTime.toISOString().slice(11, 16),
      horaFin: s.endTime.toISOString().slice(11, 16),
      modalidad: s.modality,
      lugar: s.location,
      capacidad: s.capacity,
      inscritos: s._count.registrations,
      estadoInscripcion: estadoInscripcionSubEvento(s, s._count.registrations),
      cerroInscripciones: s.registrationDeadline < now
    }))
  }));
}

function estadoInscripcionSubEvento(s: SubEvent, inscritos: number): 'Abiertas' | 'Cerradas' | 'Próximamente' {
  const now = new Date();
  if (s.registrationDeadline < now) return 'Cerradas';
  if (inscritos >= s.capacity) return 'Cerradas';
  if (s.startTime > new Date(now.getTime() + 48 * 60 * 60 * 1000)) return 'Próximamente';
  return 'Abiertas';
}

export async function listarEventos(filtros: { estado?: EventStatus; categoria?: string; q?: string }, esInstitucional: boolean) {
  const where: Prisma.EventWhereInput = {
    ...(filtros.estado ? { status: filtros.estado } : {}),
    ...(filtros.categoria ? { category: { slug: filtros.categoria } } : {}),
    ...(filtros.q
      ? { OR: [{ name: { contains: filtros.q, mode: 'insensitive' } }, { description: { contains: filtros.q, mode: 'insensitive' } }] }
      : {})
  };

  const eventos = await prisma.event.findMany({
    where,
    include: {
      category: true,
      subEvents: { orderBy: { date: 'asc' } },
      createdBy: { select: { id: true, firstName: true, lastName: true } }
    },
    orderBy: { date: 'desc' }
  });

  return eventos.map((ev) => ({
    id: ev.id,
    nombre: ev.name,
    descripcion: ev.description,
    categoria: ev.category.name,
    modalidad: ev.modality,
    fecha: ev.date.toISOString().slice(0, 10),
    hora: ev.timeText,
    lugar: ev.location,
    estado: ev.status,
    presupuestoCOP: esInstitucional ? ev.budgetEstimateCOP : undefined,
    visibilidadInicio: ev.visibilityStart,
    visibilidadFin: ev.visibilityEnd,
    motivoCancelacion: ev.cancellationReason,
    comentarioRevision: ev.reviewComment,
    ruedaActiva: ev.businessRoundEnabled,
    duracionCitaMin: ev.appointmentDurationMin,
    maxCitasPorDia: ev.maxAppointmentsPerDay,
    creador: `${ev.createdBy.firstName} ${ev.createdBy.lastName}`.trim(),
    subEventos: ev.subEvents.map((s) => ({
      id: s.id,
      nombre: s.name,
      fecha: s.date.toISOString().slice(0, 10),
      capacidad: s.capacity,
      modalidad: s.modality,
      lugar: s.location,
      fechaLimiteInscripcion: s.registrationDeadline
    }))
  }));
}

export async function obtenerEvento(id: string) {
  const ev = await prisma.event.findUnique({
    where: { id },
    include: {
      category: true,
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      subEvents: {
        orderBy: { date: 'asc' },
        include: { _count: { select: { registrations: { where: { status: { in: ['INSCRITO', 'ASISTIO'] } } } } } }
      },
      operators: { include: { operator: { select: { id: true, firstName: true, lastName: true, email: true } } } }
    }
  });
  if (!ev) throw new NotFoundError('Evento no encontrado.');
  return ev;
}

export async function crearEvento(
  datos: {
    name: string;
    description: string;
    categoryId: string;
    modality: Modality;
    date: string;
    timeText: string;
    location: string;
    budgetEstimateCOP?: number;
    coverImageUrl?: string;
  },
  creador: TransicionUsuario
) {
  if (!esAdmin(creador)) throw new ForbiddenError('Solo el Administrador crea eventos.');

  const categoria = await prisma.category.findUnique({ where: { id: datos.categoryId } });
  if (!categoria) throw new NotFoundError('Categoría no encontrada.');

  const ev = await prisma.event.create({
    data: {
      name: datos.name,
      description: datos.description,
      categoryId: datos.categoryId,
      modality: datos.modality,
      date: new Date(datos.date),
      timeText: datos.timeText,
      location: datos.location,
      budgetEstimateCOP: datos.budgetEstimateCOP,
      coverImageUrl: datos.coverImageUrl,
      status: 'BORRADOR',
      createdById: creador.userId
    }
  });

  await registrarAuditoria({
    userId: creador.userId,
    action: 'EVENTO_CREADO',
    entity: 'Event',
    entityId: ev.id,
    detail: { nombre: ev.name },
    ip: creador.ip
  });

  return ev;
}

export async function editarEvento(
  id: string,
  datos: {
    name?: string;
    description?: string;
    categoryId?: string;
    modality?: Modality;
    date?: string;
    timeText?: string;
    location?: string;
    budgetEstimateCOP?: number;
    coverImageUrl?: string;
    visibilityStart?: Date;
    visibilityEnd?: Date;
    businessRoundEnabled?: boolean;
    appointmentDurationMin?: number;
    maxAppointmentsPerDay?: number;
  },
  editor: TransicionUsuario
) {
  if (!esAdmin(editor)) throw new ForbiddenError('Solo el Administrador edita eventos.');

  const ev = await prisma.event.findUnique({ where: { id } });
  if (!ev) throw new NotFoundError('Evento no encontrado.');

  if (ev.status === 'CANCELADO') throw new BadRequestError('No se puede editar un evento cancelado.');

  const esDatosDePresupuesto = datos.budgetEstimateCOP !== undefined;
  if (ev.status !== 'BORRADOR' && esDatosDePresupuesto) {
    throw new BadRequestError(
      'El presupuesto solo se modifica en Borrador. Si hay que rehacerlo, cancela el evento y duplica su estructura.'
    );
  }

  const actualizacion: Prisma.EventUpdateInput = {
    ...(datos.name ? { name: datos.name } : {}),
    ...(datos.description ? { description: datos.description } : {}),
    ...(datos.categoryId ? { category: { connect: { id: datos.categoryId } } } : {}),
    ...(datos.modality ? { modality: datos.modality } : {}),
    ...(datos.date ? { date: new Date(datos.date) } : {}),
    ...(datos.timeText ? { timeText: datos.timeText } : {}),
    ...(datos.location ? { location: datos.location } : {}),
    ...(datos.budgetEstimateCOP !== undefined ? { budgetEstimateCOP: datos.budgetEstimateCOP } : {}),
    ...(datos.coverImageUrl !== undefined ? { coverImageUrl: datos.coverImageUrl } : {}),
    ...(datos.visibilityStart !== undefined ? { visibilityStart: datos.visibilityStart } : {}),
    ...(datos.visibilityEnd !== undefined ? { visibilityEnd: datos.visibilityEnd } : {}),
    ...(datos.businessRoundEnabled !== undefined ? { businessRoundEnabled: datos.businessRoundEnabled } : {}),
    ...(datos.appointmentDurationMin !== undefined ? { appointmentDurationMin: datos.appointmentDurationMin } : {}),
    ...(datos.maxAppointmentsPerDay !== undefined ? { maxAppointmentsPerDay: datos.maxAppointmentsPerDay } : {})
  };

  const actualizado = await prisma.event.update({ where: { id }, data: actualizacion });

  await registrarAuditoria({
    userId: editor.userId,
    action: 'EVENTO_EDITADO',
    entity: 'Event',
    entityId: id,
    detail: { campos: Object.keys(datos) },
    ip: editor.ip
  });

  return actualizado;
}

export async function enviarARevision(id: string, autor: TransicionUsuario) {
  const ev = await prisma.event.findUnique({ where: { id } });
  if (!ev) throw new NotFoundError('Evento no encontrado.');
  if (!esAdmin(autor)) throw new ForbiddenError('Solo el Administrador envía a revisión.');

  validarTransicion(ev.status, 'APROBADO', 'enviar a revisión');

  const comites = await prisma.userRole.findMany({ where: { role: 'COMITE' }, include: { user: true } });
  for (const c of comites) {
    await encolarCorreo({
      to: c.user.email,
      subject: 'Evento listo para revisión - Fondo Emprender SENA',
      template: 'aviso_comite',
      payload: { evento: ev.name },
      createdById: autor.userId
    });
  }

  await registrarAuditoria({
    userId: autor.userId,
    action: 'EVENTO_ENVIADO_REVISION',
    entity: 'Event',
    entityId: id,
    ip: autor.ip
  });

  return { ok: true, mensaje: 'Evento enviado a revisión del Comité.' };
}

export async function aprobarEvento(id: string, comite: TransicionUsuario) {
  if (!esComite(comite)) throw new ForbiddenError('Solo el Comité Directivo aprueba eventos.');

  const ev = await prisma.event.findUnique({ where: { id } });
  if (!ev) throw new NotFoundError('Evento no encontrado.');

  validarTransicion(ev.status, 'APROBADO', 'aprobar el evento');
  if (!ev.budgetEstimateCOP) {
    throw new BadRequestError('El evento debe tener un presupuesto estimado antes de aprobarse.');
  }

  const actualizado = await prisma.event.update({
    where: { id },
    data: { status: 'APROBADO', approvedById: comite.userId, reviewComment: null }
  });

  await registrarAuditoria({
    userId: comite.userId,
    action: 'EVENTO_APROBADO',
    entity: 'Event',
    entityId: id,
    detail: { comentario: ev.reviewComment },
    ip: comite.ip
  });

  return actualizado;
}

export async function devolverEvento(
  id: string,
  datos: { comentario: string },
  comite: TransicionUsuario
) {
  if (!esComite(comite)) throw new ForbiddenError('Solo el Comité Directivo devuelve eventos.');

  const ev = await prisma.event.findUnique({ where: { id } });
  if (!ev) throw new NotFoundError('Evento no encontrado.');

  validarTransicion(ev.status, 'BORRADOR', 'devolver el evento');
  validarComentarioObligatorio('devolver el evento', datos.comentario);

  const actualizado = await prisma.event.update({
    where: { id },
    data: { status: 'BORRADOR', reviewComment: datos.comentario.trim() }
  });

  await registrarAuditoria({
    userId: comite.userId,
    action: 'EVENTO_DEVUELTO',
    entity: 'Event',
    entityId: id,
    detail: { comentario: datos.comentario },
    ip: comite.ip
  });

  return actualizado;
}

export async function publicarEvento(
  id: string,
  datos: { visibilityStart: string; visibilityEnd: string },
  admin: TransicionUsuario
) {
  if (!esAdmin(admin)) throw new ForbiddenError('Solo el Administrador publica eventos.');

  const ev = await prisma.event.findUnique({ where: { id } });
  if (!ev) throw new NotFoundError('Evento no encontrado.');

  validarTransicion(ev.status, 'PUBLICADO', 'publicar el evento');
  if (!ev.approvedById) throw new BadRequestError('El evento debe ser aprobado por el Comité antes de publicarse.');

  const inicio = new Date(datos.visibilityStart);
  const fin = new Date(datos.visibilityEnd);
  if (fin <= inicio) throw new BadRequestError('La fecha de fin debe ser posterior a la de inicio.');

  await prisma.event.update({
    where: { id },
    data: {
      status: 'PUBLICADO',
      visibilityStart: inicio,
      visibilityEnd: fin,
      publishedById: admin.userId,
      reviewComment: null
    }
  });

  await invalidarCacheCalendario();

  await registrarAuditoria({
    userId: admin.userId,
    action: 'EVENTO_PUBLICADO',
    entity: 'Event',
    entityId: id,
    detail: { inicio, fin },
    ip: admin.ip
  });

  return { ok: true, mensaje: 'Evento publicado.' };
}

export async function cancelarEvento(
  id: string,
  datos: { motivo: string },
  admin: TransicionUsuario
) {
  if (!esAdmin(admin)) throw new ForbiddenError('Solo el Administrador cancela eventos.');

  const ev = await prisma.event.findUnique({
    where: { id },
    include: { subEvents: true }
  });
  if (!ev) throw new NotFoundError('Evento no encontrado.');

  if (ev.status !== 'APROBADO' && ev.status !== 'PUBLICADO') {
    throw new BadRequestError('Solo se pueden cancelar eventos Aprobados o Publicados.');
  }
  validarComentarioObligatorio('cancelar el evento', datos.motivo);

  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id },
      data: { status: 'CANCELADO', cancellationReason: datos.motivo.trim(), cancelledById: admin.userId }
    });
    await tx.registration.updateMany({
      where: { subEvent: { eventId: id }, status: { in: ['INSCRITO', 'LISTA_ESPERA'] } },
      data: { status: 'CANCELADO', cancelReason: 'EVENTO_CANCELADO' }
    });
  });

  const inscritos = await prisma.registration.findMany({
    where: { subEvent: { eventId: id }, status: 'CANCELADO' },
    distinct: ['userId'],
    include: { user: { select: { email: true } } }
  });
  for (const inscrito of inscritos) {
    await encolarCorreo({
      to: inscrito.user.email,
      subject: 'Evento cancelado - Fondo Emprender SENA',
      template: 'evento_cancelado',
      payload: { evento: ev.name, motivo: datos.motivo },
      createdById: admin.userId
    });
  }

  await invalidarCacheCalendario();

  await registrarAuditoria({
    userId: admin.userId,
    action: 'EVENTO_CANCELADO',
    entity: 'Event',
    entityId: id,
    detail: { motivo: datos.motivo },
    ip: admin.ip
  });

  return { ok: true, mensaje: 'Evento cancelado y notificado a los inscritos.' };
}

async function invalidarCacheCalendario(): Promise<void> {
  // El calendario público es cacheable (RNF-09). Al publicar o cancelar se invalida la caché.
  // Implementación base: no-op. En producción debe purgar la caché (Varnish/CDN/Redis).
}

export async function duplicarEvento(id: string, admin: TransicionUsuario) {
  if (!esAdmin(admin)) throw new ForbiddenError('Solo el Administrador duplica eventos.');

  const original = await prisma.event.findUnique({
    where: { id },
    include: { subEvents: true }
  });
  if (!original) throw new NotFoundError('Evento no encontrado.');

  const copia = await prisma.$transaction(async (tx) => {
    const nuevo = await tx.event.create({
      data: {
        name: `${original.name} (copia)`,
        description: original.description,
        categoryId: original.categoryId,
        modality: original.modality,
        date: original.date,
        timeText: original.timeText,
        location: original.location,
        budgetEstimateCOP: original.budgetEstimateCOP,
        coverImageUrl: original.coverImageUrl,
        businessRoundEnabled: original.businessRoundEnabled,
        appointmentDurationMin: original.appointmentDurationMin,
        maxAppointmentsPerDay: original.maxAppointmentsPerDay,
        status: 'BORRADOR',
        createdById: admin.userId
      }
    });

    for (const s of original.subEvents) {
      await tx.subEvent.create({
        data: {
          eventId: nuevo.id,
          name: s.name,
          description: s.description,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          modality: s.modality,
          location: s.location,
          capacity: s.capacity,
          registrationDeadline: s.registrationDeadline
        }
      });
    }
    return nuevo;
  });

  await registrarAuditoria({
    userId: admin.userId,
    action: 'EVENTO_DUPLICADO',
    entity: 'Event',
    entityId: copia.id,
    detail: { origen: id },
    ip: admin.ip
  });

  return copia;
}

export async function crearSubEvento(
  eventoId: string,
  datos: {
    name: string;
    description?: string;
    date: string;
    startTime: string;
    endTime: string;
    modality: Modality;
    location?: string;
    capacity: number;
    registrationDeadline: string;
  },
  admin: TransicionUsuario
) {
  if (!esAdmin(admin)) throw new ForbiddenError('Solo el Administrador crea sub-eventos.');

  const ev = await prisma.event.findUnique({ where: { id: eventoId } });
  if (!ev) throw new NotFoundError('Evento no encontrado.');
  if (ev.status === 'CANCELADO') throw new BadRequestError('El evento fue cancelado.');
  if (ev.status !== 'BORRADOR') {
    throw new BadRequestError('Los sub-eventos solo se agregan a eventos en Borrador.');
  }

  const sub = await prisma.subEvent.create({
    data: {
      eventId: eventoId,
      name: datos.name,
      description: datos.description,
      date: new Date(datos.date),
      startTime: new Date(datos.startTime),
      endTime: new Date(datos.endTime),
      modality: datos.modality,
      location: datos.location,
      capacity: datos.capacity,
      registrationDeadline: new Date(datos.registrationDeadline)
    }
  });

  await registrarAuditoria({
    userId: admin.userId,
    action: 'SUBEVENTO_CREADO',
    entity: 'SubEvent',
    entityId: sub.id,
    ip: admin.ip
  });

  return sub;
}

export async function editarSubEvento(
  eventoId: string,
  subEventoId: string,
  datos: {
    name?: string;
    description?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    modality?: Modality;
    location?: string;
    capacity?: number;
    registrationDeadline?: string;
  },
  admin: TransicionUsuario
) {
  if (!esAdmin(admin)) throw new ForbiddenError('Solo el Administrador edita sub-eventos.');

  const ev = await prisma.event.findUnique({ where: { id: eventoId } });
  if (!ev) throw new NotFoundError('Evento no encontrado.');

  const sub = await prisma.subEvent.findFirst({ where: { id: subEventoId, eventId: eventoId } });
  if (!sub) throw new NotFoundError('Sub-evento no encontrado.');

  if (ev.status !== 'BORRADOR') {
    const tieneInscritos = await prisma.registration.count({ where: { subEventId: sub.id, status: { in: ['INSCRITO', 'LISTA_ESPERA', 'ASISTIO'] } } });
    const editaCapacidad = datos.capacity !== undefined && datos.capacity !== sub.capacity;
    if (editaCapacidad && tieneInscritos > 0) {
      throw new BadRequestError('No se puede cambiar el aforo de un sub-evento que ya tiene inscritos.');
    }
  }

  const actualizado = await prisma.subEvent.update({
    where: { id: sub.id },
    data: {
      ...(datos.name ? { name: datos.name } : {}),
      ...(datos.description !== undefined ? { description: datos.description } : {}),
      ...(datos.date ? { date: new Date(datos.date) } : {}),
      ...(datos.startTime ? { startTime: new Date(datos.startTime) } : {}),
      ...(datos.endTime ? { endTime: new Date(datos.endTime) } : {}),
      ...(datos.modality ? { modality: datos.modality } : {}),
      ...(datos.location !== undefined ? { location: datos.location } : {}),
      ...(datos.capacity !== undefined ? { capacity: datos.capacity } : {}),
      ...(datos.registrationDeadline ? { registrationDeadline: new Date(datos.registrationDeadline) } : {})
    }
  });

  await registrarAuditoria({
    userId: admin.userId,
    action: 'SUBEVENTO_EDITADO',
    entity: 'SubEvent',
    entityId: sub.id,
    ip: admin.ip
  });

  return actualizado;
}

export async function asignarOperador(eventoId: string, operadorId: string, admin: TransicionUsuario) {
  if (!esAdmin(admin)) throw new ForbiddenError('Solo el Administrador asigna operadores.');

  const ev = await prisma.event.findUnique({ where: { id: eventoId } });
  if (!ev) throw new NotFoundError('Evento no encontrado.');

  const operador = await prisma.userRole.findUnique({
    where: { userId_role: { userId: operadorId, role: 'OPERADOR' } }
  });
  if (!operador) throw new BadRequestError('El usuario no tiene el rol de Operador Logístico.');

  const subEventos = await prisma.subEvent.findMany({ where: { eventId: eventoId } });
  if (subEventos.length === 0) {
    throw new BadRequestError('Asocia sub-eventos al evento antes de asignar operadores.');
  }

  const asignaciones = await Promise.all(
    subEventos.map((s) =>
      prisma.operatorAssignment.upsert({
        where: { operatorId_eventId_subEventId: { operatorId: operadorId, eventId: eventoId, subEventId: s.id } },
        update: {},
        create: { operatorId: operadorId, eventId: eventoId, subEventId: s.id }
      })
    )
  );

  await registrarAuditoria({
    userId: admin.userId,
    action: 'OPERADOR_ASIGNADO',
    entity: 'Event',
    entityId: eventoId,
    detail: { operadorId },
    ip: admin.ip
  });

  return asignaciones;
}

export async function eliminarOperador(eventoId: string, operadorId: string, admin: TransicionUsuario) {
  if (!esAdmin(admin)) throw new ForbiddenError('Solo el Administrador asigna operadores.');
  await prisma.operatorAssignment.deleteMany({
    where: { eventId: eventoId, operatorId: operadorId }
  });
  await registrarAuditoria({
    userId: admin.userId,
    action: 'OPERADOR_ELIMINADO',
    entity: 'Event',
    entityId: eventoId,
    detail: { operadorId },
    ip: admin.ip
  });
  return { ok: true };
}

export async function obtenerCategorias() {
  return prisma.category.findMany({ orderBy: { name: 'asc' } });
}

export async function crearCategoria(nombre: string, admin: TransicionUsuario) {
  if (!esAdmin(admin)) throw new ForbiddenError('Solo el Administrador crea categorías.');
  const slug = nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const existente = await prisma.category.findUnique({ where: { slug } });
  if (existente) throw new ConflictError('La categoría ya existe.');
  const creada = await prisma.category.create({ data: { name: nombre, slug } });
  await registrarAuditoria({
    userId: admin.userId,
    action: 'CATEGORIA_CREADA',
    entity: 'Category',
    entityId: creada.id,
    ip: admin.ip
  });
  return creada;
}