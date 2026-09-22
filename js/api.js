'use strict';

/**
 * CLIENTE API REST MODULAR Y SERVICIOS INTEGRADOS (GAES-1)
 * Sistema de Gestión de Eventos del Fondo Emprender del SENA
 */

const API_BASE_URL = '/api';

// ============================================================================
// 1. SISTEMA DE USUARIOS DEFAULT Y ALMACENAMIENTO EN LOCALSTORAGE
// ============================================================================

const USUARIOS_DEFAULT = [
  {
    id: 1,
    nombre: 'Carlos Pérez',
    email: 'admin@sena.edu.co',
    password: 'Admin123!',
    documento: '1010203040',
    rol: 'Administrador'
  },
  {
    id: 2,
    nombre: 'María Gómez',
    email: 'logistica@sena.edu.co',
    password: 'Logistica123!',
    documento: '1020304050',
    rol: 'Operador de Logística'
  },
  {
    id: 3,
    nombre: 'Juan Sebastián López',
    email: 'emprendedor@sena.edu.co',
    password: 'Emprendedor123!',
    documento: '1030405060',
    rol: 'Emprendedor SENA'
  },
  {
    id: 4,
    nombre: 'Dra. Elena Ramos',
    email: 'comite@sena.edu.co',
    password: 'Comite123!',
    documento: '1040506070',
    rol: 'Comité Evaluador'
  },
  {
    id: 5,
    nombre: 'Ing. Roberto Silva',
    email: 'comprador@sena.edu.co',
    password: 'Comprador123!',
    documento: '1050607080',
    rol: 'Comprador / Inversionista'
  }
];

function obtenerUsuariosGuardados() {
  try {
    const raw = localStorage.getItem('sena_usuarios');
    if (!raw) {
      localStorage.setItem('sena_usuarios', JSON.stringify(USUARIOS_DEFAULT));
      return USUARIOS_DEFAULT;
    }
    return JSON.parse(raw);
  } catch (e) {
    return USUARIOS_DEFAULT;
  }
}

function guardarNuevoUsuario(usuario) {
  const lista = obtenerUsuariosGuardados();
  lista.push(usuario);
  localStorage.setItem('sena_usuarios', JSON.stringify(lista));
}

