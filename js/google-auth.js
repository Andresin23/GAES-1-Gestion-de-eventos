'use strict';

/**
 * Inicio de sesión con Google (Google Identity Services).
 * La cuenta nueva completa documento y rol; un correo ya registrado conserva su rol.
 */

let perfilGooglePendiente = null;
let botonGoogleMontado = false;

function decodificarJwtGoogle(token) {
  const partes = String(token || '').split('.');
  if (partes.length !== 3) {
    throw new Error('La credencial de Google no es válida.');
  }
  let base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
  const resto = base64.length % 4;
  if (resto) base64 += '='.repeat(4 - resto);
  const json = new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));
  return JSON.parse(json);
}

function nombreDesdePerfilGoogle(perfil) {
  if (perfil.name) return perfil.name;
  const partes = [perfil.given_name, perfil.family_name].filter(Boolean);
  return partes.join(' ') || perfil.email;
}

function entrarConSesionGoogle(datosSesion, mensaje) {
  guardarSesion(datosSesion);
  mostrarToast(mensaje, 'exito');
  const enLogin = /login\.html$/i.test(window.location.pathname);
  setTimeout(() => {
    if (enLogin) {
      window.location.href = 'index.html';
      return;
    }
    if (typeof cerrarModal === 'function') cerrarModal('modal-login');
    if (typeof actualizarBarraUsuarioHeader === 'function') actualizarBarraUsuarioHeader();
  }, 400);
}

function mostrarAvisoGoogle(contenedor, mensaje) {
  contenedor.innerHTML = `<p class="google-config-aviso">${mensaje}</p>`;
}

function montarBotonGoogle(contenedorId) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor || botonGoogleMontado) return;

  const clientId = (window.SENA_CONFIG && window.SENA_CONFIG.GOOGLE_CLIENT_ID || '').trim();
  if (!clientId) {
    mostrarAvisoGoogle(
      contenedor,
      'Falta el Client ID de Google. Créalo en Google Cloud Console (OAuth, aplicación web) y pégalo en <strong>js/config.js</strong> como GOOGLE_CLIENT_ID. Agrega este origen en los orígenes JavaScript autorizados.'
    );
    return;
  }

  const pintar = () => {
    if (!window.google || !google.accounts || !google.accounts.id) {
      mostrarAvisoGoogle(contenedor, 'No se pudo cargar el servicio de Google. Revisa tu conexión e inténtalo de nuevo.');
      return;
    }
    google.accounts.id.initialize({
      client_id: clientId,
      callback: manejarCredencialGoogle,
      ux_mode: 'popup',
      auto_select: false,
      use_fedcm_for_button: true,
      itp_support: true
    });
    contenedor.innerHTML = '';
    const ancho = Math.max(240, Math.min(contenedor.clientWidth || 360, 400));
    google.accounts.id.renderButton(contenedor, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: ancho,
      locale: 'es'
    });
    botonGoogleMontado = true;
  };

  if (window.google && google.accounts && google.accounts.id) {
    pintar();
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client?hl=es';
  script.async = true;
  script.onload = pintar;
  script.onerror = () => {
    mostrarAvisoGoogle(contenedor, 'No se pudo cargar el servicio de Google. Revisa tu conexión e inténtalo de nuevo.');
  };
  document.head.appendChild(script);
}

