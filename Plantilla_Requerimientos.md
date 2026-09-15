# Especificación de Requerimientos del Proyecto - Sistema de Gestión de Eventos y Ruedas de Negocios (Fondo Emprender SENA)

> 📋 **Documento de Inscripción y Especificación de Requerimientos para el Proyecto.**
> Adaptado para la entrega del proyecto de software del **Sistema de Gestión de Eventos y Ruedas de Negocios (Fondo Emprender SENA)**.

---

## 1. Identidad del Equipo

- **Nombre del equipo:** GAES-5 (Fondo Emprender SENA)
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