# 🚀 Sistema de Gestión de Eventos - Fondo Emprender (SENA)
Plataforma web integral diseñada para la planificación, aprobación, gestión logística y analítica de eventos institucionales del **Fondo Emprender del SENA**. Desarrollado por el equipo **GAES-1**.

---

## 📋 Tabla de Contenidos
- [Descripción General](#-descripción-general)
- [Características Principales](#-características-principales)
- [Stack Tecnológico](#-stack-tecnológico)
- [Arquitectura y CI/CD](#-arquitectura-y-cicd)
- [Instalación y Configuración](#-instalación-y-configuración)
- [Uso](#-uso)
- [Contribución](#-contribución)

---

## 💡 Descripción General

El sistema automatiza los procesos operativos y logísticos de los eventos del Fondo Emprender, facilitando el matchmaking entre emprendedores y compradores, el seguimiento por parte de los comités institucionales y la generación automática de reportes.

---

## ✨ Características Principales

* 📅 **Calendario Público de Eventos:** Visualización e inscripción en tiempo real.
* 🛡️ **Flujo de Aprobación:** Control de propuestas y eventos mediante comités de evaluación.
* 🤝 **Ruedas de Negocios (Matchmaking):** Conexión directa entre emprendedores y compradores.
* 📲 **Control de Aforo mediante QR:** Validación rápida de asistencia en puerta mediante escaneo de código QR.
* 📜 **Certificación Automática:** Generación y envío automático de certificados digitales a asistentes.
* 📊 **Analítica y Reportes:** Módulo de métricas para la toma de decisiones institucionales.

---

## 🛠️ Stack Tecnológico

* **Backend:** Node.js / Express
* **Frontend:** HTML5, CSS3, JavaScript (ES6+)
* **Base de Datos:** Relacional (MySQL / PostgreSQL)
* **Control de Versiones:** Git & GitHub

---

## ⚙️ Arquitectura y CI/CD

El proyecto cuenta con un flujo de integración y despliegue continuo (**CI/CD**) automatizado a través de **GitHub Actions**, lo que garantiza que cada *pull request* o *commit* en la rama principal ejecute pruebas automáticas antes del despliegue.

---
## 📖 Uso

Una vez iniciada la aplicación localmente, accede a `http://localhost:3000` desde tu navegador web.

### Flujo básico de la plataforma:
1. **Administradores y Comités:**
   - Inician sesión para crear convocatorias y evaluar solicitudes de eventos.
   - Revisan indicadores y analíticas en el panel principal.
2. **Emprendedores y Asistentes:**
   - Consultan el calendario público de eventos disponibles.
   - Se inscriben a los eventos y reciben un pase de acceso con código QR.
3. **Logística y Control de Acceso:**
   - Escanean los códigos QR de los asistentes en puerta para validar el ingreso y controlar el aforo.
4. **Cierre y Certificación:**
   - El sistema genera y envía automáticamente los certificados de asistencia al finalizar cada evento.

---

## 🤝 Contribución

¡Las contribuciones son bienvenidas para seguir fortaleciendo el proyecto! Si deseas colaborar, sigue estos pasos:

1. **Haz un Fork** del repositorio.
2. **Crea una nueva rama** para tu funcionalidad o corrección:
   ```bash
   git checkout -b feature/nueva-funcionalidad
