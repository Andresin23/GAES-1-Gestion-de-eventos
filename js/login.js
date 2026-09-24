'use strict';

/**
 * Portal de acceso. El ingreso con cuenta es por Google (js/google-auth.js).
 * El visor público entra sin cuenta.
 */

function ingresarComoVisor() {
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
