import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL es obligatoria (se usa en Prisma Migrate)'),

  SUPABASE_URL: z.string().url('SUPABASE_URL debe ser una URL valida'),
  SUPABASE_SECRET_KEY: z.string().min(20, 'SUPABASE_SECRET_KEY es obligatoria'),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(20, 'SUPABASE_PUBLISHABLE_KEY es obligatoria'),
  SUPABASE_STORAGE_BUCKETS: z.string().default('portadas,portfolios'),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().default('no-reply@eventos.sena.edu.co'),

  APP_URL: z.string().default('http://localhost:3000'),
  TZ: z.string().default('America/Bogota')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[ENV] Variables de entorno invalidas:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;

export const buckets = {
  portadas: env.SUPABASE_STORAGE_BUCKETS.split(',')[0]?.trim() ?? 'portadas',
  portfolios: env.SUPABASE_STORAGE_BUCKETS.split(',')[1]?.trim() ?? 'portfolios'
} as const;