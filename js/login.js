'use strict';

/**
 * MÓDULO CONTROLADOR DEL PORTAL DE LOGIN Y ACCESO (GAES-1)
 * Manejo de pestañas, autenticación, registro y accesos por rol
 */

function mostrarPestana(pestana) {
  const btnLogin = document.getElementById('btn-tab-login');
  const btnRegistro = document.getElementById('btn-tab-registro');
  const pLogin = document.getElementById('pantalla-login');
  const pRegistro = document.getElementById('pantalla-registro');

  if (pestana === 'login') {
    if (btnLogin) btnLogin.classList.add('activo');
    if (btnRegistro) btnRegistro.classList.remove('activo');
    if (pLogin) pLogin.style.display = 'block';
    if (pRegistro) pRegistro.style.display = 'none';
  } else {
    if (btnRegistro) btnRegistro.classList.add('activo');
    if (btnLogin) btnLogin.classList.remove('activo');
    if (pRegistro) pRegistro.style.display = 'block';
    if (pLogin) pLogin.style.display = 'none';
  }
}

async function procesarInicioSesion(event) {
  if (event) event.preventDefault();
  const emailInput = document.getElementById('login-email');
  const passInput = document.getElementById('login-password');
  
  if (!emailInput || !passInput) return;

  const email = emailInput.value;
  const password = passInput.value;

  try {
    const respuesta = await peticionAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (respuesta.ok && respuesta.datos) {
      mostrarToast(`Bienvenido(a) ${respuesta.datos.usuario.nombre}`, 'exito');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 400);
    }
  } catch (err) {
    mostrarToast(err.message || 'Error de autenticación.', 'error');
  }
}

function ingresarComoDemo(email, password) {
  const emailInput = document.getElementById('login-email');
  const passInput = document.getElementById('login-password');
  if (emailInput && passInput) {
    emailInput.value = email;
    passInput.value = password;
    procesarInicioSesion(null);
  }
}

async function procesarRegistro(event) {
  if (event) event.preventDefault();
  const nombre = document.getElementById('reg-nombre').value;
  const documento = document.getElementById('reg-documento').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const rol = document.getElementById('reg-rol').value;

  try {
    const respuesta = await peticionAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ nombre, documento, email, password, rol })
    });

    if (respuesta.ok && respuesta.datos) {
      mostrarToast(`Cuenta creada exitosamente como ${rol}`, 'exito');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 400);
    }
  } catch (err) {
    mostrarToast(err.message || 'Error al registrar el usuario.', 'error');
  }
}

function ingresarComoVisor() {
  // Registrar sesión en modo Visor Público (Invitado)
  guardarSesion({
    token: 'GUEST-TOKEN-VISOR',
    usuario: {
      id: 0,
      nombre: 'Visor Público (Invitado)',
      email: 'invitado@sena.edu.co',
      documento: '0000000',
      rol: 'Visor Público'
    }
  });
  mostrarToast('Ingresando como Visor Público...', 'exito');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 400);
}
