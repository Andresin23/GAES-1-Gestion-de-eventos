import type { Request, Response } from 'express';
import { crearApp } from '../backend/src/app.js';

const app = crearApp();

export default function handler(req: Request, res: Response) {
  // Normalizar ruta en Vercel Serverless Functions si fue reescrita por vercel.json
  const originalUrl = (req.headers['x-matched-path'] || req.headers['x-forwarded-uri']) as string;
  if (originalUrl && originalUrl.startsWith('/api') && req.url !== originalUrl) {
    req.url = originalUrl;
  }
  return app(req, res);
}