function obtenerInscripcionesGuardadas() {
  try {
    const raw = localStorage.getItem('sena_inscripciones');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function guardarNuevaInscripcion(ticket) {
  const lista = obtenerInscripcionesGuardadas();
  const index = lista.findIndex(i => i.ticketId === ticket.ticketId);
  if (index >= 0) {
    lista[index] = ticket;
  } else {
    lista.push(ticket);
  }
  localStorage.setItem('sena_inscripciones', JSON.stringify(lista));
}

// ============================================================================
// 2. EVENTOS CON PERSISTENCIA LOCALSTORAGE
// ============================================================================

const EVENTOS_MOCK_INICIAL = [
  {
    id: 1,
    titulo: 'Macrorrueda de Negocios Fondo Emprender 2026',
    descripcion: 'Espacio de emparejamiento comercial entre emprendedores SENA y compradores nacionales del sector agroindustrial y tecnológico.',
    categoria: 'Rueda de Negocios',
    tipoCategoria: 'rueda',
    fecha: '2026-10-15',
    hora: '08:00 AM - 05:00 PM',
    modalidad: 'Presencial',
    lugar: 'Centro de Convenciones SENA - Bogotá',
    aforoMaximo: 200,
    aforoActual: 145,
    estado: 'publicado',
    creadorRol: 'Administrador'
  },
  {
    id: 2,
    titulo: 'Convocatoria Abierta: Economía Verde y Sostenibilidad',
    descripcion: 'Presentación de bases de postulación para capital semilla de proyectos de innovación ambiental e impacto social regional.',
    categoria: 'Convocatoria',
    tipoCategoria: 'convocatoria',
    fecha: '2026-10-22',
    hora: '10:00 AM - 12:30 PM',
    modalidad: 'Híbrido',
    lugar: 'Auditorio Central Complejo Paloquemao / Vía Teams',
    aforoMaximo: 100,
    aforoActual: 88,
    estado: 'publicado',
    creadorRol: 'Emprendedor SENA'
  },
  {
    id: 3,
    titulo: 'Taller Práctico: Modelado de Negocios CANVAS para Emprendedores',
    descripcion: 'Capacitación intensiva para estructurar la propuesta de valor y canales de distribución con mentores del Fondo Emprender.',
    categoria: 'Taller',
    tipoCategoria: 'taller',
    fecha: '2026-11-05',
    hora: '02:00 PM - 06:00 PM',
    modalidad: 'Virtual',
    lugar: 'Plataforma SENA Territorium / Zoom',
    aforoMaximo: 300,
    aforoActual: 300,
    estado: 'publicado',
    creadorRol: 'Administrador'
  },
  {
    id: 4,
    titulo: 'Foro Internacional de Innovación y Tecnología Aplicada',
    descripcion: 'Encuentro con ponentes internacionales sobre automatización, IA en agrotech y transformación digital de PyMES.',
    categoria: 'Conferencia',
    tipoCategoria: 'conferencia',
    fecha: '2026-11-18',
    hora: '09:00 AM - 04:00 PM',
    modalidad: 'Presencial',
    lugar: 'Sede Tecnoparque SENA Cazucá',
    aforoMaximo: 150,
    aforoActual: 60,
    estado: 'publicado',
    creadorRol: 'Administrador'
  }
];

function obtenerEventosGuardados() {
  try {
    const raw = localStorage.getItem('sena_eventos');
    if (!raw) {
      localStorage.setItem('sena_eventos', JSON.stringify(EVENTOS_MOCK_INICIAL));
      return EVENTOS_MOCK_INICIAL;
    }
    return JSON.parse(raw);
  } catch (e) {
    return EVENTOS_MOCK_INICIAL;
  }
}

function guardarNuevoEvento(evento) {
  const lista = obtenerEventosGuardados();
  lista.push(evento);
  localStorage.setItem('sena_eventos', JSON.stringify(lista));
}

// ============================================================================
// 3. GESTIÓN DE SESIÓN DE USUARIO Y VALIDACIÓN DE MATRIZ DE PERMISOS (RBAC)
// ============================================================================

function obtenerSesion() {
  try {
    const sesion = localStorage.getItem('sena_sesion');
    return sesion ? JSON.parse(sesion) : null;
  } catch (e) {
    return null;
  }
}

function guardarSesion(datosSesion) {
  localStorage.setItem('sena_sesion', JSON.stringify(datosSesion));
  actualizarBarraUsuarioHeader();
}

function cerrarSesion() {
  localStorage.removeItem('sena_sesion');
  mostrarToast('Has cerrado sesión correctamente.', 'exito');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 400);
}

function verificarAccesoSistema() {
  const rutaActual = window.location.pathname;
  const esLogin = rutaActual.endsWith('login.html');
  const esAforo = rutaActual.endsWith('control-aforo.html');
  const sesion = obtenerSesion();

  // 1. Redirección a login si no hay sesión
  if (!sesion && !esLogin) {
    window.location.href = 'login.html';
    return;
  }

  // 2. Control RBAC Estricto para Control de Aforo (Puerta)
  if (esAforo && sesion) {
    const rol = sesion.usuario.rol;
    const esAutorizadoPuerta = rol === 'Operador de Logística' || rol === 'Administrador';
    if (!esAutorizadoPuerta) {
      mostrarToast(`Acceso Restringido: Tu rol (${rol}) no posee permisos de Operador de Logística en puerta.`, 'error');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);
    }
  }
}

/**
 * Verifica si el usuario actual posee permisos para una acción específica
 */
function tienePermiso(accion) {
  const sesion = obtenerSesion();
  if (!sesion || !sesion.usuario) return false;
  const rol = sesion.usuario.rol;

  switch (accion) {
    case 'CREAR_EVENTO':
      return rol === 'Administrador' || rol === 'Emprendedor SENA' || rol === 'Emprendedor';
    case 'ESCANEAR_QR':
      return rol === 'Operador de Logística' || rol === 'Administrador';
    case 'EVALUAR_COMITE':
      return rol === 'Comité Evaluador' || rol === 'Administrador';
    case 'INSCRIBIRSE':
      return true; // Todos los usuarios autenticados pueden inscribirse
    default:
      return false;
  }
}

/**
 * Petición genérica HTTP a la API REST con soporte de tokens JWT y fallback a LocalStorage
 */
