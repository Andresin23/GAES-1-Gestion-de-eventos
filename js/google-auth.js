'use strict';

const GOOGLE_CLIENT_ID = '420141579743-8h46r750ekhnd1mhe6qf3g71ja1j9014.apps.googleusercontent.com';
const GOOGLE_EMISORES = new Set(['accounts.google.com', 'https://accounts.google.com']);
const GOOGLE_ROL_POR_DEFECTO = 'Visor Público / Asistente';
const GOOGLE_ROLES_LOCALES = new Set([
  'Administrador',
  'Operador de Logística',
  'Emprendedor SENA',
  'Comité Evaluador',
  'Comprador / Inversionista',
  'Visor Público',
  'Visor Público / Asistente',
  'Aprendiz / Público General'
]);
const GOOGLE_STATE = crearValorAleatorioGoogle();
const GOOGLE_NONCE = crearValorAleatorioGoogle();

let googleAuthInicializado = false;
let googleAuthEnProceso = false;

document.addEventListener('DOMContentLoaded', inicializarAccesoGoogle);
window.addEventListener('load', inicializarAccesoGoogle);

function crearValorAleatorioGoogle() {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function inicializarAccesoGoogle() {
  if (googleAuthInicializado) return;

  const contenedores = Array.from(document.querySelectorAll('[data-google-signin-button]'));
  if (contenedores.length === 0) return;

  if (!window.google?.accounts?.id) {
    if (document.readyState === 'complete') {
      mostrarEstadoGoogle('No fue posible cargar Google. Verifica tu conexión e inténtalo nuevamente.', 'error');
    }
    return;
  }

  try {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: manejarCredencialGoogle,
      auto_select: false,
      cancel_on_tap_outside: true,
      ux_mode: 'popup',
      context: 'signin',
      nonce: GOOGLE_NONCE,
      allowed_parent_origin: window.location.origin,
      use_fedcm_for_prompt: true
    });

    contenedores.forEach(contenedor => {
      contenedor.replaceChildren();
      window.google.accounts.id.renderButton(contenedor, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        locale: 'es',
        width: obtenerAnchoBotonGoogle(contenedor),
        state: GOOGLE_STATE,
        click_listener: limpiarEstadoGoogle
      });
    });

    googleAuthInicializado = true;
  } catch {
    mostrarEstadoGoogle('No fue posible iniciar el acceso con Google.', 'error');
  }
}

function obtenerAnchoBotonGoogle(contenedor) {
  const anchoDisponible = contenedor.parentElement?.getBoundingClientRect().width || 320;
  return Math.max(200, Math.min(360, Math.floor(anchoDisponible)));
}

function manejarCredencialGoogle(respuesta) {
  if (googleAuthEnProceso) return;
  googleAuthEnProceso = true;

  try {
    if (!respuesta || typeof respuesta.credential !== 'string' || !respuesta.credential) {
      throw new Error('Google no devolvió una credencial válida.');
    }

    if (respuesta.state !== GOOGLE_STATE) {
      throw new Error('No fue posible verificar el inicio de sesión con Google.');
    }

    const claims = decodificarTokenGoogle(respuesta.credential);
    validarClaimsGoogle(claims);

    const usuario = construirUsuarioGoogle(claims);
    guardarSesion({
      proveedor: 'google',
      expiraEn: claims.exp * 1000,
      usuario
    });

    completarAccesoGoogle(usuario);
  } catch (error) {
    mostrarEstadoGoogle(error.message || 'No fue posible completar el acceso con Google.', 'error');
  } finally {
    googleAuthEnProceso = false;
  }
}

function decodificarTokenGoogle(token) {
  try {
    const partes = token.split('.');
    if (partes.length !== 3) throw new Error('Credencial de Google inválida.');

    const segmento = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const segmentosCompletos = segmento.padEnd(Math.ceil(segmento.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(segmentosCompletos), caracter => caracter.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error('La respuesta de Google no se pudo leer correctamente.');
  }
}

function validarClaimsGoogle(claims) {
  const ahora = Math.floor(Date.now() / 1000);

  if (!claims || typeof claims !== 'object') {
    throw new Error('La identidad de Google no es válida.');
  }

  if (claims.aud !== GOOGLE_CLIENT_ID || (claims.azp && claims.azp !== GOOGLE_CLIENT_ID)) {
    throw new Error('La credencial de Google no corresponde a esta aplicación.');
  }

  if (!GOOGLE_EMISORES.has(claims.iss)) {
    throw new Error('La respuesta de Google no tiene un emisor válido.');
  }

  if (!Number.isFinite(claims.exp) || claims.exp <= ahora || !Number.isFinite(claims.iat) || claims.iat > ahora + 60) {
    throw new Error('La credencial de Google está vencida o no es válida.');
  }

  if (claims.nonce !== GOOGLE_NONCE) {
    throw new Error('No fue posible validar la respuesta de Google.');
  }

  if (claims.email_verified !== true && claims.email_verified !== 'true') {
    throw new Error('El correo de la cuenta de Google no está verificado.');
  }

  if (typeof claims.sub !== 'string' || !claims.sub || typeof claims.email !== 'string' || !claims.email) {
    throw new Error('La cuenta de Google no incluye los datos de acceso requeridos.');
  }
}

function construirUsuarioGoogle(claims) {
  const correo = claims.email.trim().toLowerCase();
  const usuarioLocal = obtenerUsuariosGuardados().find(usuario => usuario.email?.trim().toLowerCase() === correo);
  const nombre = obtenerTextoGoogle(claims.name) || [claims.given_name, claims.family_name].map(obtenerTextoGoogle).filter(Boolean).join(' ') || 'Usuario Google';
  const rol = usuarioLocal && GOOGLE_ROLES_LOCALES.has(usuarioLocal.rol) ? usuarioLocal.rol : GOOGLE_ROL_POR_DEFECTO;

  return {
    id: usuarioLocal?.id || `google:${claims.sub}`,
    nombre,
    email: correo,
    documento: usuarioLocal?.documento || '',
    rol,
    picture: typeof claims.picture === 'string' ? claims.picture : '',
    emailVerified: true
  };
}

function obtenerTextoGoogle(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function completarAccesoGoogle(usuario) {
  limpiarEstadoGoogle();
  mostrarToast(`Bienvenido(a) ${usuario.nombre}. Sesión iniciada con Google.`, 'exito');

  if (window.location.pathname.endsWith('/login.html') || window.location.pathname.endsWith('login.html')) {
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 400);
    return;
  }

  document.getElementById('modal-login')?.classList.remove('activo');
  verificarAccesoSistema();
}

function mostrarEstadoGoogle(mensaje, tipo) {
  document.querySelectorAll('[data-google-auth-status]').forEach(estado => {
    estado.textContent = mensaje;
    estado.classList.toggle('error', tipo === 'error');
    estado.hidden = !mensaje;
  });
}

function limpiarEstadoGoogle() {
  mostrarEstadoGoogle('', 'error');
}
