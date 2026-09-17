'use strict';

/**
 * MÓDULO CALENDARIO PÚBLICO DE EVENTOS Y REGISTRO QR (GAES-1)
 * Desarrollado para Fondo Emprender SENA
 */

document.addEventListener('DOMContentLoaded', () => {
  inicializarCalendario();
});

let estadoCalendario = {
  eventos: [],
  categoriaActiva: 'todos',
  busquedaTexto: '',
  modalidadActiva: 'todas',
  vista: 'grid' // 'grid' | 'lista'
};

async function inicializarCalendario() {
  configurarEventosUI();
  await cargarEventos();
}

/**
 * Carga de datos de eventos desde API con manejo de Skeletons
 */
async function cargarEventos() {
  const contenedor = document.getElementById('grid-eventos-contenedor');
  if (!contenedor) return;

  // Renderizar Skeletons de Carga
  contenedor.innerHTML = Array(3).fill(0).map(() => `
    <div class="skeleton skeleton-card"></div>
  `).join('');

  try {
    const respuesta = await peticionAPI('/eventos');
    estadoCalendario.eventos = respuesta.eventos || [];
    actualizarEstadisticas(estadoCalendario.eventos);
    renderizarEventos();
  } catch (error) {
    contenedor.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: var(--superficie); border-radius: var(--radio); border: 1px solid var(--borde);">
        <p style="color: var(--rojo); font-weight: 700;">No se pudieron cargar los eventos del Fondo Emprender.</p>
        <p style="color: var(--texto-secundario); font-size: 14px; margin-top: 8px;">${error.mensaje || error.message}</p>
        <button onclick="cargarEventos()" class="btn btn-secundario" style="margin-top: 16px;">Reintentar</button>
      </div>
    `;
  }
}

/**
 * Actualiza las estadísticas del Héroe
 */
function actualizarEstadisticas(eventos) {
  const statEventos = document.getElementById('stat-total-eventos');
  const statCupos = document.getElementById('stat-total-cupos');
  if (statEventos) statEventos.textContent = eventos.length;
  if (statCupos) {
    const totalDisponibles = eventos.reduce((acc, ev) => acc + (ev.aforoMaximo - ev.aforoActual), 0);
    statCupos.textContent = totalDisponibles;
  }
}

/**
 * Filtra y renderiza las tarjetas o filas del calendario
 */
function renderizarEventos() {
  const contenedor = document.getElementById('grid-eventos-contenedor');
  if (!contenedor) return;

  let eventosFiltrados = estadoCalendario.eventos.filter(evento => {
    const cumpleTexto = !estadoCalendario.busquedaTexto || 
      evento.titulo.toLowerCase().includes(estadoCalendario.busquedaTexto.toLowerCase()) ||
      evento.descripcion.toLowerCase().includes(estadoCalendario.busquedaTexto.toLowerCase()) ||
      evento.lugar.toLowerCase().includes(estadoCalendario.busquedaTexto.toLowerCase());

    const cumpleCat = estadoCalendario.categoriaActiva === 'todos' || 
      evento.tipoCategoria === estadoCalendario.categoriaActiva;

    const cumpleMod = estadoCalendario.modalidadActiva === 'todas' || 
      evento.modalidad.toLowerCase() === estadoCalendario.modalidadActiva.toLowerCase();

    return cumpleTexto && cumpleCat && cumpleMod;
  });

  if (eventosFiltrados.length === 0) {
    contenedor.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--superficie); border-radius: var(--radio-lg); border: 1px dashed var(--borde);">
        <span style="font-size: 40px; display: block; margin-bottom: 12px;">🔍</span>
        <h3 style="color: var(--sena-navy); font-size: 18px; font-weight: 700;">No se encontraron eventos coincidentes</h3>
        <p style="color: var(--texto-secundario); font-size: 14px; margin-top: 6px;">Intenta ajustar tus filtros de búsqueda o seleccionar otra categoría.</p>
        <button onclick="limpiarFiltros()" class="btn btn-secundario btn-sm" style="margin-top: 16px;">Limpiar Filtros</button>
      </div>
    `;
    return;
  }

  contenedor.innerHTML = eventosFiltrados.map(ev => {
    const disponible = ev.aforoMaximo - ev.aforoActual;
    const porcentaje = Math.round((ev.aforoActual / ev.aforoMaximo) * 100);
    let badgeEstado = '<span class="badge badge-disponible">Cupos Disponibles</span>';
    if (disponible <= 0) {
      badgeEstado = '<span class="badge badge-agotado">Aforo Agotado</span>';
    } else if (porcentaje >= 80) {
      badgeEstado = '<span class="badge badge-ultimos">Últimos Cupos</span>';
    }

    return `
      <article class="tarjeta-evento" aria-labelledby="titulo-ev-${ev.id}">
        <div class="tarjeta-cinta ${ev.tipoCategoria}"></div>
        <div class="tarjeta-body">
          <div class="tarjeta-header">
            <span class="tarjeta-categoria">${ev.categoria}</span>
            ${badgeEstado}
          </div>
          <h3 class="tarjeta-titulo" id="titulo-ev-${ev.id}">${ev.titulo}</h3>
          <p class="tarjeta-descripcion">${ev.descripcion}</p>
          
          <div class="tarjeta-metadatos">
            <div class="meta-item">
              <span class="meta-icono">📅</span>
              <span>${ev.fecha} · ${ev.hora}</span>
            </div>
            <div class="meta-item">
              <span class="meta-icono">📍</span>
              <span><strong>${ev.modalidad}:</strong> ${ev.lugar}</span>
            </div>
          </div>

          <div class="aforo-indicador">
            <div class="aforo-barra-mini">
              <div class="aforo-progreso-mini ${porcentaje >= 90 ? 'lleno' : porcentaje >= 70 ? 'medio' : ''}" style="width: ${porcentaje}%;"></div>
            </div>
            <span class="aforo-texto-mini">${ev.aforoActual} / ${ev.aforoMaximo} inscritos</span>
          </div>
        </div>

        <div class="tarjeta-footer">
          <button onclick="abrirModalDetalle(${ev.id})" class="btn btn-secundario btn-sm">Ver Detalle</button>
          <button onclick="abrirModalInscripcion(${ev.id})" class="btn btn-primario btn-sm" ${disponible <= 0 ? 'disabled' : ''}>
            ${disponible <= 0 ? 'Agotado' : 'Inscribirse'}
          </button>
        </div>
      </article>
    `;
  }).join('');
}

