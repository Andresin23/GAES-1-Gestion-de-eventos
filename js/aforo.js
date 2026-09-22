'use strict';

/**
 * MÓDULO DE CONTROL DE AFORO Y ESCANEO QR (GAES-1)
 * Panel de Operadores Logísticos y Registro en Puerta SENA
 */

document.addEventListener('DOMContentLoaded', () => {
  inicializarControlAforo();
});

let estadoAforo = {
  eventoSeleccionado: null,
  eventos: [],
  registrosLog: [],
  camaraActiva: false,
  escaneoEnProgreso: false
};

async function inicializarControlAforo() {
  await cargarEventosAforo();
  configurarFormularios();
}

/**
 * Carga eventos disponibles para el selector de la puerta
 */
async function cargarEventosAforo() {
  const selectEvento = document.getElementById('select-evento-aforo');
  if (!selectEvento) return;

  try {
    const respuesta = await peticionAPI('/eventos');
    estadoAforo.eventos = respuesta.eventos || [];

    selectEvento.innerHTML = estadoAforo.eventos.map(ev => `
      <option value="${ev.id}">${ev.titulo} (${ev.modalidad}) - [${ev.aforoActual}/${ev.aforoMaximo}]</option>
    `).join('');

    if (estadoAforo.eventos.length > 0) {
      seleccionarEventoAforo(estadoAforo.eventos[0].id);
    }
  } catch (e) {
    mostrarToast('Error al cargar la lista de eventos para control de aforo.', 'error');
  }

  selectEvento.addEventListener('change', (e) => {
    seleccionarEventoAforo(Number(e.target.value));
  });
}

function seleccionarEventoAforo(eventoId) {
  const evento = estadoAforo.eventos.find(e => e.id === eventoId);
  if (!evento) return;

  estadoAforo.eventoSeleccionado = evento;
  actualizarMetricasAforo();
}

/**
 * Actualiza la barra de aforo, porcentaje y contador macro
 */
function actualizarMetricasAforo() {
  const ev = estadoAforo.eventoSeleccionado;
  if (!ev) return;

  const porcentaje = Math.min(100, Math.round((ev.aforoActual / ev.aforoMaximo) * 100));
  
  const elPorcentaje = document.getElementById('aforo-porcentaje-texto');
  const elDetalle = document.getElementById('aforo-conteo-detalle');
  const barraFill = document.getElementById('aforo-barra-fill');

  if (elPorcentaje) {
    elPorcentaje.textContent = `${porcentaje}%`;
    elPorcentaje.className = `porcentaje-gigante ${porcentaje >= 90 ? 'lleno' : porcentaje >= 75 ? 'medio' : ''}`;
  }

  if (elDetalle) {
    elDetalle.textContent = `${ev.aforoActual} de ${ev.aforoMaximo} asistentes en sala`;
  }

  if (barraFill) {
    barraFill.style.width = `${porcentaje}%`;
    barraFill.className = `aforo-barra-macro-fill ${porcentaje >= 90 ? 'lleno' : porcentaje >= 75 ? 'medio' : ''}`;
  }
}

/**
 * Procesa la lectura de un código QR o Documento
 */