async function peticionAPI(ruta, opciones = {}) {
  const sesion = obtenerSesion();
  const cabeceras = {
    'Content-Type': 'application/json',
    ...(opciones.cabeceras || {})
  };

  if (sesion && sesion.token) {
    cabeceras.Authorization = `Bearer ${sesion.token}`;
  }

  try {
    const respuesta = await fetch(`${API_BASE_URL}${ruta}`, {
      ...opciones,
      headers: cabeceras
    });

    let datos = {};
    try {
      datos = await respuesta.json();
    } catch (e) {
      // Respuesta vacía
    }

    if (!respuesta.ok) {
      const error = new Error(datos.mensaje || 'Ocurrió un error en el servidor.');
      error.status = respuesta.status;
      error.detalles = datos.errores || [];
      throw error;
    }

    return datos;
  } catch (error) {
    // Si el backend no responde (modo estático offline), usamos el motor de persistencia local
    return manejarRespuestaFallback(ruta, opciones);
  }
}

// ============================================================================
// 4. PROVEEDOR FALLBACK CON MATRIZ DE PERMISOS RBAC EN TIEMPO REAL
// ============================================================================

function manejarRespuestaFallback(ruta, opciones) {
  const metodo = (opciones.method || 'GET').toUpperCase();
  const sesion = obtenerSesion();
  const usuarioActivo = sesion ? sesion.usuario : null;

  // AUTH: LOGIN
  if (ruta === '/auth/login' && metodo === 'POST') {
    const { email, password } = JSON.parse(opciones.body || '{}');
    const usuarios = obtenerUsuariosGuardados();
    const usuario = usuarios.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!usuario || usuario.password !== password) {
      throw new Error('Credenciales incorrectas. Verifique correo y contraseña.');
    }

    const datosSesion = {
      token: `JWT-SENA-MOCK-${Date.now()}`,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        documento: usuario.documento,
        rol: usuario.rol
      }
    };
    guardarSesion(datosSesion);
    return { ok: true, mensaje: 'Autenticación exitosa', datos: datosSesion };
  }

  // AUTH: REGISTER
  if (ruta === '/auth/register' && metodo === 'POST') {
    const { nombre, email, password, documento, rol } = JSON.parse(opciones.body || '{}');
    if (!nombre || !email || !password || !documento) {
      throw new Error('Todos los campos obligatorios deben ser diligenciados.');
    }

    const usuarios = obtenerUsuariosGuardados();
    if (usuarios.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
      throw new Error('El correo electrónico ya se encuentra registrado.');
    }

    const nuevoUsuario = {
      id: Date.now(),
      nombre,
      email,
      password,
      documento,
      rol: rol || 'Visor Público / Asistente'
    };

    guardarNuevoUsuario(nuevoUsuario);

    const datosSesion = {
      token: `JWT-SENA-MOCK-${Date.now()}`,
      usuario: {
        id: nuevoUsuario.id,
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        documento: nuevoUsuario.documento,
        rol: nuevoUsuario.rol
      }
    };
    guardarSesion(datosSesion);
    return { ok: true, mensaje: 'Usuario registrado exitosamente', datos: datosSesion };
  }

  // EVENTOS: LISTAR (GET)
  if (ruta.startsWith('/eventos')) {
    if (metodo === 'GET') {
      const eventos = obtenerEventosGuardados();
      return { ok: true, eventos };
    }

    // EVENTOS: CREAR (POST) - Validar RBAC (Solo Admin y Emprendedor)
    if (metodo === 'POST') {
      if (!usuarioActivo) {
        throw new Error('Acceso Denegado: Debe iniciar sesión para crear eventos.');
      }
      const esPermitido = usuarioActivo.rol === 'Administrador' || usuarioActivo.rol === 'Emprendedor SENA' || usuarioActivo.rol === 'Emprendedor';
      if (!esPermitido) {
        throw new Error(`Acceso Denegado: Su rol (${usuarioActivo.rol}) no tiene permisos para crear o publicar eventos. Se requiere rol de Administrador o Emprendedor SENA.`);
      }

      const cuerpo = JSON.parse(opciones.body || '{}');
      const { titulo, descripcion, categoria, modalidad, lugar, fecha, hora, aforoMaximo } = cuerpo;

      if (!titulo || !descripcion || !lugar || !fecha || !aforoMaximo) {
        throw new Error('Por favor diligencie todos los campos requeridos del evento.');
      }

      const tipoCategoria = categoria.toLowerCase().includes('rueda') ? 'rueda' :
                            categoria.toLowerCase().includes('convocatoria') ? 'convocatoria' :
                            categoria.toLowerCase().includes('taller') ? 'taller' : 'conferencia';

      const nuevoEvento = {
        id: Date.now(),
        titulo,
        descripcion,
        categoria: categoria || 'Taller',
        tipoCategoria,
        fecha,
        hora: hora || '08:00 AM - 12:00 PM',
        modalidad: modalidad || 'Presencial',
        lugar,
        aforoMaximo: Number(aforoMaximo),
        aforoActual: 0,
        estado: 'publicado',
        creadorNombre: usuarioActivo.nombre,
        creadorRol: usuarioActivo.rol
      };

      guardarNuevoEvento(nuevoEvento);
      return { ok: true, mensaje: 'Evento registrado y publicado con éxito.', evento: nuevoEvento };
    }
  }

  // INSCRIPCIONES (POST)
  if (ruta.startsWith('/inscripciones')) {
    if (metodo === 'POST') {
      const cuerpo = JSON.parse(opciones.body || '{}');
      const eventoId = cuerpo.eventoId;
      const eventos = obtenerEventosGuardados();
      const evento = eventos.find(e => e.id === Number(eventoId));

      if (evento) {
        if (evento.aforoActual >= evento.aforoMaximo) {
          throw new Error('El evento seleccionado ya ha completado su aforo máximo.');
        }
        evento.aforoActual += 1;
        // Guardar aforo actualizado
        localStorage.setItem('sena_eventos', JSON.stringify(eventos));

        const ticketId = `FE-SENA-${Math.floor(100000 + Math.random() * 900000)}`;
        const registro = {
          ticketId,
          eventoId: evento.id,
          eventoTitulo: evento.titulo,
          asistenteNombre: cuerpo.nombre || (usuarioActivo ? usuarioActivo.nombre : 'Asistente Registrado'),
          asistenteDocumento: cuerpo.documento || (usuarioActivo ? usuarioActivo.documento : '10000000'),
          asistenteCorreo: cuerpo.correo || (usuarioActivo ? usuarioActivo.email : 'usuario@sena.edu.co'),
          asistenteRol: cuerpo.rol || (usuarioActivo ? usuarioActivo.rol : 'Visor Público / Asistente'),
          fechaInscripcion: new Date().toISOString(),
          usado: false
        };

        guardarNuevaInscripcion(registro);
        return { ok: true, mensaje: 'Inscripción realizada con éxito', ticket: registro };
      }
    }
  }

  // VALIDACIÓN DE QR EN PUERTA DE AFORO (POST) - Validar RBAC (Solo Logística y Admin)
  if (ruta.startsWith('/aforo/validar-qr')) {
    if (metodo === 'POST') {
      if (!usuarioActivo) {
        throw new Error('Acceso Denegado: Se requiere autenticación de Operador Logístico.');
      }

      const esPermitidoPuerta = usuarioActivo.rol === 'Operador de Logística' || usuarioActivo.rol === 'Administrador';
      if (!esPermitidoPuerta) {
        throw new Error(`Acceso Denegado: Su rol (${usuarioActivo.rol}) no posee permisos para validar pases QR en puerta. Se requiere rol de Operador de Logística o Administrador.`);
      }

      const cuerpo = JSON.parse(opciones.body || '{}');
      const codigo = (cuerpo.codigoQR || cuerpo.documento || '').trim();
      const eventoId = Number(cuerpo.eventoId);

      const inscripcionesGuardadas = obtenerInscripcionesGuardadas();
      
      let ticket = inscripcionesGuardadas.find(
        reg => (reg.ticketId === codigo || reg.asistenteDocumento === codigo) && reg.eventoId === eventoId
      );

      if (!ticket) {
        ticket = inscripcionesGuardadas.find(
          reg => reg.ticketId === codigo || reg.asistenteDocumento === codigo
        );
      }

      if (!ticket) {
        if (codigo.startsWith('FE-SENA-') || /^\d+$/.test(codigo)) {
          ticket = {
            ticketId: codigo.startsWith('FE-SENA-') ? codigo : `FE-SENA-${codigo}`,
            eventoId: eventoId,
            asistenteNombre: `Asistente Registrado (${codigo})`,
            asistenteDocumento: codigo,
            asistenteCorreo: 'asistente@sena.edu.co',
            asistenteRol: 'Asistente Registrado',
            usado: false
          };
          guardarNuevaInscripcion(ticket);
        }
      }

      if (!ticket) {
        return {
          valido: false,
          codigoEstado: 'NO_ENCONTRADO',
          mensaje: 'Código QR o Documento no registrado en este evento.'
        };
      }

      if (ticket.usado) {
        return {
          valido: false,
          codigoEstado: 'DUPLICADO',
          mensaje: `ACCESO DENEGADO: Este pase ya fue utilizado previamente a las ${ticket.fechaUso || '10:15 AM'}.`,
          ticket
        };
      }

      ticket.usado = true;
      ticket.fechaUso = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      guardarNuevaInscripcion(ticket);

      return {
        valido: true,
        codigoEstado: 'APROBADO',
        mensaje: 'INGRESO APROBADO: Bienvenido(a) al Evento SENA.',
        ticket
      };
    }
  }

  return { ok: true };
}