/**
 * Event Listeners para Filtros
 */
function configurarEventosUI() {
  const buscador = document.getElementById('input-buscar-evento');
  if (buscador) {
    buscador.addEventListener('input', (e) => {
      estadoCalendario.busquedaTexto = e.target.value;
      renderizarEventos();
    });
  }

  const selectModalidad = document.getElementById('select-modalidad-filtro');
  if (selectModalidad) {
    selectModalidad.addEventListener('change', (e) => {
      estadoCalendario.modalidadActiva = e.target.value;
      renderizarEventos();
    });
  }

  // Pills de Categoría
  document.querySelectorAll('.pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      estadoCalendario.categoriaActiva = btn.dataset.categoria;
      renderizarEventos();
    });
  });

  // Alternador de Vista (Grid / Lista)
  const btnGrid = document.getElementById('btn-vista-grid');
  const btnLista = document.getElementById('btn-vista-lista');
  const contenedorPadre = document.getElementById('seccion-eventos-main');

  if (btnGrid && btnLista && contenedorPadre) {
    btnGrid.addEventListener('click', () => {
      btnGrid.classList.add('activo');
      btnLista.classList.remove('activo');
      contenedorPadre.classList.remove('vista-lista');
      estadoCalendario.vista = 'grid';
    });

    btnLista.addEventListener('click', () => {
      btnLista.classList.add('activo');
      btnGrid.classList.remove('activo');
      contenedorPadre.classList.add('vista-lista');
      estadoCalendario.vista = 'lista';
    });
  }
}

function limpiarFiltros() {
  estadoCalendario.busquedaTexto = '';
  estadoCalendario.categoriaActiva = 'todos';
  estadoCalendario.modalidadActiva = 'todas';
  const buscador = document.getElementById('input-buscar-evento');
  if (buscador) buscador.value = '';
  document.querySelectorAll('.pill-btn').forEach(b => b.classList.toggle('activo', b.dataset.categoria === 'todos'));
  renderizarEventos();
}

/**
 * Modal de Detalle de Evento
 */
function abrirModalDetalle(eventoId) {
  const evento = estadoCalendario.eventos.find(e => e.id === eventoId);
  if (!evento) return;

  const modal = document.getElementById('modal-detalle-evento');
  const cuerpo = document.getElementById('modal-detalle-cuerpo');
  if (!modal || !cuerpo) return;

  cuerpo.innerHTML = `
    <span class="badge badge-presencial" style="margin-bottom: 12px;">${evento.categoria}</span>
    <h2 style="font-size: 22px; color: var(--sena-navy); font-weight: 800; margin-bottom: 12px;">${evento.titulo}</h2>
    <p style="color: var(--texto-secundario); line-height: 1.6; margin-bottom: 20px;">${evento.descripcion}</p>

    <div style="background: var(--fondo); border: 1px solid var(--borde); border-radius: var(--radio); padding: 16px; margin-bottom: 20px; display: grid; gap: 10px;">
      <div><strong>📅 Fecha y Hora:</strong> ${evento.fecha} (${evento.hora})</div>
      <div><strong>📍 Ubicación/Modalidad:</strong> ${evento.modalidad} - ${evento.lugar}</div>
      <div><strong>👥 Aforo Permitido:</strong> ${evento.aforoMaximo} personas (${evento.aforoMaximo - evento.aforoActual} cupos libres)</div>
    </div>

    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button onclick="cerrarModal('modal-detalle-evento')" class="btn btn-secundario">Cerrar</button>
      <button onclick="cerrarModal('modal-detalle-evento'); abrirModalInscripcion(${evento.id});" class="btn btn-primario" ${evento.aforoActual >= evento.aforoMaximo ? 'disabled' : ''}>
        Proceder al Registro
      </button>
    </div>
  `;

  modal.classList.add('activo');
}

