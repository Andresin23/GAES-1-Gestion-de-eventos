'use strict';

// Funcion unica para hablar con el backend.
// Agrega automaticamente el token si el usuario tiene sesion iniciada
// y lanza un error con el mensaje del servidor si la respuesta falla.

async function peticionAPI(ruta, opciones = {}) {
  const sesion = obtenerSesion();
  const cabeceras = { 'Content-Type': 'application/json', ...(opciones.cabeceras || {}) };

  if (sesion && sesion.token) {
    cabeceras.Authorization = `Bearer ${sesion.token}`;
  }

  let respuesta;
  try {
    respuesta = await fetch(`/api${ruta}`, {
      ...opciones,
      headers: cabeceras
    });
  } catch (error) {
    throw new Error('No se pudo conectar con el servidor. Revisa que este encendido.');
  }

  let datos = {};
  try {
    datos = await respuesta.json();
  } catch (error) {
    // Respuesta sin cuerpo JSON.
  }

  if (!respuesta.ok) {
    const error = new Error(datos.mensaje || 'Ocurrio un error inesperado.');
    error.status = respuesta.status;
    error.detalles = datos.errores || [];
    throw error;
  }

  return datos;
}