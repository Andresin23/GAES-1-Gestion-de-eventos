import { parse } from 'csv-parse/sync';
import { prisma } from '../../config/db.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError
} from '../../shared/errors.js';
import { registrarAuditoria } from '../../shared/audit.js';
import { encolarCorreo } from '../../shared/mail.js';
import { generarCodigoQR, generarImagenQR } from '../../shared/qr.js';

function formatearFecha(fecha: Date): string {
  return fecha.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Bogota'
  });
}

async function contarOcupadas(subEventId: string): Promise<number> {
  return prisma.registration.count({
    where: { subEventId, status: { in: ['INSCRITO', 'ASISTIO'] } }
  });
}

async function validarSubEventoInscribible(subEventoId: string) {
  const sub = await prisma.subEvent.findUnique({
    where: { id: subEventoId },
    include: { event: true }
  });
  if (!sub) throw new NotFoundError('Sub-evento no encontrado.');

  const now = new Date();
  if (sub.event.status !== 'PUBLICADO') {
    throw new BadRequestError('El evento principal no está publicado.');
  }
  if (sub.event.visibilityStart && sub.event.visibilityStart > now) {
    throw new BadRequestError('La inscripción aún no está disponible.');
  }
  if (sub.event.visibilityEnd && sub.event.visibilityEnd < now) {
    throw new BadRequestError('El periodo de visibilidad del evento finalizó.');
  }
  if (sub.registrationDeadline < now) {
    throw new BadRequestError('La inscripción para este sub-evento cerró.');
  }
  return sub;
}

async function crearRegistroConQR(
  subEventoId: string,
  datos: { userId?: string; isGuest?: boolean; guestName?: string; guestDocument?: string; waitlistPos?: number },
  tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>
) {
  let qrCode = generarCodigoQR();
  // El QR debe ser único (RF-37). Se reintenta si colisiona.
  let existe = await tx.registration.findUnique({ where: { qrCode } });
  while (existe) {
    qrCode = generarCodigoQR();
    existe = await tx.registration.findUnique({ where: { qrCode } });
  }

  await tx.registration.create({
    data: {
      subEventId: subEventoId,
      userId: datos.userId,
      isGuest: datos.isGuest ?? false,
      guestName: datos.guestName,
      guestDocument: datos.guestDocument,
      waitlistPos: datos.waitlistPos,
      qrCode,
      status: datos.waitlistPos !== undefined ? 'LISTA_ESPERA' : 'INSCRITO'
    }
  });

  return qrCode;
}