function manejarCredencialGoogle(respuesta) {
  try {
    const clientId = (window.SENA_CONFIG && window.SENA_CONFIG.GOOGLE_CLIENT_ID || '').trim();
    const perfil = decodificarJwtGoogle(respuesta && respuesta.credential);
    const emisorValido = perfil.iss === 'accounts.google.com' || perfil.iss === 'https://accounts.google.com';
    const vigente = !perfil.exp || perfil.exp * 1000 > Date.now();

    if (!emisorValido || !vigente || perfil.aud !== clientId) {
      mostrarToast('La credencial de Google no corresponde a esta aplicación.', 'error');
      return;
    }
    if (!perfil.email || perfil.email_verified === false) {
      mostrarToast('Google no confirmó el correo de esta cuenta.', 'error');
      return;
    }

    const usuarios = obtenerUsuariosGuardados();
    const existente = usuarios.find((u) => u.email.toLowerCase() === perfil.email.toLowerCase());
    const nombre = nombreDesdePerfilGoogle(perfil);
    const credencial = respuesta.credential;

    if (existente) {
      entrarConSesionGoogle({
        token: credencial,
        proveedor: 'google',
        usuario: {
          id: existente.id,
          nombre,
          email: existente.email,
          documento: existente.documento,
          rol: existente.rol
        }
      }, `Bienvenido(a) ${nombre}`);
      return;
    }

    perfilGooglePendiente = {
      sub: perfil.sub,
      email: perfil.email,
      nombre,
      credencial
    };
    mostrarFormularioPerfilGoogle(perfilGooglePendiente);
  } catch (err) {
    mostrarToast(err.message || 'No se pudo iniciar sesión con Google.', 'error');
  }
}

function mostrarFormularioPerfilGoogle(perfil) {
  const acceso = document.getElementById('pantalla-google');
  const caja = document.getElementById('pantalla-perfil-google');
  if (acceso) acceso.style.display = 'none';
  if (caja) caja.style.display = 'block';

  const nombre = document.getElementById('perfil-nombre');
  const email = document.getElementById('perfil-email');
  const rol = document.getElementById('perfil-rol');
  if (nombre) nombre.value = perfil.nombre;
  if (email) email.value = perfil.email;
  if (rol && perfil.email.toLowerCase().endsWith('@sena.edu.co')) {
    rol.value = 'Emprendedor SENA';
  }

  const documento = document.getElementById('perfil-documento');
  if (documento) documento.focus();
}

function cancelarPerfilGoogle() {
  perfilGooglePendiente = null;
  const acceso = document.getElementById('pantalla-google');
  const caja = document.getElementById('pantalla-perfil-google');
  if (caja) caja.style.display = 'none';
  if (acceso) acceso.style.display = 'block';
}

function completarPerfilGoogle(event) {
  if (event) event.preventDefault();
  if (!perfilGooglePendiente) {
    mostrarToast('La sesión de Google expiró. Vuelve a ingresar.', 'error');
    cancelarPerfilGoogle();
    return;
  }

  const documento = (document.getElementById('perfil-documento').value || '').trim();
  const rol = document.getElementById('perfil-rol').value;
  if (documento.length < 5) {
    mostrarToast('Escribe un número de documento válido.', 'error');
    return;
  }

  const usuarios = obtenerUsuariosGuardados();
  if (usuarios.some((u) => String(u.documento) === documento)) {
    mostrarToast('Ese documento ya está registrado.', 'error');
    return;
  }
  if (usuarios.some((u) => u.email.toLowerCase() === perfilGooglePendiente.email.toLowerCase())) {
    mostrarToast('Ese correo ya está registrado. Vuelve a ingresar con Google.', 'error');
    return;
  }

  const nuevoUsuario = {
    id: perfilGooglePendiente.sub,
    nombre: perfilGooglePendiente.nombre,
    email: perfilGooglePendiente.email,
    documento,
    rol,
    proveedor: 'google'
  };
  guardarNuevoUsuario(nuevoUsuario);

  const sesion = {
    token: perfilGooglePendiente.credencial,
    proveedor: 'google',
    usuario: {
      id: nuevoUsuario.id,
      nombre: nuevoUsuario.nombre,
      email: nuevoUsuario.email,
      documento: nuevoUsuario.documento,
      rol: nuevoUsuario.rol
    }
  };
  perfilGooglePendiente = null;
  entrarConSesionGoogle(sesion, `Cuenta creada. Bienvenido(a) ${nuevoUsuario.nombre}`);
}

document.addEventListener('DOMContentLoaded', () => {
  if (/login\.html$/i.test(window.location.pathname)) {
    montarBotonGoogle('google-btn');
  }
});