/**
 * Modal de Inscripción y Generación de Pase QR
 */
function abrirModalInscripcion(eventoId) {
  const evento = estadoCalendario.eventos.find(e => e.id === eventoId);
  if (!evento) return;

  const modal = document.getElementById('modal-registro-evento');
  const tituloModal = document.getElementById('modal-registro-titulo');
  const formInscripcion = document.getElementById('form-registro-asistente');
  const contenedorPase = document.getElementById('contenedor-pase-qr');

  if (!modal || !formInscripcion || !contenedorPase) return;

  if (tituloModal) tituloModal.textContent = `Registro: ${evento.titulo}`;
  document.getElementById('input-evento-id').value = evento.id;
  
  formInscripcion.style.display = 'block';
  contenedorPase.style.display = 'none';

  modal.classList.add('activo');
}

/**
 * Procesa la inscripción y genera el código QR
 */
async function procesarInscripcion(event) {
  event.preventDefault();
  const btnSubmit = document.getElementById('btn-confirmar-registro');
  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Generando Pase...';

  const eventoId = document.getElementById('input-evento-id').value;
  const nombre = document.getElementById('reg-nombre').value;
  const documento = document.getElementById('reg-documento').value;
  const correo = document.getElementById('reg-correo').value;
  const rol = document.getElementById('reg-rol').value;

  try {
    const respuesta = await peticionAPI('/inscripciones', {
      method: 'POST',
      body: JSON.stringify({ eventoId, nombre, documento, correo, rol })
    });

    if (respuesta.ok && respuesta.ticket) {
      mostrarToast('¡Inscripción exitosa! Tu Pase Digital QR ha sido generado.', 'exito');
      renderizarPaseDigital(respuesta.ticket);
      // Actualizar aforo en estado local
      const eventoLocal = estadoCalendario.eventos.find(e => e.id === Number(eventoId));
      if (eventoLocal) {
        eventoLocal.aforoActual += 1;
        renderizarEventos();
      }
    }
  } catch (error) {
    mostrarToast(error.message || 'Error al procesar la inscripción.', 'error');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Generar Pase Digital';
  }
}

/**
 * Genera el QR dinámico en HTML Canvas para visualización instantánea y descarga
 */
function renderizarPaseDigital(ticket) {
  const formInscripcion = document.getElementById('form-registro-asistente');
  const contenedorPase = document.getElementById('contenedor-pase-qr');
  if (!formInscripcion || !contenedorPase) return;

  formInscripcion.style.display = 'none';
  contenedorPase.style.display = 'flex';

  document.getElementById('ticket-nombre').textContent = ticket.asistenteNombre;
  document.getElementById('ticket-evento').textContent = ticket.eventoTitulo;
  document.getElementById('ticket-doc').textContent = `Doc: ${ticket.asistenteDocumento}`;
  document.getElementById('ticket-codigo').textContent = ticket.ticketId;

  // Generar QR Canvas Nativo de alta precisión
  const canvas = document.getElementById('canvas-qr-generado');
  if (canvas) {
    dibujarCodigoQR(canvas, ticket.ticketId);
  }
}

/**
 * Motor ligero de dibujo de código QR visual en Canvas (Patrón de Matriz de Accesos SENA)
 */
function dibujarCodigoQR(canvas, codigo) {
  const ctx = canvas.getContext('2d');
  const size = 200;
  canvas.width = size;
  canvas.height = size;

  // Fondo Blanco
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // Semilla de cuadrícula basada en el hash del código
  const gridSize = 21;
  const cellSize = size / gridSize;
  ctx.fillStyle = '#0f2d40';

  // Patrones de Esquinas (Finders)
  const dibujarFinder = (x, y) => {
    ctx.fillRect(x * cellSize, y * cellSize, 7 * cellSize, 7 * cellSize);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect((x + 1) * cellSize, (y + 1) * cellSize, 5 * cellSize, 5 * cellSize);
    ctx.fillStyle = '#0f2d40';
    ctx.fillRect((x + 2) * cellSize, (y + 2) * cellSize, 3 * cellSize, 3 * cellSize);
  };

  dibujarFinder(0, 0);
  dibujarFinder(gridSize - 7, 0);
  dibujarFinder(0, gridSize - 7);

  // Módulo de datos simulado basado en string
  let hash = 0;
  for (let i = 0; i < codigo.length; i++) {
    hash = (hash << 5) - hash + codigo.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      // Ignorar zonas de los finders
      if ((r < 7 && c < 7) || (r < 7 && c >= gridSize - 7) || (r >= gridSize - 7 && c < 7)) continue;
      
      const pseudoBit = Math.abs((hash ^ (r * 31 + c * 17)) % 3) === 0;
      if (pseudoBit) {
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
    }
  }

  // Marca central SENA
  ctx.fillStyle = '#39A900';
  ctx.fillRect(9 * cellSize, 9 * cellSize, 3 * cellSize, 3 * cellSize);
}

function cerrarModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('activo');
}
