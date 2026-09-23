import { EventStatus } from '@prisma/client';
import { BadRequestError } from '../shared/errors.js';

/**
 * Máquina de estados del evento (sección 1.1 del REQUERIMIENTOS.md).
 * No existe vuelta atrás: un evento CANCELADO es terminal.
 */
export const TRANSICIONES: Record<EventStatus, EventStatus[]> = {
  [EventStatus.BORRADOR]: [EventStatus.APROBADO, EventStatus.BORRADOR],
  [EventStatus.APROBADO]: [EventStatus.PUBLICADO, EventStatus.CANCELADO],
  [EventStatus.PUBLICADO]: [EventStatus.CANCELADO],
  [EventStatus.CANCELADO]: []
};

export function puedeTransicionar(de: EventStatus, a: EventStatus): boolean {
  return TRANSICIONES[de].includes(a);
}

export function validarTransicion(de: EventStatus, a: EventStatus, accion: string): void {
  if (!puedeTransicionar(de, a)) {
    throw new BadRequestError(
      `No se puede ejecutar "${accion}": el evento está en estado ${de}.`
    );
  }
}

export function validarComentarioObligatorio(accion: string, comentario?: string | null): void {
  if (!comentario || comentario.trim().length === 0) {
    throw new BadRequestError(`"${accion}" requiere un comentario de justificación.`);
  }
}