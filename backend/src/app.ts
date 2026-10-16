import express, { type Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { AppError } from './shared/errors.js';
import { routerAuth } from './modules/auth/auth.routes.js';
import { routerEventos } from './modules/events/events.routes.js';
import { routerInscripciones, routerAforo } from './modules/registrations/registrations.routes.js';
import { routerUsuarios } from './modules/users/users.routes.js';

export function crearApp(): Express {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: env.NODE_ENV === 'production' ? env.APP_URL : true, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: { mensaje: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }
    })
  );

  app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.json({ ok: true, servicio: 'eventos-sena-api', version: '1.0.0' });
  });

  // Módulos institucionales oficiales GAES-1
  app.use('/api/v1/auth', routerAuth);
  app.use('/api/v1/eventos', routerEventos);
  app.use('/api/v1/inscripciones', routerInscripciones);
  app.use('/api/v1/aforo', routerAforo);
  app.use('/api/v1/usuarios', routerUsuarios);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ mensaje: 'Ruta no encontrada.', errores: [] });
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof AppError) {
      res.status(error.status).json({ mensaje: error.message, errores: error.errores });
      return;
    }

    console.error(JSON.stringify({ nivel: 'error', mensaje: (error as Error)?.message }));
    res.status(500).json({ mensaje: 'Error interno del servidor.', errores: [] });
  });

  return app;
}