export async function inscribirseSubEvento(userId: string, subEventoId: string) {
  const sub = await validarSubEventoInscribible(subEventoId);

  const yaInscrito = await prisma.registration.findUnique({
    where: { userId_subEventId: { userId, subEventId: sub.id } }
  });
  if (yaInscrito && yaInscrito.status !== 'CANCELADO') {
    throw new ConflictError('Ya estás inscrito a este sub-evento.');
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const ocupadas = await contarOcupadas(sub.id);
    const qrCode = await crearRegistroConQR(sub.id, { userId }, tx);
    const estado = ocupadas >= sub.capacity ? 'LISTA_ESPERA' : 'INSCRITO';

    await tx.registration.update({
      where: { qrCode },
      data: { status: estado, waitlistPos: estado === 'LISTA_ESPERA' ? ocupadas - sub.capacity + 1 : null }
    });

    return { qrCode, estado };
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  await encolarCorreo({
    to: user.email,
    subject: resultado.estado === 'INSCRITO' ? 'Inscripción confirmada' : 'Estás en lista de espera',
    template: 'inscripcion_confirmada',
    payload: {
      subEvento: sub.name,
      evento: sub.event.name,
      fecha: formatearFecha(sub.startTime)
    },
    createdById: userId
  });

  const qrImage = await generarImagenQR(resultado.qrCode);
  return {
    ok: true,
    estado: resultado.estado,
    registro: {
      qrCode: resultado.qrCode,
      qrImage,
      subEvento: sub.name,
      evento: sub.event.name,
      fecha: formatearFecha(sub.startTime),
      lugar: sub.location
    }
  };
}

export async function inscribirInvitadoEspecial(
  subEventoId: string,
  datos: { nombre: string; documento: string; correo?: string },
  adminId: string
) {
  const sub = await validarSubEventoInscribible(subEventoId);
  const subDb = await prisma.subEvent.findUnique({ where: { id: sub.id } });
  if (!subDb) throw new NotFoundError('Sub-evento no encontrado.');

  const qrCode = await prisma.$transaction(async (tx) => {
    const qr = await crearRegistroConQR(
      sub.id,
      { isGuest: true, guestName: datos.nombre, guestDocument: datos.documento },
      tx
    );
    return qr;
  });

  await registrarAuditoria({
    userId: adminId,
    action: 'INVITADO_ESPECIAL_CREADO',
    entity: 'Registration',
    entityId: sub.id,
    detail: { documento: datos.documento },
    ip: undefined
  });

  const qrImage = await generarImagenQR(qrCode);
  return {
    ok: true,
    invitado: {
      qrCode,
      qrImage,
      nombre: datos.nombre,
      documento: datos.documento,
      subEvento: sub.name
    }
  };
}

export async function cancelarMiInscripcion(userId: string, subEventoId: string) {
  const reg = await prisma.registration.findUnique({
    where: { userId_subEventId: { userId, subEventId: subEventoId } },
    include: { subEvent: true }
  });
  if (!reg) throw new NotFoundError('No tienes una inscripción a ese sub-evento.');
  if (reg.status === 'CANCELADO') throw new BadRequestError('La inscripción ya fue cancelada.');

  const subEventoEmpezó = reg.subEvent.startTime < new Date();
  if (subEventoEmpezó) {
    throw new BadRequestError('El sub-evento ya comenzó; no puedes cancelar la inscripción.');
  }
  if (reg.status === 'ASISTIO') {
    throw new BadRequestError('Tu QR ya fue usado; el registro de asistencia es definitivo.');
  }

  const liberoPrimera = reg.status === 'INSCRITO';

  await prisma.$transaction(async (tx) => {
    await tx.registration.update({
      where: { id: reg.id },
      data: { status: 'CANCELADO', cancelReason: 'VOLUNTARIO' }
    });

    if (liberoPrimera) {
      // RF-35: el cupo pasa a la primera persona de la lista de espera.
      const primeroEnEspera = await tx.registration.findFirst({
        where: { subEventId: subEventoId, status: 'LISTA_ESPERA' },
        orderBy: { waitlistPos: 'asc' }
      });
      if (primeroEnEspera) {
        await tx.registration.update({
          where: { id: primeroEnEspera.id },
          data: { status: 'INSCRITO', waitlistPos: null }
        });
        const promovido = await tx.registration.findUniqueOrThrow({
          where: { id: primeroEnEspera.id },
          include: { user: { select: { email: true } } },
        });
        if (promovido.user?.email) {
          await encolarCorreo({
            to: promovido.user.email,
            subject: 'Tienes un cupo asignado - Fondo Emprender SENA',
            template: 'cupo_disponible',
            payload: { subEvento: reg.subEvent.name },
            createdById: userId
          });
        }
      }
    }
  });

  return { ok: true, mensaje: 'Inscripción cancelada.' };
}

export async function listarMisInscripciones(userId: string) {
  const registros = await prisma.registration.findMany({
    where: { userId, status: { in: ['INSCRITO', 'LISTA_ESPERA', 'ASISTIO'] } },
    include: {
      subEvent: { include: { event: { include: { category: true } } } }
    },
    orderBy: { createdAt: 'desc' }
  });

  return registros.map((r) => ({
    id: r.id,
    subEventoId: r.subEventId,
    subEvento: r.subEvent.name,
    evento: r.subEvent.event.name,
    categoria: r.subEvent.event.category.name,
    fecha: r.subEvent.date.toISOString().slice(0, 10),
    horaInicio: r.subEvent.startTime.toISOString().slice(11, 16),
    modalidad: r.subEvent.modality,
    lugar: r.subEvent.location,
    estado: r.status,
    qrCode: r.status === 'CANCELADO' ? null : r.qrCode,
    fechaInscripcion: r.createdAt
  }));
}

export async function preinscripcionCSV(subEventoId: string, archivo: Buffer, adminId: string) {
  const sub = await prisma.subEvent.findUnique({ where: { id: subEventoId }, include: { event: true } });
  if (!sub) throw new NotFoundError('Sub-evento no encontrado.');
  if (sub.event.status !== 'PUBLICADO') {
    throw new BadRequestError('El evento principal no está publicado.');
  }

  const textoTsv = Buffer.from(archivo).toString('utf8');
  if (textoTsv.includes('\uFFFD')) {
    throw new BadRequestError('El archivo debe estar codificado en UTF-8 (sin caracteres extraños).');
  }

  let filas: Array<Record<string, string>>;
  try {
    const esTsv = textoTsv.includes('\t');
    filas = parse(textoTsv, {
      columns: true,
      skip_empty_lines: true,
      delimiter: esTsv ? '\t' : ',',
      relax_column_count: true
    }) as Array<Record<string, string>>;
  } catch {
    throw new BadRequestError('El archivo CSV no pudo leerse. Verifica el formato (UTF-8, con cabecera).');
  }

  if (filas.length === 0) throw new BadRequestError('El archivo no contiene filas de datos.');

  const documentos = filas
    .map((f) => (f.documento || f.documentNumber || f.cédula || '').trim())
    .filter((d) => d.length > 0);

  const duplicados = documentos.filter((d, i) => documentos.indexOf(d) !== i);
  if (duplicados.length > 0) {
    throw new ConflictError(`El archivo tiene documentos repetidos: ${Array.from(new Set(duplicados)).join(', ')}`);
  }

  const ocupadas = await contarOcupadas(sub.id);
  let cuposRestantes = sub.capacity - ocupadas;

  const resultado = await prisma.$transaction(async (tx) => {
    const creados: Array<{ documento: string; estado: string; qrCode: string }> = [];
    const rechazados: string[] = [];

    for (const f of filas) {
      const documento = (f.documento || f.documentNumber || f.cédula || '').trim();
      if (!documento) {
        rechazados.push('fila sin documento');
        continue;
      }

      const usuario = await tx.user.findUnique({
        where: { documentNumber: documento },
        include: { roles: true }
      });
      if (!usuario) {
        rechazados.push(`${documento}: no existe en la plataforma`);
        continue;
      }
      if (!usuario.roles.some((r) => r.role === 'ASISTENTE' || r.role === 'COMPRADOR' || r.role === 'PROVEEDOR')) {
        rechazados.push(`${documento}: rol no válido para asistir`);
        continue;
      }

      const yaExiste = await tx.registration.findUnique({
        where: { userId_subEventId: { userId: usuario.id, subEventId: sub.id } }
      });
      if (yaExiste && yaExiste.status !== 'CANCELADO') {
        rechazados.push(`${documento}: ya inscrito`);
        continue;
      }

      if (cuposRestantes > 0) {
        const qr = await crearRegistroConQR(sub.id, { userId: usuario.id }, tx);
        creados.push({ documento, estado: 'INSCRITO', qrCode: qr });
        cuposRestantes -= 1;
      } else {
        const enEspera = await tx.registration.findMany({
          where: { subEventId: sub.id, status: 'LISTA_ESPERA' },
          orderBy: { waitlistPos: 'asc' }
        });
        const qr = await crearRegistroConQR(
          sub.id,
          { userId: usuario.id, waitlistPos: enEspera.length + 1 },
          tx
        );
        creados.push({ documento, estado: 'LISTA_ESPERA', qrCode: qr });
      }
    }

    return { creados, rechazados };
  });

  await registrarAuditoria({
    userId: adminId,
    action: 'PREINSCRIPCION_CSV',
    entity: 'SubEvent',
    entityId: sub.id,
    detail: { inscritos: resultado.creados.length, rechazados: resultado.rechazados.length },
    ip: undefined
  });

  const conQr = await Promise.all(
    resultado.creados.map(async (c) => ({ ...c, qrImage: await generarImagenQR(c.qrCode) }))
  );

  return {
    ok: true,
    inscritos: conQr,
    rechazados: resultado.rechazados,
    mensaje: `Se inscribieron ${conQr.length} personas; ${resultado.rechazados.length} filas rechazadas.`
  };
}

export async function listarInscritosSubEvento(subEventoId: string) {
  const registros = await prisma.registration.findMany({
    where: { subEventId: subEventoId, status: { in: ['INSCRITO', 'LISTA_ESPERA', 'ASISTIO'] } },
    include: {
      user: { select: { firstName: true, lastName: true, documentNumber: true, email: true } }
    },
    orderBy: { createdAt: 'asc' }
  });

  return registros.map((r) => ({
    id: r.id,
    nombre: r.isGuest ? r.guestName : `${r.user?.firstName ?? ''} ${r.user?.lastName ?? ''}`.trim(),
    documento: r.isGuest ? r.guestDocument : r.user?.documentNumber,
    correo: r.isGuest ? null : r.user?.email,
    estado: r.status,
    qrCode: r.qrCode,
    esInvitado: r.isGuest
  }));
}

/**
 * Valida un código QR o Documento en puerta para el módulo de control de aforo (RF-37).
 * Actualiza checkedInAt = NOW() y checkedInById = operadorId en Supabase al escanear.
 */
export async function validarCheckInQR(
  codigoQR: string | { codigoQR: string; operadorId?: string; eventoId?: string },
  operadorId?: string
) {
  const qrString = typeof codigoQR === 'string' ? codigoQR : codigoQR.codigoQR;
  const opId = typeof codigoQR === 'string' ? operadorId : (codigoQR.operadorId ?? operadorId);
  const qrLimpio = (qrString || '').trim();

  if (!qrLimpio) {
    return {
      valido: false,
      mensaje: 'Código QR o documento no proporcionado.',
      ticket: {
        ticketId: '',
        asistenteNombre: 'Desconocido',
        asistenteDocumento: '',
        eventoTitulo: 'Sin evento'
      }
    };
  }

  const registro = await prisma.registration.findFirst({
    where: {
      OR: [
        { qrCode: qrLimpio },
        { guestDocument: qrLimpio },
        { user: { documentNumber: qrLimpio } },
        { id: qrLimpio }
      ]
    },
    include: {
      user: true,
      subEvent: {
        include: {
          event: true
        }
      }
    }
  });

  if (!registro) {
    return {
      valido: false,
      mensaje: `Código "${qrLimpio}" no encontrado en el sistema.`,
      ticket: {
        ticketId: qrLimpio,
        asistenteNombre: 'Desconocido',
        asistenteDocumento: qrLimpio,
        eventoTitulo: 'No encontrado'
      }
    };
  }

  const nombreAsistente = registro.isGuest
    ? (registro.guestName ?? 'Invitado Especial')
    : `${registro.user?.firstName ?? ''} ${registro.user?.lastName ?? ''}`.trim();
  const documentoAsistente = registro.isGuest
    ? (registro.guestDocument ?? '')
    : (registro.user?.documentNumber ?? '');

  if (registro.checkedInAt) {
    const horaIngreso = registro.checkedInAt.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Bogota'
    });
    return {
      valido: false,
      mensaje: `Acceso Ya Utilizado. Ingresó previamente a las ${horaIngreso}.`,
      ticket: {
        ticketId: registro.qrCode,
        asistenteNombre: nombreAsistente,
        asistenteDocumento: documentoAsistente,
        eventoTitulo: registro.subEvent.event.name,
        subEvento: registro.subEvent.name
      }
    };
  }

  if (registro.status === 'CANCELADO') {
    return {
      valido: false,
      mensaje: 'La inscripción para este pase se encuentra CANCELADA.',
      ticket: {
        ticketId: registro.qrCode,
        asistenteNombre: nombreAsistente,
        asistenteDocumento: documentoAsistente,
        eventoTitulo: registro.subEvent.event.name,
        subEvento: registro.subEvent.name
      }
    };
  }

  const ahora = new Date();
  await prisma.registration.update({
    where: { id: registro.id },
    data: {
      checkedInAt: ahora,
      checkedInById: opId ?? null,
      status: 'ASISTIO'
    }
  });

  if (opId) {
    await registrarAuditoria({
      userId: opId,
      action: 'CHECKIN_QR',
      entity: 'Registration',
      entityId: registro.id,
      detail: { qrCode: registro.qrCode, subEventId: registro.subEventId, documento: documentoAsistente },
      ip: undefined
    }).catch(() => {});
  }

  return {
    valido: true,
    mensaje: `¡Acceso Autorizado! Bienvenido(a) ${nombreAsistente}.`,
    ticket: {
      ticketId: registro.qrCode,
      asistenteNombre: nombreAsistente,
      asistenteDocumento: documentoAsistente,
      eventoTitulo: registro.subEvent.event.name,
      subEvento: registro.subEvent.name,
      horaCheckIn: ahora.toISOString()
    }
  };
}

