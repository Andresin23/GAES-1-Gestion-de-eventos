import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../shared/errors.js';

type Fuente = 'body' | 'query' | 'params';

export function validar(schema: z.ZodTypeAny, fuente: Fuente = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const resultado = schema.safeParse(req[fuente]);
    if (!resultado.success) {
      const errores = resultado.error.issues.map(
        (i) => `${i.path.join('.')}: ${i.message}`
      );
      throw new BadRequestError('Datos inválidos.', errores);
    }
    (req as Request)[fuente] = resultado.data;
    next();
  };
}