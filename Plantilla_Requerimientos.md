# Especificación de Requerimientos del Proyecto - Sistema de Gestión de Eventos y Ruedas de Negocios (Fondo Emprender SENA)

> 📋 **Documento de Inscripción y Especificación de Requerimientos para el Proyecto.**
> Adaptado para la entrega del proyecto de software del **Sistema de Gestión de Eventos y Ruedas de Negocios (Fondo Emprender SENA)**.

---

## 1. Identidad del Equipo

- **Nombre del equipo:** GAES-1 (Fondo Emprender SENA)
- **Nombre del proyecto:** Sistema de Gestión de Eventos y Ruedas de Negocios (SENA - Fondo Emprender)
- **Integrantes y roles:**

| Integrante | Rol | Responsable de |
| :--- | :--- | :--- |
| **Andres Villamizar** | ⚙️ **DevOps** | Repositorio GitHub, Git, CI/CD, contenerización (Docker) y entorno de despliegue |
| **Miguel Lopez** | 🎨 **Frontend** | Interfaz de usuario (UI/UX), prototipado responsive, librerías visuales, consumo de API |
| **Ahsly Manosalva** | 🔧 **Backend** | Servidor, API REST/GraphQL, arquitectura de base de datos, lógica de negocio y seguridad |
| **Angel Rueda** | 🧭 **Project Manager (PM)** | Gestión del proyecto, canal con el cliente/instructor, QA, entregables y desbloqueo del equipo |

---

## 2. Visión del Proyecto

**La idea en una frase:** Plataforma web integral para la planificación, aprobación, gestión operativa, emparejamiento de negocios (matchmaking) y analítica de eventos y ruedas de negocios del Fondo Emprender del SENA.

- **¿Para quién es? (Usuarios):**
  - **Comité Directivo / Administrador Estratégico:** Aprobación y alineación estratégica de eventos.
  - **Administrador de Plataforma:** Gestión técnica, creación de eventos y administración global.
  - **Operador Logístico:** Control de aforo, escaneo de accesos (QR) y registro en sitio.
  - **Emprendedores / Proveedores (Expositores):** Publicación de portafolios y participación en citas de negocios.
  - **Compradores:** Búsqueda de emprendimientos, agendamiento de citas y ruedas de negocios.
  - **Asistentes / Estudiantes:** Inscripción a conferencias, talleres y eventos culturales.

- **¿Qué problema resuelve o qué permite hacer?:**
  Resuelve la dispersión e informalidad en la gestión de eventos institucionales y ruedas de negocios. Permite conectar eficientemente a emprendedores SENA (campo, negocios verdes, tecnología) con compradores clave, controlando aforos en tiempo real, automatizando la agenda comercial y generando reportes estadísticos e impactos sociales.

- **Visión (a dónde quieren llevarlo):**
  Convertirse en la solución estándar del SENA a nivel nacional para la dinamización de economías regionales y articulación de ruedas de negocios con analítica predictiva.

- **Modelo:** B2B / B2C (Institucional y gubernamental sin fines de lucro en etapa inicial).

- **¿Cómo generaría valor o dinero?:**
  Generación de impacto social (empleo y visibilidad comercial para emprendedores). A futuro, la plataforma permitirá gestionar eventos con boletería o patrocinios comerciales.

---

## 3. Funcionalidades y Alcance (MVP vs. Extra)

| Funcionalidad / Módulo | ¿MVP? | ¿Extra? | Responsable |
| :--- | :---: | :---: | :--- |
| **Autenticación y Registro de Usuarios por Roles (RBAC)** | ✅ | | Backend (Ahsly) |
| **Flujo de Propuesta, Revisión y Aprobación de Eventos** | ✅ | | Backend + PM (Ahsly / Angel) |
| **Calendario Público de Eventos y Pre-eventos** | ✅ | | Frontend (Miguel) |
| **Módulo de Ruedas de Negocios y Matchmaking (Agendamiento de Citas)** | ✅ | | Frontend + Backend (Miguel / Ahsly) |
| **Control de Aforo y Generación de Entradas con Código QR** | ✅ | | Frontend + Backend (Miguel / Ahsly) |
| **Vista Logística para Escaneo de QR y Control de Registro en Sitio** | ✅ | | Frontend + DevOps (Miguel / Andres) |
| **Reportes y Exportación de Datos (Excel XLSX / PDF)** | ✅ | | Backend + Frontend (Ahsly / Miguel) |
| **Emisión Automática de Certificados Digitales de Asistencia en PDF** | | ✅ | Backend (Ahsly) |
| **Notificaciones Masivas vía WhatsApp / SMS / Correo Transaccional** | | ✅ | DevOps + Backend (Andres / Ahsly) |
| **Integración con Videollamadas (Teams / Meet) para Eventos Virtuales** | | ✅ | Backend + DevOps (Ahsly / Andres) |

