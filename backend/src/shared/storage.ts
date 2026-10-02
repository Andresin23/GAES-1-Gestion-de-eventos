import { supabaseAdmin } from '../config/supabase.js';
import { buckets } from '../config/env.js';
import { BadRequestError, NotFoundError } from './errors.js';

const MAX_PORTAADA = 5 * 1024 * 1024;
const MAX_PORTFOLIO = 10 * 1024 * 1024;

const TIPOS_PORTADA = ['image/jpeg', 'image/png', 'image/webp'];
const TIPOS_PORTFOLIO = ['application/pdf'];

type Subida = {
  bucket: string;
  ruta: string;
  contentType: string;
  tamano: number;
};

/** Arma una ruta por usuario para que los archivos queden agrupados y aislados. */
function construirRuta(userId: string, carpeta: string, nombreArchivo: string): string {
  const ext = nombreArchivo.includes('.') ? nombreArchivo.slice(nombreArchivo.lastIndexOf('.')) : '';
  return `${userId}/${carpeta}/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
}

function validar(tipo: string, tamano: number, bucket: string) {
  if (bucket === buckets.portadas) {
    if (!TIPOS_PORTADA.includes(tipo)) {
      throw new BadRequestError('La portada debe ser JPG, PNG o WEBP.');
    }
    if (tamano > MAX_PORTAADA) throw new BadRequestError('La portada no puede pesar más de 5 MB.');
    return;
  }
  if (!TIPOS_PORTFOLIO.includes(tipo)) {
    throw new BadRequestError('El portafolio debe ser un archivo PDF.');
  }
  if (tamano > MAX_PORTFOLIO) throw new BadRequestError('El portafolio no puede pesar más de 10 MB.');
}

/**
 * Sube un archivo al bucket indicado y devuelve la ruta relativa. Las URLs
 * firmadas se generan aparte con `urlFirmada` en el momento de leerlas.
 */
export async function subirArchivo(
  userId: string,
  archivo: { buffer: Buffer; mimetype: string; originalname: string; size: number },
  destino: 'portada' | 'portfolio'
): Promise<Subida> {
  const bucket = destino === 'portada' ? buckets.portadas : buckets.portfolios;
  validar(archivo.mimetype, archivo.size, bucket);

  const ruta = construirRuta(userId, destino, archivo.originalname);
  const { error } = await supabaseAdmin.storage.from(bucket).upload(ruta, archivo.buffer, {
    contentType: archivo.mimetype,
    upsert: false
  });

  if (error) throw new BadRequestError(`No se pudo subir el archivo: ${error.message}`);
  return { bucket, ruta, contentType: archivo.mimetype, tamano: archivo.size };
}

export async function urlFirmada(bucket: string, ruta: string, expiresEnSegundos = 3600): Promise<string> {
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(ruta, expiresEnSegundos);
  if (error) throw new NotFoundError('El archivo no está disponible.');
  return data.signedUrl;
}

export async function eliminarArchivo(bucket: string, ruta: string): Promise<void> {
  await supabaseAdmin.storage.from(bucket).remove([ruta]);
}

/** Crea los buckets si no existen. Idempotente. */
export async function asegurarBuckets(): Promise<void> {
  const { data: existentes, error } = await supabaseAdmin.storage.listBuckets();
  if (error) throw new BadRequestError(`No se pudieron listar los buckets: ${error.message}`);

  const actuales = new Set(existentes.map((b) => b.name));
  const definiciones = [
    { nombre: buckets.portadas, publico: true },
    { nombre: buckets.portfolios, publico: false }
  ];

  for (const def of definiciones) {
    if (actuales.has(def.nombre)) continue;
    const { error: createErr } = await supabaseAdmin.storage.createBucket(def.nombre, {
      public: def.publico,
      fileSizeLimit: def.nombre === buckets.portadas ? MAX_PORTAADA : MAX_PORTFOLIO
    });
    if (createErr && !/already exists/i.test(createErr.message)) {
      throw new BadRequestError(`No se pudo crear el bucket ${def.nombre}: ${createErr.message}`);
    }
  }
}