async function procesarValidacionEntrada(codigoQR) {
  if (!estadoAforo.eventoSeleccionado) {
    mostrarToast('Por favor selecciona un evento activo.', 'error');
    return;
  }

  if (estadoAforo.escaneoEnProgreso) return;
  estadoAforo.escaneoEnProgreso = true;

  const bannerResultado = document.getElementById('resultado-validacion-banner');
  if (bannerResultado) {
    bannerResultado.style.display = 'flex';
    bannerResultado.className = 'resultado-banner';
    bannerResultado.innerHTML = `Validando pase en servidor SENA...`;
  }

  try {
    const respuesta = await peticionAPI('/aforo/validar-qr', {
      method: 'POST',
      body: JSON.stringify({
        codigoQR,
        eventoId: estadoAforo.eventoSeleccionado.id
      })
    });

    if (respuesta.valido) {
      reproducirSonidoAcceso(true);
      if (bannerResultado) {
        bannerResultado.className = 'resultado-banner aprobado';
        bannerResultado.innerHTML = `
          <div>
            <div><strong>${respuesta.mensaje}</strong></div>
            <div style="font-size: 13px; font-weight: normal; margin-top: 2px;">Asistente: ${respuesta.ticket.asistenteNombre} (${respuesta.ticket.asistenteDocumento})</div>
          </div>
        `;
      }
      
      // Incrementar aforo local
      estadoAforo.eventoSeleccionado.aforoActual += 1;
      actualizarMetricasAforo();
      agregarAlLogAccesos(respuesta.ticket, 'APROBADO');

    } else {
      reproducirSonidoAcceso(false);
      if (bannerResultado) {
        bannerResultado.className = 'resultado-banner rechazado';
        bannerResultado.innerHTML = `
          <div>
            <div><strong>${respuesta.mensaje}</strong></div>
            <div style="font-size: 13px; font-weight: normal; margin-top: 2px;">Código escaneado: ${codigoQR}</div>
          </div>
        `;
      }
      agregarAlLogAccesos({ ticketId: codigoQR, asistenteNombre: 'Desconocido / Inválido', asistenteDocumento: codigoQR }, 'RECHAZADO');
    }
  } catch (err) {
    mostrarToast('Error al comunicar con el servidor de aforo.', 'error');
  } finally {
    setTimeout(() => {
      estadoAforo.escaneoEnProgreso = false;
    }, 1500);
  }
}

/**
 * Agrega un registro a la tabla log de accesos en vivo
 */
function agregarAlLogAccesos(ticket, estado) {
  const tablaCuerpo = document.getElementById('log-accesos-cuerpo');
  if (!tablaCuerpo) return;

  const hora = new Date().toLocaleTimeString('es-CO');
  const fila = document.createElement('tr');

  fila.innerHTML = `
    <td><strong>${hora}</strong></td>
    <td>${ticket.asistenteNombre}</td>
    <td><code>${ticket.asistenteDocumento || ticket.ticketId}</code></td>
    <td>
      <span class="badge ${estado === 'APROBADO' ? 'badge-disponible' : 'badge-agotado'}">
        ${estado === 'APROBADO' ? 'Aprobado' : 'Denegado'}
      </span>
    </td>
  `;

  // Insertar al inicio
  tablaCuerpo.insertBefore(fila, tablaCuerpo.firstChild);

  // Limitar a los últimos 15 registros
  if (tablaCuerpo.children.length > 15) {
    tablaCuerpo.removeChild(tablaCuerpo.lastChild);
  }
}

/**
 * Sintetizador de audio Web Audio API para feedback sonoro inmediato en puerta
 */
function reproducirSonidoAcceso(aprobado) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (aprobado) {
      // Tono agudo doble (Beep-Beep de éxito)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } else {
      // Tono grave bajo (Buzzer de error)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    }
  } catch (e) {
    // Si el navegador restringe audio sin interacción previa
  }
}

/**
 * Formularios de Búsqueda Manual y Simuladores de QR
 */
function configurarFormularios() {
  const formManual = document.getElementById('form-busqueda-manual');
  if (formManual) {
    formManual.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('input-doc-manual');
      if (input && input.value.trim()) {
        procesarValidacionEntrada(input.value.trim());
        input.value = '';
      }
    });
  }
}

/**
 * Escáner Simulado para pruebas rápidas
 */
function simularEscaneoQR(codigoEspecial = null) {
  const codigosMock = [
    'FE-SENA-782190',
    'FE-SENA-451209',
    'FE-SENA-782190', // Duplicado para probar rechazo
    'FE-INVALIDO-000000',
    '1098765432'
  ];

  const codigoAEscanear = codigoEspecial || codigosMock[Math.floor(Math.random() * codigosMock.length)];
  mostrarToast(`[Escáner QR] Detectado código: ${codigoAEscanear}`, 'exito');
  procesarValidacionEntrada(codigoAEscanear);
}
