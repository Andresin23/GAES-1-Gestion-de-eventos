import QRCode from 'qrcode';
import crypto from 'node:crypto';

/** Genera un código QR único de un solo uso para un sub-evento (RF-37). */
export function generarCodigoQR(): string {
  const numero = crypto.randomInt(100000, 999999);
  return `FE-SENA-${numero}`;
}

/** Devuelve la representación del QR como imagen data URL para mostrarla en el cliente. */
export async function generarImagenQR(codigo: string): Promise<string> {
  return QRCode.toDataURL(codigo, { width: 260, margin: 2, color: { dark: '#0f2d40', light: '#ffffff' } });
}