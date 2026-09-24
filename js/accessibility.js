'use strict';

/**
 * MÓDULO INTEGRAL DE ACCESIBILIDAD Y TEMAS WCAG 2.1 (GAES-1)
 * Widget Flotante de Accesibilidad con Botones Laterales
 */

(function () {
  const ALMACENAMIENTO_CLAVE = 'sena_accesibilidad_config';

  const estadoAccesibilidad = {
    tema: 'light', // 'light' | 'dark'
    contraste: 'normal', // 'normal' | 'high' | 'low'
    tamanoFuente: 'normal', // 'normal' | 'large' | 'xlarge'
    vozActiva: false,
    panelAbierto: false
  };

  // Cargar configuración guardada
  function cargarConfiguracion() {
    try {
      const guardado = localStorage.getItem(ALMACENAMIENTO_CLAVE);
      if (guardado) {
        Object.assign(estadoAccesibilidad, JSON.parse(guardado));
      }
    } catch (e) {
      console.warn('No se pudo cargar la configuración de accesibilidad:', e);
    }
  }

  function guardarConfiguracion() {
    try {
      localStorage.setItem(ALMACENAMIENTO_CLAVE, JSON.stringify(estadoAccesibilidad));
    } catch (e) {}
  }

  function aplicarConfiguracion() {
    const root = document.documentElement;

    // Tema Claro / Oscuro
    if (estadoAccesibilidad.tema === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }

    // Nivel de Contraste
    if (estadoAccesibilidad.contraste === 'high') {
      root.setAttribute('data-contrast', 'high');
    } else if (estadoAccesibilidad.contraste === 'low') {
      root.setAttribute('data-contrast', 'low');
    } else {
      root.removeAttribute('data-contrast');
    }

    // Tamaño de Fuente
    if (estadoAccesibilidad.tamanoFuente === 'large') {
      root.setAttribute('data-font-size', 'large');
    } else if (estadoAccesibilidad.tamanoFuente === 'xlarge') {
      root.setAttribute('data-font-size', 'xlarge');
    } else if (estadoAccesibilidad.tamanoFuente === 'small') {
      root.setAttribute('data-font-size', 'small');
    } else {
      root.removeAttribute('data-font-size');
    }

    actualizarBotonesUI();
  }

  function renderizarWidgetAccesibilidad() {
    if (document.getElementById('widget-accesibilidad-sena')) return;

    const widget = document.createElement('div');
    widget.id = 'widget-accesibilidad-sena';
    widget.className = 'widget-accesibilidad-flotante';
    widget.setAttribute('role', 'region');
    widget.setAttribute('aria-label', 'Herramientas de Accesibilidad');

    widget.innerHTML = `
      <!-- BOTÓN FLOTANTE TRIGGER -->
      <button type="button" id="btn-trigger-accesibilidad" class="btn-acc-trigger" title="Opciones de Accesibilidad WCAG" aria-label="Abrir Panel de Accesibilidad">
        <span class="acc-trigger-icon">♿</span>
        <span class="acc-trigger-text">Accesibilidad</span>
      </button>

      <!-- PANEL LATERAL FLOTANTE -->
      <div id="panel-accesibilidad-card" class="panel-acc-card" aria-hidden="true">
        <div class="panel-acc-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">♿</span>
            <h4 style="margin:0; font-size: 14px; font-weight: 800; color: white;">Accesibilidad SENA</h4>
          </div>
          <button type="button" id="btn-cerrar-panel-acc" class="btn-acc-cerrar" aria-label="Cerrar panel">&times;</button>
        </div>

        <div class="panel-acc-body">
          <!-- TEMA CLARO / OSCURO -->
          <div class="acc-seccion-item">
            <span class="acc-item-label">Apariencia Visual:</span>
            <button type="button" id="btn-toggle-tema" class="btn-acc-opcion btn-bloque">
              <span class="acc-icon">🌙</span> <span class="acc-texto">Modo Oscuro</span>
            </button>
          </div>

          <!-- CONTRASTE -->
          <div class="acc-seccion-item">
            <span class="acc-item-label">Modo de Contraste:</span>
            <div class="acc-segmento-grid">
              <button type="button" id="btn-contraste-normal" class="btn-acc-segmento" title="Contraste Normal">Normal</button>
              <button type="button" id="btn-contraste-alto" class="btn-acc-segmento" title="Alto Contraste">Alto</button>
              <button type="button" id="btn-contraste-bajo" class="btn-acc-segmento" title="Bajo Contraste">Bajo</button>
            </div>
          </div>

          <!-- TAMAÑO DE FUENTE -->
          <div class="acc-seccion-item">
            <span class="acc-item-label">Tamaño de Texto:</span>
            <div class="acc-segmento-grid">
              <button type="button" id="btn-fuente-menos" class="btn-acc-segmento" title="Fuente Normal">A-</button>
              <button type="button" id="btn-fuente-reset" class="btn-acc-segmento" title="Restablecer Tamaño">A</button>
              <button type="button" id="btn-fuente-mas" class="btn-acc-segmento" title="Aumentar Tamaño">A+</button>
            </div>
          </div>

          <!-- LECTOR DE VOZ SINTETIZADA (TTS) -->
          <div class="acc-seccion-item" style="margin-bottom: 0;">
            <span class="acc-item-label">Lector por Voz (TTS):</span>
            <button type="button" id="btn-toggle-voz" class="btn-acc-opcion btn-bloque" title="Lector de Voz de Contenido">
              <span class="acc-icon">🔊</span> <span id="texto-btn-voz" class="acc-texto">Leer Página</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(widget);
    conectarEventosAcc();
  }

  function conectarEventosAcc() {
    const trigger = document.getElementById('btn-trigger-accesibilidad');
    const panel = document.getElementById('panel-accesibilidad-card');
    const btnCerrar = document.getElementById('btn-cerrar-panel-acc');

    if (trigger && panel) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        estadoAccesibilidad.panelAbierto = !estadoAccesibilidad.panelAbierto;
        panel.classList.toggle('activo', estadoAccesibilidad.panelAbierto);
        panel.setAttribute('aria-hidden', !estadoAccesibilidad.panelAbierto);
      });
    }

    if (btnCerrar && panel) {
      btnCerrar.addEventListener('click', () => {
        estadoAccesibilidad.panelAbierto = false;
        panel.classList.remove('activo');
        panel.setAttribute('aria-hidden', 'true');
      });
    }

    // Cerrar al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (panel && estadoAccesibilidad.panelAbierto && !panel.contains(e.target) && e.target !== trigger) {
        estadoAccesibilidad.panelAbierto = false;
        panel.classList.remove('activo');
        panel.setAttribute('aria-hidden', 'true');
      }
    });

    // Tema
    const btnTema = document.getElementById('btn-toggle-tema');
    if (btnTema) {
      btnTema.addEventListener('click', () => {
        estadoAccesibilidad.tema = estadoAccesibilidad.tema === 'dark' ? 'light' : 'dark';
        guardarConfiguracion();
        aplicarConfiguracion();
      });
    }

    // Contraste
    const btnNorm = document.getElementById('btn-contraste-normal');
    const btnAlto = document.getElementById('btn-contraste-alto');
    const btnBajo = document.getElementById('btn-contraste-bajo');

    if (btnNorm) btnNorm.addEventListener('click', () => setContraste('normal'));
    if (btnAlto) btnAlto.addEventListener('click', () => setContraste('high'));
    if (btnBajo) btnBajo.addEventListener('click', () => setContraste('low'));

    // Tamaño Fuente
    const btnMenos = document.getElementById('btn-fuente-menos');
    const btnReset = document.getElementById('btn-fuente-reset');
    const btnMas = document.getElementById('btn-fuente-mas');

    if (btnMenos) {
      btnMenos.addEventListener('click', () => {
        setTamanoFuente('small');
      });
    }
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        setTamanoFuente('normal');
      });
    }
    if (btnMas) {
      btnMas.addEventListener('click', () => {
        if (estadoAccesibilidad.tamanoFuente === 'normal') {
          setTamanoFuente('large');
        } else if (estadoAccesibilidad.tamanoFuente === 'large') {
          setTamanoFuente('xlarge');
        } else if (estadoAccesibilidad.tamanoFuente === 'small') {
          setTamanoFuente('large');
        } else {
          setTamanoFuente('xlarge');
        }
      });
    }

    // Voz TTS
    const btnVoz = document.getElementById('btn-toggle-voz');
    if (btnVoz) {
      btnVoz.addEventListener('click', alternarLectorVoz);
    }
  }

  function setContraste(nivel) {
    estadoAccesibilidad.contraste = nivel;
    guardarConfiguracion();
    aplicarConfiguracion();
  }

  function setTamanoFuente(tam) {
    estadoAccesibilidad.tamanoFuente = tam;
    guardarConfiguracion();
    aplicarConfiguracion();
  }

  function actualizarBotonesUI() {
    const btnTema = document.getElementById('btn-toggle-tema');
    if (btnTema) {
      const esDark = estadoAccesibilidad.tema === 'dark';
      btnTema.querySelector('.acc-icon').textContent = esDark ? '☀️' : '🌙';
      btnTema.querySelector('.acc-texto').textContent = esDark ? 'Modo Claro' : 'Modo Oscuro';
      btnTema.classList.toggle('activo', esDark);
    }

    // Botones Contraste
    ['normal', 'alto', 'bajo'].forEach(c => {
      const btn = document.getElementById(`btn-contraste-${c}`);
      if (btn) {
        const mapeo = { normal: 'normal', alto: 'high', bajo: 'low' };
        btn.classList.toggle('activo', estadoAccesibilidad.contraste === mapeo[c]);
      }
    });

    // Botones Fuente
    const btnMenos = document.getElementById('btn-fuente-menos');
    const btnReset = document.getElementById('btn-fuente-reset');
    const btnMas = document.getElementById('btn-fuente-mas');

    if (btnMenos) btnMenos.classList.toggle('activo', estadoAccesibilidad.tamanoFuente === 'small');
    if (btnReset) btnReset.classList.toggle('activo', estadoAccesibilidad.tamanoFuente === 'normal');
    if (btnMas) btnMas.classList.toggle('activo', estadoAccesibilidad.tamanoFuente === 'large' || estadoAccesibilidad.tamanoFuente === 'xlarge');
  }

  /**
   * LECTOR DE VOZ SINTETIZADA (WEB SPEECH API)
   */
  let sintesisVoz = window.speechSynthesis;
  let locucionActual = null;

  function alternarLectorVoz() {
    if (!sintesisVoz) {
      alert('Tu navegador no soporta síntesis de voz Web Speech API.');
      return;
    }

    if (sintesisVoz.speaking) {
      sintesisVoz.cancel();
      estadoAccesibilidad.vozActiva = false;
      actualizarEstadoBotonVoz(false);
      return;
    }

    // Recopilar contenido principal para leer
    const selectorTexto = document.querySelector('main') || document.body;
    let textoALeer = '';

    // Si hay texto seleccionado por el usuario, leer la selección
    const seleccion = window.getSelection().toString().trim();
    if (seleccion) {
      textoALeer = seleccion;
    } else {
      // Extraer títulos y párrafos relevantes
      const encabezados = Array.from(selectorTexto.querySelectorAll('h1, h2, h3, .tarjeta-titulo, p'))
        .slice(0, 15)
        .map(el => el.textContent.trim())
        .filter(t => t.length > 0)
        .join('. ');
      textoALeer = encabezados || 'Bienvenido a la plataforma de eventos del Fondo Emprender SENA.';
    }

    locucionActual = new SpeechSynthesisUtterance(textoALeer);
    locucionActual.lang = 'es-CO';
    locucionActual.rate = 0.95;

    locucionActual.onend = () => {
      estadoAccesibilidad.vozActiva = false;
      actualizarEstadoBotonVoz(false);
    };

    locucionActual.onerror = () => {
      estadoAccesibilidad.vozActiva = false;
      actualizarEstadoBotonVoz(false);
    };

    estadoAccesibilidad.vozActiva = true;
    actualizarEstadoBotonVoz(true);
    sintesisVoz.speak(locucionActual);
  }

  function actualizarEstadoBotonVoz(leyendo) {
    const txt = document.getElementById('texto-btn-voz');
    const btn = document.getElementById('btn-toggle-voz');
    if (txt) txt.textContent = leyendo ? 'Detener Voz' : 'Leer Página';
    if (btn) btn.classList.toggle('leyendo', leyendo);
  }

  document.addEventListener('DOMContentLoaded', () => {
    cargarConfiguracion();
    renderizarWidgetAccesibilidad();
    aplicarConfiguracion();
  });
})();
