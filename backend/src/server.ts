import { crearApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/db.js';

const app = crearApp();

const servidor = app.listen(env.PORT, () => {
  console.log(
    JSON.stringify({
      nivel: 'info',
      mensaje: `API escuchando en http://localhost:${env.PORT}/api/v1/health`,
      entorno: env.NODE_ENV
    })
  );
});

function apagar(signal: string) {
  console.log(JSON.stringify({ nivel: 'info', mensaje: `Recibido ${signal}. Cerrando servidor...` }));
  servidor.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => apagar('SIGINT'));
process.on('SIGTERM', () => apagar('SIGTERM'));