**Feature clave:** Módulo interactivo de Rueda de Negocios (Matchmaking) entre Compradores y Proveedores con agendamiento automatizado de citas y generación de códigos QR para acreditación de aforo.

---

## 4. Requerimientos Técnicos

- [x] **Frontend:** HTML5 semántico + CSS3 (Sass/Tailwind) + JavaScript (SPA con React/Vue o JS Vanilla modular).
- [x] **Backend:** Node.js + Express (API RESTful estructurada).
- [x] **Base de Datos:** MySQL (relacional para integridad estricta de citas, aforos y roles).
- [x] **Feature Clave:** Módulo de Rueda de Negocios + Control de Aforo con Código QR en tiempo real.
- [x] **Tiempo Real / Comunicación:** WebSockets (Socket.IO) para actualización de aforo e indicadores del Dashboard logístico.
- [x] **Autenticación:** JWT (JSON Web Tokens) + Encriptación Bcrypt + RBAC (Control de acceso basado en roles).
- [x] **Servicios / APIs Externas:** QR Code Generator, SendGrid/AWS SES para emails, PDFKit/WeasyPrint para certificados y reportes.

### Esquema Relacional de Base de Datos (Borrador)

```sql
-- Usuarios y Autenticación
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    clave_hash VARCHAR(255) NOT NULL,
    rol ENUM('ADMIN', 'COMITE', 'LOGISTICO', 'PROVEEDOR', 'COMPRADOR', 'ASISTENTE') NOT NULL,
    identificacion VARCHAR(20) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Perfiles de Empresas / Emprendimientos
CREATE TABLE perfiles_empresa (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNIQUE NOT NULL,
    nit VARCHAR(20),
    razon_social VARCHAR(150),
    sector_economico VARCHAR(100),
    portafolio_pdf_url VARCHAR(255),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Eventos
CREATE TABLE eventos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    modalidad ENUM('PRESENCIAL', 'VIRTUAL', 'HIBRIDO') NOT NULL,
    estado ENUM('BORRADOR', 'PENDIENTE_APROBACION', 'APROBADO', 'RECHAZADO', 'CANCELADO') DEFAULT 'BORRADOR',
    aforo_maximo INT NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NOT NULL,
    presupuesto_cop DECIMAL(12,2) DEFAULT 0.00,
    creado_por INT,
    FOREIGN KEY (creado_por) REFERENCES usuarios(id)
);

-- Rueda de Negocios (Citas)
CREATE TABLE citas_negocio (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evento_id INT NOT NULL,
    comprador_id INT NOT NULL,
    proveedor_id INT NOT NULL,
    fecha_hora DATETIME NOT NULL,
    estado ENUM('SOLICITADA', 'CONFIRMADA', 'RECHAZADA', 'CANCELADA', 'REALIZADA') DEFAULT 'SOLICITADA',
    mesa_stand VARCHAR(20),
    enlace_virtual VARCHAR(255),
    calificacion INT CHECK (calificacion BETWEEN 1 AND 5),
    FOREIGN KEY (evento_id) REFERENCES eventos(id),
    FOREIGN KEY (comprador_id) REFERENCES usuarios(id),
    FOREIGN KEY (proveedor_id) REFERENCES usuarios(id)
);

-- Asistencia y Registros
CREATE TABLE inscripciones_asistencia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evento_id INT NOT NULL,
    usuario_id INT NOT NULL,
    codigo_qr VARCHAR(255) UNIQUE NOT NULL,
    estado_asistencia ENUM('INSCRITO', 'ASISTIO', 'CANCELADO') DEFAULT 'INSCRITO',
    fecha_ingreso DATETIME,
    FOREIGN KEY (evento_id) REFERENCES eventos(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
## 5. Requerimientos de Despliegue y Arquitectura CI/CD

- **Frontend se desplegará en:** Vercel (Hosting para el cliente web SPA).
- **Backend se desplegará en:** Render (Servicio en la nube para la API REST en Node.js/Express).
- **Base de datos se desplegará en:** Railway (Instancia gestionada de MySQL).
- **Dominio:** Subdominio gratuito de Vercel (`https://sistema-eventos-fondoemprender.vercel.app`).
- **CI/CD:** ✅ Sí. Pipeline automatizado con **GitHub Actions** configurado por Andres Villamizar (DevOps). Ejecuta pruebas unitarias, validación de estilo/linter y despliegue automático ante cada *merge* o *push* en la rama `main`.
- **Link del repositorio oficial:** ` https://github.com/Andresin23/GAES-1-Gestion-de-eventos.git` *(Pendiente crear)*.

