'use strict';

/**
 * CLIENTE API REST MODULAR Y SERVICIOS INTEGRADOS (GAES-1)
 * Sistema de Gestión de Eventos del Fondo Emprender del SENA
 */

const API_BASE_URL = '/api';

// Gestión Local de Sesión
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
}

function cerrarSesion() {
  localStorage.removeItem('sena_sesion');
  window.location.reload();
}

/**
 * Petición genérica HTTP a la API REST con soporte de tokens JWT y errores estructurados
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
      // Respuesta vacía o sin JSON
    }

    if (!respuesta.ok) {
      const error = new Error(datos.mensaje || 'Ocurrió un error en el servidor.');
      error.status = respuesta.status;
      error.detalles = datos.errores || [];
      throw error;
    }

    return datos;
  } catch (error) {
    // Si la API backend no está disponible localmente en modo estático, usamos los servicios simulados (Fallback)
    console.warn(`[API REST] backend no detectado en "${ruta}". Activando proveedor de datos simulados.`);
    return manejarRespuestaFallback(ruta, opciones);
  }
}

/**
 * Proveedor de Datos Simulados para desarrollo offline y prototipado
 */
const EVENTOS_MOCK = [
  {
    id: 1,
    titulo: 'Macro Macrorrueda de Negocios Fondo Emprender 2026',
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
    imagen: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80'
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
    imagen: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&auto=format&fit=crop&q=80'
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
    imagen: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&auto=format&fit=crop&q=80'
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
    imagen: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&auto=format&fit=crop&q=80'
  }
];

const INSCRIPCIONES_MOCK = new Map();

function manejarRespuestaFallback(ruta, opciones) {
  const metodo = (opciones.method || 'GET').toUpperCase();

  if (ruta.startsWith('/eventos')) {
    if (metodo === 'GET') {
      return { ok: true, eventos: EVENTOS_MOCK };
    }
  }

  if (ruta.startsWith('/inscripciones')) {
    if (metodo === 'POST') {
      const cuerpo = JSON.parse(opciones.body || '{}');
      const eventoId = cuerpo.eventoId;
      const evento = EVENTOS_MOCK.find(e => e.id === Number(eventoId));
      if (evento) {
        if (evento.aforoActual >= evento.aforoMaximo) {
          throw new Error('El evento seleccionado ya ha completado su aforo máximo.');
        }
        evento.aforoActual += 1;
        const ticketId = `FE-SENA-${Math.floor(100000 + Math.random() * 900000)}`;
        const registro = {
          ticketId,
          eventoId: evento.id,
          eventoTitulo: evento.titulo,
          asistenteNombre: cuerpo.nombre,
          asistenteDocumento: cuerpo.documento,
          asistenteCorreo: cuerpo.correo,
          asistenteRol: cuerpo.rol || 'Asistente',
          fechaInscripcion: new Date().toISOString(),
          usado: false
        };
        INSCRIPCIONES_MOCK.set(ticketId, registro);
        return { ok: true, mensaje: 'Inscripción realizada con éxito', ticket: registro };
      }
    }
  }

  if (ruta.startsWith('/aforo/validar-qr')) {
    if (metodo === 'POST') {
      const cuerpo = JSON.parse(opciones.body || '{}');
      const codigo = cuerpo.codigoQR || cuerpo.documento;
      const eventoId = Number(cuerpo.eventoId);

      // Buscar boleto existente o generar registro válido simulado
      let ticket = INSCRIPCIONES_MOCK.get(codigo);

      if (!ticket && codigo.startsWith('FE-SENA-')) {
        // Ticket mock dinámico si el usuario escanea un código generado en la sesión
        ticket = {
          ticketId: codigo,
          eventoId: eventoId,
          asistenteNombre: 'Carlos Andres Mendoza',
          asistenteDocumento: '1098765432',
          asistenteCorreo: 'carlos.mendoza@soy.sena.edu.co',
          usado: false
        };
        INSCRIPCIONES_MOCK.set(codigo, ticket);
      }

      if (!ticket && !codigo.startsWith('FE-SENA-')) {
        // Búsqueda por cédula/documento
        for (const [id, reg] of INSCRIPCIONES_MOCK.entries()) {
          if (reg.asistenteDocumento === codigo && reg.eventoId === eventoId) {
            ticket = reg;
            break;
          }
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

      // Marcar como usado y actualizar aforo
      ticket.usado = true;
      ticket.fechaUso = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

      return {
        valido: true,
        codigoEstado: 'APROBADO',
        mensaje: '¡INGRESO APROBADO! Bienvenido(a) al Evento SENA.',
        ticket
      };
    }
  }

  return { ok: true };
}

/**
 * Sistema de Notificaciones Toast UI
 */
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
    <span>${tipo === 'exito' ? '✅' : '⚠️'}</span>
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