/**
 * Procesa la inscripción pública a un evento desde el calendario web.
 */
export async function inscribirseEventoGeneral(datos: {
  eventoId: string;
  subEventoId?: string;
  nombre: string;
  documento: string;
  correo: string;
  rol?: string;
}) {
  let subEvento = datos.subEventoId
    ? await prisma.subEvent.findUnique({ where: { id: datos.subEventoId }, include: { event: true } })
    : await prisma.subEvent.findFirst({ where: { eventId: datos.eventoId }, include: { event: true }, orderBy: { date: 'asc' } });

  if (!subEvento) {
    throw new NotFoundError('No se encontró una jornada o sub-evento disponible para este evento.');
  }

  let usuario = await prisma.user.findFirst({
    where: {
      OR: [
        { documentNumber: datos.documento.trim() },
        { email: datos.correo.trim().toLowerCase() }
      ]
    }
  });

  if (usuario) {
    const yaInscrito = await prisma.registration.findUnique({
      where: { userId_subEventId: { userId: usuario.id, subEventId: subEvento.id } }
    });
    if (yaInscrito && yaInscrito.status !== 'CANCELADO') {
      const qrImage = await generarImagenQR(yaInscrito.qrCode);
      return {
        ok: true,
        mensaje: 'Ya estabas registrado. Aquí tienes tu pase digital.',
        ticket: {
          ticketId: yaInscrito.qrCode,
          asistenteNombre: `${usuario.firstName} ${usuario.lastName}`.trim(),
          asistenteDocumento: usuario.documentNumber,
          asistenteCorreo: usuario.email,
          eventoTitulo: subEvento.event.name,
          qrImage
        }
      };
    }
  }

  let qrCode = generarCodigoQR();
  let existe = await prisma.registration.findUnique({ where: { qrCode } });
  while (existe) {
    qrCode = generarCodigoQR();
    existe = await prisma.registration.findUnique({ where: { qrCode } });
  }

  const qrImage = await generarImagenQR(qrCode);

  if (usuario) {
    await prisma.registration.create({
      data: {
        subEventId: subEvento.id,
        userId: usuario.id,
        isGuest: false,
        qrCode,
        status: 'INSCRITO'
      }
    });
  } else {
    await prisma.registration.create({
      data: {
        subEventId: subEvento.id,
        isGuest: true,
        guestName: datos.nombre.trim(),
        guestDocument: datos.documento.trim(),
        qrCode,
        status: 'INSCRITO'
      }
    });
  }

  return {
    ok: true,
    mensaje: 'Inscripción confirmada. Se ha generado tu pase digital.',
    ticket: {
      ticketId: qrCode,
      asistenteNombre: datos.nombre.trim(),
      asistenteDocumento: datos.documento.trim(),
      asistenteCorreo: datos.correo.trim(),
      eventoTitulo: subEvento.event.name,
      qrImage
    }
  };
}