### Costos Estimados de Servidores (Proyección Mensual para Entorno Real)

| Recurso | Proveedor / Plan | Costo Estimado (USD/mes) |
| :--- | :--- | :--- |
| **Hosting Backend** | Render Starter Plan (Instancia Express de alta disponibilidad) | $7.00 USD |
| **Base de Datos Relacional** | Railway Managed MySQL (5 GB Almacenamiento + IOPS) | $10.00 USD |
| **Hosting Frontend** | Vercel Free / Hobby Plan (Despliegue estático y CDN) | $0.00 USD |
| **Servicio de Correos** | SendGrid / AWS SES (API de correos transaccionales) | $0.00 USD (Capa gratuita) |
| **Dominio Personalizado** | Registro anual de dominio institucional `.com` / `.co` | $1.00 USD ($12/año) |
| **TOTAL ESTIMADO** | | **~$18.00 USD / mes** |

---

## 6. Plan de Trabajo e Hitos del Hackathon (Cronograma Detallado)

| Clases / Semanas | Qué esperamos terminar (Objetivos y Entregables) | Responsable Principal |
| :--- | :--- | :--- |
| **Clase 06 (Actual)** | **Inscripción del proyecto:** Definición de requerimientos, asignación de roles del GAES-5 y estructuración del repositorio en GitHub. | Angel Rueda (PM) / Todo el equipo |
| **Clases 07–08 (Backend)** | **Servidor y API Base:** Configuración del servidor Node.js/Express, arquitectura de rutas, modelos de datos en MySQL y endpoints de autenticación RBAC con JWT. | Ahsly Manosalva (Backend) |
| **Clases 09–10 (Datos)** | **Persistencia y Lógica:** Base de datos relacional operativa. Endpoints para gestión de eventos, flujo de aprobación del Comité Directivo y generación de agenda de citas. | Ahsly Manosalva (Backend) |
| **Clases 11–13 (Feature / Auth / Realtime)** | **Front + Socket.IO + QR:** Maquetación UI de la Rueda de Negocios, integración del mapa/calendario público, lector de QR con la cámara y actualización de aforo en tiempo real. | Miguel Lopez (Frontend) / Andres Villamizar (DevOps) |
| **Clases 14–15 (Integración)** | **Integración Total & CI/CD:** Conexión completa Frontend-Backend, despliegue continuo en Vercel/Render y generación de reportes en PDF/XLSX. | Todo el equipo (Liderado por Andres y Angel) |
| **Clase 16 (Demo Day)** | **Entrega Final:** Sistema 100% operativo, pruebas de estrés realizadas y presentación/demo en vivo ante el instructor y clientes. | Angel Rueda (PM) / Todo el equipo |

---

## 7. Riesgos y Preguntas de Validación para el Cliente

### Riesgos Identificados
- **Riesgo 1 (Sincronización de Citas en Tiempo Real):** Colisión de horarios durante la Rueda de Negocios si dos Compradores solicitan cita al mismo Proveedor de forma simultánea.
  * *Mitigación:* Implementar bloqueos optimistas en la base de datos MySQL y validación de disponibilidad inmediata en backend.
- **Riesgo 2 (Fallas de Conectividad en Sitio):** Pérdida de acceso a Internet por parte del Operador Logístico al escanear entradas QR en eventos de alta concurrencia.
  * *Mitigación:* Diseñar un caché local temporal en la vista del Operador que sincronice las asistencias en lote al recuperar conexión.
- **Riesgo 3 (Generación de Reportes Pesados):** Sobrecarga del servidor al exportar archivos PDF o XLSX con miles de registros de asistentes e indicadores del evento.
  * *Mitigación:* Procesar la exportación de reportes complejos en segundo plano utilizando trabajos asíncronos.

### Preguntas para el Instructor / Cliente (Lideradas por Angel Rueda - PM)
1. **Flujo del Comité Directivo:** ¿El visto bueno del Comité Directivo para aprobar un evento requiere firma digital formal o únicamente la actualización de estado en plataforma con log de auditoría?
2. **Asignación de Ubicación:** En las Ruedas de Negocios presenciales, ¿la asignación del número de mesa/stand debe ser automática e incremental o se debe permitir la reasignación manual por parte del Administrador?
3. **Mecanismo de Autenticación:** ¿Es estrictamente obligatorio el uso de JWT (JSON Web Tokens) o el cliente acepta manejo de sesiones mediante Express-Session con cookies seguras?