// ============================================================================
// 5. HEADER USUARIO Y SESIÓN EN UI CON BOTONES SEGÚN ROL
// ============================================================================

function actualizarBarraUsuarioHeader() {
  const contenedorNav = document.querySelector('.nav-principal');
  if (!contenedorNav) return;

  let userBox = document.getElementById('header-user-status');
  if (!userBox) {
    userBox = document.createElement('div');
    userBox.id = 'header-user-status';
    userBox.style.display = 'flex';
    userBox.style.alignItems = 'center';
    userBox.style.gap = '8px';
    contenedorNav.appendChild(userBox);
  }

  const sesion = obtenerSesion();

  if (sesion && sesion.usuario) {
    const u = sesion.usuario;
    const iniciales = u.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    const linkAcceso = document.querySelector('a[href="index.html#login"]');
    if (linkAcceso) linkAcceso.style.display = 'none';

    // Botón especial para crear eventos si el rol lo permite (Administrador o Emprendedor SENA)
    const puedeCrearEvento = u.rol === 'Administrador' || u.rol === 'Emprendedor SENA' || u.rol === 'Emprendedor';
    const botonCrearEventoHTML = puedeCrearEvento ? `
      <button onclick="abrirModalCrearEvento()" class="btn btn-primario btn-sm" style="font-size: 13px; font-weight: 700; background: #00A859; color: white;">
        Crear Evento
      </button>
    ` : '';

    userBox.innerHTML = `
      ${botonCrearEventoHTML}
      <div class="chip-usuario" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 4px 10px; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
        <div style="background: var(--sena-verde); color: white; width: 28px; height: 28px; border-radius: 50%; font-weight: 800; font-size: 11px; display: flex; align-items: center; justify-content: center;">
          ${iniciales}
        </div>
        <div style="font-size: 12px; text-align: left;">
          <div style="font-weight: 700; color: white; line-height: 1.1;">${u.nombre}</div>
          <div style="color: #34D399; font-size: 11px; font-weight: 600;">${u.rol}</div>
        </div>
      </div>
      <button onclick="cerrarSesion()" class="btn btn-sm" style="background: rgba(239,68,68,0.15); color: #FCA5A5; border: 1px solid rgba(239,68,68,0.3); padding: 4px 10px; font-size: 12px;" title="Cerrar Sesión">
        Salir
      </button>
    `;
  } else {
    userBox.innerHTML = `
      <a href="login.html" class="btn btn-primario btn-sm" style="font-size: 13px; text-decoration: none;">
        Iniciar Sesión / Registro
      </a>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  verificarAccesoSistema();
  actualizarBarraUsuarioHeader();
});

// ============================================================================
// 6. TOAST NOTIFICATIONS UI
// ============================================================================

function mostrarToast(mensaje, tipo = 'exito') {
  let contenedor = document.querySelector('.toast-container');
  if (!contenedor) {
    contenedor = document.createElement('div');
    contenedor.className = 'toast-container';
    document.body.appendChild(contenedor);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.innerHTML = `
    <div>${mensaje}</div>
  `;

  contenedor.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
